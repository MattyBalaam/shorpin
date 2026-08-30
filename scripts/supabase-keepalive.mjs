#!/usr/bin/env node
// Pings the e2e Supabase project's REST API so the free-tier project
// doesn't auto-pause after a week of inactivity. Uses only the public
// anon key — no service-role access, no table reads/writes.

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!url || !anonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY");
  process.exit(1);
}

const response = await fetch(new URL("/rest/v1/", url), {
  headers: { apikey: anonKey },
});

if (!response.ok) {
  console.error(`Supabase keep-alive ping failed: ${response.status} ${response.statusText}`);
  process.exit(1);
}

console.log(
  `Supabase keep-alive ping succeeded (${response.status}) at ${new Date().toISOString()}`,
);
