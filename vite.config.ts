import { reactRouter } from "@react-router/dev/vite";
// import { reactRouterDevTools } from "react-router-devtools";

import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [reactRouter(), tsconfigPaths()],
});
