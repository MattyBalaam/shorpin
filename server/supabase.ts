import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import {
  type AuthError,
  isAuthRetryableFetchError,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { Context, MiddlewareHandler } from "hono";
import type { Database } from "../lib/database.types.ts";
import { env } from "./env.ts";

export type Supabase = SupabaseClient<Database>;

export interface AppEnv {
  Variables: {
    supabase: Supabase;
    /** Set by requireAuth on protected routes. */
    user: { id: string; email: string };
  };
}

/**
 * A request-scoped client. Session cookies it refreshes (or clears on sign
 * out) are appended to the response through Hono's context, so they ride
 * along with whatever the handler returns, redirects included.
 */
export function createSupabase(c: Context): Supabase {
  return createServerClient<Database>(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(c.req.header("Cookie") ?? "").filter(
          (cookie): cookie is { name: string; value: string } => cookie.value !== undefined,
        );
      },
      setAll(cookies) {
        for (const { name, value, options } of cookies) {
          c.header("Set-Cookie", serializeCookieHeader(name, value, options), { append: true });
        }
      },
    },
  });
}

/**
 * True when Supabase auth couldn't answer (network failure, timeout, 5xx,
 * rate limit), which says nothing about whether the session is valid. Only a
 * definitive rejection should log the user out.
 */
export function isTransientAuthError(error: AuthError | null | undefined) {
  if (!error) return false;
  return isAuthRetryableFetchError(error) || error.status === 429 || (error.status ?? 0) >= 500;
}

const storageKey = `sb-${new URL(env.supabaseUrl).hostname.split(".")[0]}-auth-token`;

/** Seconds until the access token expires, or null when it can't be read. */
function tokenSecondsLeft(cookieHeader: string): number | null {
  const cookie = parseCookieHeader(cookieHeader).find(
    ({ name, value }) => (name === storageKey || name === `${storageKey}.0`) && value,
  );
  if (!cookie?.value) return null;
  try {
    let value = cookie.value;
    if (value.startsWith("base64-")) value = Buffer.from(value.slice(7), "base64url").toString();
    const token = value.match(/"access_token":"([^"]+)"/)?.[1];
    const payload = token?.split(".")[1];
    if (!payload) return null; // not a real JWT (e.g. the mock's token)
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp: number };
    return exp - Math.floor(Date.now() / 1000);
  } catch {
    return null;
  }
}

function toLogin(c: Context) {
  // A no-JS fetch can't follow a redirect into a page it then has to render,
  // so enhanced requests get told where to go instead.
  if (c.req.header("X-Enhance")) {
    return c.body(null, 401, { "X-Location": "/login" });
  }
  return c.redirect("/login", 303);
}

function unavailable(c: Context) {
  return c.text("Auth service unavailable", 503);
}

/**
 * Guards a route: a missing or definitively rejected session goes to
 * /login, a transient auth failure is a 503 (so an offline-capable page
 * falls back to its cache rather than looking logged out).
 */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const supabase = c.get("supabase");
  const cookie = c.req.header("Cookie") ?? "";
  if (!cookie.includes("sb-")) return toLogin(c);

  const secondsLeft = tokenSecondsLeft(cookie);
  if (secondsLeft === null || secondsLeft <= 60) {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (!session) return isTransientAuthError(error) ? unavailable(c) : toLogin(c);
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (!user) return isTransientAuthError(error) ? unavailable(c) : toLogin(c);

  c.set("user", { id: user.id, email: user.email ?? "" });
  await next();
};
