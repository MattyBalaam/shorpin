import { reactRouter } from "@react-router/dev/vite";
import { type SentryReactRouterBuildOptions, sentryReactRouter } from "@sentry/react-router";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import babel from "@rolldown/plugin-babel";
import devtoolsJson from "vite-plugin-devtools-json";
import { VitePWA } from "vite-plugin-pwa";

const sentryConfig: SentryReactRouterBuildOptions = {
  org: process.env.SENTRY_ORG,
  project: "shorpin",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    assets: "./build/**",
    // Without an auth token there's nothing to authenticate the upload with —
    // skip it locally instead of failing noisily. CI/deploy sets
    // SENTRY_AUTH_TOKEN, so this stays enabled where it matters.
    disable: !process.env.SENTRY_AUTH_TOKEN,
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
    optimizeDeps: {
      // Pre-bundle at server startup rather than on first navigation into
      // app/layout.tsx — discovering it mid-navigation forces Vite to reload
      // the page, which interrupts the post-login client-side redirect.
      include: ["motion/react"],
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
      babel({ plugins: ["babel-plugin-react-compiler"] }),
      reactRouter(),
      sentryReactRouter(sentryConfig, config),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "app",
        filename: "sw.ts",
        outDir: "build/client",
        injectManifest: {
          // Hashed JS/CSS/font assets, plus the one static HTML file
          // (offline.html — the SW's navigation fallback). Never route
          // HTML more broadly than that: real route HTML is per-user/SSR
          // and would go stale or leak data across accounts if precached
          // (see app/sw.ts's navigation handler and README.md).
          globPatterns: ["**/*.{js,css,woff2}", "offline.html"],
        },
        manifest: false, // public/manifest.webmanifest is already hand-maintained
        injectRegister: false, // registered manually in root.tsx (needs PROD-only gating)
        devOptions: { enabled: false }, // don't run under `pnpm dev`/mock — SW only matters for real builds
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
  };
});
