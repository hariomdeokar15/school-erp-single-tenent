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

@Injectable()
export class AuthMailService {
  private readonly testMessages: AuthEmailMessage[] = [];

  constructor(private readonly config: ConfigService) {
    if (
      config.get<string>("environment") === "production" &&
      config.get<string>("email.transport") === "test"
    ) {
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
    const apiKey = this.config.get<string>("email.brevoApiKey");
    const sender = this.config.get<string>("email.senderEmail");
    if (!allowLive || !retentionConfirmed || !apiKey || !sender) {
      throw Object.assign(
        new Error("email_live_transport_not_approved_or_configured"),
        { retryable: false },
      );
    }
    const subject = this.subject(message.kind, message.language);
    const textContent = this.body(message);
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: sender,
          name: this.config.get<string>("email.senderName") || "SchoolERP",
        },
        to: [{ email: message.recipient, contactPixelTrackingConsent: false }],
        subject,
        textContent,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const error = new Error(`brevo_http_${response.status}`);
      Object.assign(error, {
        retryable: response.status === 429 || response.status >= 500,
      });
      throw error;
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
}
