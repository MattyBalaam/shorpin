import * as Sentry from "@sentry/react-router";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import type { EntryContext, RouterContextProvider } from "react-router";
import { ServerRouter } from "react-router";

export const handleError = Sentry.createSentryHandleError({
  logErrors: false,
});

export const streamTimeout = 5_000;

// In preview builds (Coolify PR previews), intercept all Supabase calls with
// MSW so the server doesn't need a real Supabase project. Runs once at
// startup; state persists in memory until the container restarts.
if (import.meta.env.MODE === "preview") {
  const { network } = await import("virtual:msw");
  const { handlers } = await import("../mocks/handlers.ts");
  const { seed } = await import("../mocks/seed");
  const { waitlist } = await import("../mocks/db");
  const { http, passthrough } = await import("msw");
  const { canChooseBackend, supabaseConfig } = await import("./lib/supabase-backend");

  // The mock handlers match any host (`*/rest/v1/…`), so a preview signed in
  // to the test project (see supabase-backend.ts) would get mock answers.
  // MSW uses the first matching handler, so this one, listed first, sends
  // everything for the test project to the real Supabase.
  const testProjectPassthrough = canChooseBackend
    ? [http.all(`${supabaseConfig("test").url}/*`, () => passthrough())]
    : [];

  network.configure({
    handlers: [...testProjectPassthrough, ...handlers],
    onUnhandledFrame: "bypass",
  });
  await network.enable();

  await seed();
  await waitlist.create({
    id: "preview-waitlist-demo",
    email: "demo-pending@test.com",
    first_name: "Demo",
    last_name: "User",
    created_at: new Date().toISOString(),
  });
}

async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: RouterContextProvider,
) {
  // https://httpwg.org/specs/rfc9110.html#HEAD
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  }

  let shellRendered = false;
  const userAgent = request.headers.get("user-agent");

  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: AbortSignal.timeout(streamTimeout + 1000),
      onError(error: unknown) {
        responseStatusCode = 500;
        if (shellRendered) console.error(error);
      },
    },
  );

  shellRendered = true;

  if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}

export default Sentry.wrapSentryHandleRequest(handleRequest);
export const unstable_instrumentations = [Sentry.createSentryServerInstrumentation()];
