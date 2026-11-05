# Not yet ported to TanStack Start + Solid

This branch is a trial migration from React Router + React to TanStack Start + Solid 2. The
React Router code that hasn't been ported yet lives here, unchanged, for reference. It's
excluded from typecheck, lint and the build.

Ported so far (in `src/`): the root document, the auth and app layouts, the dev login,
sign-out, home (lists with unread counts, create, reorder, the launch-list star and the
offline cache and queued replays) and the list page.

Still to port:

- **Routes:** production login, forgot/set password, request access, auth confirm, sign-ups,
  list config, delete list, style dialogs (home and list), dev notifications page, health,
  version, perf, and the Sentry example routes.
- **Home:** the sign-ups count, the style/colour-scheme controls, re-reading the account's
  style from its profile, and a router `Link` for Configure (a plain anchor until
  `/config/$list` exists).
- **List:** the palette picker (`Theme.Button`) and the Style link.
- **Platform:** the service worker (`sw.ts`, offline shell, page cache, background sync),
  Sentry (client, and the server's `instrument.server.mjs`), and the `entry.*` files (Start
  provides defaults). `react-router.config.ts` is here too.
- **Deployment:** the Dockerfile's runtime stage still copies `build/`. Nitro builds a
  self-contained `.output/` (server and static files), so copy that instead, and drop the
  `--prod` install it no longer needs. Its health check needs the `/health` route back.
- **Tests:** `supabase.server.test.ts` covers code that's still here.
- **Docs:** CONTRIBUTING.md still describes React conventions (hooks, effects, Conform), and
  README sections for unported features still describe the React version.
