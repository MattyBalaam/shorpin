// Which Supabase a build talks to. Most builds have one, baked in from
// VITE_SUPABASE_*. Preview builds (`pnpm build:preview`, Coolify PR previews)
// can have two: the in-process MSW mock (VITE_SUPABASE_* from .env.preview)
// and, when VITE_TEST_SUPABASE_* are set at build time, the e2e test project.
// The login page picks one and stores it in the BACKEND_COOKIE cookie, which
// the server client (supabase.server.ts) and the realtime client
// (supabase.client.ts) both read. Other builds drop the test branch.

export const BACKEND_COOKIE = "shorpin-backend";

export type Backend = "mock" | "test";

interface SupabaseConfig {
  url: string;
  key: string;
}

function config(url: string | undefined, key: string | undefined): SupabaseConfig | undefined {
  return url && key ? { url, key } : undefined;
}

const defaultConfig = config(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
);

const testConfig =
  import.meta.env.MODE === "preview"
    ? config(
        import.meta.env.VITE_TEST_SUPABASE_URL,
        import.meta.env.VITE_TEST_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
      )
    : undefined;

/** True when this build can switch to the test project (preview builds only). */
export const canChooseBackend = testConfig !== undefined;

export function parseBackend(value: string | undefined): Backend {
  return canChooseBackend && value === "test" ? "test" : "mock";
}

/** URL and publishable key for the backend a BACKEND_COOKIE value names. */
export function supabaseConfig(cookieValue: string | undefined): SupabaseConfig {
  const chosen = parseBackend(cookieValue) === "test" ? testConfig : defaultConfig;
  if (!chosen) {
    throw new Error(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY environment variables",
    );
  }
  return chosen;
}

/** Cookie options for BACKEND_COOKIE. Readable from JS: realtime needs it. */
export const backendCookieOptions = {
  path: "/",
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 365,
} as const;
