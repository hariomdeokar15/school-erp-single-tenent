import { describe, it, expect } from "vitest";
import { locales } from "../src";

describe("i18n Dictionaries", () => {
  it("contains valid translations for all supported languages", () => {
    expect(locales.en.appName).toBe("SchoolERP India");
    expect(locales.hi.appName).toBe("स्कूल ईआरपी इंडिया");
    expect(locales.mr.appName).toBe("स्कूल ईआरपी इंडिया");
  });

  it("guarantees identical translation key structures across en, hi, and mr", () => {
    const enKeys = Object.keys(locales.en).sort();
    const hiKeys = Object.keys(locales.hi).sort();
    const mrKeys = Object.keys(locales.mr).sort();

    expect(enKeys).toEqual(hiKeys);
    expect(enKeys).toEqual(mrKeys);
  });
});
