/**
 * Appends one compare.ts run to the trend history that the dashboard
 * (scripts/bench/dashboard/index.html) charts. The daily workflow keeps the
 * history on the `bench-data` branch.
 *
 *   node scripts/bench/history.ts <bench-results.json> <history.json>
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { type BenchFile, metrics, summarise } from "./metrics.ts";

const [benchPath, historyPath] = process.argv.slice(2);
if (!benchPath || !historyPath) {
  throw new Error("Usage: node scripts/bench/history.ts <bench-results.json> <history.json>");
}

/** About a year of daily runs; older ones drop off the front. */
const KEEP = 400;

interface History {
  /** Labels and units, so the page needn't import metrics.ts. */
  metrics: { key: string; label: string; unit: string; group: string }[];
  entries: (Omit<BenchFile, "results"> & { summary: ReturnType<typeof summarise> })[];
}

const bench = JSON.parse(readFileSync(benchPath, "utf8")) as BenchFile;
const history: History = existsSync(historyPath)
  ? (JSON.parse(readFileSync(historyPath, "utf8")) as History)
  : { metrics: [], entries: [] };

const { results, ...meta } = bench;
history.metrics = metrics.map(({ key, label, unit, group }) => ({ key, label, unit, group }));
history.entries = [...history.entries, { ...meta, summary: summarise(results) }].slice(-KEEP);

writeFileSync(historyPath, `${JSON.stringify(history)}\n`);
console.log(`${historyPath}: ${history.entries.length} entries`);
