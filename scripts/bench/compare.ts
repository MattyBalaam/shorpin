/**
 * Compares prod (React Router) with staging (Solid + Start) under the same
 * phone-like conditions: cold loads of home and a list, a client navigation
 * between them, and the list's main interactions. See scripts/bench/README.md.
 *
 *   pnpm bench [--runs 10] [--items 30] [--no-throttle]
 *
 * Writes to prod: each run creates a "Benchmark …" list on each site, seeds it
 * with the same items, and deletes it at the end (also on failure).
 */

import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { type Browser, type BrowserContext, chromium, type Page } from "@playwright/test";

const { values: args } = parseArgs({
  options: {
    runs: { type: "string", default: "10" },
    items: { type: "string", default: "30" },
    "no-throttle": { type: "boolean", default: false },
  },
});

const RUNS = Number(args.runs);
const SEED_ITEMS = Number(args.items);
const THROTTLE = !args["no-throttle"];

interface Site {
  name: "prod" | "staging";
  url: string;
  email: string;
  password: string;
}

function site(name: Site["name"], defaultUrl: string): Site {
  const prefix = name.toUpperCase();
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) {
    throw new Error(`Missing ${prefix}_EMAIL / ${prefix}_PASSWORD (see scripts/bench/README.md)`);
  }
  return { name, url: process.env[`${prefix}_URL`] ?? defaultUrl, email, password };
}

const sites = [
  site("prod", "https://shorpin.matthewbalaam.co.uk"),
  site("staging", "https://staging.shorpin.matthewbalaam.co.uk"),
];

// ---- In-page collection ----------------------------------------------------

interface BenchState {
  lcp: number;
  cls: number;
  longTasks: { start: number; duration: number }[];
  events: { duration: number; interactionId: number }[];
  hydrations: { path: string; at: number }[];
}

declare global {
  interface Window {
    __bench: BenchState;
  }
}

/** Installed before any page script: buffers the entries the metrics need. */
function installObservers() {
  const state: BenchState = { lcp: 0, cls: 0, longTasks: [], events: [], hydrations: [] };
  window.__bench = state;
  const observe = (type: string, onEntry: (entry: PerformanceEntry) => void, extra = {}) => {
    try {
      new PerformanceObserver((list) => list.getEntries().forEach(onEntry)).observe({
        type,
        buffered: true,
        ...extra,
      } as PerformanceObserverInit);
    } catch {
      // Unsupported entry type: the metric stays empty.
    }
  };
  observe("largest-contentful-paint", (entry) => {
    state.lcp = entry.startTime;
  });
  observe("layout-shift", (entry) => {
    const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
    if (!shift.hadRecentInput) state.cls += shift.value;
  });
  observe("longtask", (entry) => {
    state.longTasks.push({ start: entry.startTime, duration: entry.duration });
  });
  observe(
    "event",
    (entry) => {
      const event = entry as PerformanceEntry & { interactionId: number };
      if (event.interactionId > 0) {
        state.events.push({ duration: event.duration, interactionId: event.interactionId });
      }
    },
    { durationThreshold: 16 },
  );
  // Both apps set <html data-hydrated-path> once a route has rendered in the
  // browser: after hydration, then after each client navigation.
  new MutationObserver(() => {
    const path = document.documentElement.dataset.hydratedPath;
    if (path) state.hydrations.push({ path, at: performance.now() });
  }).observe(document, {
    attributes: true,
    subtree: true,
    attributeFilter: ["data-hydrated-path"],
  });
}

interface LoadMetrics {
  /** Main-thread time running script, and all main-thread tasks (DevTools' counters). */
  scriptMs: number;
  taskMs: number;
  ttfb: number;
  fcp: number;
  lcp: number;
  cls: number;
  tbt: number;
  hydrated: number;
  jsKb: number;
  jsDecodedKb: number;
}

