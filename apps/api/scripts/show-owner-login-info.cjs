#!/usr/bin/env node
"use strict";

const path = require("node:path");
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
      "Safety check failed: this script only reads localhost:5434/schoolerp.",
    );
  }
  return url.toString();
}

async function main() {
  const client = new Client({ connectionString: getLocalDatabaseUrl() });
  let connected = false;
  try {
    await client.connect();
    connected = true;
    await client.query("BEGIN READ ONLY");
    const result = await client.query(`
      SELECT u."email", u."status", u."emailVerifiedAt",
             u."mustChangePassword",
             array_agg(r."role"::text ORDER BY r."role"::text) AS "roles"
      FROM "users" u
      JOIN "role_assignments" r ON r."userId" = u."id"
      WHERE r."role" = 'OWNER'
      GROUP BY u."id"
      ORDER BY lower(u."email")
    `);
    await client.query("COMMIT");

    if (result.rowCount === 0) {
      process.stdout.write(
        "No OWNER accounts were found in the local database.\n",
      );
      return;
    }

    process.stdout.write(
      "Owner login account information (password omitted):\n",
    );
    for (const owner of result.rows) {
      process.stdout.write(
        JSON.stringify({
          email: owner.email,
          roles: owner.roles,
          status: owner.status,
          recoveryEmailVerified: owner.emailVerifiedAt !== null,
          mustChangePassword: owner.mustChangePassword,
        }) + "\n",
      );
    }
    process.stdout.write(
      "The database stores password hashes, not recoverable passwords. Use the password reset flow or the temporary password shown when the account was created.\n",
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    if (connected) await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`Could not read owner account info: ${error.message}\n`);
  process.exitCode = 1;
});
