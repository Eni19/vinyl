import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { mediaForLocale, type Project } from "@/domain/entities/portfolio";
import { formatDecimal, formatGain, formatMonth, formatPeriod } from "@/ui/format";
import { ArrowIcon, ExternalLinks, Highlights, SkillList, translator, type SectionProps } from "@/ui/panels/shared";
import type { ThemeId } from "./catalog";

type Sides = { a: ReactNode; b: ReactNode };

/** A side's track list, numbered the way records are: A1, A2… B1. */
function Tracks({ items, side }: { items: string[]; side: "A" | "B" }) {
  return (
    <ol className="tracks">
      {items.map((item, i) => (
        <li key={item}>
          <span className="track-no">{`${side}${i + 1}`}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function projectSides(project: Project, { portfolio, dict, locale }: SectionProps): Sides {
  const t = translator(locale);
  const media = mediaForLocale(project.media, locale);
  return {
    a: (
      <>
        <p className="liner-lede">{t(project.summary)}</p>
        <Tracks items={project.highlights.map(t)} side="A" />
        <ExternalLinks links={project.links} dict={dict} />
      </>
    ),
    b: (
      <>
        <h3 className="liner-section">{dict.records.credits}</h3>
        <SkillList skillIds={project.skillIds} portfolio={portfolio} locale={locale} />
        {media.slice(0, 2).map((m) => (
          <figure key={m.src} className="liner-figure">
            <Image src={m.src} alt={t(m.alt)} width={m.width} height={m.height} sizes="(max-width: 860px) 92vw, 40vw" />
            {m.caption && <figcaption>{t(m.caption)}</figcaption>}
          </figure>
        ))}
        <p>
          <Link className="text-link" href={`/${locale}/projects/${project.id}`}>
            {dict.records.fullStory}
            <ArrowIcon />
          </Link>
        </p>
      </>
    ),
  };
}

function researchSides({ portfolio, dict, locale }: SectionProps): Sides {
  const t = translator(locale);
  const studies = portfolio.experiences.filter((e) => e.kind === "research");
  return {
    a: (
      <>
        {portfolio.publications.map((paper) => {
          const venue = paper.venue.includes(String(paper.year)) ? paper.venue : `${paper.venue} ${paper.year}`;
          return (
            <div key={paper.id} className="liner-block">
              <h3 className="liner-section">{t(paper.title)}</h3>
              <p className="muted">{dict.research.published.replace("{venue}", venue)}</p>
              <Highlights items={paper.highlights} locale={locale} />
              {paper.comparisons.length > 0 && (
                <figure className="chart">
                  {paper.comparisons.map((c) => {
                    const max = Math.max(c.baseline.value, c.result.value, 1);
                    return (
                      <div key={c.metric.pt}>
                        <p className="chart-head">
                          <span>{t(c.metric)}</span>
                          <strong>{formatGain(c.baseline.value, c.result.value, locale)}</strong>
                        </p>
                        {[
                          { ...c.result, isResult: true },
                          { ...c.baseline, isResult: false },
                        ].map((row) => (
                          <p key={row.name} className={["bar", row.isResult && "is-result"].filter(Boolean).join(" ")}>
                            <span>{row.name}</span>
                            <span className="bar-track">
                              <span
                                className="bar-fill"
                                style={{ "--value": row.value / max } as React.CSSProperties}
                              />
                            </span>
                            <span>{formatDecimal(row.value, locale)}</span>
                          </p>
                        ))}
                      </div>
                    );
                  })}
                </figure>
              )}
              {paper.url && (
                <p>
                  <a className="button" href={paper.url} target="_blank" rel="noreferrer">
                    {dict.research.read}
                    <ArrowIcon />
                  </a>
                </p>
              )}
            </div>
          );
        })}
      </>
    ),
    b: (
      <>
        {studies.map((study) => (
          <div key={study.id} className="liner-block">
            <h3 className="liner-section">{t(study.role)}</h3>
            <p className="muted">
              {study.organization} · {formatPeriod(study.period, locale, dict.experience.ongoing)}
            </p>
            <Highlights items={study.highlights} locale={locale} />
            <SkillList skillIds={study.skillIds} portfolio={portfolio} locale={locale} />
          </div>
        ))}
      </>
    ),
  };
}

function experienceSides({ portfolio, dict, locale }: SectionProps): Sides {
  const t = translator(locale);
  const roles = [...portfolio.experiences].sort((a, b) => b.period.start.localeCompare(a.period.start));
  return {
    a: (
      <ol className="roles">
        {roles.map((role) => (
          <li key={role.id} className="liner-block">
            <p className="muted">{formatPeriod(role.period, locale, dict.experience.ongoing)}</p>
            <h3 className="liner-section">{t(role.role)}</h3>
            <p className="role-org">{role.organization}</p>
            <Highlights items={role.highlights} locale={locale} />
          </li>
        ))}
      </ol>
    ),
    b: (
      <div className="facts">
        <div>
          <h3 className="liner-section">{dict.experience.education}</h3>
          <ul>
            {portfolio.education.map((e) => (
              <li key={e.id}>
                {t(e.degree)}
                <span className="muted">
                  {e.institution}
                  {e.status === "in-progress" ? ` · ${dict.experience.inProgress}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="liner-section">{dict.experience.courses}</h3>
          <ul>
            {portfolio.courses.map((c) => (
              <li key={c.id}>
                {t(c.name)}
                <span className="muted">
                  {c.issuer} ·{" "}
                  {c.status === "in-progress"
                    ? dict.experience.inProgress
                    : c.completedAt
                      ? formatMonth(c.completedAt, locale)
                      : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="liner-section">{dict.experience.languages}</h3>
          <ul>
            {portfolio.languages.map((l) => (
              <li key={l.name.pt}>
                {t(l.name)}
                <span className="muted">{dict.experience.levels[l.level]}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    ),
  };
}

function skillsSides({ portfolio, locale }: SectionProps): Sides {
  const t = translator(locale);
  const half = Math.ceil(portfolio.skillCategories.length / 2);
  const column = (categories: typeof portfolio.skillCategories, side: "A" | "B") => (
    <div className="skill-columns">
      {categories.map((category) => (
        <div key={category.id}>
          <h3 className="liner-section">{t(category.label)}</h3>
          <Tracks
            items={portfolio.skills.filter((s) => s.categoryId === category.id).map((s) => t(s.name))}
            side={side}
          />
        </div>
      ))}
    </div>
  );
  return {
    a: column(portfolio.skillCategories.slice(0, half), "A"),
    b: column(portfolio.skillCategories.slice(half), "B"),
  };
}

function contactSides({ portfolio, dict }: SectionProps): Sides {
  const { contacts } = portfolio.profile;
  const email = contacts.find((c) => c.kind === "email");
  const social = contacts.filter((c) => c.showOnSite && c.url && c.kind !== "email");
  return {
    a: (
      <>
        <p className="liner-lede">{dict.contact.lede}</p>
        {email?.url && (
          <p className="contact-email">
            <a href={email.url}>{email.value}</a>
          </p>
        )}
        <ul className="links">
          {social.map((c) => (
            <li key={c.kind}>
              <a className="text-link" href={c.url} target="_blank" rel="noreferrer">
                {c.value}
                <ArrowIcon />
              </a>
            </li>
          ))}
        </ul>
      </>
    ),
    b: (
      <>
        <p className="liner-lede">{dict.hero.lede}</p>
        <p>{dict.records.offRecord}</p>
      </>
    ),
  };
}

/** Side A and side B of every record, keyed by record id. */
export function linerNotes(props: SectionProps): Record<string, Sides> {
  const themes: Record<ThemeId, Sides> = {
    research: researchSides(props),
    experience: experienceSides(props),
    skills: skillsSides(props),
    contact: contactSides(props),
  };
  return {
    ...Object.fromEntries(props.portfolio.projects.map((p) => [p.id, projectSides(p, props)])),
    ...themes,
  };
}
