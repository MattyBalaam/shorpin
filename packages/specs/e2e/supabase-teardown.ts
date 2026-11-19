import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { CREDS_FILE } from "./supabase-setup.ts";

export default async function globalTeardown() {
  const { userId } = JSON.parse(readFileSync(CREDS_FILE, "utf-8")) as { userId: string };

  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) console.error(`Failed to delete test user: ${error.message}`);
}
