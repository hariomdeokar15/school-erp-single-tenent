import { describe, it, expect } from "vitest";
import { locales } from "@schoolerp/i18n";

describe("Mobile Application Localization", () => {
  it("has identical keys for English, Hindi, and Marathi", () => {
    const keysEn = Object.keys(locales.en).sort();
    const keysHi = Object.keys(locales.hi).sort();
    const keysMr = Object.keys(locales.mr).sort();

    expect(keysEn).toEqual(keysHi);
    expect(keysEn).toEqual(keysMr);
  });
});
