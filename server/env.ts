import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

// Settings a build ships with (only `pnpm build:preview` writes this file:
// it's .env.preview). Applied for anything the environment leaves unset or
// empty — empty too, because Docker turns an unset build arg into an empty
// variable — so a value set on the deployment always wins.
try {
  const shipped = parseEnv(
    readFileSync(path.resolve(import.meta.dirname, "../dist/runtime.env"), "utf8"),
  );
  for (const [name, value] of Object.entries(shipped)) {
    if (!process.env[name] && value !== undefined) process.env[name] = value;
  }
} catch {
  // No runtime.env: an ordinary build.
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} environment variable`);
  return value;
}

const mode = process.env.APP_MODE;

// The VITE_ names are kept from the React app so .env files, CI secrets and
// the Docker build args carry over unchanged; nothing is baked into a client
// bundle any more.
export const env = {
  supabaseUrl: required("VITE_SUPABASE_URL"),
  supabaseKey: required("VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY"),
  port: Number(process.env.PORT ?? "3000"),
  isProduction: process.env.NODE_ENV === "production",
  /** PR previews: Supabase is the in-memory mock, inside this process. */
  isPreview: mode === "preview",
  // Mock and preview builds show the dev quick-login and test aids.
  isMock: mode === "mock" || mode === "preview",
  gitHash: process.env.VITE_GIT_HASH || "unknown",
  gitDate: process.env.VITE_GIT_DATE || "unknown",
  prNumber: process.env.VITE_PR_NUMBER || null,
  branch: process.env.VITE_BRANCH || null,
};
