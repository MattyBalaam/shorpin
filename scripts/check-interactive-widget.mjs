// Checks MDN's browser-compat-data for iOS Safari support of the viewport
// meta's `interactive-widget`. Once it ships, root.tsx's temporary
// `trackKeyboardViewport` workaround can go — see README "On-screen keyboard
// sizing". Writes `supported=true|false` (and the version) to GITHUB_OUTPUT.
import { appendFileSync } from "node:fs";

const DATA_URL = "https://unpkg.com/@mdn/browser-compat-data/data.json";

const response = await fetch(DATA_URL);
if (!response.ok) {
  throw new Error(`Failed to fetch ${DATA_URL}: ${response.status}`);
}
const data = await response.json();

const compat = data.html?.elements?.meta?.name?.viewport?.["interactive-widget"]?.__compat;
if (!compat) {
  throw new Error("interactive-widget is missing from browser-compat-data; update the key path");
}

// Support is a statement or an array of them, newest first. A released
// version is a version string; `false`/`null` mean unsupported, and "preview"
// means Technology Preview only — not shipped to users yet.
const statements = [compat.support.safari_ios].flat().filter(Boolean);
const shipped = statements.find(
  (statement) =>
    typeof statement.version_added === "string" &&
    statement.version_added !== "preview" &&
    !statement.flags &&
    !statement.partial_implementation,
);
const version = shipped?.version_added ?? "";

console.log(
  `browser-compat-data ${data.__meta.version}: iOS Safari interactive-widget ` +
    (shipped ? `supported since ${version}` : "not supported yet"),
);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `supported=${Boolean(shipped)}\nversion=${version}\n`);
}
