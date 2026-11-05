# Not yet ported to TanStack Start + Solid

This branch is a trial migration from React Router + React to TanStack Start + Solid 2. The
React Router code that hasn't been ported yet lives here, unchanged, for reference. It's
excluded from typecheck, lint and the build.

Ported so far (in `src/`): the root document, the auth and app layouts, sign-in (with the
dev quick-login), forgot/set password, request access, auth confirm, sign-out, home (lists
with unread counts, create, reorder, the launch-list star, the sign-ups count and dialog, and
the offline cache and queued replays), the list page (with its palette picker and Style link), list config, delete list, the style dialogs
(home and list), app styles, the colour-scheme toggle, the dev notifications page, the
health, version and perf server routes, and the service worker (offline shell, page cache and
update prompt; the Background Sync backstop was dropped).

Still to port:

- **Routes:** the Sentry example routes.
- **Platform:** Sentry (client, and the server's `instrument.server.mjs`), and the `entry.*` files (Start
  provides defaults). `react-router.config.ts` is here too.
- **Deployment:** the Dockerfile's runtime stage still copies `build/`. Nitro builds a
  self-contained `.output/` (server and static files), so copy that instead, and drop the
  `--prod` install it no longer needs. Its health check hits `/health`, which is ported.
- **Tests:** `supabase.server.test.ts` covers code that's still here (`requireUser`, which
  only the React style actions used; server functions use `authMiddleware` instead).
- **Docs:** CONTRIBUTING.md still describes React conventions (hooks, effects, Conform), and
  README sections for unported features still describe the React version.