function readLoadMetrics(): Omit<LoadMetrics, "hydrated" | "scriptMs" | "taskMs"> & {
  hydrated: number | null;
} {
  const state = window.__bench;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
  const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0;
  const scripts = (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).filter(
    (entry) => new URL(entry.name).pathname.endsWith(".js"),
  );
  const sum = (key: "transferSize" | "decodedBodySize") =>
    Math.round(scripts.reduce((total, entry) => total + entry[key], 0) / 1024);
  return {
    ttfb: nav.responseStart,
    fcp,
    lcp: state.lcp,
    cls: state.cls,
    // Lighthouse's definition: blocking time past 50ms, after first paint.
    tbt: state.longTasks
      .filter((task) => task.start >= fcp)
      .reduce((total, task) => total + Math.max(0, task.duration - 50), 0),
    hydrated: state.hydrations[0]?.at ?? null,
    jsKb: sum("transferSize"),
    jsDecodedKb: sum("decodedBodySize"),
  };
}

// ---- Browser setup ---------------------------------------------------------

async function throttle(page: Page) {
  if (!THROTTLE) return;
  // Lighthouse's mobile profile: 4x CPU slowdown, 150ms RTT, 1.6/0.75 Mbps.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
}

async function newContext(
  browser: Browser,
  storageState?: Awaited<ReturnType<BrowserContext["storageState"]>>,
) {
  const context = await browser.newContext({
    storageState,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    // Cold every time: no HTTP cache carried over, and no service worker
    // serving the precache (a first visit has neither).
    serviceWorkers: "block",
  });
  await context.addInitScript(installObservers);
  return context;
}

async function waitForHydration(page: Page, path: string) {
  await page
    .locator(`html[data-hydrated-path="${path}"]`)
    .waitFor({ state: "attached", timeout: 30_000 });
}

