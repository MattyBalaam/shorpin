// App-wide visual styles (typography, shape, borders, focus treatment). These
// are independent of a list's palette: every style paints with
// `vars.palette.*`, so per-list colours carry through whichever is chosen.

export const appStyles = {
  classic: {
    label: "Classic",
    description: "The original Shorpin look",
  },
  minimal: {
    label: "Minimal",
    description: "Clean, quiet and stylish",
  },
  "user-agent": {
    label: "User agent",
    description: "Your browser's own default styles",
  },
  brutalist: {
    label: "Brutalist",
    description: "Hard edges, heavy borders, no apologies",
  },
  "gov-uk": {
    label: "GOV.UK",
    description: "Plain, accessible, public-service",
  },
  y2k: {
    label: "Y2K",
    description: "Glossy, bubbly, millennium-ready",
  },
  myspace: {
    label: "MySpace",
    description: "Tiled, bevelled, Top 8 energy",
  },
} as const;

export type AppStyle = keyof typeof appStyles;

export const DEFAULT_APP_STYLE: AppStyle = "classic";

export const APP_STYLE_COOKIE = "shorpin-style";

/** The attribute that scopes a style, on `<html>` and on preview cards. */
export const APP_STYLE_ATTRIBUTE = "data-app-style";

export function isAppStyle(value: unknown): value is AppStyle {
  return typeof value === "string" && Object.hasOwn(appStyles, value);
}

// The account's style lives on its profile (`profiles.app_style`); this
// cookie only caches it so the server can render <html> in it without a
// lookup on every request. Sign-out expires it, so signed-out pages and the
// next person on a shared device get the default.

/** The cached style, or null when there's no (valid) cookie to go on. */
export function readAppStyleCookie(cookieHeader: string | null | undefined): AppStyle | null {
  const value = cookieHeader
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === APP_STYLE_COOKIE)?.[1];
  return isAppStyle(value) ? value : null;
}

/** Reads the chosen style from a `Cookie` header or `document.cookie`. */
export function parseAppStyle(cookieHeader: string | null | undefined): AppStyle {
  return readAppStyleCookie(cookieHeader) ?? DEFAULT_APP_STYLE;
}

const ONE_YEAR = 60 * 60 * 24 * 365;

/** A `Set-Cookie`/`document.cookie` value; null expires the cookie. */
export function serializeAppStyleCookie(style: AppStyle | null) {
  return style
    ? `${APP_STYLE_COOKIE}=${style}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`
    : `${APP_STYLE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
