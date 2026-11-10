// Which Supabase a request talks to. Most deployments have one
// (VITE_SUPABASE_*). PR previews can have two: the in-process mock and,
// when VITE_TEST_SUPABASE_* are set, the e2e test project. The login page
// picks one and stores it in BACKEND_COOKIE, which createSupabase reads.
import { parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { Context } from "hono";
import { env } from "./env.ts";

const BACKEND_COOKIE = "shorpin-backend";

export type Backend = "mock" | "test";

/** True when this deployment can switch to the test project (previews only). */
export const canChooseBackend = env.testSupabase !== null;

export function parseBackend(value: unknown): Backend {
  return canChooseBackend && value === "test" ? "test" : "mock";
}

/** The backend the request's cookie names. */
export function requestBackend(c: Context): Backend {
  return parseBackend(
    parseCookieHeader(c.req.header("Cookie") ?? "").find(({ name }) => name === BACKEND_COOKIE)
      ?.value,
  );
}

/** URL and publishable key for a backend. */
export function supabaseConfig(backend: Backend) {
  return backend === "test" && env.testSupabase
    ? env.testSupabase
    : { url: env.supabaseUrl, key: env.supabaseKey };
}

export function setBackendCookie(c: Context, backend: Backend) {
  c.header(
    "Set-Cookie",
    serializeCookieHeader(BACKEND_COOKIE, backend, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
    }),
    { append: true },
  );
}
