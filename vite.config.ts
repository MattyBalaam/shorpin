import { reactRouter } from "@react-router/dev/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import devtoolsJson from "vite-plugin-devtools-json";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => ({
  server: {
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("@supabase/")) return "vendor-supabase";
          if (id.includes("@sentry/")) return "vendor-sentry";
          if (id.includes("/sonner/")) return "vendor-sonner";
        },
      },
    },
  },
  // Bundle mock packages into the SSR function for preview builds so they are
  // available at runtime without requiring devDependencies to be installed.
  ...(mode === "preview" && {
    ssr: { noExternal: ["msw", "@msw/data"] },
  }),
  plugins: [
    devtoolsJson(),
    // reactRouterDevTools(),
    vanillaExtractPlugin(),
    babel({ babelConfig: { plugins: ["babel-plugin-react-compiler"] } }),
    reactRouter(),
    tsconfigPaths(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: "shorpin",
      sourcemaps: {
        assets: "./build/**",
      },
    }),
    ...(mode === "analyse"
      ? [
          visualizer({
            open: true,
            filename: "dist/stats.html",
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
  ],
}));
