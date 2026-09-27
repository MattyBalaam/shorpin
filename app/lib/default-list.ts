// Shared between the home route's server loader/action (reads the Cookie
// header, emits Set-Cookie) and its clientLoader/clientAction (reads/writes
// document.cookie while offline) — see README.md's "Default list on launch".

import { createCookie } from "react-router";
import * as v from "valibot";

/** Appended to the manifest's start_url so only PWA launches redirect. */
export const LAUNCH_PARAM = "launch";

// Unsigned so the client can read it offline (a signing secret can't ship
// to the browser); the value is a non-sensitive list id, re-validated on
// read. Not Secure: Safari rejects Secure cookies over plain-http localhost.
// Browsers cap lifetime at 400 days; refreshed on every launch.
const defaultListCookie = createCookie("default-list", {
  path: "/",
  sameSite: "lax",
  maxAge: 400 * 24 * 60 * 60,
});

const zListId = v.pipe(v.string(), v.uuid());

export function isLaunchUrl(url: URL) {
  return url.searchParams.has(LAUNCH_PARAM);
}

export async function readDefaultListId(cookieHeader: string | null) {
  const value: unknown = await defaultListCookie.parse(cookieHeader);
  return v.is(zListId, value) ? value : null;
}

export function serializeDefaultListCookie(listId: string | null) {
  return listId
    ? defaultListCookie.serialize(listId)
    : defaultListCookie.serialize("", { maxAge: 0 });
}
