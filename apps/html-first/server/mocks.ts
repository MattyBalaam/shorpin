// The shared mock backend (@shorpin/mocks), for preview mode only. It's
// TypeScript, and a deployed image has it under node_modules, where Node
// won't strip types. So build:preview bundles preview-mocks.ts into
// dist/preview-mocks.js (vite.preview.config.ts); run from source, without
// that bundle, it loads directly.
import { existsSync } from "node:fs";

type Mocks = typeof import("./preview-mocks.ts");

const bundle = new URL("../dist/preview-mocks.js", import.meta.url);

export const mocks: Mocks = await import(existsSync(bundle) ? bundle.href : "./preview-mocks.ts");
