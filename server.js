import { createRequestHandler } from "@react-router/express";
import compression from "compression";
import express from "express";
import morgan from "morgan";

const BUILD_PATH = "./build/server/index.js";
const PORT = Number.parseInt(process.env.PORT || "3000", 10);

const build = await import(BUILD_PATH);

const app = express();

// The container runs behind Coolify's Traefik reverse proxy, which terminates
// TLS and forwards plain HTTP with `X-Forwarded-Proto: https` /
// `X-Forwarded-Host`. Trusting it makes `req.protocol` / `req.hostname` reflect
// the external URL, so `@react-router/express` reconstructs `request.url` as
// `https://<public-host>/…`. React Router 8.3.1's action-origin check compares
// that against the browser's `Origin` header and 400s every POST when they
// disagree (see README "Deployment"). `react-router-serve` can't be told to
// trust the proxy, which is why this custom server exists.
//
// `true` trusts every forwarding hop. That's fine here because the container is
// only reachable through Traefik; tighten to a hop count or subnet if it ever
// becomes directly addressable.
app.set("trust proxy", true);

app.disable("x-powered-by");

app.use(compression());

// Hashed asset files never change for a given URL — cache them hard. The rest
// of the client build (sw.js, manifest, icons, offline.html) gets a short TTL.
app.use("/assets", express.static("build/client/assets", { immutable: true, maxAge: "1y" }));
app.use(express.static("build/client", { maxAge: "1h" }));

app.use(morgan("tiny"));

app.all("/{*splat}", createRequestHandler({ build, mode: process.env.NODE_ENV }));

const server = app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, () => {
    server.close((error) => {
      if (error) {
        console.error(error);
        process.exit(1);
      }
      process.exit(0);
    });
  });
}
