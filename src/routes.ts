import { index, layout, rootRoute, route } from "@tanstack/virtual-file-routes";

// TanStack Router's virtual route config: the same shape as React Router's
// routes.ts. Paths are relative to src/ (routesDirectory in vite.config.ts).
// Routes still to port from React Router are listed in legacy/README.md.
export const routes = rootRoute("root.tsx", [
  // Server routes (no page), outside the layouts so no layout's beforeLoad
  // runs for them: health for the Dockerfile, version for CI and
  // version-guard, perf for performance.client.ts's beacons.
  route("/health", "routes/health.ts"),
  route("/version", "routes/version.ts"),
  route("/perf", "routes/perf.ts"),
  layout("auth", "routes/auth/layout.tsx", [
    route("/login", "routes/auth/login.tsx"),
    route("/forgot-password", "routes/auth/forgot-password.tsx"),
    // A server route: no page, just a redirect (see confirm.ts).
    route("/auth/confirm", "routes/auth/confirm.ts"),
    route("/set-password", "routes/auth/set-password.tsx"),
    route("/request-access", "routes/auth/request-access.tsx"),
  ]),
  // Sign-out has no page of its own: it's the signOut server function in
  // routes/auth/logout.ts, called from home's Sign out button.
  layout("app", "routes/app/layout.tsx", [
    // Dialogs are child routes, so each has its own URL and renders over
    // the page behind, in that page's <Outlet />. Home is a pathless layout
    // with an empty index: a `/` route with children would itself be
    // pathless, leaving nothing to match `/`.
    layout("home", "routes/home/home.tsx", [
      index("routes/home/index.tsx"),
      route("/style", "routes/home/style.tsx"),
      route("/config/$list", "routes/list/config.tsx"),
      route("/sign-ups", "routes/home/sign-ups.tsx"),
    ]),
    route("/lists/$list", "routes/list/list.tsx", [route("/style", "routes/list/style.tsx")]),
    route("/lists/$list/confirm-delete", "routes/delete.tsx"),
    // Manual testing aid: 404s outside the mock and preview builds (see the
    // route), since this config can't read the mode.
    route("/dev/notifications", "routes/dev/notifications.tsx"),
  ]),
]);
