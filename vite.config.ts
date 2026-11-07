import { copyFile, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { brotliCompress, constants as zlibConstants, gzip } from "node:zlib";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import solid from "@solidjs/vite-plugin";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { nitro } from "nitro/vite";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, perEnvironmentPlugin, type Plugin } from "vite";
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

/**
 * Brotli and gzip copies of the hashed client assets, beside them in
 * .output/public/assets. Nitro's static table picks them up by extension
 * and serves one by Accept-Encoding: brotli is ~10% smaller than the proxy's
 * on-the-fly gzip, and nothing is compressed per request.
 *
 * Not Nitro's own `compressPublicAssets`, which also compresses sw.js and
 * offline.html. Those are small and rarely fetched, and offline.spec.ts
 * simulates a redeploy by editing the built sw.js, which a precompressed
 * copy would hide. Runs where the worker is built (the same Nitro hook),
 * once the client assets are in place but before Nitro's static table.
 */
const compressible = /\.(?:js|css|svg|json)$/;

function precompressAssets(): Plugin {
  return {
    name: "shorpin:precompress-assets",
    apply: "build",
    nitro: {
      setup(nitro) {
        nitro.hooks.hook("vite:compile:before", async () => {
          const dir = path.join(nitro.options.output.publicDir, "assets");
          const files = (await readdir(dir)).filter((file) => compressible.test(file));
          await Promise.all(
            files.map(async (file) => {
              const filePath = path.join(dir, file);
              const contents = await readFile(filePath);
              if (contents.length < 1024) return;
              const [br, gz] = await Promise.all([
                promisify(brotliCompress)(contents, {
                  params: {
                    [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
                    [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
                    [zlibConstants.BROTLI_PARAM_SIZE_HINT]: contents.length,
                  },
                }),
                promisify(gzip)(contents, { level: zlibConstants.Z_BEST_COMPRESSION }),
              ]);
              await Promise.all([writeFile(`${filePath}.br`, br), writeFile(`${filePath}.gz`, gz)]);
            }),
          );
        });
      },
    },
  };
}

/**
 * Uploads the client bundle's source maps to Sentry, so production stack
 * traces are readable. Only with SENTRY_AUTH_TOKEN (the Docker build gets it
 * as a BuildKit secret); without it, nothing is added. Client only: the
 * server bundle isn't minified. The maps are built hidden (no
 * sourceMappingURL) and deleted after the upload, so they're never served.
 */
const uploadSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN);

function sentrySourceMaps(): Plugin[] {
  if (!uploadSourceMaps) return [];
  return sentryVitePlugin({
    org: process.env.SENTRY_ORG,
    project: "shorpin",
    authToken: process.env.SENTRY_AUTH_TOKEN,
    // Matches the events to this build (also injected into the bundle).
    release: { name: process.env.VITE_GIT_HASH },
    // Named explicitly: `deleteSourcemapsAfterUpload` alone deletes nothing
    // here (plugin 11.11). The client builds into .output/public before
    // Nitro builds its static file table, so the deleted maps aren't in it.
    sourcemaps: { filesToDeleteAfterUpload: [".output/public/**/*.map"] },
    telemetry: false,
  }).map((plugin) => ({
    ...(plugin as Plugin),
    applyToEnvironment: (environment) => environment.name === "client",
  }));
}

export default defineConfig(({ mode }) => ({
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
  environments: {
    client: {
      build: {
        ...(uploadSourceMaps && { sourcemap: "hidden" as const }),
        rolldownOptions: {
          output: {
            codeSplitting: {
              groups: [
                {
                  // Solid, the router and Start in one chunk of their own.
                  // Its hash only changes when they're upgraded, so an
                  // app-only deploy leaves it cached (HTTP and the service
                  // worker's precache) and returning users re-download just
                  // the app's chunks. Without it, Rolldown names the shared
                  // chunks after whichever app module it put in them
                  // (clickable-element.css-*.js held Solid's runtime), and
                  // an edit to that module re-hashed the framework too.
                  //
                  // Only the runtime packages: Start's client packages
                  // import the app's router entry, and a group takes its
                  // modules' dependencies with it. Solid's serialization
                  // module stays out because it's only loaded lazily, for
                  // streamed server function responses.
                  name: "framework",
                  test: (id) =>
                    /[\\/]node_modules[\\/](?:solid-js|@solidjs[\\/](?:signals|web)|@tanstack[\\/](?:solid-router|router-core|history))[\\/]/.test(
                      id,
                    ) && !/[\\/]@solidjs[\\/]web[\\/]serialization[\\/]/.test(id),
                },
              ],
            },
          },
        },
      },
    },
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
      traceDeps: [
        "@sentry/node",
        "@sentry/profiling-node",
        "@sentry/node-cpu-profiler*",
        // Preview builds run MSW in the server (src/lib/preview-mocks.server.ts).
        // Bundled, its interceptors can't find the llhttp.wasm they read
        // from beside their own module.
        ...(mode === "preview" ? ["msw*"] : []),
      ],
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
    precompressAssets(),
    ...sentrySourceMaps(),
    // `pnpm build:analyse`: the client bundle's treemap, in dist/stats.html.
    ...(mode === "analyse"
      ? [
          perEnvironmentPlugin("shorpin:visualizer", (environment) =>
            environment.name === "client"
              ? visualizer({
                  open: true,
                  filename: "dist/stats.html",
                  gzipSize: true,
                  brotliSize: true,
                })
              : false,
          ),
        ]
      : []),
  ],
}));
