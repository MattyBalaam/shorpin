// What a benchmark run measures, and how runs are summarised. Shared by
// compare.ts (one comparison) and history.ts (the daily trend).

export type SiteName = "prod" | "staging";

export interface LoadMetrics {
  ttfb: number;
  fcp: number;
  lcp: number;
  cls: number;
  tbt: number;
  hydrated: number;
  /** Main-thread time running script, and all main-thread tasks (DevTools' counters). */
  scriptMs: number;
  taskMs: number;
  jsKb: number;
  jsDecodedKb: number;
}

export interface RunResult {
  site: SiteName;
  run: number;
  home: LoadMetrics;
  list: LoadMetrics;
  navToList: number;
  addLatency: number;
  addSaved: number;
  openEditLatency: number;
  deleteLatency: number;
  deleteSaved: number;
}

/** What each site was running, from its /version route. */
export interface SiteVersion {
  hash: string;
  branch: string | null;
}

/** compare.ts's output file. */
export interface BenchFile {
  startedAt: string;
  runs: number;
  items: number;
  throttle: boolean;
  versions: Record<SiteName, SiteVersion | null>;
  results: RunResult[];
}

export interface Metric {
  /** Stable id for the history; labels can change, keys must not. */
  key: string;
  label: string;
  unit: "ms" | "KB" | "";
  group: "Home load" | "List load" | "Navigation" | "Interactions";
  pick: (result: RunResult) => number;
}

export const metrics: Metric[] = [
  {
    key: "home.ttfb",
    label: "Home: TTFB",
    unit: "ms",
    group: "Home load",
    pick: (r) => r.home.ttfb,
  },
  { key: "home.fcp", label: "Home: FCP", unit: "ms", group: "Home load", pick: (r) => r.home.fcp },
  { key: "home.lcp", label: "Home: LCP", unit: "ms", group: "Home load", pick: (r) => r.home.lcp },
  {
    key: "home.hydrated",
    label: "Home: hydrated",
    unit: "ms",
    group: "Home load",
    pick: (r) => r.home.hydrated,
  },
  { key: "home.tbt", label: "Home: TBT", unit: "ms", group: "Home load", pick: (r) => r.home.tbt },
  {
    key: "home.script",
    label: "Home: script time",
    unit: "ms",
    group: "Home load",
    pick: (r) => r.home.scriptMs,
  },
  {
    key: "home.task",
    label: "Home: main-thread time",
    unit: "ms",
    group: "Home load",
    pick: (r) => r.home.taskMs,
  },
  { key: "home.cls", label: "Home: CLS", unit: "", group: "Home load", pick: (r) => r.home.cls },
  {
    key: "home.js",
    label: "Home: JS transferred",
    unit: "KB",
    group: "Home load",
    pick: (r) => r.home.jsKb,
  },
  {
    key: "home.jsDecoded",
    label: "Home: JS decoded",
    unit: "KB",
    group: "Home load",
    pick: (r) => r.home.jsDecodedKb,
  },
  {
    key: "list.ttfb",
    label: "List: TTFB",
    unit: "ms",
    group: "List load",
    pick: (r) => r.list.ttfb,
  },
  { key: "list.fcp", label: "List: FCP", unit: "ms", group: "List load", pick: (r) => r.list.fcp },
  { key: "list.lcp", label: "List: LCP", unit: "ms", group: "List load", pick: (r) => r.list.lcp },
  {
    key: "list.hydrated",
    label: "List: hydrated",
    unit: "ms",
    group: "List load",
    pick: (r) => r.list.hydrated,
  },
  { key: "list.tbt", label: "List: TBT", unit: "ms", group: "List load", pick: (r) => r.list.tbt },
  {
    key: "list.script",
    label: "List: script time",
    unit: "ms",
    group: "List load",
    pick: (r) => r.list.scriptMs,
  },
  {
    key: "list.task",
    label: "List: main-thread time",
    unit: "ms",
    group: "List load",
    pick: (r) => r.list.taskMs,
  },
  { key: "list.cls", label: "List: CLS", unit: "", group: "List load", pick: (r) => r.list.cls },
  {
    key: "list.js",
    label: "List: JS transferred",
    unit: "KB",
    group: "List load",
    pick: (r) => r.list.jsKb,
  },
  {
    key: "nav.homeToList",
    label: "Navigate home → list",
    unit: "ms",
    group: "Navigation",
    pick: (r) => r.navToList,
  },
  {
    key: "add.interaction",
    label: "Add item: interaction",
    unit: "ms",
    group: "Interactions",
    pick: (r) => r.addLatency,
  },
  {
    key: "add.saved",
    label: "Add item: saved",
    unit: "ms",
    group: "Interactions",
    pick: (r) => r.addSaved,
  },
  {
    key: "edit.interaction",
    label: "Open edit dialog: interaction",
    unit: "ms",
    group: "Interactions",
    pick: (r) => r.openEditLatency,
  },
  {
    key: "delete.interaction",
    label: "Delete item: interaction",
    unit: "ms",
    group: "Interactions",
    pick: (r) => r.deleteLatency,
  },
  {
    key: "delete.saved",
    label: "Delete item: saved",
    unit: "ms",
    group: "Interactions",
    pick: (r) => r.deleteSaved,
  },
];

