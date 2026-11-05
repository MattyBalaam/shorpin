// Shared between app/sw.ts (service worker bundle) and
// app/routes/auth/logout.tsx (client bundle) — single source of truth so the
// two can't drift on what "the page cache" means.

export const PAGE_CACHE_NAME = "shorpin-pages";

/**
 * Routes whose rendered HTML the service worker's NetworkFirst runtime cache
 * is allowed to store — exactly the two routes the rest of the offline
 * feature covers. Deliberately excludes nested/adjacent paths like
 * /sign-ups, /config/:list, /lists/:list/confirm-delete, and all auth
 * routes: those are session-sensitive or out of the offline feature's scope
 * and must always fall through to the generic offline shell.
 */
export function isCacheablePageUrl(pathname: string): boolean {
  return pathname === "/" || /^\/lists\/[^/]+$/.test(pathname);
}
