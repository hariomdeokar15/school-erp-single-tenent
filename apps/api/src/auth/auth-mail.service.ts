import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailOutboxKind } from "./entities/email-outbox.entity";
import { locales, SupportedLanguage } from "@schoolerp/i18n";

export interface AuthEmailMessage {
  kind: EmailOutboxKind;
  recipient: string;
  link?: string;
  language: SupportedLanguage;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return replacements[character];
  });
}

@Injectable()
export class AuthMailService {
  private readonly testMessages: AuthEmailMessage[] = [];

  constructor(private readonly config: ConfigService) {
    const environment = config.get<string>("environment");
    const mode = config.get<string>("email.transport") || "test";
    if (environment === "production" && mode === "test") {
      throw new Error(
        "The non-delivering email sink is disabled in production",
      );
    }
  }

  async send(message: AuthEmailMessage): Promise<void> {
    const mode = this.config.get<string>("email.transport") || "test";
    if (mode === "test") {
      this.testMessages.push({ ...message });
      if (this.testMessages.length > 100) this.testMessages.shift();
      return;
    }

    const allowLive = this.config.get<boolean>("email.allowLive") === true;
    const retentionConfirmed =
      this.config.get<boolean>("email.sensitiveRetentionConfirmed") === true;
    const sender = this.config.get<string>("email.senderEmail");
    const senderName =
      this.config.get<string>("email.senderName") || "SchoolERP India";
    const apiKey = this.config.get<string>("email.brevoApiKey");
    if (!allowLive || !retentionConfirmed || !sender || !apiKey) {
      throw Object.assign(
        new Error("email_live_transport_not_approved_or_configured"),
        { retryable: false },
      );
    }

    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: senderName, email: sender },
          to: [{ email: message.recipient }],
          subject: this.subject(message.kind, message.language),
          textContent: this.body(message),
          htmlContent: this.html(message, senderName),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        let providerCode = "";
        const body: unknown = await response.json().catch(() => null);
        if (body && typeof body === "object" && "code" in body) {
          const code = (body as { code?: unknown }).code;
          if (typeof code === "string" && /^[A-Za-z0-9_.-]{1,36}$/.test(code)) {
            providerCode = `_${code.toLowerCase()}`;
          }
        }
        const error = Object.assign(
          new Error(`brevo_http_${response.status}${providerCode}`),
          { retryable: response.status === 429 || response.status >= 500 },
        );
        throw error;
      }
    } catch (error) {
      if (error instanceof Error && /^brevo_http_/.test(error.message))
        throw error;
      const cause =
        error instanceof Error
          ? (error as Error & { cause?: { code?: unknown } }).cause
          : undefined;
      const code =
        cause &&
        typeof cause.code === "string" &&
        /^[A-Z0-9_]{2,40}$/.test(cause.code)
          ? `email_network_${cause.code.toLowerCase()}`
          : error instanceof Error &&
              ["TimeoutError", "AbortError"].includes(error.name)
            ? "email_provider_timeout"
            : "email_provider_network_error";
      throw Object.assign(new Error(code), { retryable: true });
    }
  }

  /** In-memory only; exposed for non-delivering integration tests. */
  drainTestMessages(): AuthEmailMessage[] {
    return this.testMessages.splice(0);
  }

  private subject(kind: EmailOutboxKind, language: SupportedLanguage): string {
    const copy = locales[language];
    if (kind === EmailOutboxKind.VERIFY_EMAIL) return copy.emailVerifySubject;
    if (kind === EmailOutboxKind.PASSWORD_RESET) return copy.emailResetSubject;
    return copy.emailResetCompleteSubject;
  }

  private body(message: AuthEmailMessage): string {
    const copy = locales[message.language];
    const template =
      message.kind === EmailOutboxKind.VERIFY_EMAIL
        ? copy.emailVerifyBody
        : message.kind === EmailOutboxKind.PASSWORD_RESET
          ? copy.emailResetBody
          : copy.emailResetCompleteBody;
    return template.replace("{{link}}", message.link || "");
  }

  private html(message: AuthEmailMessage, senderName: string): string {
    const text = this.body(message);
    const safeLink = message.link ? escapeHtml(message.link) : "";
    const linkText = safeLink
      ? `<p style="margin:24px 0;text-align:center"><a href="${safeLink}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:13px 22px;border-radius:7px;font-weight:600">Open SchoolERP</a></p>`
      : "";
    const paragraphs = escapeHtml(text)
      .replace(/\n/g, "<br>")
      .replace(escapeHtml(message.link || ""), "");
    const year = new Date().getUTCFullYear();
    return `<!doctype html><html lang="${message.language}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#172033"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e5e7eb;border-radius:12px"><tr><td style="padding:30px 32px"><div style="font-size:18px;font-weight:700;color:#4f46e5;margin-bottom:24px">${escapeHtml(senderName)}</div><div style="font-size:15px;line-height:1.7;color:#374151">${paragraphs}</div>${linkText}<p style="margin-top:28px;font-size:12px;line-height:1.6;color:#6b7280">If the button does not work, copy the link from the plain-text version of this email.</p></td></tr></table><p style="font-size:12px;color:#6b7280">© ${year} SchoolERP</p></td></tr></table></body></html>`;
  }
}
