# Migrate Supabase (DB + Auth) to a self-hosted instance on Coolify

## Context

The app currently uses hosted Supabase (supabase.com) for Postgres, Auth (GoTrue), and Realtime broadcast. The goal is to run on infrastructure fully controlled via Coolify (already the deploy target per [coolify-setup.md](coolify-setup.md) and `coolify-synology-guide.md`) rather than depend on a third-party hosted service.

Audit of the current app found **~88 Supabase call sites across 19 files**, all speaking to Supabase through `@supabase/ssr` / `@supabase/supabase-js` / `@supabase/realtime-js` — i.e. PostgREST, GoTrue, and Realtime's wire protocols. Because **Coolify has a one-click self-hosted Supabase template** (Postgres + GoTrue + PostgREST + Realtime + Kong + Studio, from the official `supabase/docker` compose), the decision made in this planning session is:

- **Self-host the full Supabase stack on Coolify**, not swap it for a different DB/auth/realtime stack. This means **no application code changes** — `supabase.server.ts`, `supabase.middleware.ts`, all auth routes, all `.from()`/`.rpc()` call sites, the Realtime broadcast channel code, and the `mocks/` fake-Supabase test server all keep working unmodified, because the new instance speaks the identical protocol.
- The migration is therefore an **infra/ops project**: stand up the stack, migrate the schema + data, rotate secrets, repoint env vars, verify, cut over.
- Production data (users + lists) will be migrated via Supabase-native `pg_dump`/`pg_restore`, since source and target schemas are identical (same `auth`, `public`, `storage` schemas).

## What does NOT change

- `app/lib/supabase.server.ts`, `supabase.client.ts`, `supabase.middleware.ts`
- All 7 auth routes (`login`, `logout`, `forgot-password`, `auth/confirm`, `set-password`, `request-access`, `sign-ups`)
- All DB query sites (`home.server.ts`, `list.server.ts`, `config.server.ts`, `delete.server.ts`, etc.) and the `mutate_list` RPC
- Realtime broadcast (`list.server.ts` channel publish, `list.tsx`/`list-legacy.tsx` channel subscribe)
- `mocks/` fake Supabase server used for local dev + integration tests (never talks to real Supabase, so untouched)
- `supabase/migrations/*.sql` — these are the source of truth for schema and get applied to the new instance as-is

## What changes

Only the **connection target and secrets**, plus a few deploy-config lines.

### 1. Provision self-hosted Supabase on Coolify

- In Coolify: **Add Resource → Services → Supabase** (official one-click template). This deploys Postgres, GoTrue, PostgREST, Realtime, Kong (API gateway), Studio as a stack, separate from the app resource.
- Configure:
  - A domain/subdomain for the Kong API gateway (this becomes the new `VITE_SUPABASE_URL`) and optionally one for Studio.
  - **SMTP settings for GoTrue** — hosted Supabase provides a built-in mailer for password-reset/invite emails; self-hosted GoTrue needs a real SMTP provider configured, or `forgot-password` / invite flows silently fail. This is the one functional gap to close before cutover.
  - Postgres password, JWT secret, and the derived anon/service-role keys — Coolify's template generates these; treat them as brand-new secrets (they cannot match the old hosted project's keys).

### 2. Apply schema to the new instance

- Run the existing migrations against the new Postgres via the Supabase CLI already in `devDependencies`:
  ```sh
  supabase db push --db-url "postgresql://<user>:<password>@<host>:5432/postgres"
  ```
  This replays every file in `supabase/migrations/` (18 as of writing — recount before running) in order, recreating `lists`, `list_items`, `list_views`, `list_members`, `profiles`, `waitlist`, the `has_list_access()`/`mutate_list()`/`handle_new_user()` functions, RLS policies, and the `auth.users` triggers/FKs — identically to production.
- Skip `supabase link` and go straight to `--db-url`. `.github/workflows/ci.yml`'s `migrate-prod` job (see the comments above its `db push` step) already hit two issues worth avoiding here: `supabase link`'s project-linking API call has a known CLI parsing bug (SchemaError on `inserted_at`, CLI 2.108–2.112), and if the connection goes through a pooler, it must be **session mode**, not transaction mode — the CLI's migration runner uses prepared statements, which collide across pooled connections (`"prepared statement already exists"`, SQLSTATE 42P05) in transaction mode. If Coolify's self-host stack fronts Postgres with any pooler, use its session-mode port; if it's a direct connection, this doesn't apply.

