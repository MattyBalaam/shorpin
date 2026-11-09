function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} environment variable`);
  return value;
}

// The VITE_ names are kept from the React app so .env files, CI secrets and
// the Docker build args carry over unchanged; nothing is baked into a client
// bundle any more.
export const env = {
  supabaseUrl: required("VITE_SUPABASE_URL"),
  supabaseKey: required("VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY"),
  port: Number(process.env.PORT ?? "3000"),
  isProduction: process.env.NODE_ENV === "production",
  // Mock and preview builds show the dev quick-login and test aids.
  isMock: process.env.APP_MODE === "mock",
  gitHash: process.env.VITE_GIT_HASH ?? "unknown",
  gitDate: process.env.VITE_GIT_DATE ?? "unknown",
  prNumber: process.env.VITE_PR_NUMBER || null,
  branch: process.env.VITE_BRANCH || null,
};
