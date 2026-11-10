// Preview builds (`pnpm build:preview`) answer Supabase calls from MSW
// inside the server process, so they need neither a Supabase project nor
// the mock server (mocks/server.ts). State lives in memory until the server
// restarts. Only src/start.ts imports this, and only in preview mode.
import { http, passthrough } from "msw";
import { setupServer } from "msw/node";
import { waitlist } from "../../mocks/db.ts";
import { handlers } from "../../mocks/handlers.ts";
import { seed } from "../../mocks/seed.ts";
import { canChooseBackend, supabaseConfig } from "./supabase-backend";

// The mock handlers match any host (`*/rest/v1/…`), so a preview signed in
// to the test project (see supabase-backend.ts) would get mock answers.
// MSW uses the first matching handler, so this one, listed first, sends
// everything for the test project to the real Supabase.
const testProjectPassthrough = canChooseBackend
  ? [http.all(`${supabaseConfig("test").url}/*`, () => passthrough())]
  : [];

export async function startPreviewMocks() {
  setupServer(...testProjectPassthrough, ...handlers).listen({ onUnhandledFrame: "bypass" });
  await seed();
  await waitlist.create({
    id: "preview-waitlist-demo",
    email: "demo-pending@test.com",
    first_name: "Demo",
    last_name: "User",
    created_at: new Date().toISOString(),
  });
}
