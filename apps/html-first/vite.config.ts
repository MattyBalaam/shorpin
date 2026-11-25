import { defineConfig } from "vite";

// Vite builds browser assets only: one stylesheet and the small enhancement
// scripts. The server is plain TypeScript run by Node and reads
// dist/.vite/manifest.json to link the hashed files. The service worker is
// a second, self-contained build (vite.sw.config.ts) that runs after this.
export default defineConfig({
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    manifest: true,
    // Latest browsers only (see CLAUDE.md): light-dark(), @scope and native
    // nesting pass through untouched.
    target: ["chrome123", "edge123", "firefox146", "safari17.5", "ios17.5"],
    cssTarget: ["chrome123", "edge123", "firefox146", "safari17.5", "ios17.5"],
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        styles: "client/styles/index.css",
        base: "client/enhance/base.ts",
        home: "client/enhance/home.ts",
        list: "client/enhance/list.ts",
      },
    },
  },
});
