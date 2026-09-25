import { describe, it, expect } from "vitest";
import {
  formatToISTDate,
  formatPaiseToINR,
  formatIndianNumber,
  isValidEmail,
  isValidIndianMobileNumber,
} from "../src";

describe("Shared Utility Helpers", () => {
  it("formats dates in IST format", () => {
    const formatted = formatToISTDate("2026-09-24T00:00:00Z");
    expect(formatted).toBe("24/09/2026");
  });

  it("formats paise to INR currency display", () => {
    expect(formatPaiseToINR(500000)).toBe("₹5,000.00");
    expect(formatPaiseToINR(0)).toBe("₹0.00");
  });

  it("formats numbers in Indian numbering system", () => {
    expect(formatIndianNumber(100000)).toBe("1,00,000");
    expect(formatIndianNumber(10000000)).toBe("1,00,00,000");
  });

  it("validates email addresses correctly", () => {
    expect(isValidEmail("test@school.edu.in")).toBe(true);
    expect(isValidEmail("invalid-email")).toBe(false);
  });

  it("validates Indian mobile numbers correctly", () => {
    expect(isValidIndianMobileNumber("9876543210")).toBe(true);
    expect(isValidIndianMobileNumber("12345")).toBe(false);
  });
});
