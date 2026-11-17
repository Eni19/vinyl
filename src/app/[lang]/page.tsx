import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_OWNER_SLUG } from "@/config/site";
import { isLocale, type Locale } from "@/domain/i18n/locale";
import { portfolioRepository } from "@/infrastructure/container";
import { buildCatalog } from "@/ui/records/catalog";
import { Credits, Intro } from "@/ui/records/Intro";
import { linerNotes } from "@/ui/records/LinerNotes";
import { Shelf } from "@/ui/records/Shelf";
import { getDictionary } from "./dictionaries";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [portfolio, dict] = await Promise.all([portfolioRepository.findBySlug(SITE_OWNER_SLUG), getDictionary(lang)]);
  if (!portfolio) notFound();

  const props = { portfolio, dict, locale: lang };
  const other: Locale = lang === "pt" ? "en" : "pt";
  const records = buildCatalog(portfolio, lang, { themes: dict.records.themes, kinds: dict.projects.kind });
  const r = dict.records;

  return (
    <>
      <a className="skip-link" href="#content">
        {dict.nav.skip}
      </a>
      <Link className="lang-switch" href={`/${other}`} hrefLang={other} aria-label={dict.nav.switchLanguageLabel}>
        {dict.nav.switchLanguage}
      </Link>
      <main id="content">
        <Shelf
          records={records}
          intro={<Intro {...props} />}
          credits={<Credits dict={dict} />}
          notes={linerNotes(props)}
          switcher={
            <Link className="liner-lang" href={`/${other}`} hrefLang={other} aria-label={dict.nav.switchLanguageLabel}>
              {dict.nav.switchLanguage}
            </Link>
          }
          labels={{
            shelf: r.shelf,
            sideA: r.sideA,
            sideB: r.sideB,
            back: r.back,
            next: r.next,
            previous: r.previous,
            hint: r.hint,
            hintTouch: r.hintTouch,
            play: r.play,
            explore: r.explore,
          }}
        />
      </main>
    </>
  );
}