### 3. Migrate data (Supabase-native dump/restore)

- From the hosted project, dump the full database including `auth` schema:
  ```sh
  pg_dump --dbname="<hosted-connection-string>" \
    --schema=auth --schema=public --schema=storage \
    -F c -f shorpin-dump.bak
  ```
  (or `supabase db dump --db-url ... -f shorpin-dump.bak`, which handles Supabase's schema exclusions correctly)
- Restore into the new self-hosted Postgres:
  ```sh
  pg_restore --dbname="<self-hosted-connection-string>" --clean --if-exists shorpin-dump.bak
  ```
- This carries over `auth.users` (with existing bcrypt password hashes — GoTrue self-hosted uses the same hashing, so no forced password reset) plus every row in `lists`/`list_items`/`profiles`/`list_members`/`waitlist`.
- Do this dump/restore as a **dress rehearsal against a throwaway Coolify Postgres first**, then repeat for real right before cutover to minimize the window of writes that happen on the old instance after the dump is taken.

### 4. Repoint env vars and secrets

Two different mechanisms currently supply Supabase config (per `Dockerfile` and [coolify-setup.md](coolify-setup.md)):

| Var                                     | Currently supplied via                                                | Change                                                       |
| --------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| `VITE_SUPABASE_URL`                     | GitHub Actions build secret → Docker `ARG` → baked into client bundle | Update the GitHub Actions secret to the new Kong gateway URL |
| `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Same (build-time)                                                     | Update to the new instance's anon key                        |
| `SUPABASE_SERVICE_ROLE_KEY`             | Coolify runtime env var                                               | Update to the new instance's service-role key                |

Because the `VITE_*` vars are **baked at build time**, changing them requires a fresh image build + push (not just a Coolify redeploy of the existing image) — call this out explicitly in the cutover step so it isn't missed.

(The `.env.example` naming inconsistency noted in an earlier draft of this plan — `VITE_SUPABASE_PUBLISHABLE_KEY` vs. the actual `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` — has since been fixed independently; no action needed here.)

### 5. Update the real-Supabase e2e suite

`e2e/supabase-setup.ts` / `e2e/supabase-teardown.ts` / `playwright.supabase.config.ts` use a service-role key to `auth.admin.createUser` and smoke-test against a real project. Point these at the new self-hosted instance (same env vars as above, likely via a `.env.e2e` or CI secret), and run `pnpm test:e2e` against it as the primary pre-cutover verification — this suite already exercises the exact auth + `list_views` access paths that matter most.

### 6. Cutover sequence

1. Stand up self-hosted Supabase on Coolify (step 1), apply migrations (step 2).
2. Do a rehearsal data migration (step 3) against it; run `pnpm test:e2e` (step 5) to confirm login, RLS, and `mutate_list` work identically.
3. Freeze writes on the old hosted project (brief maintenance window), take the final `pg_dump`, restore to the new instance.
4. Update GitHub Actions secrets + Coolify runtime env (step 4); trigger a rebuild so the new `VITE_*` values get baked in; let the existing deploy pipeline (`git push main` → CI → GHCR → Coolify webhook, per [coolify-setup.md](coolify-setup.md)) roll it out.
5. Verify `app/routes/health.ts` (already pings `lists`) is healthy against the new instance, then smoke-test login/list/realtime manually.
6. Keep the old hosted Supabase project intact but paused/read-only for a rollback window (e.g. 1–2 weeks) before cancelling it.

### 7. Post-migration ops

- Set up scheduled `pg_dump` backups of the self-hosted Postgres (Coolify supports scheduled backups on its database resources) — hosted Supabase did this automatically; self-hosting means it's now this project's responsibility.
- Note the stack is now ~8 containers to keep updated (Postgres, GoTrue, PostgREST, Realtime, Kong, Studio, plus the app) — track Supabase's self-hosting release notes for security updates.

## Verification

- `pnpm test:integration` — unaffected (runs against `mocks/`, not real Supabase); confirms no regressions from any incidental code touch.
- `pnpm test:e2e` against the new self-hosted instance — exercises real auth (`auth.admin.createUser`, sign-in, `list_views` access) end to end; this is the primary go/no-go gate before cutover.
- Manual smoke test post-deploy: log in, create/edit/reorder a list, open the same list in two browser tabs and confirm the Realtime broadcast still triggers a revalidation in the second tab, trigger a password-reset email and confirm SMTP delivery.
- `app/routes/health.ts` returning 200 against the new instance.
