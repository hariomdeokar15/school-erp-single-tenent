import { describe, it, expect } from "vitest";
import { validateEnvironment } from "../src/config/validation";

describe("API Configuration Validation", () => {
  it("validates default development environment variables", () => {
    const valid = validateEnvironment({
      NODE_ENV: "development",
      PORT: "3000",
    });
    expect(valid.PORT).toBe(3000);
    expect(valid.NODE_ENV).toBe("development");
  });

  it("rejects invalid PORT type", () => {
    expect(() => validateEnvironment({ PORT: "invalid-port" })).toThrow();
  });
});