async function signIn(browser: Browser, target: Site) {
  const context = await newContext(browser);
  const page = await context.newPage();
  await page.goto(`${target.url}/login`);
  await waitForHydration(page, "/login");
  await page.getByLabel("Email").fill(target.email);
  await page.getByLabel("Password").fill(target.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${target.url}/`);
  await waitForHydration(page, "/");
  return { context, page };
}

// ---- Benchmark list --------------------------------------------------------

const seedItem = (index: number) => `Bench seed ${String(index).padStart(2, "0")}`;

async function addItem(page: Page, name: string) {
  await page.getByLabel("New item").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: `Edit ${name}` }).waitFor();
}

async function createBenchList(page: Page, target: Site, name: string) {
  await page.getByLabel("New list").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.waitForURL(/\/lists\/[^/]+$/);
  const path = new URL(page.url()).pathname;
  await waitForHydration(page, path);
  for (let index = 1; index <= SEED_ITEMS; index++) {
    // Each add waits for the row; saves run one at a time in both apps.
    await addItem(page, seedItem(index));
  }
  // Let the last save land before anything reloads the list.
  await page.waitForLoadState("networkidle");
  console.log(`  ${target.name}: created ${path} with ${SEED_ITEMS} items`);
  return path;
}

async function deleteBenchList(page: Page, target: Site, name: string) {
  await page.goto(`${target.url}/`);
  await waitForHydration(page, "/");
  await page
    .locator("li")
    .filter({ has: page.getByRole("link", { name, exact: true }) })
    .getByRole("link", { name: "Configure" })
    .click();
  await page.getByRole("link", { name: "Delete list" }).click();
  await page.getByRole("button", { name: "Yes" }).click();
  await page.getByRole("link", { name, exact: true }).waitFor({ state: "detached" });
  console.log(`  ${target.name}: deleted "${name}"`);
}

// ---- Measurements ----------------------------------------------------------

async function measureLoad(page: Page, url: string, path: string): Promise<LoadMetrics> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  await page.goto(url, { waitUntil: "load" });
  await waitForHydration(page, path);
  // LCP and layout shifts can still arrive just after hydration.
  await page.waitForTimeout(1500);
  const metrics = await page.evaluate(readLoadMetrics);
  const counters = new Map(
    (await cdp.send("Performance.getMetrics")).metrics.map(({ name, value }) => [name, value]),
  );
  await cdp.detach();
  return {
    ...metrics,
    hydrated: metrics.hydrated ?? Number.NaN,
    scriptMs: (counters.get("ScriptDuration") ?? Number.NaN) * 1000,
    taskMs: (counters.get("TaskDuration") ?? Number.NaN) * 1000,
  };
}

/** The longest event-timing duration of the interaction(s) since the last call. */
async function takeInteractionLatency(page: Page) {
  await page.waitForTimeout(300); // event timing entries arrive after the next paint
  return page.evaluate(() => {
    const longest = Math.max(0, ...window.__bench.events.map((event) => event.duration));
    window.__bench.events = [];
    return longest;
  });
}

/** Runs `action`, timing until a same-origin POST it triggers has answered. */
async function timeSave(page: Page, origin: string, action: () => Promise<void>) {
  const response = page
    .waitForResponse(
      (candidate) => candidate.request().method() === "POST" && candidate.url().startsWith(origin),
      { timeout: 15_000 },
    )
    .then(() => performance.now())
    .catch(() => Number.NaN);
  const start = performance.now();
  await action();
  return (await response) - start;
}

interface RunResult {
  site: Site["name"];
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

async function runOnce(
  browser: Browser,
  target: Site,
  state: Awaited<ReturnType<BrowserContext["storageState"]>>,
  listName: string,
  listPath: string,
  run: number,
): Promise<RunResult> {
  // Home, cold, then a client navigation into the list.
  const homeContext = await newContext(browser, state);
  const homePage = await homeContext.newPage();
  await throttle(homePage);
  const home = await measureLoad(homePage, `${target.url}/`, "/");
  const navStart = await homePage.evaluate(() => performance.now());
  await homePage.getByRole("link", { name: listName, exact: true }).click();
  await waitForHydration(homePage, listPath);
  const navToList = await homePage.evaluate(
    ({ start, path }) =>
      (window.__bench.hydrations.find((h) => h.path === path && h.at > start)?.at ?? Number.NaN) -
      start,
    { start: navStart, path: listPath },
  );
  await homeContext.close();

  // The list, cold, then its interactions.
  const listContext = await newContext(browser, state);
  const page = await listContext.newPage();
  await throttle(page);
  const list = await measureLoad(page, `${target.url}${listPath}`, listPath);
  await page.evaluate(() => {
    window.__bench.events = [];
  });

  const item = `Bench run ${run}`;
  await page.getByLabel("New item").fill(item);
  await takeInteractionLatency(page); // typing isn't what's being measured
  const addSaved = await timeSave(page, target.url, async () => {
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("button", { name: `Edit ${item}` }).waitFor();
  });
  const addLatency = await takeInteractionLatency(page);

  await page.getByRole("button", { name: `Edit ${item}` }).click();
  await page.getByRole("dialog", { name: "Edit item" }).waitFor();
  const openEditLatency = await takeInteractionLatency(page);
  await page.keyboard.press("Escape");
  await page.getByRole("dialog", { name: "Edit item" }).waitFor({ state: "detached" });
  await takeInteractionLatency(page);

  const deleteSaved = await timeSave(page, target.url, async () => {
    await page.getByRole("button", { name: `Delete ${item}` }).click();
    await page.getByRole("button", { name: `Edit ${item}` }).waitFor({ state: "detached" });
  });
  const deleteLatency = await takeInteractionLatency(page);
  await page.waitForLoadState("networkidle");
  await listContext.close();

  return {
    site: target.name,
    run,
    home,
    list,
    navToList,
    addLatency,
    addSaved,
    openEditLatency,
    deleteLatency,
    deleteSaved,
  };
}

// ---- Report ----------------------------------------------------------------

function percentile(values: number[], p: number) {
  const sorted = values.filter(Number.isFinite).toSorted((a, b) => a - b);
  if (sorted.length === 0) return Number.NaN;
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

const rows: [label: string, unit: string, pick: (result: RunResult) => number][] = [
  ["Home: TTFB", "ms", (r) => r.home.ttfb],
  ["Home: FCP", "ms", (r) => r.home.fcp],
  ["Home: LCP", "ms", (r) => r.home.lcp],
  ["Home: hydrated", "ms", (r) => r.home.hydrated],
  ["Home: TBT", "ms", (r) => r.home.tbt],
  ["Home: script time", "ms", (r) => r.home.scriptMs],
  ["Home: main-thread time", "ms", (r) => r.home.taskMs],
  ["Home: CLS", "", (r) => r.home.cls],
  ["Home: JS transferred", "KB", (r) => r.home.jsKb],
  ["Home: JS decoded", "KB", (r) => r.home.jsDecodedKb],
  ["List: TTFB", "ms", (r) => r.list.ttfb],
  ["List: FCP", "ms", (r) => r.list.fcp],
  ["List: LCP", "ms", (r) => r.list.lcp],
  ["List: hydrated", "ms", (r) => r.list.hydrated],
  ["List: TBT", "ms", (r) => r.list.tbt],
  ["List: script time", "ms", (r) => r.list.scriptMs],
  ["List: main-thread time", "ms", (r) => r.list.taskMs],
  ["List: CLS", "", (r) => r.list.cls],
  ["List: JS transferred", "KB", (r) => r.list.jsKb],
  ["Navigate home → list", "ms", (r) => r.navToList],
  ["Add item: interaction", "ms", (r) => r.addLatency],
  ["Add item: saved", "ms", (r) => r.addSaved],
  ["Open edit dialog: interaction", "ms", (r) => r.openEditLatency],
  ["Delete item: interaction", "ms", (r) => r.deleteLatency],
  ["Delete item: saved", "ms", (r) => r.deleteSaved],
];

function format(value: number, unit: string) {
  if (!Number.isFinite(value)) return "–";
  return unit === "" ? value.toFixed(3) : `${Math.round(value)}${unit === "KB" ? " KB" : ""}`;
}

function report(results: RunResult[]) {
  const of = (name: Site["name"]) => results.filter((result) => result.site === name);
  const lines = [
    `### Prod (React Router) vs staging (Solid + Start)`,
    "",
    `${RUNS} runs each, ${THROTTLE ? "4x CPU, 150ms RTT, 1.6 Mbps" : "no throttling"}, ${SEED_ITEMS}-item list, cold cache. Lower is better; times in ms.`,
    "",
    "| Metric | Prod median | Staging median | Change | Prod p75 | Staging p75 |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const [label, unit, pick] of rows) {
    const prod = of("prod").map(pick);
    const staging = of("staging").map(pick);
    const [pm, sm] = [percentile(prod, 50), percentile(staging, 50)];
    const change =
      pm > 0 && Number.isFinite(sm)
        ? `${sm > pm ? "+" : ""}${Math.round(((sm - pm) / pm) * 100)}%`
        : "–";
    lines.push(
      `| ${label} | ${format(pm, unit)} | ${format(sm, unit)} | ${change} | ${format(percentile(prod, 75), unit)} | ${format(percentile(staging, 75), unit)} |`,
    );
  }
  lines.push(
    "",
    "TTFB and saves include each site's backend (prod and e2e Supabase projects), so they compare infrastructure as much as framework.",
  );
  return lines.join("\n");
}

