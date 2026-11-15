import { describe, expect, it } from "vitest";
import { formatDecimal, formatGain, formatMonth, formatPeriod } from "./format";

describe("formatMonth", () => {
  it("writes a short month and the year in each locale", () => {
    expect(formatMonth("2023-06", "pt")).toBe("jun 2023");
    expect(formatMonth("2024-01", "en")).toBe("Jan 2024");
  });
});

describe("formatPeriod", () => {
  it("joins start and end", () => {
    expect(formatPeriod({ start: "2023-06", end: "2024-01" }, "pt", "atual")).toBe("jun 2023 – jan 2024");
  });

  it("uses the ongoing label when there is no end", () => {
    expect(formatPeriod({ start: "2025-01" }, "en", "present")).toBe("Jan 2025 – present");
  });
});

describe("formatGain", () => {
  it("matches the paper's rounded gains", () => {
    expect(formatGain(0.7467, 0.9278, "en")).toBe("+24.3%");
    expect(formatGain(0.4471, 0.5032, "pt")).toBe("+12,5%");
  });

  it("marks losses with a minus sign", () => {
    expect(formatGain(1, 0.5, "en")).toBe("−50%");
  });
});

describe("formatDecimal", () => {
  it("uses the locale's decimal separator", () => {
    expect(formatDecimal(0.5032, "pt")).toBe("0,5032");
    expect(formatDecimal(0.5, "en")).toBe("0.50");
  });
});
