import { z } from "zod";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./locale";

/**
 * Text that exists in every supported locale. The default locale is required;
 * the others fall back to it until translated.
 */
export const LocalizedStringSchema = z
  .object({
    pt: z.string().min(1),
    en: z.string().min(1).optional(),
  })
  .strict();

export type LocalizedString = z.infer<typeof LocalizedStringSchema>;

export function localize(value: LocalizedString, locale: Locale): string {
  return value[locale] ?? value[DEFAULT_LOCALE] ?? value.pt;
}

/** Locales that still fall back to the default for this value. */
export function missingLocales(value: LocalizedString): Locale[] {
  return LOCALES.filter((locale) => !value[locale]);
}
