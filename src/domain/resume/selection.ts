import { z } from "zod";
import { IdSchema } from "../entities/common";
import type { Portfolio } from "../entities/portfolio";
import { LOCALES } from "../i18n/locale";

/**
 * What a person picked for one job application. Order inside each list is the
 * order the items appear on the resume.
 */
export const ResumeSelectionSchema = z
  .object({
    locale: z.enum(LOCALES),
    /** Replaces the profile headline, e.g. the title of the job being applied to. */
    headline: z.string().min(1).optional(),
    /** Replaces the profile summary with text written for this application. */
    summary: z.array(z.string().min(1)).optional(),
    skillIds: z.array(IdSchema),
    projectIds: z.array(IdSchema),
    experienceIds: z.array(IdSchema),
    publicationIds: z.array(IdSchema),
    educationIds: z.array(IdSchema),
    courseIds: z.array(IdSchema),
    includeLanguages: z.boolean(),
  })
  .strict();

export type ResumeSelection = z.infer<typeof ResumeSelectionSchema>;

/** A sensible starting point: everything, with featured projects only. */
export function defaultSelection(portfolio: Portfolio, locale: ResumeSelection["locale"]): ResumeSelection {
  const featured = portfolio.projects.filter((p) => p.featured);
  return {
    locale,
    skillIds: portfolio.skills.map((s) => s.id),
    projectIds: (featured.length > 0 ? featured : portfolio.projects).map((p) => p.id),
    experienceIds: portfolio.experiences.map((e) => e.id),
    publicationIds: portfolio.publications.map((p) => p.id),
    educationIds: portfolio.education.map((e) => e.id),
    courseIds: portfolio.courses.map((c) => c.id),
    includeLanguages: true,
  };
}
