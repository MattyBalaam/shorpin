import { reactRouter } from "@react-router/dev/vite";
import netlifyReactRouter from "@netlify/vite-plugin-react-router";
import netlify from "@netlify/vite-plugin";
import { reactRouterDevTools } from "react-router-devtools";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";

import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => ({
  server: {
    host: true,
  },
  // Bundle mock packages into the SSR function for preview builds so they are
  // available at runtime without requiring devDependencies to be installed.
  ...(mode === "preview" && {
    ssr: { noExternal: ["msw", "@msw/data", "valibot"] },
  }),
  plugins: [
    devtoolsJson(),
    // reactRouterDevTools(),
    vanillaExtractPlugin(),
    reactRouter(),
    netlifyReactRouter(),
    netlify(),
    tsconfigPaths(),
    ...(mode === "analyse"
      ? [visualizer({ open: true, filename: "dist/stats.html", gzipSize: true, brotliSize: true })]
      : []),
  ],
}));
