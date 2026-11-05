import {
  SINGLE_FLIGHT_HEADER,
  configureServerFunctionsClient,
} from "@solidjs/web/server-functions/client";
import { createRouter } from "@tanstack/solid-router";
import { routeTree } from "./routeTree.gen";

// Opt every mutation out of single-flight: without the header the server
// doesn't re-run the current page's loaders and fold their data into the
// response. Pages apply their own mutation results (and call
// `router.invalidate()` where they want fresh data); the re-run would reset
// their local state, read cookies from before the mutation, and count as a
// fresh visit. See README § Migration.
if (!import.meta.env.SSR) {
  configureServerFunctionsClient({
    prepareRequest: (init) => {
      const headers = new Headers(init.headers);
      headers.delete(SINGLE_FLIGHT_HEADER);
      return { ...init, headers };
    },
  });
}

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultViewTransition: true,
    // A route's error boundary otherwise swallows the error: in dev the
    // router only logs "Error in route match" with no detail.
    defaultOnCatch: import.meta.env.DEV ? (error) => console.error(error) : undefined,
  });
}

declare module "@tanstack/solid-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
