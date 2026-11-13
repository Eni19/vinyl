import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, isLocale, negotiateLocale } from "./locale";

describe("isLocale", () => {
  it("accepts supported locales only", () => {
    expect(isLocale("pt")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("es")).toBe(false);
    expect(isLocale("pt-BR")).toBe(false);
  });
});

describe("negotiateLocale", () => {
  it("falls back to the default without a header", () => {
    expect(negotiateLocale(null)).toBe(DEFAULT_LOCALE);
    expect(negotiateLocale("")).toBe(DEFAULT_LOCALE);
  });

  it("matches regional tags by primary language", () => {
    expect(negotiateLocale("en-US,en;q=0.9")).toBe("en");
    expect(negotiateLocale("pt-BR")).toBe("pt");
  });

  it("respects quality weights over header order", () => {
    expect(negotiateLocale("pt;q=0.5,en;q=0.8")).toBe("en");
  });

  it("skips unsupported languages", () => {
    expect(negotiateLocale("fr-FR,de;q=0.9,en;q=0.3")).toBe("en");
    expect(negotiateLocale("fr,de")).toBe(DEFAULT_LOCALE);
  });

  it("ignores languages with q=0", () => {
    expect(negotiateLocale("en;q=0,pt;q=0.1")).toBe("pt");
  });
});
