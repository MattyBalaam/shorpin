// A throwaway test-project user per preview, for the login page's one-click
// sign-in. Needs TEST_SUPABASE_SERVICE_ROLE_KEY at runtime (env.ts).
// .github/workflows/preview-user-cleanup.yml deletes the user when its PR
// closes; deleting it cascades to its lists and profile.
import { createClient } from "@supabase/supabase-js";
import type { Context } from "hono";
import { supabaseConfig } from "./backend.ts";
import { env } from "./env.ts";
import { createSupabase } from "./supabase.ts";

/**
 * One user per preview host: `<pr>.shorpin.matthewbalaam.co.uk` gives
 * `preview-<pr>@test.invalid`. The cleanup workflow builds the same address
 * from the PR number. Null when there's no service role key.
 */
export function previewUserEmail(c: Context): string | null {
  if (!env.testServiceRoleKey) return null;
  // Behind Coolify's proxy the Host header is the container's.
  const host = c.req.header("X-Forwarded-Host") ?? c.req.header("Host") ?? "local";
  const label = (host.split(/[.:]/)[0] ?? "").replace(/[^a-z0-9-]/gi, "").toLowerCase();
  return `preview-${label || "local"}@test.invalid`;
}

/**
 * Creates the preview user if it doesn't exist yet, then signs in as it with
 * a magic-link token generated (not emailed) by the admin API, so there's no
 * password to store. The session cookies go on the response. Returns an
 * error message, or null when signed in.
 */
export async function signInAsPreviewUser(c: Context): Promise<string | null> {
  const email = previewUserEmail(c);
  if (!env.testServiceRoleKey || !email) return "Preview user isn't configured";

  const admin = createClient(supabaseConfig("test").url, env.testServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error && created.error.code !== "email_exists") return created.error.message;

  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) return link.error.message;

  const { error } = await createSupabase(c, "test").auth.verifyOtp({
    type: "email",
    token_hash: link.data.properties.hashed_token,
  });
  return error?.message ?? null;
}
