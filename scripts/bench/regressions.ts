/**
 * Finds new regressions in the trend history, for the daily workflow's alert.
 *
 *   node scripts/bench/regressions.ts <history.json> <report.md>
 *
 * Prints `regressed=true|false` (for $GITHUB_OUTPUT) and, when true, writes a
 * markdown report. Only regressions that are new since the previous run are
 * reported, so one regression alerts once, not every day until the baseline
 * catches up.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { percentile, type SiteName } from "./metrics.ts";

interface Entry {
  startedAt: string;
  versions: Record<SiteName, { hash: string; branch: string | null } | null>;
  summary: Record<string, Record<SiteName, { p50: number | null }>>;
}

interface Rule {
  label: string;
  unit: "ms" | "KB";
  /** Worse by more than this fraction of the baseline… */
  relative: number;
  /** …and by more than this much. */
  absolute: number;
  /** Builds are deterministic in size, so one run is proof; timings need two. */
  runs: 1 | 2;
}

// Framework-level metrics only: TTFB and saves mostly measure the backends.
const rules: Record<string, Rule> = {
  "home.js": { label: "Home: JS transferred", unit: "KB", relative: 0.05, absolute: 5, runs: 1 },
  "home.jsDecoded": {
    label: "Home: JS decoded",
    unit: "KB",
    relative: 0.05,
    absolute: 10,
    runs: 1,
  },
  "list.js": { label: "List: JS transferred", unit: "KB", relative: 0.05, absolute: 5, runs: 1 },
  "home.script": { label: "Home: script time", unit: "ms", relative: 0.2, absolute: 15, runs: 2 },
  "list.script": { label: "List: script time", unit: "ms", relative: 0.2, absolute: 15, runs: 2 },
  "home.task": {
    label: "Home: main-thread time",
    unit: "ms",
    relative: 0.2,
    absolute: 50,
    runs: 2,
  },
  "list.task": {
    label: "List: main-thread time",
    unit: "ms",
    relative: 0.2,
    absolute: 50,
    runs: 2,
  },
  "home.hydrated": { label: "Home: hydrated", unit: "ms", relative: 0.2, absolute: 150, runs: 2 },
  "list.hydrated": { label: "List: hydrated", unit: "ms", relative: 0.2, absolute: 150, runs: 2 },
  "home.lcp": { label: "Home: LCP", unit: "ms", relative: 0.2, absolute: 150, runs: 2 },
  "list.lcp": { label: "List: LCP", unit: "ms", relative: 0.2, absolute: 150, runs: 2 },
  "nav.homeToList": {
    label: "Navigate home → list",
    unit: "ms",
    relative: 0.2,
    absolute: 100,
    runs: 2,
  },
  "add.interaction": {
    label: "Add item: interaction",
    unit: "ms",
    relative: 0.25,
    absolute: 16,
    runs: 2,
  },
  "edit.interaction": {
    label: "Open edit dialog: interaction",
    unit: "ms",
    relative: 0.25,
    absolute: 16,
    runs: 2,
  },
  "delete.interaction": {
    label: "Delete item: interaction",
    unit: "ms",
    relative: 0.25,
    absolute: 16,
    runs: 2,
  },
};

/** Runs before the window being judged that form its baseline. */
const BASELINE = 7;
/** Fewer than this and there's no trend to regress from. */
const MIN_BASELINE = 5;

const SITES: SiteName[] = ["prod", "staging"];

interface Finding {
  site: SiteName;
  key: string;
  baseline: number;
  latest: number;
}

/** Regressions in the last run(s) of `entries`, against the runs before them. */
export function detect(entries: Entry[]): Finding[] {
  const findings: Finding[] = [];
  for (const [key, rule] of Object.entries(rules)) {
    const judged = entries.slice(-rule.runs);
    const before = entries.slice(-rule.runs - BASELINE, -rule.runs);
    if (judged.length < rule.runs || before.length < MIN_BASELINE) continue;
    for (const site of SITES) {
      const value = (entry: Entry) => entry.summary[key]?.[site]?.p50 ?? Number.NaN;
      const baseline = percentile(before.map(value), 50);
      if (!Number.isFinite(baseline)) continue;
      const worse = judged.every((entry) => {
        const delta = value(entry) - baseline;
        return delta > rule.absolute && delta > baseline * rule.relative;
      });
      if (worse) findings.push({ site, key, baseline, latest: value(judged.at(-1) as Entry) });
    }
  }
  return findings;
}

/** Findings in the latest run that the run before didn't already have. */
export function newRegressions(entries: Entry[]) {
  const seen = new Set(detect(entries.slice(0, -1)).map((f) => `${f.site}:${f.key}`));
  return detect(entries).filter((f) => !seen.has(`${f.site}:${f.key}`));
}

function report(findings: Finding[], entries: Entry[]) {
  const latest = entries.at(-1) as Entry;
  const commit = (site: SiteName) => {
    const version = latest.versions[site];
    return version
      ? `\`${version.hash.slice(0, 7)}\`${version.branch ? ` (${version.branch})` : ""}`
      : "unknown";
  };
  const lines = [
    `### Performance regression on ${latest.startedAt.slice(0, 10)}`,
    "",
    "| Site | Metric | Baseline | Latest | Change |",
    "| --- | --- | ---: | ---: | ---: |",
    ...findings.map(({ site, key, baseline, latest: value }) => {
      const { label, unit } = rules[key];
      const pct = Math.round(((value - baseline) / baseline) * 100);
      return `| ${site} | ${label} | ${Math.round(baseline)} ${unit} | ${Math.round(value)} ${unit} | +${pct}% |`;
    }),
    "",
    `Commits measured: prod ${commit("prod")}, staging ${commit("staging")}.`,
    "",
    `Baseline: the median of the ${BASELINE} runs before. JS sizes alert on one run; timings only once two runs in a row are worse. Check the [dashboard](https://mattybalaam.github.io/shorpin/bench/) for the deploy ticks around it.`,
  ];
  return lines.join("\n");
}

if (import.meta.main) {
  const [historyPath, reportPath] = process.argv.slice(2);
  if (!historyPath || !reportPath) {
    throw new Error("Usage: node scripts/bench/regressions.ts <history.json> <report.md>");
  }
  const { entries } = JSON.parse(readFileSync(historyPath, "utf8")) as { entries: Entry[] };
  const findings = newRegressions(entries);
  if (findings.length > 0) writeFileSync(reportPath, `${report(findings, entries)}\n`);
  console.log(`regressed=${findings.length > 0}`);
}
