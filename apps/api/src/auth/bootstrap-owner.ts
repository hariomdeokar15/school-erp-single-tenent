import * as argon2 from "argon2";
import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";
import AppDataSource from "../database/data-source";
import { RoleAssignment } from "./entities/role-assignment.entity";
import { User, UserStatus } from "./entities/user.entity";
import { UserRole } from "@schoolerp/contracts";
import { AuditEvent } from "../audit/entities/audit-event.entity";

async function askPassword(prompt: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error(
      "Owner bootstrap requires an interactive terminal so the password is not echoed.",
    );
  }
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let password = "";
    const onData = (chunk: Buffer) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Owner bootstrap cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          stdout.write("\n");
          resolve(password);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          password = password.slice(0, -1);
        } else if (character >= " ") {
          password += character;
        }
      }
    };
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    const email = (await readline.question("Owner email: "))
      .trim()
      .toLowerCase();
    const displayName = (
      await readline.question("Owner display name: ")
    ).trim();
    readline.close();
    const password = await askPassword("Owner password (12+ characters): ");
    if (
      !email.includes("@") ||
      !displayName ||
      password.length < 12 ||
      password.length > 128
    ) {
      throw new Error(
        "Provide a valid email, display name, and password between 12 and 128 characters.",
      );
    }

    await AppDataSource.initialize();
    await AppDataSource.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock($1)", [93741028]);
      const ownerCount = await manager
        .getRepository(RoleAssignment)
        .count({ where: { role: UserRole.OWNER } });
      if (ownerCount > 0)
        throw new Error("An owner account is already provisioned.");
      const user = await manager.getRepository(User).save({
        email,
        displayName,
        passwordHash: await argon2.hash(password, {
          type: argon2.argon2id,
          memoryCost: 19_456,
          timeCost: 2,
          parallelism: 1,
        }),
        status: UserStatus.ACTIVE,
        mustChangePassword: false,
      });
      await manager
        .getRepository(RoleAssignment)
        .save({ userId: user.id, role: UserRole.OWNER });
      await manager.getRepository(AuditEvent).save({
        actorId: user.id,
        actorRole: UserRole.OWNER,
        action: "auth.bootstrap.owner.created",
        entityName: "user",
        entityId: user.id,
        metadata: null,
      });
    });
    stdout.write(
      "Owner account provisioned. Remove any temporary shell history and sign in through the web or mobile app.\n",
    );
  } finally {
    readline.close();
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  stdout.write(
    `${error instanceof Error ? error.message : "Owner provisioning failed."}\n`,
  );
  process.exitCode = 1;
});
