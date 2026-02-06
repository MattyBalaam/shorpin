import type { RouteConfig } from "@react-router/dev/routes";
import { index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("toast-test", "routes/toast-test.tsx"),
  route("lists/:list", "routes/list/list.tsx"),
  route("lists/:list/confirm-delete", "routes/delete.tsx"),
  route("cache", "routes/cache.tsx"),
] satisfies RouteConfig;
