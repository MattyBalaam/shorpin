import { RealtimeClient } from "@supabase/realtime-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY environment variables",
  );
}

export const realtimeClient = new RealtimeClient(`${supabaseUrl}/realtime/v1`, {
  params: { apikey: supabaseAnonKey, eventsPerSecond: 10 },
});
