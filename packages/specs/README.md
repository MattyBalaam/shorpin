# @shorpin/specs

One Playwright suite run against every app, to keep them at feature parity. `APP=<name> pnpm test:integration` picks the app (React Router by default); names are the keys of [apps/index.ts](apps/index.ts), which match `deploy/apps.json`. Running the suite and its mock backend: [integration-tests/README.md](integration-tests/README.md). Real-Supabase specs: [e2e/README.md](e2e/README.md).

## Adapters

Each app has an adapter in `apps/<app>.ts` ([types.ts](apps/types.ts) documents every field). Specs describe what a user sees, so they only reach for the adapter to touch the wire:

- `server`: the commands that build and serve the app against the mock.
- `requests`: matchers for the requests a spec waits for, blocks or fakes, named by what they do (`list(slug)`, `home`, `style`…). They must not catch a plain page navigation.
- `redirect()`: how a save endpoint answers with a redirect (React Router: a 204 with `X-Remix-Redirect`; html-first: a 401 with `X-Location`).
- `realtime`: `trackJoins(page)` counts the list subscriptions a page opens, and `block(page)` keeps them from opening. React Router's are the Supabase realtime WebSocket; html-first's are a server-sent events stream.
- `offlineQueue`: the IndexedDB database and store that hold offline changes.
- `parityGaps`: specs the app doesn't pass, by title, each with a reason. They run as `test.fixme`, so a gap stays in every report. Remove an entry when the app catches up.

A difference a user can see is a parity gap, not an adapter field.

## Specs for one app

A behaviour only one app has (html-first's JavaScript-off flows, its native swipe) goes in `integration-tests/app-only/<app>/`. The config skips every other app's folder, so only that app's run picks them up. Import `../../fixtures` and `../../helpers` as the shared specs do.

- A file named `no-js.spec.ts` runs in the `no-js` project, with JavaScript turned off.
- A file named `touch.spec.ts` runs in the `touch` project, with the shared touch specs.
- Anything else runs in `desktop`, and `@visual` tests in the visual projects.

The pre-commit hook runs an app-only spec for its own app only.

## Visual baselines

Each app keeps its own, under `<spec>-snapshots/<app>/`. They're macOS renders, so the visual projects run locally only. For a new app, generate them with `APP=<app> pnpm test:visual:update`, check the images, then confirm with `APP=<app> pnpm test:visual`.
