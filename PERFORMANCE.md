# Performance Analysis

The app is functional and fast in most areas, but a few targeted fixes would make it feel genuinely snappy. This document records the current state, what's already well-optimised, and a prioritised action list.

---

## Already well-optimised

These are working well — don't change them.

- **No N+1 queries** — list items fetched with nested expansion in a single Supabase call (`list_items(*)`)
- **Motion library lazy-loaded** — `LazyMotion` with deferred `domMax` feature import in `app/routes/app/layout.tsx`
- **Supabase Realtime dynamically imported** — only loaded when the list route mounts (`list.tsx`)
- **System fonts only** — no web font fetch; Google Fonts import is intentionally commented out in `root.tsx`
- **Vanilla Extract** — zero runtime CSS overhead; all styles compiled at build time
- **`clientLoader` offline cache** — sophisticated offline-first caching in `app/routes/list/list.tsx` with smart `shouldRevalidate`
- **Minimal client state** — only 2 React contexts (`OnlineContext`, `ThemeContext`); form state managed by Conform, not React state
- **RLS indexes** — `lists` and `list_items` tables have indexes on `slug`, `state`, `list_id`, and `sort_order`

---

## Prioritised improvements

### 🔴 High impact

#### 1. Add HTTP Cache-Control headers

**File:** `app/entry.server.tsx`

No `Cache-Control`, `ETag`, or `stale-while-revalidate` headers are set on any SSR response. Every navigation — including back-button — hits the server fresh.

**Fix:** Add `private, max-age=0, stale-while-revalidate=30` to authenticated responses in `entry.server.tsx`. Static assets already get content-hash URLs from Vite, so those are fine as-is.

**Impact:** Repeat visits and back-navigations served from the browser's revalidation cache instead of a fresh server round-trip.

---

#### 2. Proactive JWT refresh to avoid mid-request token re-check

**File:** `app/lib/supabase.middleware.ts:73`

When the JWT expiry heuristic (`secs <= 0`) fires, `supabase.auth.getSession()` is called synchronously in the request path — adding a full Supabase auth RTT (~50–200ms) to the response time. The middleware already instruments this path (lines 50, 67, 91) so the latency is measurable.

**Fix:** Refresh proactively when the token is within 60 seconds of expiry (change `secs <= 0` to `secs <= 60`). The refresh will happen on a request where it's still valid, keeping the hot path free.

**Impact:** Eliminates a 50–200ms spike on every request where the token has just expired.

---

### 🟡 Medium impact

#### 3. Config route: ownership check creates a sequential waterfall

**File:** `app/routes/list/config.server.ts:14–44`

The ownership check (lines 14–27) must resolve before the `Promise.all` fetching users and members starts. That's two sequential Supabase round-trips on every config page load.

**Fix (option A — preferred):** Move the ownership check into RLS (the pattern already used on other tables) so all three fetches can be parallelised in a single `Promise.all`.

**Fix (option B — simpler):** Start the user/member fetches immediately alongside the ownership check, then gate the response on both:

```ts
const [ownerCheck, users, members] = await Promise.all([
  supabase.from("lists").select("id").eq("id", listId).eq("user_id", userId).single(),
  supabase.from("profiles").select("id, email").neq("id", userId),
  supabase.from("list_members").select("user_id").eq("list_id", listId),
]);
if (ownerCheck.error) throw redirect("/app");
```

**Impact:** Saves ~1 Supabase RTT (~20–50ms) on every config page load.

---

#### 4. `waitlist` table has no index on `created_at`

**File:** `supabase/migrations/` — new migration needed

`sign-ups.server.ts:12` runs `ORDER BY created_at DESC` on the `waitlist` table with no supporting index. This is a full table scan today; it degrades as the waitlist grows.

**Fix:**

```sql
CREATE INDEX waitlist_created_at_idx ON waitlist (created_at DESC);
```

**Impact:** Prevents future degradation. Free to fix now.

---

### 🟢 Low impact / polish

#### 5. Enable React Compiler

**Files:** `vite.config.ts`, `package.json`

The `itemsKey` computation in `app/routes/list/list.tsx:242` rebuilds a string on every render and is a `useEffect` dependency, causing spurious effect re-runs. The manual fix is `useMemo`, but the better fix is React Compiler — it handles this entire class of problem automatically.

The codebase is an ideal candidate:

- React 19.2 ✅
- Zero existing `useMemo` / `useCallback` / `React.memo` — nothing to unwind ✅
- No Compiler rule violations: hooks at top-level, no prop/state mutations ✅

**Integration:** `@react-router/dev/vite` accepts babel plugin options. Install `babel-plugin-react-compiler` as a dev dependency and configure it:

```ts
// vite.config.ts
reactRouter({
  babel: {
    plugins: [["babel-plugin-react-compiler", {}]],
  },
});
```

**Impact:** Automatic memoization across all components and hooks, now and as the codebase grows.

---

#### 6. Remove production console log in `shouldRevalidate`

**File:** `app/routes/list/list.tsx:64`

A `console.log` fires on every navigation event in production. Minor noise but easy to remove.

**Fix:** Delete the line or wrap it: `if (import.meta.env.DEV) console.log(...)`.

---

## How to verify each fix

| Fix                          | Verification method                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Cache-Control headers        | Browser DevTools → Network tab → response headers on page navigations                                               |
| JWT refresh buffer           | Middleware timing logs at `supabase.middleware.ts:50,67,91`; check the slow path stops firing                       |
| Config route parallelisation | Add timing logs around loader; compare before/after RTT count in Supabase dashboard                                 |
| Waitlist index               | `EXPLAIN ANALYZE SELECT ... ORDER BY created_at DESC FROM waitlist` in Supabase SQL editor — should show index scan |
| React Compiler               | React DevTools Profiler — renders should show memoized components; `itemsKey` effect should not fire spuriously     |
| Console log removal          | Check browser console during navigation in production build                                                         |
