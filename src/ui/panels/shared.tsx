import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Link } from "@/domain/entities/common";
import type { Portfolio } from "@/domain/entities/portfolio";
import type { Locale } from "@/domain/i18n/locale";
import { localize, type LocalizedString } from "@/domain/i18n/localized";

export interface SectionProps {
  portfolio: Portfolio;
  dict: Dictionary;
  locale: Locale;
}

export function translator(locale: Locale) {
  return (value: LocalizedString) => localize(value, locale);
}

/** One sleeve colour per skill category, by category order. */
const CATEGORY_DOTS = ["#1f2a8a", "#4fbdb1", "#e8572a", "#b7a6e3", "#c6d43a", "#24242a"];

export function inkMap(portfolio: Portfolio): Map<string, string> {
  return new Map(portfolio.skillCategories.map((c, i) => [c.id, CATEGORY_DOTS[i % CATEGORY_DOTS.length]]));
}

export function ArrowIcon() {
  return (
    <svg className="arrow" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 12 12 4M5.5 4H12v6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
    </svg>
  );
}

export function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg className="chevron" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d={direction === "left" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function ExternalLinks({ links, dict }: { links: Link[]; dict: Dictionary }) {
  if (links.length === 0) return null;
  return (
    <ul className="links">
      {links.map((link) => (
        <li key={link.url}>
          <a className="text-link" href={link.url} target="_blank" rel="noreferrer">
            {dict.links[link.kind]}
            <ArrowIcon />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function SkillList({
  skillIds,
  portfolio,
  locale,
}: {
  skillIds: string[];
  portfolio: Portfolio;
  locale: Locale;
}) {
  const t = translator(locale);
  const inks = inkMap(portfolio);
  const skills = skillIds.map((id) => portfolio.skills.find((s) => s.id === id)).filter((s) => s !== undefined);
  return (
    <ul className="skill-list">
      {skills.map((skill) => (
        <li key={skill.id}>
          <span className="dot" style={{ "--dot": inks.get(skill.categoryId) } as React.CSSProperties} />
          {t(skill.name)}
        </li>
      ))}
    </ul>
  );
}

export function Highlights({ items, locale }: { items: LocalizedString[]; locale: Locale }) {
  if (items.length === 0) return null;
  const t = translator(locale);
  return (
    <ul className="highlights">
      {items.map((item) => (
        <li key={item.pt}>{t(item)}</li>
      ))}
    </ul>
  );
}
