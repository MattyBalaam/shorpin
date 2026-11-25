import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";

/**
 * Hands the worker the list of files to precache: everything the page build
 * emitted (from its manifest), plus the offline page. Replaces a placeholder,
 * so the worker's bytes, and so its update check, change with each build.
 */
function precacheManifest(): Plugin {
  return {
    name: "shorpin:precache-manifest",
    generateBundle(_options, bundle) {
      const manifest = JSON.parse(readFileSync("dist/.vite/manifest.json", "utf8")) as Record<
        string,
        { file: string; css?: string[] }
      >;
      const urls = new Set(["/offline.html"]);
      for (const [source, entry] of Object.entries(manifest)) {
        // The stylesheet entry also leaves an empty script stub behind.
        if (!(source.endsWith(".css") && entry.file.endsWith(".js"))) urls.add(`/${entry.file}`);
        for (const css of entry.css ?? []) urls.add(`/${css}`);
      }
      for (const file of Object.values(bundle)) {
        if (file.type !== "chunk") continue;
        file.code = file.code.replace('"__PRECACHE_MANIFEST__"', JSON.stringify([...urls].sort()));
      }
    },
  };
}

// A classic (non-module) worker in one file: module service workers aren't
// everywhere yet, so nothing may be split out of it.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    target: ["chrome123", "edge123", "firefox146", "safari17.5", "ios17.5"],
    lib: {
      entry: "client/sw.ts",
      formats: ["iife"],
      name: "shorpinServiceWorker",
      fileName: () => "sw.js",
    },
  },
  plugins: [precacheManifest()],
});
