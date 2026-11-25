import { defineConfig } from "vite";

// Preview builds only (build:preview): bundles the shared mock backend into
// dist/preview-mocks.js, so a deployed image can run it (see server/mocks.ts).
// Only the workspace packages are inlined; msw and the rest are published
// JavaScript and stay external.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    ssr: "server/preview-mocks.ts",
    target: "node24",
    rollupOptions: { output: { entryFileNames: "preview-mocks.js" } },
  },
  ssr: { noExternal: [/^@shorpin\//] },
});
