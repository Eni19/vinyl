import { describe, expect, it } from "vitest";
import { LocalizedStringSchema, localize, missingLocales } from "./localized";

describe("localize", () => {
  it("returns the requested locale when present", () => {
    expect(localize({ pt: "Olá", en: "Hello" }, "en")).toBe("Hello");
  });

  it("falls back to Portuguese when a translation is missing", () => {
    expect(localize({ pt: "Olá" }, "en")).toBe("Olá");
  });
});

describe("LocalizedStringSchema", () => {
  it("requires the default locale", () => {
    expect(LocalizedStringSchema.safeParse({ en: "Hello" }).success).toBe(false);
  });

  it("rejects unknown locales", () => {
    expect(LocalizedStringSchema.safeParse({ pt: "Olá", es: "Hola" }).success).toBe(false);
  });
});

describe("missingLocales", () => {
  it("lists locales that still need a translation", () => {
    expect(missingLocales({ pt: "Olá" })).toEqual(["en"]);
    expect(missingLocales({ pt: "Olá", en: "Hello" })).toEqual([]);
  });
});
