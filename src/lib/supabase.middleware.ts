import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "@tanstack/solid-router";
import { createMiddleware } from "@tanstack/solid-start";
import { setResponseStatus } from "@tanstack/solid-start/server";
import type { Database, Tables } from "./database.types";
import { SERVICE_UNAVAILABLE } from "./network-error";
import { createSupabaseClient, isTransientAuthError, logAuthRedirect } from "./supabase.server";

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
 * supabase-js refreshes an expiring access token inside getUser(), and the
 * new cookies go out through setCookie (see createSupabaseClient), so the
 * React Router middleware's own expiry check isn't needed either.
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const supabase = createSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user) {
    // A network blip on token refresh must not look like a logout: the
    // client treats a 5xx as "fall back to cached data" instead.
    if (isTransientAuthError(error)) {
      setResponseStatus(503);
      throw new Error(SERVICE_UNAVAILABLE);
    }

    logAuthRedirect("getUser returned no user", error);
    throw redirect({ to: "/login" });
  }

  return next({ context: { supabase, user } });
});
