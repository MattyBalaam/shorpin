import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { distDir } from "./assets.ts";
import { env } from "./env.ts";
import { html } from "./html.ts";
import { renderPage } from "./page.ts";
import { auth } from "./routes/auth.ts";
import { home } from "./routes/home.ts";
import { list } from "./routes/list.ts";
import { system } from "./routes/system.ts";
import { type AppEnv, createSupabase, requireAuth } from "./supabase.ts";
import { notifications } from "./views/components.ts";

const app = new Hono<AppEnv>();

app.use(compress());

// Hashed build output never changes; everything else revalidates.
app.use(
  "/assets/*",
  serveStatic({
    root: distDir,
    onFound: (_path, c) => c.header("Cache-Control", "public, max-age=31536000, immutable"),
  }),
);
app.use(
  "*",
  serveStatic({
    root: distDir,
    onFound: (path, c) => {
      // The worker must be able to update the moment a deploy lands.
      if (path.endsWith("/sw.js")) c.header("Cache-Control", "no-cache");
    },
  }),
);

/**
 * Cross-site form posts are refused. Browsers send Sec-Fetch-Site on every
 * request, so this needs no token in the forms and no list of allowed
 * origins (which a TLS-terminating proxy would make awkward to get right).
 */
app.use(async (c, next) => {
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    const site = c.req.header("Sec-Fetch-Site");
    if (site && site !== "same-origin" && site !== "none") {
      return c.text("Cross-site request refused", 403);
    }
  }
  await next();
});

app.use(async (c, next) => {
  c.set("supabase", createSupabase(c));
  await next();
});

app.route("/", system);
app.route("/", auth);

// Everything past the routes above needs a session; auth and system routes
// were matched first, so this only guards the app itself.
app.use("*", requireAuth);
app.route("/", home);
app.route("/", list);

app.notFound((c) =>
  renderPage(c, {
    title: "Not found | Shorpin",
    status: 404,
    body: ({ flash }) =>
      html`${notifications(flash)}
        <div class="error-state">
          <h1>404</h1>
          <p>That page doesn't exist.</p>
          <a class="button-link" href="/">Back to home</a>
        </div>`,
  }),
);

app.onError((error, c) => {
  console.error(error);
  return c.html(
    html`<!doctype html>
      <title>Something went wrong | Shorpin</title>
      <h1>Something went wrong</h1>
      <p><a href="${c.req.path}">Try again</a> or <a href="/">go home</a>.</p>`,
    500,
  );
});

if (env.isPreview) {
  const { startPreviewBackend } = await import("./preview.ts");
  await startPreviewBackend();
}

serve({ fetch: app.fetch, port: env.port }, ({ port }) => {
  console.log(`Shorpin listening on http://localhost:${port}`);
});

// Lets Playwright's and Docker's SIGTERM stop the server promptly.
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => process.exit(0));
