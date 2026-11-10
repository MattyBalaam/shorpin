import { serializeCookieHeader } from "@supabase/ssr";
import { href, redirectDocument } from "react-router";
import { redirectWithSuccess } from "remix-toast";
import type { Route } from "./+types/login";
import { supabaseContext } from "~/lib/supabase.middleware";
import {
  BACKEND_COOKIE,
  backendCookieOptions,
  canChooseBackend,
  parseBackend,
  type Backend,
} from "~/lib/supabase-backend";
import { createSupabaseClient, requestBackend } from "~/lib/supabase.server";
import { parseSubmission, report } from "@conform-to/react/future";
import * as v from "valibot";
import { zLogin } from "./schemas";

// The preview user helpers need the service role key, so they're only
// loaded in preview builds that offer the test project.
const loadPreviewUser = () =>
  import.meta.env.MODE === "preview" && canChooseBackend
    ? import("~/lib/preview-user.server")
    : undefined;

/**
 * Only login.dev.tsx (mock and preview builds) uses this: the backend the
 * preview will sign in to (see supabase-backend.ts), and the preview users'
 * emails when one-click sign-in is set up.
 */
export async function loader({ request }: { request: Request }) {
  return {
    canChooseBackend,
    backend: parseBackend(requestBackend(request)),
    previewUsers: (await loadPreviewUser())?.previewUsers(request) ?? null,
  };
}

/**
 * Where to go once signed in. A new backend gets a full page load, so the
 * realtime client (supabase.client.ts) is built again for its project.
 */
async function signedIn(request: Request, chosen: Backend | undefined, cookieHeaders: Headers) {
  const headers = new Headers(cookieHeaders);
  if (chosen) {
    headers.append(
      "Set-Cookie",
      serializeCookieHeader(BACKEND_COOKIE, chosen, backendCookieOptions),
    );
    if (chosen !== parseBackend(requestBackend(request))) {
      return redirectDocument(href("/"), { headers });
    }
  }
  return redirectWithSuccess(href("/"), "Welcome back!", { headers });
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const submission = parseSubmission(formData);

  if (formData.get("intent") === "preview-user") {
    const previewUser = await loadPreviewUser();
    if (!previewUser) {
      return report(submission, {
        error: { formErrors: ["Preview user isn't available in this build"] },
      });
    }
    const role = formData.get("role") === "collab" ? "collab" : "owner";
    const { formError, cookieHeaders } = await previewUser.signInAsPreviewUser(request, role);
    if (formError) return report(submission, { error: { formErrors: [formError] } });
    throw await signedIn(request, "test", cookieHeaders);
  }

  const result = v.safeParse(zLogin, submission.payload);

  if (!result.success) {
    return report(submission);
  }

  const { email, password } = result.output;
  // Preview builds that offer the test project sign in to the chosen one.
  // Its session cookies go on the redirect; the middleware's client is
  // bound to the request's (possibly old) backend.
  const chosen = canChooseBackend ? parseBackend(String(formData.get("backend"))) : undefined;
  const { supabase, cookieHeaders } = chosen
    ? createSupabaseClient(request, chosen)
    : { supabase: context.get(supabaseContext), cookieHeaders: new Headers() };
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return report(submission, {
      error: { formErrors: [error.message] },
    });
  }

  throw await signedIn(request, chosen, cookieHeaders);
}
