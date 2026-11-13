import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_OWNER_SLUG } from "@/config/site";
import { isLocale, type Locale } from "@/domain/i18n/locale";
import { localize } from "@/domain/i18n/localized";
import { portfolioRepository } from "@/infrastructure/container";
import { getDictionary } from "./dictionaries";

// Provisional page: proves content, i18n and routing end to end.
// The visual design is built in phase 1.
export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [portfolio, dict] = await Promise.all([portfolioRepository.findBySlug(SITE_OWNER_SLUG), getDictionary(lang)]);
  if (!portfolio) notFound();

  const t = (value: Parameters<typeof localize>[0]) => localize(value, lang);
  const otherLocale: Locale = lang === "pt" ? "en" : "pt";
  const { profile } = portfolio;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <nav className="flex justify-end">
        <Link href={`/${otherLocale}`} hrefLang={otherLocale} aria-label={dict.nav.switchLanguageLabel}>
          {dict.nav.switchLanguage}
        </Link>
      </nav>

      <h1 className="mt-12 text-5xl font-semibold tracking-tight">{profile.name}</h1>
      <p className="mt-4 text-xl">{t(profile.headline)}</p>
      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
        {profile.contacts
          .filter((c) => c.showOnSite && c.url)
          .map((c) => (
            <li key={c.kind}>
              <a href={c.url}>{c.value}</a>
            </li>
          ))}
      </ul>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold">{dict.home.projects}</h2>
        <ul className="mt-6 space-y-8">
          {portfolio.projects.map((project) => (
            <li key={project.id}>
              <h3 className="text-lg font-semibold">{t(project.title)}</h3>
              <p className="mt-1">{t(project.summary)}</p>
              <ul className="mt-2 flex gap-4">
                {project.links.map((link) => (
                  <li key={link.url}>
                    <a href={link.url}>{dict.links[link.kind]}</a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold">{dict.home.skills}</h2>
        <dl className="mt-6 space-y-4">
          {portfolio.skillCategories.map((category) => (
            <div key={category.id}>
              <dt className="font-semibold">{t(category.label)}</dt>
              <dd>
                {portfolio.skills
                  .filter((s) => s.categoryId === category.id)
                  .map((s) => t(s.name))
                  .join(", ")}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
