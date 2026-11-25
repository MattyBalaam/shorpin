import type { AppAdapter, RequestMatcher } from "./types.ts";

const filter = "pnpm --filter @shorpin/html-first run";

/** A list page's live-update stream (server-sent events). */
const events: RequestMatcher = ({ pathname }) => /^\/lists\/[^/]+\/events$/.test(pathname);

const path =
  (...paths: string[]): RequestMatcher =>
  ({ pathname }) =>
    paths.includes(pathname);

/**
 * The HTML-first app (Hono, progressive enhancement). Every save is a plain
 * form post; with a script it goes by fetch with `X-Enhance: 1`, the server
 * answers with the same 303 back to the page, and the page swaps the result
 * in. Pages are GETs of the page itself, so there's no separate data request
 * to match: the matchers below name form endpoints only.
 */
export const htmlFirst: AppAdapter = {
  package: "@shorpin/html-first",

  server: {
    // build:mock ships .env.mock as dist/runtime.env (APP_MODE=mock); the
    // env the specs pass still wins over it.
    built: `${filter} build:mock && ${filter} serve`,
    dev: `${filter} dev:mock`,
    e2e: `${filter} build && ${filter} serve`,
  },

  requests: {
    // Saves post to /items; the page fetches itself back with `?enhanced`
    // (a save's redirect, a refresh), which a navigation never has.
    list: (slug) => (url) =>
      url.pathname === `/lists/${slug}/items` ||
      (url.pathname === `/lists/${slug}` && url.searchParams.has("enhanced")),
    listStyle: (slug) => path(`/lists/${slug}/style`),
    home: path("/default-list", "/lists-order"),
    // New lists post to `/`, reorders to `/lists-order`; both replay from
    // the offline queue (client/lib/queue.ts).
    homeReplay: path("/", "/lists-order"),
    style: path("/style"),
    signUps: path("/sign-ups"),
    // No data requests: a navigation is the page itself. Anything that isn't
    // a built asset or a form endpoint counts.
    navigationData: ({ pathname }) =>
      !pathname.startsWith("/assets/") && !/\.\w+$/.test(pathname) && !pathname.endsWith("/items"),
  },

  // requireAuth (server/supabase.ts) can't redirect an enhanced fetch into
  // a page, so it answers 401 and names where to go.
  redirect: (location) => ({ status: 401, headers: { "X-Location": location } }),

  // Server-sent events from GET /lists/:list/events (client/enhance/list.ts).
  // The server publishes after its own saves, so there's no socket to fake:
  // a join is the stream opening, and blocking it holds the request.
  realtime: {
    async trackJoins(page) {
      let joins = 0;
      page.on("response", (response) => {
        if (response.ok() && events(new URL(response.url()))) joins += 1;
      });
      return () => joins;
    },
    async block(page) {
      // Never answered, so EventSource never opens or retries.
      await page.context().route(events, () => {});
    },
  },

  offlineQueue: { database: "shorpin-offline", store: "posts" },

  parityGaps: [
    // Different by design: the spike swaps custom widgets for the platform's.
    ...[
      "swiping an item far enough deletes it and persists",
      "a quick short fling deletes an item",
      "a slow short swipe springs the item back instead of deleting",
      "a swipe that drifts a full row vertically reorders instead of deleting",
    ].map((title) => ({
      title,
      reason:
        "Swipe-to-delete is native scroll snapping onto a Delete button, not a scripted gesture (see app-only/html-first/touch.spec.ts).",
    })),
    ...[
      "vertical touch drag reorders list items without scrolling the page",
      "vertical touch drag reorders lists on home",
      "a vertical touch drag without a long-press doesn't reorder",
    ].map((title) => ({
      title,
      reason:
        "Reordering is native drag and drop, which Chromium's touch emulation can't long-press; touch uses the move buttons.",
    })),
    ...[
      /^picking a tag from the list keeps the edit modal open/,
      "the add bar's tag combobox tags each new item until a reload",
      "the edit modal's tag combobox lists, filters, picks and adds tags",
    ].map((title) => ({
      title,
      reason: "Tag suggestions are a native <datalist>, not a scripted listbox.",
    })),
    {
      title: /^scroll edges fall back to attributes without scroll-state queries/,
      reason: "No scripted fallback: without scroll-state queries the edges simply don't shade.",
    },

    // Navigations are full page loads, so the in-app network error states
    // are the service worker's offline page instead.
    ...[
      "cancelling the network error modal goes back to the previous page",
      "client-side navigation to a route with no offline handling of its own falls back to a friendly message when the server is unreachable",
      "client-side navigation to a route with no offline handling of its own shows an offline message when the browser itself has no connection",
    ].map((title) => ({
      title,
      reason:
        "No client-side navigation: a page with no offline copy shows the service worker's offline page.",
    })),
    {
      title: "a failed fresh-data fetch on reconnect never syncs against stale cached data",
      reason:
        "Not applicable: replays are plain form posts the server applies to fresh data, with no client-side refetch to fail.",
    },
    {
      title:
        "a stale-session redirect during reconnect sync doesn't drop a queued list, and it flushes once retried",
      reason:
        "A lapsed session during a replay goes to /login and replays after signing in, rather than keeping the pending row on home.",
    },

    // Specs that lean on React Router's wire protocol.
    {
      title: "a submission without explicitDeletes still deletes what it leaves out",
      reason:
        "Not applicable: deletes post one item id, so there's no explicitDeletes field to leave out.",
    },
    {
      title: "new item is marked in the list since last opening",
      reason:
        "Waits for a refetch when realtime first connects. This app refetches then only if the list changed after the page rendered, so there's none to wait for; the markers themselves last the visit (a cookie, see server/routes/list.ts).",
    },
    {
      title: "a realtime reconnect refetches the list, so broadcasts missed meanwhile aren't lost",
      reason:
        "Proxies the Supabase realtime WebSocket to drop messages and cut the connection. The app does refresh when its server-sent events stream reconnects, but Playwright can't proxy a stream (route.fetch buffers the body) to drive it.",
    },
  ],
};
