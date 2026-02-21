import { reactRouter } from "@react-router/dev/vite";
import netlifyReactRouter from "@netlify/vite-plugin-react-router";
import netlify from "@netlify/vite-plugin";
import { reactRouterDevTools } from "react-router-devtools";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { resolve } from "node:path";

import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";

export default defineConfig(({ mode }) => ({
  server: {
    host: true,
  },
  resolve: {
    alias:
      mode === "mock"
        ? [
            {
              // Swap the login page for a dev version that lists quick-login shortcuts
              find: resolve("app/routes/auth/login.tsx"),
              replacement: resolve("app/routes/auth/login.dev.tsx"),
            },
          ]
        : [],
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
}));
