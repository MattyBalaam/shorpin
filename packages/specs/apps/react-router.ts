import type { AppAdapter, RequestMatcher } from "./types.ts";

const filter = "pnpm --filter @shorpin/react-router run";

/**
 * Matches the single-fetch data request for the route at `path`, which
 * client-side loads and form submissions use. The plain path is the page
 * itself, so matching it would catch navigations too.
 */
const data =
  (path: string): RequestMatcher =>
  ({ pathname }) =>
    pathname === `${path}.data`;

/** The reference implementation: the suite was written against it. */
export const reactRouter: AppAdapter = {
  package: "@shorpin/react-router",

  server: {
    built: `${filter} build:mock && ${filter} serve`,
    dev: `${filter} dev:mock --port $PORT`,
    e2e: `${filter} build && ${filter} serve`,
  },

  requests: {
    list: (slug) => data(`/lists/${slug}`),
    listStyle: (slug) => data(`/lists/${slug}/style`),
    // The root route's actions: home's own fetchers post to `/_.data`.
    home: data("/_"),
    // The offline queue replays with a raw fetch() to the route's own path
    // (entry.route), not through single fetch.
    homeReplay: ({ pathname }) => pathname === "/",
    style: data("/style"),
    signUps: data("/sign-ups"),
    navigationData: ({ pathname }) => pathname.endsWith(".data") || pathname === "/__manifest",
  },

  // fetchAndDecodeViaTurboStream in react-router's single-fetch client.
  redirect: (location) => ({
    status: 204,
    headers: { "X-Remix-Redirect": location, "X-Remix-Status": "302" },
  }),

  // The Supabase realtime WebSocket (Phoenix channels).
  realtime: {
    async trackJoins(page) {
      let joins = 0;
      await page.routeWebSocket(/\/realtime\//, (ws) => {
        const server = ws.connectToServer();
        server.onMessage((message) => {
          // Phoenix v2 frames: [join_ref, ref, topic, event, payload].
          const [, , topic, event] = JSON.parse(String(message)) as unknown[];
          if (event === "phx_reply" && String(topic).includes("list-")) joins += 1;
          ws.send(message);
        });
      });
      return () => joins;
    },
    async block(page) {
      await page.routeWebSocket(/\/realtime\//, () => {});
    },
  },

  offlineQueue: { database: "shorpin-offline", store: "mutation-queue" },

  parityGaps: [],
};
