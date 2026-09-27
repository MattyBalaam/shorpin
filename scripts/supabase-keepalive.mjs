#!/usr/bin/env node
// Runs a real query against the e2e Supabase project's Postgres database so
// the free-tier project doesn't auto-pause after a week of inactivity.
// Supabase's auto-pause check only counts actual database activity — a
// health-check ping (e.g. /auth/v1/health) returns 200 without touching
// Postgres and does NOT count, which is why this project got paused despite
// a daily "successful" ping. Querying `lists` with the anon key still counts
// as a database hit even though RLS returns zero rows (no auth.uid()) — no
// service-role access, no actual table access needed.

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!url || !anonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY");
  process.exit(1);
}

const response = await fetch(new URL("/rest/v1/lists?select=id&limit=1", url), {
  headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
});

if (!response.ok) {
  console.error(`Supabase keep-alive ping failed: ${response.status} ${response.statusText}`);
  process.exit(1);
}

console.log(
  `Supabase keep-alive ping succeeded (${response.status}) at ${new Date().toISOString()}`,
);
