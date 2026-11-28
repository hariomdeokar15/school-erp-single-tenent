import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import { EmailOutboxKind } from "./entities/email-outbox.entity";
import { AuthMailService } from "./auth-mail.service";

function config(email: Record<string, unknown>) {
  return new ConfigService({ environment: "test", email });
}

describe("AuthMailService", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps test transport non-delivering and stores messages only in memory", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const service = new AuthMailService(config({ transport: "test" }));
    await service.send({
      kind: EmailOutboxKind.PASSWORD_RESET,
      recipient: "person@example.test",
      link: "https://school.example/reset#token",
      language: "en",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(service.drainTestMessages()).toHaveLength(1);
  });

  it("sends localized content through Brevo API with the API key header", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const service = new AuthMailService(
      config({
        transport: "brevo",
        allowLive: true,
        sensitiveRetentionConfirmed: true,
        brevoApiKey: "server-api-key",
        senderEmail: "verified@example.test",
        senderName: "SchoolERP",
      }),
    );
    const link = "https://school.example/verify#token-123";
    await service.send({
      kind: EmailOutboxKind.VERIFY_EMAIL,
      recipient: "person@example.test",
      link,
      language: "en",
    });
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(request.headers["api-key"]).toBe("server-api-key");
    const body = JSON.parse(request.body);
    expect(body.sender.email).toBe("verified@example.test");
    expect(body.to[0].email).toBe("person@example.test");
    expect(body.textContent).toContain(link);
    expect(body.htmlContent).toContain(`href="${link}"`);
  });

  it("sanitizes API errors and marks invalid credentials as non-retryable", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ code: "unauthorized", message: "private details" }),
          { status: 401 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const service = new AuthMailService(
      config({
        transport: "brevo",
        allowLive: true,
        sensitiveRetentionConfirmed: true,
        brevoApiKey: "server-api-key",
        senderEmail: "verified@example.test",
      }),
    );
    await expect(
      service.send({
        kind: EmailOutboxKind.PASSWORD_RESET,
        recipient: "person@example.test",
        link: "https://school.example/reset#token",
        language: "en",
      }),
    ).rejects.toMatchObject({
      message: "brevo_http_401_unauthorized",
      retryable: false,
    });
  });
});
