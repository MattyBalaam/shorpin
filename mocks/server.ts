import { createServer } from "node:http";
import { setupServer } from "msw/node";
import { seed } from "./seed";
import { handlers } from "./handlers";
import { users, lists, listItems, listMembers, waitlist } from "./db";

// Seed fixed dev users at startup so pnpm dev works without any setup.
// No waitlistEmail here — the demo entry is created separately below so it
// has a distinct name and cannot conflict with e2e test selectors.
await seed();
await waitlist.create({
  id: "dev-waitlist-demo",
  email: "demo-pending@test.com",
  first_name: "Demo",
  last_name: "User",
  created_at: new Date().toISOString(),
});

// MSW intercepts fetch() calls within this process before any TCP connection
const msw = setupServer(...handlers);
msw.listen({
  onUnhandledRequest: (request, print) => {
    // Silently ignore Supabase Realtime WebSocket connections — the app
    // subscribes for live updates but the mock doesn't need to support them.
    if (request.url.includes("/realtime/")) return;
    print.error();
  },
});

const httpServer = createServer(async (req, res) => {
  // Health check — Playwright webServer polls this before running tests
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Reset endpoint — seeds fresh data for the given test worker's users.
  // Accepts a JSON body: { ownerEmail, collabEmail, waitlistEmail }.
  // Only clears and re-seeds data for those specific users so parallel
  // workers don't interfere with each other.
  if (req.method === "POST" && req.url === "/test/reset") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    const body =
      chunks.length > 0
        ? (JSON.parse(Buffer.concat(chunks).toString()) as {
            ownerEmail?: string;
            collabEmail?: string;
            waitlistEmail?: string;
          })
        : {};

    const ownerEmail = body.ownerEmail ?? "owner@test.com";
    const collabEmail = body.collabEmail ?? "collab@test.com";
    const waitlistEmail = body.waitlistEmail ?? "pending@test.com";

    // Delete existing data for each user
    for (const email of [ownerEmail, collabEmail]) {
      const user = users.findFirst((q) => q.where({ email }));
      if (!user) continue;

      const userLists = lists.findMany((q) => q.where({ user_id: user.id }));
      for (const list of userLists) {
        const items = listItems.findMany((q) => q.where({ list_id: list.id }));
        items.forEach((item) => listItems.delete((q) => q.where({ id: item.id })));
        const members = listMembers.findMany((q) => q.where({ list_id: list.id }));
        members.forEach((m) => listMembers.delete((q) => q.where({ id: m.id })));
      }
      userLists.forEach((l) => lists.delete((q) => q.where({ id: l.id })));

      // Remove memberships where this user is a collaborator on other lists
      const memberships = listMembers.findMany((q) => q.where({ user_id: user.id }));
      memberships.forEach((m) => listMembers.delete((q) => q.where({ id: m.id })));

      users.delete((q) => q.where({ id: user.id }));
    }

    // Remove the waitlist entry for this worker
    const existingWaitlist = waitlist.findFirst((q) => q.where({ email: waitlistEmail }));
    if (existingWaitlist) {
      waitlist.delete((q) => q.where({ id: existingWaitlist.id }));
    }

    await seed(ownerEmail, collabEmail, waitlistEmail);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Convert Node headers to Fetch Headers
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (!value) continue;
    if (Array.isArray(value)) value.forEach((v) => headers.append(name, v));
    else headers.set(name, value);
  }

  // Collect body
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const hasBody = chunks.length > 0 && req.method !== "GET" && req.method !== "HEAD";

  try {
    // This fetch is intercepted by MSW — no real network request is made
    const response = await fetch(`http://localhost:9001${req.url}`, {
      method: req.method,
      headers,
      ...(hasBody && { body: Buffer.concat(chunks), duplex: "half" }),
    } as RequestInit);

    const resHeaders: Record<string, string> = {};
    response.headers.forEach((value, name) => {
      resHeaders[name] = value;
    });
    res.writeHead(response.status, resHeaders);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    // No matching handler — return 404 rather than crashing the server
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "No mock handler", url: req.url, method: req.method }));
  }
}).listen(9001, () => {
  console.log("[MSW] Mock server running on http://localhost:9001");
});

function shutdown() {
  httpServer.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
