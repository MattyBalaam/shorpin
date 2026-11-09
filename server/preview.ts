// PR previews (APP_MODE=preview): every Supabase call this process makes is
// answered by the same in-memory mock `pnpm dev` runs as a separate server,
// so a preview never touches a real project and needs no per-PR setup.
// Data lives until the container restarts. Imported only in preview mode,
// as msw is a dev dependency.
import { setupServer } from "msw/node";
import { waitlist } from "../mocks/db.ts";
import { handlers } from "../mocks/handlers.ts";
import { seed } from "../mocks/seed.ts";

export async function startPreviewBackend() {
  // Anything not aimed at the mock (none expected) goes to the network.
  setupServer(...handlers).listen({ onUnhandledFrame: "bypass" });
  await seed();
  await waitlist.create({
    id: "preview-waitlist-demo",
    email: "demo-pending@test.com",
    first_name: "Demo",
    last_name: "User",
    created_at: new Date().toISOString(),
  });
  console.log("Preview mode: Supabase is the in-memory mock");
}
