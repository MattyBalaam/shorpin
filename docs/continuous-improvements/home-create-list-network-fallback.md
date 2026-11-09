# Home: queue list creation when the request fails

## Status

Planned. Follows the list-page change that queues item edits when the request fails, not only when `navigator.onLine` is false (README, "Offline / Local-first").

## Problem

[`app/routes/home/client-action.ts`](../../app/routes/home/client-action.ts) chooses its path before sending anything. If `navigator.onLine` is true it calls `serverAction`; otherwise it queues. On mobile, `navigator.onLine` stays true for several seconds after the connection drops. Creating, reordering or starring a list in that window throws "Load failed", and the error boundary shows the "You're offline." modal. Nothing is queued.

Falling back to the queue on any network error fixes the modal but adds a new risk. The server may have created the list and only the response was lost. The queued copy then replays on reconnect. Slugs are made unique server-side, so the replay creates a second list called `<name>-2`.

Reorder and star are already safe to repeat. Reorder sets each row's `sort_order` and keeps whichever request lands last. Star only writes a cookie. Only create needs to be made safe to repeat.

## Approach

Give every create a client-generated list id. The server inserts the list with that id. If the id already exists, the server treats the request as a replay of a create it has already applied and redirects to that list instead of inserting again. This mirrors `newId` on the list page.

No migration should be needed. `lists.id` is a uuid primary key, and the insert policy (`auth.uid() = user_id`) doesn't restrict the id. Confirm this against the live schema before starting.

## Steps

1. **Schema.** Add `newListId: v.optional(v.pipe(v.string(), v.uuid()))` to `zCreate` in `home.schema.ts`. Don't call it `list-id`, because the star form already uses that name.

2. **Client: attach the id when the form is submitted** (`home.tsx`). Use Conform's `onSubmit` option, as `list.tsx` does. Build `FormData(form, submitter)`, set `newListId` to `crypto.randomUUID()`, `preventDefault()`, then call `submit(formData, { method: "POST" })`. Generate the id at submit time, not in a hidden input, so retyping and resubmitting after a validation error always gets a fresh id.

3. **Client action: fall back to the queue on a network error** (`client-action.ts`).
   - Move the current offline body into a `queueOfflineMutation(request)` helper.
   - When online, take `request.clone()`, call `withStaleVersionRetry(serverAction)`, and on an `isNetworkOrServerError` error pass the clone to the helper.
   - In the create branch, use `newListId` as the pending row's `id` instead of a fresh `crypto.randomUUID()`. The real row and the placeholder row then share an id, so React keeps the same element when the real row replaces the placeholder.

4. **Server: make the insert safe to repeat** (`home.server.ts`).
   - Pass `id: newListId` to `insertList` when it's present.
   - The retry loop currently treats every `23505` as a slug collision and retries with a random suffix. With a fixed id, a primary-key collision would retry three times and then fail. Before that loop, check for a primary-key collision. Either match the `lists_pkey` constraint name in the error message, or (more robust) select by id when `insertList` fails: `select("slug, state").eq("id", newListId).maybeSingle()`.
     - If the row exists and is active, redirect to `/lists/<slug>` with the same success toast. The request was a replay.
     - If the row exists but was deleted, redirect to `/`. Don't bring a list back that the user deleted between the create and the replay.
     - If no row is visible, the id belongs to another user's list. RLS hides it, and with uuids this should never happen. Return the existing "Failed to create list" error.
   - If `newListId` is absent (older clients), keep the current behaviour.

5. **Mocks** (`mocks/api/rest/v1/lists.ts`). Use `body.id ?? crypto.randomUUID()` when inserting. Return `23505` with `lists_pkey` in the message when the id already exists, matching Postgres. Support the `id=eq.` lookup the server uses after a failed insert (a lookup already exists for the launch redirect; check it covers lists in any state).

6. **Replay paths.** Home's `syncPendingQueue` and the service worker's `drainSimpleMutations` resend the stored form fields as they are, so `newListId` goes along without changes. A replayed create that was already applied gets a redirect to the existing list. `isSuccessfulReplay` already counts any redirect other than one to `/login` as delivered.

## Tests (`integration-tests/home.spec.ts` or `offline.spec.ts`)

- **Connection drops before the browser notices.** Route `**/*.data*` POSTs to `abort("internetdisconnected")` without calling `setOffline`. Create a list. Expect a pending row, no "Retry" modal, and a queued mutation. Remove the route and trigger a sync (go offline then online, or reload). Expect exactly one list with that name.
- **Response lost after the server applied it.** In the route handler, `await route.fetch()`, then `route.abort()`. Create a list, let the queue drain, and expect exactly one list with that name and no `-2` copy.
- **Reorder and star with the connection down.** Both should queue, or write the cookie for star, instead of showing the modal.
- Check that both new create tests fail with the fallback disabled. Do the same for the list-page tests.

## Out of scope / follow-ups

- **Keep one queue entry per list on the list page.** Each offline edit adds a queue entry, but the sync only uses the latest local state. Replacing the entry on each edit, instead of adding another, would stop the queue from growing over a long offline session.
- **Config, sign-ups and delete-list stay online-only.** They have no local cache. The friendly error modal remains the intended behaviour for them.

## Docs

When this lands, extend the README paragraph "List edits queue on a failed request…" to cover home. In the paragraph on reconnecting home, change "creation is append-only and de-duplicated server-side" to explain that the client id is what makes a replayed create safe.
