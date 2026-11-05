import { createRouter } from "@tanstack/solid-router";
import { routeTree } from "./routeTree.gen";

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
