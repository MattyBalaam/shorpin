import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { setupServer } from "msw/node";
import { seed } from "./seed.ts";
import { handlers } from "./handlers.ts";
import { users, lists, listItems, listMembers, waitlist } from "./db.ts";
import { broadcastEmitter, type BroadcastMessage } from "./broadcast.ts";

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

const port = Number(process.env.MOCK_SERVER_PORT ?? "9001");

// MSW intercepts fetch() calls within this process before any TCP connection
const msw = setupServer(...handlers);
msw.listen({
  onUnhandledRequest: (request, print) => {
    // WebSocket upgrade requests for Supabase Realtime are handled by the
    // upgrade event on httpServer below — not by MSW fetch interception.
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
        items.forEach((item) =>
          listItems.delete((q) => q.where({ id: item.id })),
        );
        const members = listMembers.findMany((q) =>
          q.where({ list_id: list.id }),
        );
        members.forEach((m) =>
          listMembers.delete((q) => q.where({ id: m.id })),
        );
      }
      userLists.forEach((l) => lists.delete((q) => q.where({ id: l.id })));

      // Remove memberships where this user is a collaborator on other lists
      const memberships = listMembers.findMany((q) =>
        q.where({ user_id: user.id }),
      );
      memberships.forEach((m) =>
        listMembers.delete((q) => q.where({ id: m.id })),
      );

      users.delete((q) => q.where({ id: user.id }));
    }

    // Remove the waitlist entry for this worker
    const existingWaitlist = waitlist.findFirst((q) =>
      q.where({ email: waitlistEmail }),
    );
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
  const hasBody =
    chunks.length > 0 && req.method !== "GET" && req.method !== "HEAD";

  try {
    // This fetch is intercepted by MSW — no real network request is made
    const response = await fetch(`http://localhost:${port}${req.url}`, {
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
    res.end(
      JSON.stringify({
        error: "No mock handler",
        url: req.url,
        method: req.method,
      }),
    );
  }
}).listen(port, () => {
  console.log(`[MSW] Mock server running on http://localhost:${port}`);
});

// WebSocket server for Supabase Realtime — implements enough of the Phoenix
// channel protocol for the app's broadcast subscription to work in mock mode.
// Tracks which WebSocket connections have joined which channel topics so that
// incoming broadcast events can be relayed to the right subscribers.
const wss = new WebSocketServer({ noServer: true });

// topic -> set of WebSocket connections subscribed to that topic
const channelSubscribers = new Map<string, Set<WebSocket>>();

httpServer.on("upgrade", (req, socket, head) => {
  if (req.url?.includes("/realtime/")) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws) => {
  const clientTopics = new Set<string>();

  ws.on("message", (data) => {
    // Skip binary frames — only control messages (heartbeat/join/leave) arrive as JSON
    if (typeof data !== "string" && !Buffer.isBuffer(data)) return;
    const raw = Array.isArray(data)
      ? Buffer.concat(data).toString()
      : data.toString();

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return; // ignore malformed frames
    }

    // Supabase realtime uses Phoenix v2 array wire format: [join_ref, ref, topic, event, payload]
    const [join_ref, ref, topic, event] = parsed as [
      string | null,
      string | null,
      string,
      string,
    ];

    const ok = () =>
      ws.send(
        JSON.stringify([
          join_ref,
          ref,
          topic,
          "phx_reply",
          { status: "ok", response: {} },
        ]),
      );

    if (event === "heartbeat") {
      ws.send(
        JSON.stringify([
          null,
          ref,
          "phoenix",
          "phx_reply",
          { status: "ok", response: {} },
        ]),
      );
    } else if (event === "phx_join") {
      // Supabase's httpSend uses subTopic (strips "realtime:" prefix), so normalise here to match
      const channelName = topic.replace(/^realtime:/i, "");
      clientTopics.add(channelName);
      if (!channelSubscribers.has(channelName)) {
        channelSubscribers.set(channelName, new Set());
      }
      channelSubscribers.get(channelName)!.add(ws);
      ok();
    } else if (event === "phx_leave") {
      const channelName = topic.replace(/^realtime:/i, "");
      clientTopics.delete(channelName);
      channelSubscribers.get(channelName)?.delete(ws);
      ok();
    }
  });

  ws.on("close", () => {
    for (const channelName of clientTopics) {
      channelSubscribers.get(channelName)?.delete(ws);
    }
  });
});

// Relay broadcast events from the HTTP broadcast handler to all WebSocket
// clients subscribed to the matching channel topic.
broadcastEmitter.on("message", (message: BroadcastMessage) => {
  const subscribers = channelSubscribers.get(message.topic);
  if (!subscribers?.size) return;

  // Phoenix v2 array format: [join_ref, ref, topic, event, payload]
  // The channel was joined with the full "realtime:" prefix — restore it here
  const frame = JSON.stringify([
    null,
    null,
    `realtime:${message.topic}`,
    "broadcast",
    { type: "broadcast", event: message.event, payload: message.payload },
  ]);

  for (const ws of subscribers) {
    if (ws.readyState === ws.OPEN) ws.send(frame);
  }
});

function shutdown() {
  httpServer.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
