import { index, layout, rootRoute, route } from "@tanstack/virtual-file-routes";

// TanStack Router's virtual route config: the same shape as React Router's
// routes.ts. Paths are relative to src/ (routesDirectory in vite.config.ts).
// Routes still to port from React Router are listed in legacy/README.md.
export const routes = rootRoute("root.tsx", [
  layout("auth", "routes/auth/layout.tsx", [route("/login", "routes/auth/login.dev.tsx")]),
  // Sign-out has no page of its own: it's the signOut server function in
  // routes/auth/logout.ts, called from home's Sign out button.
  layout("app", "routes/app/layout.tsx", [
    index("routes/home/home.tsx"),
    route("/lists/$list", "routes/list/list.tsx"),
  ]),
]);
