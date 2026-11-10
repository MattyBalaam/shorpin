// A throwaway test-project user per preview, for the login page's one-click
// sign-in. Only login.server.ts imports this, lazily and only in preview
// builds. It needs TEST_SUPABASE_SERVICE_ROLE_KEY at runtime (never a VITE_
// variable: it bypasses RLS and must stay out of the client bundle).
// .github/workflows/preview-user-cleanup.yml deletes the user when its PR
// closes; deleting it cascades to its lists and profile.
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./supabase-backend";
import { createSupabaseClient } from "./supabase.server";

function serviceRoleKey() {
  return process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || undefined;
}

/**
 * One user per preview host: `<pr>.shorpin.matthewbalaam.co.uk` gives
 * `preview-<pr>@test.invalid`. The cleanup workflow builds the same address
 * from the PR number. Null when the server has no service role key.
 */
export function previewUserEmail(request: Request): string | null {
  if (!serviceRoleKey()) return null;
  // Behind Coolify's proxy the Host header is the container's.
  const host =
    request.headers.get("X-Forwarded-Host") ??
    request.headers.get("Host") ??
    new URL(request.url).host;
  const label = (host.split(/[.:]/)[0] ?? "local").replace(/[^a-z0-9-]/gi, "").toLowerCase();
  return `preview-${label || "local"}@test.invalid`;
}

/**
 * Creates the preview user if it doesn't exist yet, then signs in as it with
 * a magic-link token generated (not emailed) by the admin API, so there's no
 * password to store. The caller adds `cookieHeaders` (the session) to its response.
 */
export async function signInAsPreviewUser(
  request: Request,
): Promise<{ formError: string | null; cookieHeaders: Headers }> {
  const key = serviceRoleKey();
  const email = previewUserEmail(request);
  const { supabase, cookieHeaders } = createSupabaseClient(request, "test");
  const fail = (formError: string) => ({ formError, cookieHeaders });
  if (!key || !email) return fail("Preview user isn't configured");

  const admin = createClient(supabaseConfig("test").url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error && created.error.code !== "email_exists") {
    return fail(created.error.message);
  }

  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) return fail(link.error.message);

  const { error } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: link.data.properties.hashed_token,
  });
  return { formError: error?.message ?? null, cookieHeaders };
}
