import { reactRouter } from "@react-router/dev/vite";
import netlifyReactRouter from "@netlify/vite-plugin-react-router";
import netlify from "@netlify/vite-plugin";
import { reactRouterDevTools } from "react-router-devtools";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";

import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";

export default defineConfig({
  server: {
    host: true,
  },
  plugins: [
    devtoolsJson(),
    // reactRouterDevTools(),
    vanillaExtractPlugin(),
    reactRouter(),
    netlifyReactRouter(),
    netlify(),
    tsconfigPaths(),
  ],
});
