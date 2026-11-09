import { href } from "react-router";
import { redirectWithSuccess } from "remix-toast";
import type { Route } from "./+types/logout";
import { serializeAppStyleCookie } from "~/lib/app-style";
import { clearAllOfflineData } from "~/lib/offline-store.client";
import { PAGE_CACHE_NAME } from "~/lib/page-cache";
import { supabaseContext } from "~/lib/supabase.middleware";

export async function action({ context }: Route.ActionArgs) {
  const supabase = context.get(supabaseContext);
  await supabase.auth.signOut();
  // The style cookie caches this account's choice (see app/lib/app-style.ts);
  // expire it so signed-out pages, and whoever signs in next, get the default.
  throw await redirectWithSuccess(href("/login"), "You have been logged out.", {
    headers: { "Set-Cookie": serializeAppStyleCookie(null) },
  });
}

export async function clientAction({ serverAction }: Route.ClientActionArgs) {
  await clearAllOfflineData();
  // Mirrors clearAllOfflineData's IndexedDB wipe: the SW's runtime page
  // cache (app/sw.ts) also holds per-user SSR HTML, so it needs the same
  // shared-device protection on sign-out.
  await caches.delete(PAGE_CACHE_NAME);
  return serverAction();
}
