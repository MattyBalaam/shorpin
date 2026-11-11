import type { Context } from "hono";
import {
  type AppStyle,
  DEFAULT_APP_STYLE,
  isAppStyle,
  readAppStyleCookie,
  serializeAppStyleCookie,
} from "../lib/app-style.ts";
import { type ColorScheme, parseColorScheme } from "../lib/color-scheme.ts";
import { requestBackend } from "./backend.ts";
import { env } from "./env.ts";
import { type Flash, takeFlash } from "./flash.ts";
import type { Html } from "./html.ts";
import type { AppEnv, Supabase } from "./supabase.ts";
import { document, type DocumentOptions } from "./views/layout.ts";

/** The account's saved style, or null when signed out or unreadable. */
async function readAccountAppStyle(supabase: Supabase): Promise<AppStyle | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("app_style")
      .eq("id", user.id)
      .maybeSingle();
    if (error) return null;
    return isAppStyle(data?.app_style) ? data.app_style : DEFAULT_APP_STYLE;
  } catch {
    return null;
  }
}

/**
 * The style to render <html> in. The cookie caches the account's choice, so
 * most pages need no lookup; home always checks the profile so a change made
 * on another device reaches this one's cookie.
 */
export async function resolveAppStyle(c: Context<AppEnv>, alwaysCheck: boolean): Promise<AppStyle> {
  const cached = readAppStyleCookie(c.req.header("Cookie"));
  if (cached && !alwaysCheck) return cached;

  const account = await readAccountAppStyle(c.get("supabase"));
  if (!account) return cached ?? DEFAULT_APP_STYLE;
  if (account !== cached)
    c.header("Set-Cookie", serializeAppStyleCookie(account), { append: true });
  return account;
}

export interface PageContext {
  appStyle: AppStyle;
  colorScheme: ColorScheme;
  flash: Flash | null;
}

/**
 * Renders a full page. `body` gets the resolved style and the pending flash,
 * so it can put the flash in its notification panel.
 */
export async function renderPage(
  c: Context<AppEnv>,
  {
    status = 200,
    checkAccountStyle = false,
    styleOverride,
    body,
    ...options
  }: Omit<DocumentOptions, "appStyle" | "colorScheme" | "path" | "body"> & {
    status?: 200 | 400 | 404 | 422 | 503;
    checkAccountStyle?: boolean;
    /** A list's own style, which wins over the account's. */
    styleOverride?: AppStyle | null;
    body: (page: PageContext) => Html;
  },
) {
  const appStyle = styleOverride ?? (await resolveAppStyle(c, checkAccountStyle));
  const flash = takeFlash(c);
  const colorScheme = parseColorScheme(c.req.header("Cookie"));
  const page = document({
    ...options,
    appStyle,
    colorScheme,
    path: new URL(c.req.url).pathname,
    // Previews on the in-process mock say so (the "Mocks enabled" banner).
    // Local mock builds don't: they're never mistaken for real data.
    mocksEnabled: env.isPreview && requestBackend(c) === "mock",
    body: body({ appStyle, colorScheme, flash }),
  });
  return c.html(page, status);
}
