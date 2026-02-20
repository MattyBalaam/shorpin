import { createServer } from "node:http";
import { setupServer } from "msw/node";
import { seed } from "./seed";
import { handlers } from "./handlers";

await seed();

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

createServer(async (req, res) => {
  // Health check — Playwright webServer polls this before running tests
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200);
    res.end();
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
