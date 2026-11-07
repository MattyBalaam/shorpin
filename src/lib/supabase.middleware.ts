import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "@tanstack/solid-router";
import { createMiddleware } from "@tanstack/solid-start";
import { setResponseStatus } from "@tanstack/solid-start/server";
import type { Database, Tables } from "./database.types";
import { SERVICE_UNAVAILABLE } from "./network-error";
import {
  createSupabaseClient,
  isTransientAuthError,
  logAuthRedirect,
  logAuthUnavailable,
} from "./supabase.server";

export type SupaBaseContext = SupabaseClient<Database>;

export type ListItem = Tables<"lists">;

/**
 * Server function middleware: every server function that reads or writes a
 * user's data goes through this, and gets `context.supabase` and
 * `context.user`.
 *
 * Replaces React Router's root `supabaseMiddleware`, which ran for every
 * request and redirected anything outside a public-route allowlist. Here
 * the protection sits on the data instead: a server function is its own
 * endpoint, reachable whichever page called it, so it must check for
 * itself. Pages need no allowlist: a page without data needs no check.
 *
 * getClaims() verifies the access token's signature locally, against the
 * project's public signing keys (fetched once and cached by supabase-js),
 * so a server function doesn't wait on a round trip to the auth server
 * before its own queries. The trade-off: a session revoked elsewhere stays
 * usable until its token expires (jwt_expiry, an hour), as it already was
 * for PostgREST and RLS. It still refreshes an expiring token, and the new
 * cookies go out through setCookie (see createSupabaseClient).
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  // Only the id: it's all server functions need, and it keeps them from
  // depending on fields a full User has but the token's claims don't.
  const user = data ? { id: data.claims.sub } : null;

  if (!user) {
    // A network blip on token refresh must not look like a logout: the
    // client treats a 5xx as "fall back to cached data" instead.
    if (isTransientAuthError(error)) {
      logAuthUnavailable(error);
      setResponseStatus(503);
      throw new Error(SERVICE_UNAVAILABLE);
    }

    logAuthRedirect("getClaims returned no claims", error);
    throw redirect({ to: "/login" });
  }

  return next({ context: { supabase, user } });
});
