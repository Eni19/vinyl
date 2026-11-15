import type { Period } from "@/domain/entities/common";
import type { Locale } from "@/domain/i18n/locale";

const INTL_LOCALE: Record<Locale, string> = { pt: "pt-BR", en: "en-US" };

export function intlLocale(locale: Locale): string {
  return INTL_LOCALE[locale];
}

/** "2023-06" → "jun 2023" / "Jun 2023". */
export function formatMonth(yearMonth: string, locale: Locale): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const label = new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(".", "");
  return `${label} ${year}`;
}

/** "jun 2023 – jan 2024", or "2025 – atual" style when ongoing. */
export function formatPeriod(period: Period, locale: Locale, ongoingLabel: string): string {
  const end = period.end ? formatMonth(period.end, locale) : ongoingLabel;
  return `${formatMonth(period.start, locale)} – ${end}`;
}

/** Relative gain of `result` over `baseline`, e.g. "+24%" / "+12,5%". */
export function formatGain(baseline: number, result: number, locale: Locale): string {
  const gain = ((result - baseline) / baseline) * 100;
  const rounded = Math.round(gain * 10) / 10;
  const text = new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 1 }).format(Math.abs(rounded));
  return `${rounded >= 0 ? "+" : "−"}${text}%`;
}

export function formatDecimal(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(
    value,
  );
}
