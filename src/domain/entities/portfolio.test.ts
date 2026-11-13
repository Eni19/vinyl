import { describe, expect, it } from "vitest";
import { portfolioInput } from "@/test/fixtures";
import { PeriodSchema } from "./common";
import { PortfolioSchema } from "./portfolio";

function issuesOf(input: unknown): string[] {
  const result = PortfolioSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
}

describe("PortfolioSchema", () => {
  it("accepts a valid portfolio and fills defaults", () => {
    const parsed = PortfolioSchema.parse(portfolioInput());
    expect(parsed.publications).toEqual([]);
    expect(parsed.projects[1].featured).toBe(false);
    expect(parsed.profile.contacts[0].showOnSite).toBe(true);
  });

  it("rejects duplicate ids in a collection", () => {
    const input = portfolioInput();
    input.skills.push({ id: "python", name: { pt: "Outro Python" }, categoryId: "lang" });
    expect(issuesOf(input)).toContain('skills: duplicate id "python"');
  });

  it("rejects skills in unknown categories", () => {
    const input = portfolioInput();
    input.skills[0].categoryId = "ghost";
    expect(issuesOf(input)).toContain('skills.0.categoryId: unknown category "ghost"');
  });

  it("rejects projects that reference unknown skills", () => {
    const input = portfolioInput();
    input.projects[0].skillIds = ["analysis", "cobol"];
    expect(issuesOf(input)).toContain('projects.0.skillIds.1: unknown skill "cobol"');
  });

  it("rejects publications linked to unknown projects", () => {
    const input = portfolioInput({
      publications: [{ id: "paper", title: { pt: "Artigo" }, venue: "X", year: 2020, projectId: "ghost" }],
    });
    expect(issuesOf(input)).toContain('publications.0.projectId: unknown project "ghost"');
  });

  it("rejects ids that are not kebab-case", () => {
    const input = portfolioInput();
    input.projects[0].id = "My Project";
    expect(issuesOf(input).some((i) => i.startsWith("projects.0.id"))).toBe(true);
  });
});

describe("PeriodSchema", () => {
  it("allows an open-ended period", () => {
    expect(PeriodSchema.safeParse({ start: "2025-01" }).success).toBe(true);
  });

  it("rejects an end before the start", () => {
    expect(PeriodSchema.safeParse({ start: "2025-03", end: "2024-12" }).success).toBe(false);
  });

  it("rejects malformed months", () => {
    expect(PeriodSchema.safeParse({ start: "2025-13" }).success).toBe(false);
  });
});
