// Shared between the home route's server loader/action (reads the Cookie
// header, emits Set-Cookie) and its clientLoader/clientAction (reads/writes
// document.cookie while offline) — see README.md's "Default list on launch".

import * as v from "valibot";

export const DEFAULT_LIST_COOKIE = "default-list";

/** Appended to the manifest's start_url so only PWA launches redirect. */
export const LAUNCH_PARAM = "launch";

// Browsers cap cookie lifetime at 400 days; refreshed on every launch.
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

// Not Secure: the value is a non-sensitive list id, and Safari rejects Secure
// cookies over plain-http localhost during development.
const ATTRIBUTES = "Path=/; SameSite=Lax";

export function isLaunchUrl(url: URL) {
  return url.searchParams.has(LAUNCH_PARAM);
}

export function readDefaultListId(cookieHeader: string | null | undefined): string | null {
  for (const pair of (cookieHeader ?? "").split(/;\s*/)) {
    const separator = pair.indexOf("=");
    if (pair.slice(0, separator) !== DEFAULT_LIST_COOKIE) continue;

    const value = decodeURIComponent(pair.slice(separator + 1));
    return v.is(v.pipe(v.string(), v.uuid()), value) ? value : null;
  }
  return null;
}

export function serializeDefaultListCookie(listId: string | null) {
  return listId
    ? `${DEFAULT_LIST_COOKIE}=${encodeURIComponent(listId)}; Max-Age=${MAX_AGE_SECONDS}; ${ATTRIBUTES}`
    : `${DEFAULT_LIST_COOKIE}=; Max-Age=0; ${ATTRIBUTES}`;
}
