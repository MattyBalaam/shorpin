// Light/dark choice for this device. "system" follows the OS preference (the
// default); light and dark pin `color-scheme` on <html>, which every
// light-dark() colour and system colour (Canvas, CanvasText) tracks.
//
// A device preference rather than an account one, so it lives only in a
// cookie: the server reads it to render <html> in the right scheme (no flash),
// and the toggle writes it client-side, so it works offline too.

export const colorSchemes = {
  system: { label: "Auto" },
  light: { label: "Light" },
  dark: { label: "Dark" },
} as const;

export type ColorScheme = keyof typeof colorSchemes;

export const DEFAULT_COLOR_SCHEME: ColorScheme = "system";

export const COLOR_SCHEME_COOKIE = "shorpin-color-scheme";

/** The attribute on `<html>` that pins the scheme (see reset.css.ts). */
export const COLOR_SCHEME_ATTRIBUTE = "data-color-scheme";

export function isColorScheme(value: unknown): value is ColorScheme {
  return typeof value === "string" && Object.hasOwn(colorSchemes, value);
}

/** Reads the chosen scheme from a `Cookie` header or `document.cookie`. */
export function parseColorScheme(cookieHeader: string | null | undefined): ColorScheme {
  const value = cookieHeader
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === COLOR_SCHEME_COOKIE)?.[1];
  return isColorScheme(value) ? value : DEFAULT_COLOR_SCHEME;
}

const ONE_YEAR = 60 * 60 * 24 * 365;

/** A `document.cookie` value; the default expires the cookie. */
export function serializeColorSchemeCookie(scheme: ColorScheme) {
  return scheme === DEFAULT_COLOR_SCHEME
    ? `${COLOR_SCHEME_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
    : `${COLOR_SCHEME_COOKIE}=${scheme}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`;
}
