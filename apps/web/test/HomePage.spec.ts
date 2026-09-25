import { describe, it, expect } from "vitest";
import { locales } from "@schoolerp/i18n";

describe("Web Localization and Configuration", () => {
  it("loads English, Hindi, and Marathi translations correctly", () => {
    expect(locales.en.appName).toBe("SchoolERP India");
    expect(locales.hi.appName).toBe("स्कूल ईआरपी इंडिया");
    expect(locales.mr.appName).toBe("स्कूल ईआरपी इंडिया");
  });

  it("contains matching key structures across all three locales", () => {
    const enKeys = Object.keys(locales.en).sort();
    const hiKeys = Object.keys(locales.hi).sort();
    const mrKeys = Object.keys(locales.mr).sort();

    expect(enKeys).toEqual(hiKeys);
    expect(enKeys).toEqual(mrKeys);
  });
});
