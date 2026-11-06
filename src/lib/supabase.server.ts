import { logger } from "@sentry/node";
import { createServerClient } from "@supabase/ssr";
import { type AuthError, isAuthRetryableFetchError } from "@supabase/supabase-js";
import { getCookies, setCookie } from "@tanstack/solid-start/server";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY environment variables",
  );
}

/**
 * A Supabase client bound to the current request's cookies. Start keeps the
 * request in async context, so getCookies/setCookie need no request argument,
 * and cookies set here (a token refresh, sign-in, sign-out) are applied to
 * whatever response is being built — an SSR page or a server function call.
 */
export function createSupabaseClient() {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) setCookie(name, value, options);
      },
    },
  });
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

function logAuthEvent(message: string, error: AuthError | null | undefined) {
  const details = { code: error?.code, status: error?.status, message: error?.message };
  console.warn(message, details);
  // The server SDK doesn't capture console output, so send it as a log too.
  logger.warn(message, details);
}

/** Every forced logout goes through here so production records why. */
export function logAuthRedirect(reason: string, error?: AuthError | null) {
  logAuthEvent(`auth: redirect to login (${reason})`, error);
}

/** A transient auth failure answered with a 503 instead of a logout. */
export function logAuthUnavailable(error: AuthError | null | undefined) {
  logAuthEvent("auth: transient failure, serving 503", error);
}
