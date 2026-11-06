# Performance comparison: prod vs staging

`pnpm bench` drives prod (React Router, `main`) and staging (whatever branch is deployed there) the same way, many times, and prints medians and p75s side by side. It's a lab benchmark: phone-like conditions, a cold cache each time, and identical data on both sites.

```sh
pnpm bench                 # 10 runs each, 30-item list, throttled
pnpm bench --runs 20       # tighter medians
pnpm bench --items 100     # a bigger list
pnpm bench --no-throttle   # desktop-like, unthrottled
```

The table goes to the console. The raw runs go to `bench-results/<time>.json`, which is git-ignored. On GitHub Actions the table is also written to the job summary.

## Logins

It signs in to each site with a real account, read from git-ignored env files:

- `.env.staging.local`: `STAGING_EMAIL`, `STAGING_PASSWORD` (the e2e Supabase project's staging account)
- `.env.prod.local`: `PROD_EMAIL`, `PROD_PASSWORD` (a prod account)

`PROD_URL` and `STAGING_URL` override the sites. To try the script without touching prod, point both at staging with the staging login.

## It writes to prod

Each run signs in and creates a list named `Benchmark <site> <time>` on each site, then adds the same seed items to both. Every run adds one item, opens its edit dialog and deletes it again. At the end the list is deleted, even if the run fails. If cleanup fails, it prints the list's name so you can delete it by hand.

## Conditions

- Full headless Chromium (`channel: "chromium"`). Playwright's default headless shell reports no long tasks, so TBT would always be 0.
- Lighthouse's mobile throttling: 4x CPU, 150ms round trip, 1.6 Mbps down and 0.75 Mbps up. The viewport is 390×844 at 3x.
- Every load uses a fresh browser context, with no HTTP cache and service workers blocked, the way a first visit looks.
- The two sites alternate which goes first each run, so drift in the network or the backends is spread across both.

## Metrics

| Metric                        | How                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| TTFB, FCP                     | Navigation and paint timing                                                                                          |
| LCP, CLS                      | `PerformanceObserver`, read 1.5s after hydration                                                                     |
| Hydrated                      | When `<html data-hydrated-path>` is first set; both apps set it once the route has rendered in the browser           |
| TBT                           | Long tasks after FCP, minus 50ms each (Lighthouse's definition)                                                      |
| Script time, main-thread time | DevTools' `ScriptDuration` and `TaskDuration` counters for the load. Steadier than TBT when there are few long tasks |
| JS transferred, decoded       | Resource timing for `.js` files                                                                                      |
| Navigate home → list          | From the click to the list's `data-hydrated-path`                                                                    |
| Interaction                   | The longest Event Timing duration for the click (what INP is made of). The browser rounds it to 8ms                  |
| Saved                         | From the click to the save's POST response                                                                           |

## Caveats

- **The backends differ.** Prod uses the prod Supabase project and staging uses the e2e one, so TTFB and save times compare infrastructure as much as framework. JS size, hydration, script time and interaction latency are the framework-level signals.
- **It's lab data.** The app's `/perf` beacon only logs slow field metrics to the server console, and staging has almost no real traffic.
- **Run counts:** 10 runs is enough for large differences. For differences under about 10%, use `--runs 20` or more, and check that the p75s agree.
