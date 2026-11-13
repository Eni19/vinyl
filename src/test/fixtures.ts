import { PortfolioSchema, type Portfolio, type PortfolioInput } from "@/domain/entities/portfolio";

/** A small, valid portfolio. Override any top-level key per test. */
export function portfolioInput(overrides: Partial<PortfolioInput> = {}): PortfolioInput {
  return {
    schemaVersion: 1,
    profile: {
      slug: "ada",
      name: "Ada Lovelace",
      headline: { pt: "Programadora", en: "Programmer" },
      summary: [{ pt: "Escrevo algoritmos.", en: "I write algorithms." }],
      contacts: [
        { kind: "email", value: "ada@example.com", url: "mailto:ada@example.com" },
        { kind: "phone", value: "+44 0000", showOnSite: false },
      ],
    },
    skillCategories: [
      { id: "lang", label: { pt: "Linguagens", en: "Languages" } },
      { id: "math", label: { pt: "Matemática", en: "Math" } },
    ],
    skills: [
      { id: "python", name: { pt: "Python" }, categoryId: "lang" },
      { id: "analysis", name: { pt: "Análise", en: "Analysis" }, categoryId: "math" },
      { id: "rust", name: { pt: "Rust" }, categoryId: "lang" },
    ],
    projects: [
      {
        id: "engine",
        title: { pt: "Máquina analítica", en: "Analytical engine" },
        kind: "research",
        summary: { pt: "Um computador." },
        highlights: [{ pt: "Primeiro algoritmo", en: "First algorithm" }],
        skillIds: ["analysis"],
        featured: true,
      },
      {
        id: "notes",
        title: { pt: "Notas" },
        kind: "personal",
        summary: { pt: "Notas sobre a máquina." },
        highlights: [],
        skillIds: ["python"],
      },
    ],
    experiences: [
      {
        id: "babbage",
        organization: "Babbage & Co",
        role: { pt: "Colaboradora", en: "Collaborator" },
        kind: "work",
        period: { start: "1842-01", end: "1843-12" },
        highlights: [{ pt: "Tradução comentada", en: "Annotated translation" }],
      },
    ],
    languages: [{ name: { pt: "Inglês", en: "English" }, level: "native" }],
    ...overrides,
  };
}

export function portfolio(overrides: Partial<PortfolioInput> = {}): Portfolio {
  return PortfolioSchema.parse(portfolioInput(overrides));
}
