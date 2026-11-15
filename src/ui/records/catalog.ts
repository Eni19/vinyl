import { mediaForLocale, type Portfolio } from "@/domain/entities/portfolio";
import type { Locale } from "@/domain/i18n/locale";
import { localize } from "@/domain/i18n/localized";

/**
 * The record collection: every project and every theme of the portfolio as a
 * vinyl record with a sleeve, a spine and two sides. Pure data, so the 3D
 * shelf, the HTML fallback and the tests all read the same thing.
 */

export type ThemeId = "research" | "experience" | "skills" | "contact";
export const THEME_IDS: ThemeId[] = ["research", "experience", "skills", "contact"];

/** Sleeve colours, from the owner's room and drawings. */
export const SLEEVES = {
  ink: { sleeve: "#1f2a8a", ink: "#f4f1ff", label: "#e8572a" },
  seafoam: { sleeve: "#7fd8cf", ink: "#13205e", label: "#1f2a8a" },
  orange: { sleeve: "#e8572a", ink: "#fff6ee", label: "#1f2a8a" },
  lilac: { sleeve: "#c9bfe6", ink: "#1b1f5e", label: "#e8572a" },
  lime: { sleeve: "#e1ef4a", ink: "#1b1f5e", label: "#1f2a8a" },
  paper: { sleeve: "#f3efe6", ink: "#1f2a8a", label: "#7fd8cf" },
  graphite: { sleeve: "#24242a", ink: "#f1f0ea", label: "#e1ef4a" },
} as const;
export type Sleeve = keyof typeof SLEEVES;

export interface Track {
  title: string;
}

export interface RecordSpec {
  id: string;
  kind: "project" | "theme";
  /** Catalogue number on the spine, like a real pressing ("ES-001"). */
  catalog: string;
  title: string;
  /** Second line on the cover: the kind of project or the theme's scope. */
  subtitle: string;
  sleeve: Sleeve;
  /** Artwork printed on the cover; type-only covers have none. */
  art?: { src: string; fit: "cover" | "contain" };
  /** Track list shown on the back cover: a project's highlights, a theme's items. */
  tracks: Track[];
  /** Where the record links to for the full story, if anywhere. */
  href?: string;
}

export interface CatalogLabels {
  themes: Record<ThemeId, { title: string; subtitle: string }>;
  kinds: Record<Portfolio["projects"][number]["kind"], string>;
}

const PROJECT_SLEEVES: Sleeve[] = ["ink", "seafoam", "orange", "lilac", "lime"];

/** The owner's drawings dress the theme records (ids from the gallery). */
const THEME_ART: Record<ThemeId, { drawing: string; sleeve: Sleeve }> = {
  research: { drawing: "tubarao", sleeve: "paper" },
  experience: { drawing: "rostos", sleeve: "lilac" },
  skills: { drawing: "sapos", sleeve: "seafoam" },
  contact: { drawing: "violao", sleeve: "ink" },
};

export function buildCatalog(portfolio: Portfolio, locale: Locale, labels: CatalogLabels): RecordSpec[] {
  const t = (value: Parameters<typeof localize>[0]) => localize(value, locale);
  const drawing = (id: string) => portfolio.gallery.find((a) => a.id === id);

  const projects: RecordSpec[] = portfolio.projects.map((p, i) => {
    const cover = mediaForLocale(p.media, locale).find((m) => m.width < 900) ?? mediaForLocale(p.media, locale)[0];
    return {
      id: p.id,
      kind: "project",
      catalog: `ES-${String(i + 1).padStart(3, "0")}`,
      title: t(p.title).split(/:\s/)[0],
      subtitle: labels.kinds[p.kind],
      sleeve: PROJECT_SLEEVES[i % PROJECT_SLEEVES.length],
      art: cover ? { src: cover.src, fit: "cover" } : undefined,
      tracks: p.highlights.map((h) => ({ title: t(h) })),
      href: `/${locale}/projects/${p.id}`,
    };
  });

  const themeTracks: Record<ThemeId, Track[]> = {
    research: [
      ...portfolio.publications.map((p) => ({ title: t(p.title) })),
      ...portfolio.experiences.filter((e) => e.kind === "research").map((e) => ({ title: t(e.role) })),
    ],
    experience: [...portfolio.experiences]
      .sort((a, b) => b.period.start.localeCompare(a.period.start))
      .map((e) => ({ title: `${t(e.role)} · ${e.organization}` })),
    skills: portfolio.skillCategories.map((c) => ({ title: t(c.label) })),
    contact: portfolio.profile.contacts.filter((c) => c.showOnSite).map((c) => ({ title: c.value })),
  };

  const themes: RecordSpec[] = THEME_IDS.map((id, i) => {
    const art = drawing(THEME_ART[id].drawing);
    return {
      id,
      kind: "theme",
      catalog: `ES-${String(projects.length + i + 1).padStart(3, "0")}`,
      title: labels.themes[id].title,
      subtitle: labels.themes[id].subtitle,
      sleeve: THEME_ART[id].sleeve,
      art: art ? { src: art.media.src, fit: "cover" } : undefined,
      tracks: themeTracks[id],
    };
  });

  return [...projects, ...themes];
}

/** Where each record stands on the shelf: spines side by side, a gap between projects and themes. */
export function shelfSlots(records: RecordSpec[], spine = 0.11, gap = 0.5): number[] {
  const slots: number[] = [];
  let x = 0;
  records.forEach((record, i) => {
    if (i > 0 && record.kind !== records[i - 1].kind) x += gap;
    slots.push(x);
    x += spine;
  });
  const width = x - spine;
  return slots.map((s) => Math.round((s - width / 2) * 1e6) / 1e6);
}
