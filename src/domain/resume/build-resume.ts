import type { Link, Period } from "../entities/common";
import type { Contact, Portfolio } from "../entities/portfolio";
import { localize } from "../i18n/localized";
import type { Locale } from "../i18n/locale";
import type { ResumeSelection } from "./selection";

/** Plain, already-localized data that a resume template renders. */
export interface Resume {
  locale: Locale;
  name: string;
  headline: string;
  contacts: Contact[];
  summary: string[];
  skillGroups: { category: string; skills: string[] }[];
  experiences: {
    organization: string;
    role: string;
    location?: string;
    period: Period;
    highlights: string[];
  }[];
  projects: { title: string; kind: Portfolio["projects"][number]["kind"]; highlights: string[]; links: Link[] }[];
  publications: { title: string; venue: string; year: number; url?: string; highlights: string[] }[];
  education: { institution: string; degree: string; status: "in-progress" | "completed"; period?: Period }[];
  courses: { name: string; issuer: string; status: "in-progress" | "completed"; completedAt?: string }[];
  languages: { name: string; level: Portfolio["languages"][number]["level"] }[];
}

export class UnknownSelectionError extends Error {
  constructor(readonly unknown: { collection: string; id: string }[]) {
    super(`Selection references unknown items: ${unknown.map((u) => `${u.collection}/${u.id}`).join(", ")}`);
    this.name = "UnknownSelectionError";
  }
}

function pick<T extends { id: string }>(
  collection: string,
  items: T[],
  ids: string[],
  unknown: { collection: string; id: string }[],
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const picked: T[] = [];
  for (const id of new Set(ids)) {
    const item = byId.get(id);
    if (item) picked.push(item);
    else unknown.push({ collection, id });
  }
  return picked;
}

/**
 * Turns a portfolio plus a selection into a resume. Items keep the order they
 * have in the selection; skills are grouped by category in portfolio order.
 */
export function buildResume(portfolio: Portfolio, selection: ResumeSelection): Resume {
  const { locale } = selection;
  const t = (value: Parameters<typeof localize>[0]) => localize(value, locale);
  const unknown: { collection: string; id: string }[] = [];

  const skills = pick("skills", portfolio.skills, selection.skillIds, unknown);
  const experiences = pick("experiences", portfolio.experiences, selection.experienceIds, unknown);
  const projects = pick("projects", portfolio.projects, selection.projectIds, unknown);
  const publications = pick("publications", portfolio.publications, selection.publicationIds, unknown);
  const education = pick("education", portfolio.education, selection.educationIds, unknown);
  const courses = pick("courses", portfolio.courses, selection.courseIds, unknown);

  if (unknown.length > 0) throw new UnknownSelectionError(unknown);

  const skillGroups = portfolio.skillCategories
    .map((category) => ({
      category: t(category.label),
      skills: skills.filter((s) => s.categoryId === category.id).map((s) => t(s.name)),
    }))
    .filter((group) => group.skills.length > 0);

  return {
    locale,
    name: portfolio.profile.name,
    headline: selection.headline ?? t(portfolio.profile.headline),
    contacts: portfolio.profile.contacts,
    summary: selection.summary ?? portfolio.profile.summary.map(t),
    skillGroups,
    experiences: experiences.map((e) => ({
      organization: e.organization,
      role: t(e.role),
      location: e.location,
      period: e.period,
      highlights: e.highlights.map(t),
    })),
    projects: projects.map((p) => ({
      title: t(p.title),
      kind: p.kind,
      highlights: p.highlights.map(t),
      links: p.links,
    })),
    publications: publications.map((p) => ({
      title: t(p.title),
      venue: p.venue,
      year: p.year,
      url: p.url,
      highlights: p.highlights.map(t),
    })),
    education: education.map((e) => ({
      institution: e.institution,
      degree: t(e.degree),
      status: e.status,
      period: e.period,
    })),
    courses: courses.map((c) => ({
      name: t(c.name),
      issuer: c.issuer,
      status: c.status,
      completedAt: c.completedAt,
    })),
    languages: selection.includeLanguages ? portfolio.languages.map((l) => ({ name: t(l.name), level: l.level })) : [],
  };
}
