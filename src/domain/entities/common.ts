import { z } from "zod";

/** Stable, URL-safe identifier used for cross references ("pytorch", "rag-qa"). */
export const IdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use kebab-case: lowercase letters, digits and hyphens");

/** Calendar month in ISO form, e.g. "2023-06". */
export const YearMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "use YYYY-MM");

/** A period of time. A missing `end` means it is ongoing. */
export const PeriodSchema = z
  .object({
    start: YearMonthSchema,
    end: YearMonthSchema.optional(),
  })
  .strict()
  .refine((p) => !p.end || p.end >= p.start, { message: "end must not be before start" });

export type Period = z.infer<typeof PeriodSchema>;

export const LinkSchema = z
  .object({
    kind: z.enum(["live", "code", "paper", "other"]),
    url: z.url(),
  })
  .strict();

export type Link = z.infer<typeof LinkSchema>;
