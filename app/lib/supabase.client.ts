import { RealtimeClient } from "@supabase/realtime-js";
import { BACKEND_COOKIE, supabaseConfig } from "./supabase-backend";

// Preview builds follow the backend chosen at login (supabase-backend.ts).
// Signing in with a different backend reloads the page, so this module is
// evaluated again rather than keeping the old project's client.
const { url, key } = supabaseConfig(
  document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${BACKEND_COOKIE}=`))
    ?.slice(BACKEND_COOKIE.length + 1),
);

export const realtimeClient = new RealtimeClient(`${url}/realtime/v1`, {
  params: { apikey: key, eventsPerSecond: 10 },
});