export function percentile(values: number[], p: number) {
  const sorted = values.filter(Number.isFinite).toSorted((a, b) => a - b);
  if (sorted.length === 0) return Number.NaN;
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

/** Median and p75 of each metric, per site. NaN (no samples) becomes null for JSON. */
export function summarise(results: RunResult[]) {
  const summary: Record<string, Record<SiteName, { p50: number | null; p75: number | null }>> = {};
  const finite = (value: number) =>
    Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
  for (const metric of metrics) {
    const of = (site: SiteName) =>
      results.filter((result) => result.site === site).map(metric.pick);
    summary[metric.key] = {
      prod: { p50: finite(percentile(of("prod"), 50)), p75: finite(percentile(of("prod"), 75)) },
      staging: {
        p50: finite(percentile(of("staging"), 50)),
        p75: finite(percentile(of("staging"), 75)),
      },
    };
  }
  return summary;
}

export function format(value: number | null, unit: Metric["unit"]) {
  if (value === null || !Number.isFinite(value)) return "–";
  return unit === "" ? value.toFixed(3) : `${Math.round(value)}${unit === "KB" ? " KB" : ""}`;
}

const describe = (version: SiteVersion | null) =>
  version
    ? `\`${version.hash.slice(0, 7)}\`${version.branch ? ` (${version.branch})` : ""}`
    : "unknown";

/** The markdown comparison table: the console, the job summary and the history page's notes. */
export function report(file: BenchFile) {
  const summary = summarise(file.results);
  const lines = [
    `### Prod (React Router) vs staging (Solid + Start)`,
    "",
    `${file.runs} runs each, ${file.throttle ? "4x CPU, 150ms RTT, 1.6 Mbps" : "no throttling"}, ${file.items}-item list, cold cache. Lower is better; times in ms.`,
    "",
    `Prod: ${describe(file.versions.prod)}. Staging: ${describe(file.versions.staging)}.`,
    "",
    "| Metric | Prod median | Staging median | Change | Prod p75 | Staging p75 |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const metric of metrics) {
    const { prod, staging } = summary[metric.key];
    const change =
      prod.p50 && staging.p50 !== null
        ? `${staging.p50 > prod.p50 ? "+" : ""}${Math.round(((staging.p50 - prod.p50) / prod.p50) * 100)}%`
        : "–";
    lines.push(
      `| ${metric.label} | ${format(prod.p50, metric.unit)} | ${format(staging.p50, metric.unit)} | ${change} | ${format(prod.p75, metric.unit)} | ${format(staging.p75, metric.unit)} |`,
    );
  }
  lines.push(
    "",
    "TTFB and saves include each site's backend (prod and e2e Supabase projects), so they compare infrastructure as much as framework.",
  );
  return lines.join("\n");
}
