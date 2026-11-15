import { describe, expect, it } from "vitest";
import { PortfolioSchema } from "@/domain/entities/portfolio";
import { missingLocales } from "@/domain/i18n/localized";
import { buildResume } from "@/domain/resume/build-resume";
import { defaultSelection } from "@/domain/resume/selection";
import { THEME_IDS, buildCatalog } from "@/ui/records/catalog";
import { portfolioSources } from "./index";

// Guards the real content: a typo in a JSON file fails CI instead of the site.
describe.each(Object.entries(portfolioSources))("content/%s", (slug, source) => {
  const parsed = PortfolioSchema.safeParse(source);

  it("is a valid portfolio registered under its own slug", () => {
    expect(parsed.error?.issues ?? []).toEqual([]);
    expect(parsed.data?.profile.slug).toBe(slug);
  });

  it("is fully translated", () => {
    const untranslated: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}.${i}`));
      else if (value && typeof value === "object") {
        if ("pt" in value && missingLocales(value as { pt: string }).length > 0) untranslated.push(path);
        for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
      }
    };
    walk(source, slug);
    expect(untranslated).toEqual([]);
  });

  it("presses a full record collection in every locale", () => {
    const labels = {
      themes: Object.fromEntries(THEME_IDS.map((id) => [id, { title: id, subtitle: id }])) as never,
      kinds: { personal: "p", academic: "a", research: "r", professional: "w" },
    };
    for (const locale of ["pt", "en"] as const) {
      const records = buildCatalog(parsed.data!, locale, labels);
      expect(new Set(records.map((r) => r.id)).size).toBe(records.length);
      for (const record of records) {
        expect(record.tracks.length, `${record.id} has no tracks`).toBeGreaterThan(0);
      }
      // Every theme record is dressed in one of the owner's drawings.
      for (const theme of records.filter((r) => r.kind === "theme")) {
        expect(theme.art?.src, `${theme.id} has no artwork`).toMatch(/^\/art\//);
      }
    }
  });

  it("builds a resume in every locale", () => {
    for (const locale of ["pt", "en"] as const) {
      expect(() => buildResume(parsed.data!, defaultSelection(parsed.data!, locale))).not.toThrow();
    }
  });
});
