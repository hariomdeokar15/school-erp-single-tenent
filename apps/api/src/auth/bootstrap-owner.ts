import * as argon2 from "argon2";
import { randomBytes } from "crypto";
import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";
import AppDataSource from "../database/data-source";
import { RoleAssignment } from "./entities/role-assignment.entity";
import { User, UserStatus } from "./entities/user.entity";
import { UserRole } from "@schoolerp/contracts";
import { AuditEvent } from "../audit/entities/audit-event.entity";

async function main() {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error(
      "Owner bootstrap requires an interactive terminal to display the generated temporary password once.",
    );
  }
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    const email = (await readline.question("Owner email: "))
      .trim()
      .toLowerCase();
    const displayName = (
      await readline.question("Owner display name: ")
    ).trim();
    readline.close();
    if (!email.includes("@") || !displayName) {
      throw new Error("Provide a valid email and display name.");
    }
    const temporaryPassword = randomBytes(24).toString("base64url");

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
        passwordHash: await argon2.hash(temporaryPassword, {
          type: argon2.argon2id,
          memoryCost: 19_456,
          timeCost: 2,
          parallelism: 1,
        }),
        status: UserStatus.ACTIVE,
        mustChangePassword: true,
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
      `Owner account provisioned for ${email}. Temporary password (shown once): ${temporaryPassword}\nChange it immediately after signing in.\n`,
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
