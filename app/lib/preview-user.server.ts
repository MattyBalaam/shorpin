// Throwaway test-project users per preview, for the login page's one-click
// sign-in: an owner and a collaborator, seeded with the same demo data as the
// mock (mocks/seed-data.ts). Only login.server.ts imports this, lazily and
// only in preview builds. It needs TEST_SUPABASE_SERVICE_ROLE_KEY at runtime
// (never a VITE_ variable: it bypasses RLS and must stay out of the client
// bundle). .github/workflows/preview-user-cleanup.yml deletes both when the
// PR closes; that cascades to their lists, items and memberships.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { collabLists, ownerLists, type SeedList } from "../../mocks/seed-data";
import type { Database } from "./database.types";
import { supabaseConfig } from "./supabase-backend";
import { createSupabaseClient } from "./supabase.server";

export type PreviewRole = "owner" | "collab";

type Admin = SupabaseClient<Database>;

function serviceRoleKey() {
  return process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || undefined;
}

/**
 * Names the preview's users after its host: `<pr>.shorpin.matthewbalaam.co.uk`
 * gives `preview-<pr>@test.invalid` and `preview-<pr>-collab@test.invalid`.
 * The cleanup workflow builds the same addresses from the PR number. The
 * label also suffixes the seeded slugs, which are unique across the project.
 * Null when there's no service role key.
 */
export function previewUsers(request: Request) {
  if (!serviceRoleKey()) return null;
  // Behind Coolify's proxy the Host header is the container's.
  const host =
    request.headers.get("X-Forwarded-Host") ??
    request.headers.get("Host") ??
    new URL(request.url).host;
  const label = (host.split(/[.:]/)[0] ?? "").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "local";
  return {
    label,
    owner: `preview-${label}@test.invalid`,
    collab: `preview-${label}-collab@test.invalid`,
  };
}

/** The user's id, creating it (already confirmed) if needed. */
async function ensureUser(admin: Admin, email: string) {
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (!created.error) return { id: created.data.user.id, isNew: true };
  if (created.error.code !== "email_exists") throw created.error;
  // The profile trigger mirrors auth.users, and the admin API can't look a
  // user up by email.
  const { data, error } = await admin.from("profiles").select("id").eq("email", email).single();
  if (error) throw error;
  return { id: data.id, isNew: false };
}

async function insertLists(admin: Admin, userId: string, lists: SeedList[], label: string) {
  const ids: string[] = [];
  for (const [sortOrder, { name, slug, items }] of lists.entries()) {
    const now = Date.now();
    const { data, error } = await admin
      .from("lists")
      .insert({ name, slug: `${slug}-${label}`, sort_order: sortOrder, user_id: userId })
      .select("id")
      .single();
    if (error) throw error;
    ids.push(data.id);
    if (items.length === 0) continue;
    const { error: itemsError } = await admin.from("list_items").insert(
      items.map((value, i) => ({
        list_id: data.id,
        value,
        sort_order: i,
        updated_at: now,
        updated_by: userId,
      })),
    );
    if (itemsError) throw itemsError;
  }
  return ids;
}

/**
 * Both users, seeded like the mock the first time the owner is created. A
 * failed seed deletes the new users again, so the next sign-in retries it
 * rather than leaving a half-seeded account.
 */
async function ensurePreviewUsers(
  admin: Admin,
  users: NonNullable<ReturnType<typeof previewUsers>>,
) {
  const owner = await ensureUser(admin, users.owner);
  const collab = await ensureUser(admin, users.collab);
  if (!owner.isNew) return;

  try {
    const [sharedListId] = await insertLists(admin, owner.id, ownerLists, users.label);
    await insertLists(admin, collab.id, collabLists, users.label);
    if (sharedListId) {
      const { error } = await admin
        .from("list_members")
        .insert({ list_id: sharedListId, user_id: collab.id });
      if (error) throw error;
    }
  } catch (error) {
    await admin.auth.admin.deleteUser(owner.id);
    if (collab.isNew) await admin.auth.admin.deleteUser(collab.id);
    throw error;
  }
}

/**
 * Signs in as one of the preview's users, creating and seeding them on first
 * use. The session comes from a magic-link token generated (not emailed) by
 * the admin API, so there's no password to store. The caller adds
 * `cookieHeaders` (the session) to its response.
 */
export async function signInAsPreviewUser(
  request: Request,
  role: PreviewRole,
): Promise<{ formError: string | null; cookieHeaders: Headers }> {
  const users = previewUsers(request);
  const key = serviceRoleKey();
  const { supabase, cookieHeaders } = createSupabaseClient(request, "test");
  const fail = (formError: string) => ({ formError, cookieHeaders });
  if (!key || !users) return fail("Preview users aren't configured");

  const admin = createClient<Database>(supabaseConfig("test").url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    await ensurePreviewUsers(admin, users);
  } catch (error) {
    // PostgREST and auth errors are plain objects with a message.
    const message = (error as { message?: unknown } | null)?.message;
    return fail(typeof message === "string" ? message : "Couldn't set up the preview users");
  }

  const email = role === "collab" ? users.collab : users.owner;
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) return fail(link.error.message);

  const { error } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: link.data.properties.hashed_token,
  });
  return { formError: error?.message ?? null, cookieHeaders };
}
