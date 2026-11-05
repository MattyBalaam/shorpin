// The list an installed app opens on launch, starred on home. Shared by the
// server (reads the Cookie header, sets the cookie) and the browser (reads
// and writes document.cookie while offline) — see README.md's "Default list
// on launch".

import * as v from "valibot";

/** Appended to the manifest's start_url so only PWA launches redirect. */
export const LAUNCH_PARAM = "launch";

export const DEFAULT_LIST_COOKIE = "default-list";

// Unsigned so the client can read it offline (a signing secret can't ship
// to the browser); the value is a non-sensitive list id, re-validated on
// read. Not Secure: Safari rejects Secure cookies over plain-http localhost.
// Browsers cap lifetime at 400 days; refreshed on every launch.
const MAX_AGE = 400 * 24 * 60 * 60;

export const defaultListCookieOptions = {
  path: "/",
  sameSite: "lax",
  maxAge: MAX_AGE,
} as const;

const zListId = v.pipe(v.string(), v.uuid());

export function isLaunchUrl(url: URL) {
  return url.searchParams.has(LAUNCH_PARAM);
}

/** A list id from the cookie's value, or null if it isn't one. */
export function parseDefaultListId(value: string | null | undefined) {
  return v.is(zListId, value) ? value : null;
}

/** Reads the starred list's id from a `Cookie` header or `document.cookie`. */
export function readDefaultListId(cookieHeader: string | null | undefined) {
  const value = cookieHeader
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === DEFAULT_LIST_COOKIE)?.[1];
  return parseDefaultListId(value && decodeURIComponent(value));
}

/** A `Set-Cookie` / `document.cookie` value; null expires the cookie. */
export function serializeDefaultListCookie(listId: string | null) {
  return listId
    ? `${DEFAULT_LIST_COOKIE}=${listId}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`
    : `${DEFAULT_LIST_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
