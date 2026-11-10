import { createServerFn } from "@tanstack/solid-start";
import { getCookie, setCookie } from "@tanstack/solid-start/server";
import {
  BACKEND_COOKIE,
  backendCookieOptions,
  canChooseBackend,
  parseBackend,
} from "~/lib/supabase-backend";
import { createSupabaseClient } from "~/lib/supabase.server";
import * as v from "valibot";
import { zSignIn } from "./schemas";

// The preview user helpers need the service role key, so they're only
// loaded in preview builds that offer the test project.
const loadPreviewUser = () =>
  import.meta.env.MODE === "preview" && canChooseBackend
    ? import("~/lib/preview-user.server")
    : undefined;

/**
 * The backend preview builds will sign in to (see supabase-backend.ts), and
 * the preview users' emails when one-click sign-in is set up.
 */
export const getBackend = createServerFn({ method: "GET" }).handler(async () => {
  const users = (await loadPreviewUser())?.previewUsers();
  return {
    backend: parseBackend(getCookie(BACKEND_COOKIE)),
    previewUsers: users ? { owner: users.owner, collab: users.collab } : null,
  };
});

/**
 * Signs in as this preview's test-project owner or collaborator, creating
 * and seeding them like the mock on first use.
 */
export const signInAsPreviewUser = createServerFn({ method: "POST" })
  .validator(v.object({ role: v.picklist(["owner", "collab"]) }))
  .handler(async ({ data: { role } }) => {
    const previewUser = await loadPreviewUser();
    if (!previewUser) return { formError: "Preview users aren't available in this build" };
    setCookie(BACKEND_COOKIE, "test", backendCookieOptions);
    return { formError: await previewUser.signInAsPreviewUser(role) };
  });

/**
 * Signs in and sets the session cookies on the response. Returns a form
 * error rather than throwing, so the form can show it. The redirect home is
 * the caller's (see login.tsx): with a server function the page decides
 * where to go next, instead of the action answering with a redirect.
 * Preview builds that offer the test project also store the chosen backend.
 */
export const signIn = createServerFn({ method: "POST" })
  .validator(zSignIn)
  .handler(async ({ data: { email, password, backend } }) => {
    const chosen = canChooseBackend ? parseBackend(backend) : undefined;
    if (chosen) setCookie(BACKEND_COOKIE, chosen, backendCookieOptions);
    // undefined falls back to the request's cookie.
    const supabase = createSupabaseClient(chosen);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { formError: error.message } : { formError: null };
  });
