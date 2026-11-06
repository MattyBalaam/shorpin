import { copyFile } from "node:fs/promises";
import path from "node:path";
import solid from "@solidjs/vite-plugin";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { nitro } from "nitro/vite";
import { defineConfig, type Plugin } from "vite";
import { VitePWA, type VitePWAOptions } from "vite-plugin-pwa";

/**
 * vite-plugin-pwa, building the worker once, at the point in Nitro's build
 * where .output/public is complete but the server isn't built yet. The
 * plugin's own build step runs in every environment's closeBundle (client,
 * ssr and nitro here): the first two run before Nitro has copied public/
 * (offline.html) into .output/public, and the last runs after the server
 * has baked in its table of static files, so it would 404 sw.js.
 */
function serviceWorker(options: Partial<VitePWAOptions>): Plugin[] {
  const plugins = VitePWA(options).filter((plugin) => plugin.name !== "vite-plugin-pwa:build");
  const main = plugins.find((plugin) => plugin.name === "vite-plugin-pwa");
  return [
    ...plugins,
    {
      name: "shorpin:service-worker",
      apply: "build",
      nitro: {
        setup(nitro) {
          nitro.hooks.hook("vite:compile:before", () => main?.api.generateSW());
        },
      },
    },
  ];
}

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: true,
  },
  build: {
    // Latest major browsers only (see CLAUDE.md). Vite's default
    // "widely available" baseline predates light-dark(), so LightningCSS
    // rewrites it into --lightningcss-light/dark fallbacks that are only
    // defined where it also rewrites a `color-scheme` declaration — in light
    // mode every light-dark() colour then computes as invalid. These
    // versions support light-dark() (Chrome 123, Safari 17.5) and @scope
    // (Firefox 146), so both pass through untouched.
    cssTarget: ["chrome123", "edge123", "firefox146", "safari17.5", "ios17.5"],
  },
  define: {
    "import.meta.env.VITE_GIT_HASH": JSON.stringify(process.env.VITE_GIT_HASH ?? "unknown"),
    "import.meta.env.VITE_GIT_DATE": JSON.stringify(process.env.VITE_GIT_DATE ?? "unknown"),
    "import.meta.env.VITE_PR_NUMBER": JSON.stringify(process.env.VITE_PR_NUMBER ?? ""),
    "import.meta.env.VITE_BRANCH": JSON.stringify(process.env.VITE_BRANCH ?? ""),
  },
  plugins: [
    vanillaExtractPlugin(),
    // Builds .output/server/index.mjs, a standalone Node server (`pnpm start`).
    // Self-contained: .output is all the Docker image copies.
    nitro({
      preset: "node-server",
      // Copied into .output/server/node_modules rather than bundled:
      // instrument.server.mjs runs before the server (`node --import`), and
      // must share one copy of Sentry with src/start.ts. `*` traces the
      // whole package, so the profiler's native binaries come too.
      traceDeps: ["@sentry/node", "@sentry/profiling-node", "@sentry/node-cpu-profiler*"],
      hooks: {
        compiled: (nitro) =>
          copyFile(
            "instrument.server.mjs",
            `${nitro.options.output.serverDir}/instrument.server.mjs`,
          ),
      },
    }),
    tanstackStart({
      srcDirectory: "src",
      // `*.client.ts` modules (IndexedDB, realtime…) are imported by route
      // modules but only called from effects and event handlers. Mocking
      // them on the server matches React Router's rule (a .client module is
      // empty on the server) instead of failing the build; calling a mocked
      // export at runtime still throws.
      importProtection: { behavior: "mock", mockAccess: "error" },
      // Readable server function URLs (/_serverFn/list.functions--mutateList…)
      // in place of hashes, so DevTools and integration tests can tell the
      // calls apart. Deterministic, so ids stay stable between builds.
      serverFns: {
        generateFunctionId: ({ filename, functionName }) =>
          `${path.basename(filename).replace(/\.tsx?$/, "")}--${functionName}`,
      },
      router: {
        // Explicit route config, like React Router's routes.ts, so route
        // modules can sit beside their helpers (data.ts, *.css.ts…) without
        // the file-based router treating every file as a route.
        routesDirectory: ".",
        virtualRouteConfig: "./src/routes.ts",
        generatedRouteTree: "routeTree.gen.ts",
      },
    }),
    // Must come after tanstackStart().
    solid({ ssr: true }),
    serviceWorker({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      // Nitro's static output, which the server serves from the root.
      outDir: ".output/public",
      injectManifest: {
        // Hashed JS/CSS/font assets, plus the one static HTML file
        // (offline.html — the SW's navigation fallback). Never precache
        // real route HTML more broadly than that: it's per-user/SSR and
        // would go stale or leak data across accounts (see src/sw.ts's
        // navigation handler and README.md). Home/list page HTML is cached
        // at runtime instead (Workbox NetworkFirst in src/sw.ts, cleared on
        // sign-out).
        globPatterns: ["**/*.{js,css,woff2}", "offline.html"],
        globIgnores: ["**/node_modules/**"],
      },
      manifest: false, // public/manifest.webmanifest is hand-maintained
      injectRegister: false, // registered in root.tsx, in builds only
      devOptions: { enabled: false }, // no worker under `pnpm dev`
    }),
  ],
});
