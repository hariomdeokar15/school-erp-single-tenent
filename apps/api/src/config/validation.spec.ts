import { describe, expect, it } from "vitest";
import { validateEnvironment } from "./validation";

describe("email environment validation", () => {
  it("allows SMTP placeholders while the non-delivering transport is selected", () => {
    const environment = validateEnvironment({
      BREVO_SENDER_EMAIL: "",
      EMAIL_TRANSPORT: "test",
    });

    expect(environment.BREVO_SENDER_EMAIL).toBeUndefined();
    expect(environment.EMAIL_TRANSPORT).toBe("test");
  });

  it("requires SMTP credentials and a sender before selecting live transport", () => {
    expect(() => validateEnvironment({ EMAIL_TRANSPORT: "brevo" })).toThrow(
      /BREVO_API_KEY/,
    );
  });
});
