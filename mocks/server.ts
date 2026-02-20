import { createServer } from "node:http";
import { createMiddleware } from "@mswjs/http-middleware";
import { seed } from "./seed";
import { handlers } from "./handlers";

await seed();

const middleware = createMiddleware(...handlers);

createServer((req, res) => {
  middleware(req, res, () => {
    console.warn(`[MSW] Unhandled: ${req.method} ${req.url}`);
    res.writeHead(404);
    res.end(
      JSON.stringify({ error: "No mock handler", method: req.method, url: req.url })
    );
  });
}).listen(9001, () => {
  console.log("[MSW] Mock server running on http://localhost:9001");
});
