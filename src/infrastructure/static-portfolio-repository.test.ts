import { describe, expect, it } from "vitest";
import { portfolioInput } from "@/test/fixtures";
import { InvalidPortfolioError, StaticPortfolioRepository } from "./static-portfolio-repository";

describe("StaticPortfolioRepository", () => {
  it("returns a validated portfolio by slug", async () => {
    const repo = new StaticPortfolioRepository({ ada: portfolioInput() });
    const found = await repo.findBySlug("ada");
    expect(found?.profile.name).toBe("Ada Lovelace");
    expect(await repo.listSlugs()).toEqual(["ada"]);
  });

  it("returns null for an unknown slug, including inherited keys", async () => {
    const repo = new StaticPortfolioRepository({ ada: portfolioInput() });
    expect(await repo.findBySlug("grace")).toBeNull();
    expect(await repo.findBySlug("toString")).toBeNull();
  });

  it("explains what is wrong with invalid content", async () => {
    const input = portfolioInput();
    input.projects[0].skillIds = ["cobol"];
    const repo = new StaticPortfolioRepository({ ada: input });
    await expect(repo.findBySlug("ada")).rejects.toThrow(/unknown skill "cobol"/);
  });

  it("rejects content registered under a different slug", async () => {
    const repo = new StaticPortfolioRepository({ grace: portfolioInput() });
    await expect(repo.findBySlug("grace")).rejects.toBeInstanceOf(InvalidPortfolioError);
  });
});
