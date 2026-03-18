import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

export const CREDS_FILE = join(tmpdir(), "supabase-test-user.json");

export default async function globalSetup() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !serviceKey || !anonKey)
    throw new Error(
      "Missing VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
    );

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: schemaError } = await supabase
    .from("list_views")
    .select("list_id", { head: true, count: "exact" })
    .limit(1);

  if (schemaError?.code === "PGRST205") {
    throw new Error(
      "Supabase smoke prerequisites missing: list_views table not found. Apply migrations (including supabase/migrations/20260312000000_list_views.sql) to the e2e Supabase project.",
    );
  }

  if (schemaError) {
    throw new Error(`Failed to verify list_views migration state: ${schemaError.message}`);
  }

  const email = `smoke-${Date.now()}@test.invalid`;
  const password = randomUUID();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw new Error(`Failed to create test user: ${error.message}`);

  const userClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw new Error(`Failed to sign in test user: ${signInError.message}`);
  }

  const accessToken = signInData.session?.access_token;
  if (!accessToken) {
    throw new Error("Failed to sign in test user: missing access token");
  }

  const authedClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const { error: userAccessError } = await authedClient
    .from("list_views")
    .select("list_id", { head: true, count: "exact" })
    .limit(1);

  if (userAccessError?.code === "PGRST205") {
    throw new Error(
      "Supabase smoke prerequisites missing: authenticated role cannot access list_views. Apply migrations and grants for list_views, including supabase/migrations/20260318000000_list_views_authenticated_access.sql.",
    );
  }

  if (userAccessError) {
    throw new Error(`Authenticated list_views access check failed: ${userAccessError.message}`);
  }

  writeFileSync(CREDS_FILE, JSON.stringify({ email, password, userId: data.user.id }));
}
