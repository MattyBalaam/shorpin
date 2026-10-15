# Visual Snapshot Tests

Screenshots of every page route, compared against committed baselines with Playwright's `toHaveScreenshot`. They run against the same mock server and built app as the [integration tests](../integration-tests/README.md), but through a separate config, [playwright.visual.config.ts](../playwright.visual.config.ts).

## Running

```
pnpm test:visual          # compare against the baselines
pnpm test:visual:update   # rewrite the baselines after an intended UI change
```

WebKit is needed for the iPhone project: `pnpm exec playwright install webkit`.

After `pnpm test:visual:update`, look over the changed PNGs in `routes.spec.ts-snapshots/` before committing them. A failed comparison writes `-actual` and `-diff` images to `test-results/`, and `pnpm exec playwright show-report` shows them side by side.

## Projects

| Project          | Device                          | Browser  |
| ---------------- | ------------------------------- | -------- |
| `iphone-pro-max` | iPhone 17 Pro Max (440×763 @3x) | WebKit   |
| `laptop`         | 1440×900 @1x                    | Chromium |

## Keeping snapshots stable

- **Fixed seed users, run serially.** The config and sign-ups modals list every user in the shared mock DB, so every test uses the mock server's default users and the config sets `workers: 1`.
- **Service workers blocked.** Its "Offline support ready" toast appears at a timing-dependent point.
- **Masks** paint over anything that changes between runs. Currently that's only the sign-up dates, which are set when the mock DB is reset.
- Playwright disables CSS animations and hides the text caret by default.

## Local only

Baselines depend on the OS's fonts and rendering, so the file names carry a platform suffix (`-darwin`) and won't match CI's Linux container. To run these in CI, generate and compare the baselines inside a pinned Playwright Docker image (the same one CI uses) so every machine produces identical screenshots.

## Routes left out

- `/logout`: action only, no page.
- `/auth/confirm`: always redirects.
- `/sentry-example-page`: its content depends on reaching Sentry.
- Resource routes (`/health`, `/perf`, `/version`, `/api/*`).
