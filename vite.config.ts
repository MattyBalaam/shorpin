import { reactRouter } from "@react-router/dev/vite";
import { type SentryReactRouterBuildOptions, sentryReactRouter } from "@sentry/react-router";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import devtoolsJson from "vite-plugin-devtools-json";

const sentryConfig: SentryReactRouterBuildOptions = {
  org: process.env.SENTRY_ORG,
  project: "shorpin",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    assets: "./build/**",
  },
};

export default defineConfig((config) => {
  const mode = config.mode;

  return {
    resolve: {
      tsconfigPaths: true,
    },
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
    ...(mode === "preview" && {
      ssr: { noExternal: ["msw", "@msw/data"] },
    }),
    define: {
      "import.meta.env.VITE_GIT_HASH": JSON.stringify(process.env.VITE_GIT_HASH ?? "unknown"),
      "import.meta.env.VITE_GIT_DATE": JSON.stringify(process.env.VITE_GIT_DATE ?? "unknown"),
      "import.meta.env.VITE_PR_NUMBER": JSON.stringify(process.env.VITE_PR_NUMBER ?? ""),
      "import.meta.env.VITE_BRANCH": JSON.stringify(process.env.VITE_BRANCH ?? ""),
    },
    plugins: [
      devtoolsJson(),
      vanillaExtractPlugin(),
      babel({ babelConfig: { plugins: ["babel-plugin-react-compiler"] } }),
      reactRouter(),
      sentryReactRouter(sentryConfig, config),
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
  };
});
