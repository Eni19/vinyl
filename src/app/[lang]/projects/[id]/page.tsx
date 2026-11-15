import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_OWNER_SLUG } from "@/config/site";
import { mediaForLocale } from "@/domain/entities/portfolio";
import { isLocale } from "@/domain/i18n/locale";
import { localize } from "@/domain/i18n/localized";
import { portfolioRepository } from "@/infrastructure/container";
import { linerNotes } from "@/ui/records/LinerNotes";
import { ExternalLinks, Highlights, SkillList } from "@/ui/panels/shared";
import { getDictionary } from "../../dictionaries";

export async function generateStaticParams() {
  const portfolio = await portfolioRepository.findBySlug(SITE_OWNER_SLUG);
  return (portfolio?.projects ?? []).map((p) => ({ id: p.id }));
}

async function load(params: PageProps<"/[lang]/projects/[id]">["params"]) {
  const { lang, id } = await params;
  if (!isLocale(lang)) return null;
  const portfolio = await portfolioRepository.findBySlug(SITE_OWNER_SLUG);
  const index = portfolio?.projects.findIndex((p) => p.id === id) ?? -1;
  if (!portfolio || index < 0) return null;
  return { lang, portfolio, index, project: portfolio.projects[index] };
}

export async function generateMetadata({ params }: PageProps<"/[lang]/projects/[id]">): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const { lang, portfolio, project } = data;
  return {
    title: `${localize(project.title, lang)} · ${portfolio.profile.shortName ?? portfolio.profile.name}`,
    description: localize(project.summary, lang),
  };
}

export default async function ProjectPage({ params }: PageProps<"/[lang]/projects/[id]">) {
  const data = await load(params);
  if (!data) notFound();
  const { lang, portfolio, index, project } = data;
  const dict = await getDictionary(lang);
  const t = (value: Parameters<typeof localize>[0]) => localize(value, lang);
  const next = portfolio.projects[(index + 1) % portfolio.projects.length];
  const paper = portfolio.publications.find((p) => p.projectId === project.id);
  const props = { portfolio, dict, locale: lang };
  // "DLG / lab: data leakage from gradients" → a short title and its subtitle.
  const [title, subtitle] = t(project.title).split(/:\s(.+)/);

  return (
    <>
      <a className="skip-link" href="#content">
        {dict.nav.skip}
      </a>
      <nav className="page-bar" aria-label={dict.nav.label}>
        <Link className="text-link" href={`/${lang}#${project.id}`}>
          {dict.records.back}
        </Link>
        <Link className="lang-switch-inline" href={`/${lang === "pt" ? "en" : "pt"}/projects/${project.id}`}>
          {dict.nav.switchLanguage}
        </Link>
      </nav>
      <main id="content">
        <article aria-labelledby="project-title">
          <header className="project-hero">
            <h1 id="project-title">{title}</h1>
            {subtitle && <p className="project-subtitle">{subtitle}</p>}
            <div className="project-hero-side">
              <p className="project-summary">{t(project.summary)}</p>
              <ExternalLinks links={project.links} dict={dict} />
            </div>
          </header>

          {project.media.length > 0 && (
            <div className="project-media">
              {mediaForLocale(project.media, lang).map((m) => (
                <figure key={m.src} className={m.width < 900 ? "is-detail" : undefined}>
                  <Image src={m.src} alt={t(m.alt)} width={m.width} height={m.height} sizes="100vw" />
                  {m.caption && <figcaption>{t(m.caption)}</figcaption>}
                </figure>
              ))}
            </div>
          )}

          <div className="project-details">
            <section className="highlights-block" aria-labelledby="highlights-title">
              <h2 id="highlights-title" className="block-title">
                {dict.project.highlights}
              </h2>
              <div>
                <Highlights items={project.highlights} locale={lang} />
              </div>
              {paper && (
                <p className="paper-link">
                  {dict.project.paper}:{" "}
                  {paper.url ? (
                    <a className="text-link" href={paper.url} target="_blank" rel="noreferrer">
                      {t(paper.title)} ({paper.venue})
                    </a>
                  ) : (
                    `${t(paper.title)} (${paper.venue})`
                  )}
                </p>
              )}
            </section>
            <section className="skills-block" aria-labelledby="skills-used-title">
              <h2 id="skills-used-title" className="block-title">
                {dict.project.skills}
              </h2>
              <SkillList skillIds={project.skillIds} portfolio={portfolio} locale={lang} />
            </section>
          </div>
        </article>

        {next.id !== project.id && (
          <nav className="next-project" aria-label={dict.project.next}>
            <Link href={`/${lang}/projects/${next.id}`}>
              <span className="next-title">{t(next.title).split(/:\s/)[0]}</span>
              <span className="next-label">{dict.project.next}</span>
            </Link>
          </nav>
        )}
        <section className="page-contact" aria-labelledby="page-contact-title">
          <h2 id="page-contact-title" className="liner-title">
            {dict.records.themes.contact.title}
          </h2>
          {linerNotes(props).contact.a}
        </section>
      </main>
    </>
  );
}
