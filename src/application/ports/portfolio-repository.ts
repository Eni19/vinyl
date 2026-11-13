import type { Portfolio } from "@/domain/entities/portfolio";

/**
 * Where portfolios come from. Today: content files in the repo. Later: a
 * database with one portfolio per user. Callers never know which.
 */
export interface PortfolioRepository {
  findBySlug(slug: string): Promise<Portfolio | null>;
  listSlugs(): Promise<string[]>;
}
