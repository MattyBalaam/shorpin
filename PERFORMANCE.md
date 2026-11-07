# Performance Analysis

The app is functional and fast in most areas, but a few targeted fixes would make it feel genuinely snappy. This document records the current state, what's already well-optimised, and a prioritised action list.

Rechecked after the move to TanStack Start + Solid: the React-only items (React Compiler, a `shouldRevalidate` console log) and the old JWT expiry heuristic no longer apply, and the waitlist index has shipped.

---

## Already well-optimised

These are working well — don't change them.

- **No N+1 queries** — list items fetched with nested expansion in a single Supabase call (`list_items(*)`)
- **No animation library** — drag/reorder/swipe use a small pointer-events + WAAPI controller (`src/components/reorderable/create-drag-list.ts`) in place of Motion (~48 KB gzipped)
- **Supabase Realtime dynamically imported** — only loaded when the list route mounts (`loadRealtime` in `src/routes/list/list.tsx`)
- **System fonts only** — no web font fetch
- **Vanilla Extract** — zero runtime CSS overhead; all styles compiled at build time
- **Offline-first loaders** — home and list's isomorphic loaders fall back to IndexedDB in the browser, before or instead of a network request
- **Fine-grained reactivity, minimal client state** — Solid updates only the DOM that reads a changed signal, so there's no re-render cost to memoise away; one context (`OnlineContext`)
- **Local JWT verification** — `authMiddleware` uses `getClaims()`, which verifies the access token against the projects' ES256 signing keys (cached by supabase-js) instead of a round trip to the auth server per server function
- **List page in two queries** — the list query embeds the user's `list_views` row, and the visit is one upsert
- **Indexes** — `lists` and `list_items` have indexes on `slug`, `state`, `list_id` and `sort_order`; `waitlist` has `waitlist_created_at_idx` for the sign-ups page's `ORDER BY created_at DESC`

---

## Prioritised improvements

### 🔴 High impact

#### 1. Add HTTP Cache-Control headers

**File:** `src/start.ts` (a request middleware)

No `Cache-Control`, `ETag`, or `stale-while-revalidate` headers are set on any SSR response. Every navigation — including back-button — hits the server fresh.

**Fix:** Add `private, max-age=0, stale-while-revalidate=30` to authenticated page responses. Static assets already get content-hash URLs from Vite, so those are fine as-is.

**Impact:** Repeat visits and back-navigations served from the browser's revalidation cache instead of a fresh server round-trip.

---

### 🟡 Medium impact

#### 2. Config route: ownership check creates a sequential waterfall

**File:** `src/routes/list/config.functions.ts` (`getListConfig`)

`findOwnedList` must resolve before the `Promise.all` fetching profiles and members starts. That's two sequential Supabase round-trips on every config dialog load.

**Fix (option A — preferred):** Move the ownership check into RLS (the pattern already used on other tables) so all three fetches can be parallelised in a single `Promise.all`.

**Fix (option B — simpler):** Start the profile/member fetches alongside the ownership check, then gate the response on it. The members query needs the list's id, so either look members up by the list's slug through a join, or accept that only the profiles query moves into the `Promise.all`.

**Impact:** Saves ~1 Supabase RTT (~20–50ms) on every config dialog load.

---

## How to verify each fix

| Fix                          | Verification method                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| Cache-Control headers        | Browser DevTools → Network tab → response headers on page navigations                   |
| Config route parallelisation | Add timing logs around `getListConfig`; compare before/after RTT count in the dashboard |