// ---- Main ------------------------------------------------------------------

// Full Chromium, not Playwright's default headless shell, which reports no
// long tasks (so no TBT).
const browser = await chromium.launch({ channel: "chromium" });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const prepared: {
  target: Site;
  page: Page;
  state: Awaited<ReturnType<BrowserContext["storageState"]>>;
  name: string;
  path: string;
}[] = [];
const results: RunResult[] = [];

try {
  console.log("Setting up");
  for (const target of sites) {
    // Named per site, so both can point at one account when testing.
    const name = `Benchmark ${target.name} ${stamp.slice(0, 16)}`;
    const { context, page } = await signIn(browser, target);
    const path = await createBenchList(page, target, name);
    prepared.push({ target, page, state: await context.storageState(), name, path });
  }

  for (let run = 1; run <= RUNS; run++) {
    // Alternate which site goes first, so drift in the network or backends
    // doesn't always land on the same one.
    const order = run % 2 === 1 ? prepared : prepared.toReversed();
    for (const { target, state, name, path } of order) {
      const result = await runOnce(browser, target, state, name, path, run);
      results.push(result);
      console.log(
        `  run ${run} ${target.name}: home LCP ${Math.round(result.home.lcp)}ms, list hydrated ${Math.round(result.list.hydrated)}ms`,
      );
    }
  }
} finally {
  for (const { target, page, name } of prepared) {
    await deleteBenchList(page, target, name).catch((error: unknown) => {
      console.error(`  ${target.name}: couldn't delete "${name}", remove it by hand`, error);
    });
  }
  await browser.close();
}

const summary = report(results);
mkdirSync("bench-results", { recursive: true });
const file = `bench-results/${stamp}.json`;
writeFileSync(
  file,
  JSON.stringify({ runs: RUNS, items: SEED_ITEMS, throttle: THROTTLE, results }, null, 2),
);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
console.log(`\n${summary}\n\nRaw results: ${file}`);
