import path from "node:path";
import solid from "@solidjs/vite-plugin";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

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
    nitro({ preset: "node-server" }),
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
  ],
});
