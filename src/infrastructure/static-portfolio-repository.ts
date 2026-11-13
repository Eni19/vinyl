import type { PortfolioRepository } from "@/application/ports/portfolio-repository";
import { PortfolioSchema, type Portfolio } from "@/domain/entities/portfolio";

export class InvalidPortfolioError extends Error {
  constructor(
    readonly slug: string,
    readonly details: string,
  ) {
    super(`Portfolio "${slug}" is invalid:\n${details}`);
    this.name = "InvalidPortfolioError";
  }
}

/**
 * Serves portfolios bundled with the app (the JSON files under /content).
 * Each source is validated once, on first read.
 */
export class StaticPortfolioRepository implements PortfolioRepository {
  private readonly cache = new Map<string, Portfolio>();

  constructor(private readonly sources: Record<string, unknown>) {}

  async findBySlug(slug: string): Promise<Portfolio | null> {
    if (!Object.hasOwn(this.sources, slug)) return null;

    const cached = this.cache.get(slug);
    if (cached) return cached;

    const result = PortfolioSchema.safeParse(this.sources[slug]);
    if (!result.success) {
      const details = result.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
      throw new InvalidPortfolioError(slug, details);
    }
    if (result.data.profile.slug !== slug) {
      throw new InvalidPortfolioError(slug, `- profile.slug: expected "${slug}", got "${result.data.profile.slug}"`);
    }

    this.cache.set(slug, result.data);
    return result.data;
  }

  async listSlugs(): Promise<string[]> {
    return Object.keys(this.sources);
  }
}
