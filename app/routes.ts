import type { RouteConfig } from "@react-router/dev/routes";
import { index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("lists/:list", "routes/list/list.tsx"),
  route("lists/:list/confirm-delete", "routes/delete.tsx"),
] satisfies RouteConfig;
