import type { RouteConfig } from "@react-router/dev/routes";
import { index, route } from "@react-router/dev/routes";

export const routes = [
	index("routes/home.tsx"),
	route("lists/:list", "routes/list.tsx"),
	route("lists/:list/confirm-delete", "routes/delete.tsx"),
] satisfies RouteConfig;
