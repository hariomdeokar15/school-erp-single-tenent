#!/usr/bin/env node
"use strict";

const path = require("node:path");
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const { Client } = require("pg");
const dotenv = require("dotenv");

const repoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(repoRoot, ".env") });

function getLocalDatabaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is missing from the root .env.");
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run with NODE_ENV=production.");
  }

  const url = new URL(value);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "::1"].includes(url.hostname) ||
    url.port !== "5434" ||
    database !== "schoolerp"
  ) {
    throw new Error(
      "Safety check failed: this script only runs against localhost:5434/schoolerp. No user was deleted.",
    );
  }
  return url.toString();
}

async function main() {
  const connectionString = getLocalDatabaseUrl();
  const prompt = readline.createInterface({ input: stdin, output: stdout });
  const client = new Client({ connectionString });
  let clientConnected = false;
  let transactionOpen = false;

  try {
    const email = (
      await prompt.question("Exact email of the OWNER account to remove: ")
    )
      .trim()
      .toLowerCase();
    if (!email || !email.includes("@")) {
      throw new Error("Enter a valid account email. No user was deleted.");
    }

    stdout.write(
      `\nTarget: ${email}\nDatabase: localhost:5434/schoolerp\n\n` +
        "This permanently removes the user row. Auth sessions, role assignments, recovery tokens, and outbox rows cascade. Related school records may prevent deletion.\n",
    );
    const confirmation = await prompt.question(
      `To continue, type DELETE ${email}: `,
    );
    if (confirmation !== `DELETE ${email}`) {
      stdout.write("Confirmation did not match. Nothing was changed.\n");
      return;
    }

    await client.connect();
    clientConnected = true;
    await client.query("BEGIN");
    transactionOpen = true;

    // Lock owner rows while checking the last-owner rule, so the count cannot
    // be invalidated by another owner being disabled/deleted concurrently.
    await client.query(`
      SELECT u."id"
      FROM "users" u
      JOIN "role_assignments" r ON r."userId" = u."id"
      WHERE r."role" = 'OWNER'
      ORDER BY u."id"
      FOR UPDATE OF u, r
    `);

    const matches = await client.query(
      `SELECT u."id", u."status"
       FROM "users" u
       JOIN "role_assignments" r ON r."userId" = u."id"
       WHERE r."role" = 'OWNER' AND lower(u."email") = $1
       FOR UPDATE OF u`,
      [email],
    );
    if (matches.rowCount !== 1) {
      throw new Error(
        `Expected exactly one OWNER account for ${email}; found ${matches.rowCount}. No user was deleted.`,
      );
    }

    const targetId = matches.rows[0].id;
    const remainingOwners = await client.query(
      `SELECT count(*)::integer AS count
       FROM "users" u
       JOIN "role_assignments" r ON r."userId" = u."id"
       WHERE r."role" = 'OWNER'
         AND u."status" = 'ACTIVE'
         AND u."emailVerifiedAt" IS NOT NULL
         AND u."mustChangePassword" = false
         AND u."id" <> $1`,
      [targetId],
    );
    if (remainingOwners.rows[0].count < 1) {
      throw new Error(
        "Cannot remove the last active OWNER. Create and verify a replacement OWNER, confirm they can sign in, then run this script again.",
      );
    }

    const deleted = await client.query(
      `DELETE FROM "users" u
       WHERE u."id" = $1
         AND EXISTS (
           SELECT 1 FROM "role_assignments" r
           WHERE r."userId" = u."id" AND r."role" = 'OWNER'
         )`,
      [targetId],
    );
    if (deleted.rowCount !== 1) {
      throw new Error("Owner row was not deleted; transaction will roll back.");
    }

    await client.query("COMMIT");
    transactionOpen = false;
    stdout.write(
      `Removed OWNER account ${email}. One or more active OWNER accounts remain.\n`,
    );
  } catch (error) {
    if (transactionOpen) {
      await client.query("ROLLBACK").catch(() => undefined);
      transactionOpen = false;
    }
    throw error;
  } finally {
    prompt.close();
    if (clientConnected) await client.end();
  }
}

main().catch((error) => {
  stdout.write(`\nNo deletion completed: ${error.message}\n`);
  process.exitCode = 1;
});
