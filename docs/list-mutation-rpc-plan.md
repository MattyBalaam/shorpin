# List Mutation RPC Refactor Plan

## Goal

Reduce branching and multi-step mutation orchestration in `app/routes/list/list.server.ts` by moving list mutation logic into a single transactional Supabase/Postgres RPC.

## Plan

1. Define behavior contract

- Document exact mutation semantics to preserve: add/edit/reorder/delete/undelete, prune deleted items, and unread/viewed behavior.
- Capture edge cases (failed mutation, no-op submission, permission failure).

2. Add a single DB RPC for list mutations

- Create a migration with `public.mutate_list(...)`.
- Accept validated mutation payload (JSON) and list identifier.
- Return normalized result payload for the route action.

3. Make RPC transactional and authoritative

- Perform all writes in one transaction to avoid partial updates.
- Handle add/update/reorder/delete/undelete in SQL.
- Enforce deleted-item pruning in the same transaction.

4. Move unread/view synchronization into DB mutation path

- Update `list_views.viewed_at` only when item mutations succeed.
- Use the same mutation timestamp for item `updated_at` and `viewed_at`.

5. Harden auth and permissions

- Ensure function permission model is explicit (`GRANT EXECUTE` to `authenticated`).
- Use safe function config (`SECURITY DEFINER` only if needed, controlled `search_path`).
- Keep access checks consistent with RLS/list membership constraints.

6. Simplify route action to one RPC call

- Keep Conform input parsing/validation in TypeScript.
- Replace branching mutation logic with a single `supabase.rpc(...)` call.
- Preserve current action response shape to avoid UI churn.

7. Keep loader focused on read concerns

- Leave loader responsible for list loading and list-open viewed behavior.
- Ensure action-triggered revalidation semantics do not regress unread behavior.

8. Add regression coverage

- Integration tests for unread behavior, collaborator behavior, and delete/undelete pruning.
- Keep e2e smoke aligned with intended unread semantics.

9. Rollout and cleanup

- Optionally ship behind a feature flag for one release.
- Remove old branching logic once tests are stable.
- Monitor RPC failures/latency post-merge.
