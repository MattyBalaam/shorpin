#!/usr/bin/env node
// Writes to the e2e Supabase project so the free tier doesn't auto-pause.
// Neither a health-check ping nor a daily PostgREST read counted as activity
// (both ran "successfully" while pause warnings kept arriving), so this
// inserts a marker row and immediately deletes it. Deleting by email also
// cleans up a marker left behind by a run that died between the two calls.

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const MARKER_EMAIL = "keepalive@shorpin.invalid";
const projectRef = new URL(url).hostname.split(".")[0];
const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

async function request(path, init) {
  const response = await fetch(new URL(path, url), { ...init, headers });
  if (!response.ok) {
    console.error(
      `Supabase keep-alive ${init.method} failed: ${response.status} ${await response.text()}`,
    );
    process.exit(1);
  }
}

await request("/rest/v1/waitlist", {
  method: "POST",
  body: JSON.stringify({ email: MARKER_EMAIL, first_name: "Keep", last_name: "Alive" }),
});
await request(`/rest/v1/waitlist?email=eq.${encodeURIComponent(MARKER_EMAIL)}`, {
  method: "DELETE",
});

console.log(`Supabase keep-alive write succeeded on ${projectRef} at ${new Date().toISOString()}`);
