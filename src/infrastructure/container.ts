import { portfolioSources } from "@content/index";
import type { PortfolioRepository } from "@/application/ports/portfolio-repository";
import { StaticPortfolioRepository } from "./static-portfolio-repository";

/** Composition root: swap the implementation here when portfolios move to a database. */
export const portfolioRepository: PortfolioRepository = new StaticPortfolioRepository(portfolioSources);
