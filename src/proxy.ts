import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, negotiateLocale } from "@/domain/i18n/locale";

/** Sends requests without a locale prefix to the visitor's preferred language. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = LOCALES.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
  if (hasLocale) return;

  const locale = negotiateLocale(request.headers.get("accept-language"));
  request.nextUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Skip Next internals and any file with an extension (favicon.ico, images…).
  matcher: ["/((?!_next|.*\\.[^/]+$).*)"],
};
