import { describe, expect, it } from "vitest";
import { ConfigService } from "@nestjs/config";
import { EmailOutboxKind } from "./entities/email-outbox.entity";
import { EmailOutboxCryptoService } from "./email-outbox-crypto.service";

function cryptoService(keys: Record<string, string>, active: string) {
  const config = new ConfigService({
    email: {
      outboxKeys: JSON.stringify(keys),
      outboxActiveKeyVersion: active,
    },
  });
  return new EmailOutboxCryptoService(config);
}

describe("EmailOutboxCryptoService", () => {
  const keyV1 = Buffer.alloc(32, 1).toString("base64");
  const keyV2 = Buffer.alloc(32, 2).toString("base64");

  it("encrypts and decrypts with authenticated row binding", () => {
    const service = cryptoService({ v1: keyV1 }, "v1");
    const encrypted = service.encrypt(
      "outbox-1",
      "user-1",
      EmailOutboxKind.PASSWORD_RESET,
      7,
      "random-token",
    );
    expect(
      service.decrypt(
        encrypted,
        "outbox-1",
        "user-1",
        EmailOutboxKind.PASSWORD_RESET,
        7,
      ),
    ).toBe("random-token");
    expect(() =>
      service.decrypt(
        encrypted,
        "outbox-2",
        "user-1",
        EmailOutboxKind.PASSWORD_RESET,
        7,
      ),
    ).toThrow();
    expect(() =>
      service.decrypt(
        encrypted,
        "outbox-1",
        "user-1",
        EmailOutboxKind.PASSWORD_RESET,
        8,
      ),
    ).toThrow();
  });

  it("rejects ciphertext and tag tampering", () => {
    const service = cryptoService({ v1: keyV1 }, "v1");
    const encrypted = service.encrypt(
      "o",
      "u",
      EmailOutboxKind.VERIFY_EMAIL,
      1,
      "token",
    );
    const tampered = {
      ...encrypted,
      ciphertext: Buffer.from(encrypted.ciphertext),
    };
    tampered.ciphertext[0] ^= 1;
    expect(() =>
      service.decrypt(tampered, "o", "u", EmailOutboxKind.VERIFY_EMAIL, 1),
    ).toThrow();
    const tagTampered = { ...encrypted, tag: Buffer.from(encrypted.tag) };
    tagTampered.tag[0] ^= 1;
    expect(() =>
      service.decrypt(tagTampered, "o", "u", EmailOutboxKind.VERIFY_EMAIL, 1),
    ).toThrow();
  });

  it("decrypts old rows during rotation and encrypts new rows with the active key", () => {
    const oldService = cryptoService({ v1: keyV1 }, "v1");
    const oldRow = oldService.encrypt(
      "o",
      "u",
      EmailOutboxKind.PASSWORD_RESET,
      1,
      "old-token",
    );
    const rotated = cryptoService({ v1: keyV1, v2: keyV2 }, "v2");
    expect(
      rotated.decrypt(oldRow, "o", "u", EmailOutboxKind.PASSWORD_RESET, 1),
    ).toBe("old-token");
    const newRow = rotated.encrypt(
      "o2",
      "u",
      EmailOutboxKind.PASSWORD_RESET,
      1,
      "new-token",
    );
    expect(newRow.keyVersion).toBe("v2");
    expect(
      rotated.decrypt(newRow, "o2", "u", EmailOutboxKind.PASSWORD_RESET, 1),
    ).toBe("new-token");
  });
});
