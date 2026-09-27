import * as Sentry from "@sentry/react-router";
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { type AuthError, isAuthRetryableFetchError } from "@supabase/supabase-js";
import { redirect, href } from "react-router";
import type { Database } from "./database.types";
import { SupaBaseContext } from "./supabase.middleware";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY environment variables",
  );
}

export function createSupabaseClient(request: Request) {
  const cookieHeaders = new Headers();

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "").filter(
          (c): c is { name: string; value: string } => c.value !== undefined,
        );
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieHeaders.append("Set-Cookie", serializeCookieHeader(name, value, options)),
        );
      },
    },
  });

  return { supabase, cookieHeaders };
}

/**
 * True when Supabase auth couldn't answer (network failure, timeout, 5xx,
 * rate limit) — which says nothing about whether the session is valid.
 * Only a definitive rejection (e.g. refresh_token_already_used,
 * session_not_found) should log the user out.
 */
export function isTransientAuthError(error: AuthError | null | undefined): boolean {
  if (!error) return false;
  return isAuthRetryableFetchError(error) || error.status === 429 || (error.status ?? 0) >= 500;
}

/**
 * Thrown instead of a /login redirect when auth is only temporarily
 * unreachable. Home and list clientLoaders treat any 5xx as "fall back to
 * cached data", so an auth blip keeps the user on their offline copy
 * instead of bouncing them to the login page.
 */
export function authUnavailable(error: AuthError | null | undefined, headers?: Headers) {
  Sentry.logger.warn("auth: transient failure, serving 503", {
    code: error?.code,
    status: error?.status,
    message: error?.message,
  });
  return new Response("Auth service unavailable", { status: 503, headers });
}

/** Every forced logout goes through here so production records why. */
export function logAuthRedirect(
  reason: string,
  error?: AuthError | null,
  level: "info" | "warn" = "warn",
) {
  Sentry.logger[level](`auth: redirect to login (${reason})`, {
    code: error?.code,
    status: error?.status,
    message: error?.message,
  });
}

export async function requireUser(supabase: SupaBaseContext) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user) {
    if (isTransientAuthError(error)) throw authUnavailable(error);

    logAuthRedirect("getUser returned no user", error);
    throw redirect(href("/login"));
  }
  return user;
}
