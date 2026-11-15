import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { notFound } from "next/navigation";
import { SITE_OWNER_SLUG } from "@/config/site";
import { LOCALES, isLocale } from "@/domain/i18n/locale";
import { localize } from "@/domain/i18n/localized";
import { portfolioRepository } from "@/infrastructure/container";
import { getDictionary } from "./dictionaries";
import "../globals.css";

const sans = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-sans",
  display: "swap",
});

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  const [portfolio, dict] = await Promise.all([portfolioRepository.findBySlug(SITE_OWNER_SLUG), getDictionary(lang)]);
  if (!portfolio) return {};

  const { name, headline } = portfolio.profile;
  return {
    title: `${name} · ${localize(headline, lang)}`,
    description: dict.meta.description.replace("{name}", name),
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])) },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <html lang={lang === "pt" ? "pt-BR" : "en"} className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
