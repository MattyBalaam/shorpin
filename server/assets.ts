import { readFileSync } from "node:fs";
import path from "node:path";
import { env } from "./env.ts";

// Vite builds the browser assets (one stylesheet, a few small enhancement
// scripts, the service worker) into dist/ and writes a manifest mapping each
// entry to its hashed file. Pages look entries up here to emit their tags.

export const distDir = path.resolve(import.meta.dirname, "../dist");

interface ManifestEntry {
  file: string;
  css?: string[];
  imports?: string[];
}
type Manifest = Record<string, ManifestEntry>;

let cached: Manifest | null = null;

function manifest(): Manifest {
  // Dev rebuilds on save (vite build --watch), so re-read every request.
  if (cached && env.isProduction) return cached;
  try {
    cached = JSON.parse(
      readFileSync(path.join(distDir, ".vite/manifest.json"), "utf8"),
    ) as Manifest;
  } catch {
    throw new Error("dist/.vite/manifest.json is missing: run `pnpm build` first");
  }
  return cached;
}

export type ScriptEntry = "base" | "list" | "home";

const entrySources = {
  styles: "client/styles/index.css",
  base: "client/enhance/base.ts",
  list: "client/enhance/list.ts",
  home: "client/enhance/home.ts",
} as const;

export function assetUrl(entry: keyof typeof entrySources) {
  const found = manifest()[entrySources[entry]];
  if (!found) throw new Error(`No build output for ${entrySources[entry]}`);
  return `/${found.file}`;
}

/** Every chunk an entry imports, so pages can modulepreload them. */
export function importedChunks(entry: ScriptEntry) {
  const all = manifest();
  const seen = new Set<string>();
  const visit = (key: string) => {
    for (const imported of all[key]?.imports ?? []) {
      if (seen.has(imported)) continue;
      seen.add(imported);
      visit(imported);
    }
  };
  visit(entrySources[entry]);
  return [...seen].flatMap((key) => (all[key] ? [`/${all[key].file}`] : []));
}
