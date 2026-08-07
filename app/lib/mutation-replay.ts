// Shared between app/routes/home/home.tsx (main thread) and app/sw.ts
// (service worker) — both replay queued mutations with a raw fetch() rather
// than going through React Router, so both need the same check.

// Where supabaseMiddleware sends a request when the session is stale and
// can't be refreshed (see app/lib/supabase.middleware.ts). Not every
// redirect means failure — home's create-list action legitimately redirects
// to the new list's own page on success — so the check below has to look at
// *where* the request landed, not just whether a redirect happened.
const LOGIN_PATH = "/login";

/**
 * True only if `response` reflects the mutation actually reaching and being
 * accepted by the route action, rather than getting bounced to the login
 * page by a stale session. fetch()'s default "follow" redirect mode means
 * `response` already reflects wherever the request ultimately landed —
 * `response.ok` alone can't tell a delivered mutation apart from one that
 * got redirected to a perfectly normal-rendering /login page instead.
 */
export function isSuccessfulReplay(response: Response): boolean {
  return response.ok && new URL(response.url).pathname !== LOGIN_PATH;
}
