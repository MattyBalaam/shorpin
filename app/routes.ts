import type { RouteConfig } from "@react-router/dev/routes";
import { index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/auth/layout.tsx", [
    route("login", "routes/auth/login.tsx"),
    route("logout", "routes/auth/logout.tsx"),
    route("forgot-password", "routes/auth/forgot-password.tsx"),
    route("auth/confirm", "routes/auth/confirm.tsx"),
    route("set-password", "routes/auth/set-password.tsx"),
  ]),
  layout("routes/app/layout.tsx", [
    index("routes/home.tsx"),
    route("lists/:list", "routes/list/list.tsx"),
    route("lists/:list/config", "routes/list/config.tsx"),
    route("lists/:list/confirm-delete", "routes/delete.tsx"),
  ]),
] satisfies RouteConfig;
