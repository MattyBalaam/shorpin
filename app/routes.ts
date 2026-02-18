import type { RouteConfig } from "@react-router/dev/routes";
import { index, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("auth/confirm", "routes/auth/confirm.tsx"),
  route("set-password", "routes/set-password.tsx"),
  index("routes/home.tsx"),
  route("lists/:list", "routes/list/list.tsx"),
  route("lists/:list/config", "routes/list/config.tsx"),
  route("lists/:list/confirm-delete", "routes/delete.tsx"),
] satisfies RouteConfig;
