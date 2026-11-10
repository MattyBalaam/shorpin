// PR previews (APP_MODE=preview): Supabase calls are answered by the same
// in-memory mock `pnpm dev` runs as a separate server, so a preview needs no
// per-PR setup. Only a preview signed in to the test project (backend.ts)
// reaches a real one.
// Data lives until the container restarts. Imported only in preview mode,
// as msw is a dev dependency.
import { http, passthrough } from "msw";
import { setupServer } from "msw/node";
import { waitlist } from "../mocks/db.ts";
import { handlers } from "../mocks/handlers.ts";
import { seed } from "../mocks/seed.ts";
import { canChooseBackend, supabaseConfig } from "./backend.ts";

// The mock handlers match any host (`*/rest/v1/…`), so a preview signed in
// to the test project (backend.ts) would get mock answers. MSW uses the
// first matching handler, so this one, listed first, sends everything for
// the test project to the real Supabase.
const testProjectPassthrough = canChooseBackend
  ? [http.all(`${supabaseConfig("test").url}/*`, () => passthrough())]
  : [];

export async function startPreviewBackend() {
  setupServer(...testProjectPassthrough, ...handlers).listen({ onUnhandledFrame: "bypass" });
  await seed();
  await waitlist.create({
    id: "preview-waitlist-demo",
    email: "demo-pending@test.com",
    first_name: "Demo",
    last_name: "User",
    created_at: new Date().toISOString(),
  });
  console.log(
    canChooseBackend
      ? "Preview mode: Supabase is the in-memory mock, or the test project if chosen at login"
      : "Preview mode: Supabase is the in-memory mock",
  );
}
