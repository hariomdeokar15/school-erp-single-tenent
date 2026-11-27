import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { EmailOutboxKind } from "./entities/email-outbox.entity";

export interface EncryptedOutboxPayload {
  ciphertext: Buffer;
  nonce: Buffer;
  tag: Buffer;
  keyVersion: string;
}

@Injectable()
export class EmailOutboxCryptoService {
  private readonly keys = new Map<string, Buffer>();
  private readonly activeVersion: string;

  constructor(config: ConfigService) {
    this.activeVersion =
      config.get<string>("email.outboxActiveKeyVersion") || "";
    const rawKeys = config.get<string>("email.outboxKeys") || "";
    let parsed: Record<string, string>;
    try {
      parsed = rawKeys ? (JSON.parse(rawKeys) as Record<string, string>) : {};
    } catch {
      throw new Error("EMAIL_OUTBOX_KEYS must be a JSON object of base64 keys");
    }
    for (const [version, encoded] of Object.entries(parsed)) {
      if (!/^[a-zA-Z0-9._-]{1,32}$/.test(version)) {
        throw new Error("EMAIL_OUTBOX_KEYS contains an invalid key version");
      }
      const key = Buffer.from(encoded, "base64");
      if (key.length !== 32 || key.toString("base64") !== encoded) {
        throw new Error(
          `Outbox key ${version} must be canonical base64 for 32 bytes`,
        );
      }
      this.keys.set(version, key);
    }
    if (!this.activeVersion || !this.keys.has(this.activeVersion)) {
      throw new Error("The active email outbox encryption key is unavailable");
    }
  }

  encrypt(
    outboxId: string,
    userId: string,
    kind: EmailOutboxKind,
    emailVersion: number,
    plaintext: string,
  ): EncryptedOutboxPayload {
    const nonce = randomBytes(12);
    const cipher = createCipheriv(
      "aes-256-gcm",
      this.keys.get(this.activeVersion)!,
      nonce,
    );
    cipher.setAAD(this.aad(outboxId, userId, kind, emailVersion));
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    return {
      ciphertext,
      nonce,
      tag: cipher.getAuthTag(),
      keyVersion: this.activeVersion,
    };
  }

  decrypt(
    input: EncryptedOutboxPayload,
    outboxId: string,
    userId: string,
    kind: EmailOutboxKind,
    emailVersion: number,
  ): string {
    const key = this.keys.get(input.keyVersion);
    if (!key)
      throw new Error("Email outbox encryption key version is unavailable");
    const decipher = createDecipheriv("aes-256-gcm", key, input.nonce);
    decipher.setAAD(this.aad(outboxId, userId, kind, emailVersion));
    decipher.setAuthTag(input.tag);
    return Buffer.concat([
      decipher.update(input.ciphertext),
      decipher.final(),
    ]).toString("utf8");
  }

  private aad(
    id: string,
    userId: string,
    kind: EmailOutboxKind,
    emailVersion: number,
  ) {
    return Buffer.from(`${id}|${userId}|${kind}|${emailVersion}`, "utf8");
  }
}
