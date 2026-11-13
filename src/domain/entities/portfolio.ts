import { z } from "zod";
import { LocalizedStringSchema } from "../i18n/localized";
import { IdSchema, LinkSchema, PeriodSchema, YearMonthSchema } from "./common";

export const ContactSchema = z
  .object({
    kind: z.enum(["email", "phone", "github", "linkedin", "website"]),
    value: z.string().min(1),
    url: z.url().optional(),
    /** Some contacts (a phone number) belong on the resume but not on the public site. */
    showOnSite: z.boolean().default(true),
  })
  .strict();

export const ProfileSchema = z
  .object({
    slug: IdSchema,
    name: z.string().min(1),
    headline: LocalizedStringSchema,
    summary: z.array(LocalizedStringSchema).min(1),
    location: LocalizedStringSchema.optional(),
    contacts: z.array(ContactSchema),
  })
  .strict();

export const SkillCategorySchema = z
  .object({
    id: IdSchema,
    label: LocalizedStringSchema,
  })
  .strict();

export const SkillSchema = z
  .object({
    id: IdSchema,
    name: LocalizedStringSchema,
    categoryId: IdSchema,
    /** Extra terms used to match this skill against a job description. */
    keywords: z.array(z.string().min(1)).default([]),
  })
  .strict();

export const ProjectSchema = z
  .object({
    id: IdSchema,
    title: LocalizedStringSchema,
    kind: z.enum(["personal", "academic", "research", "professional"]),
    summary: LocalizedStringSchema,
    highlights: z.array(LocalizedStringSchema),
    skillIds: z.array(IdSchema),
    links: z.array(LinkSchema).default([]),
    period: PeriodSchema.optional(),
    featured: z.boolean().default(false),
  })
  .strict();

export const ExperienceSchema = z
  .object({
    id: IdSchema,
    organization: z.string().min(1),
    role: LocalizedStringSchema,
    kind: z.enum(["work", "internship", "research", "extension", "volunteer"]),
    location: z.string().optional(),
    period: PeriodSchema,
    highlights: z.array(LocalizedStringSchema),
    skillIds: z.array(IdSchema).default([]),
  })
  .strict();

export const PublicationSchema = z
  .object({
    id: IdSchema,
    title: LocalizedStringSchema,
    venue: z.string().min(1),
    year: z.number().int().min(1900),
    url: z.url().optional(),
    highlights: z.array(LocalizedStringSchema).default([]),
    skillIds: z.array(IdSchema).default([]),
    projectId: IdSchema.optional(),
  })
  .strict();

export const EducationSchema = z
  .object({
    id: IdSchema,
    institution: z.string().min(1),
    degree: LocalizedStringSchema,
    status: z.enum(["in-progress", "completed"]),
    period: PeriodSchema.optional(),
  })
  .strict();

export const CourseSchema = z
  .object({
    id: IdSchema,
    name: LocalizedStringSchema,
    issuer: z.string().min(1),
    status: z.enum(["in-progress", "completed"]),
    completedAt: YearMonthSchema.optional(),
  })
  .strict();

export const SpokenLanguageSchema = z
  .object({
    name: LocalizedStringSchema,
    level: z.enum(["native", "fluent", "advanced", "intermediate", "basic"]),
  })
  .strict();

type Issue = { path: (string | number)[]; message: string };

function findDuplicateIds(items: { id: string }[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const { id } of items) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates];
}

export const PortfolioSchema = z
  .object({
    schemaVersion: z.literal(1),
    profile: ProfileSchema,
    skillCategories: z.array(SkillCategorySchema),
    skills: z.array(SkillSchema),
    projects: z.array(ProjectSchema),
    experiences: z.array(ExperienceSchema).default([]),
    publications: z.array(PublicationSchema).default([]),
    education: z.array(EducationSchema).default([]),
    courses: z.array(CourseSchema).default([]),
    languages: z.array(SpokenLanguageSchema).default([]),
  })
  .strict()
  .superRefine((portfolio, ctx) => {
    const issues: Issue[] = [];
    const collections = [
      "skillCategories",
      "skills",
      "projects",
      "experiences",
      "publications",
      "education",
      "courses",
    ] as const;

    for (const key of collections) {
      for (const id of findDuplicateIds(portfolio[key])) {
        issues.push({ path: [key], message: `duplicate id "${id}"` });
      }
    }

    const categoryIds = new Set(portfolio.skillCategories.map((c) => c.id));
    portfolio.skills.forEach((skill, i) => {
      if (!categoryIds.has(skill.categoryId)) {
        issues.push({ path: ["skills", i, "categoryId"], message: `unknown category "${skill.categoryId}"` });
      }
    });

    const skillIds = new Set(portfolio.skills.map((s) => s.id));
    for (const key of ["projects", "experiences", "publications"] as const) {
      portfolio[key].forEach((item, i) => {
        item.skillIds.forEach((skillId, j) => {
          if (!skillIds.has(skillId)) {
            issues.push({ path: [key, i, "skillIds", j], message: `unknown skill "${skillId}"` });
          }
        });
      });
    }

    const projectIds = new Set(portfolio.projects.map((p) => p.id));
    portfolio.publications.forEach((publication, i) => {
      if (publication.projectId && !projectIds.has(publication.projectId)) {
        issues.push({ path: ["publications", i, "projectId"], message: `unknown project "${publication.projectId}"` });
      }
    });

    for (const issue of issues) ctx.addIssue({ code: "custom", ...issue });
  });

/** Shape accepted when authoring content (defaults may be omitted). */
export type PortfolioInput = z.input<typeof PortfolioSchema>;
export type Portfolio = z.output<typeof PortfolioSchema>;
export type Profile = Portfolio["profile"];
export type Contact = Profile["contacts"][number];
export type Skill = Portfolio["skills"][number];
export type SkillCategory = Portfolio["skillCategories"][number];
export type Project = Portfolio["projects"][number];
export type Experience = Portfolio["experiences"][number];
export type Publication = Portfolio["publications"][number];
export type Education = Portfolio["education"][number];
export type Course = Portfolio["courses"][number];
export type SpokenLanguage = Portfolio["languages"][number];
