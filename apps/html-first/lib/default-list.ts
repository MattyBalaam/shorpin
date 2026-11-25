// The list a PWA launch opens (manifest start_url is `/?launch`). A device
// preference, so a cookie rather than the profile. Unsigned and not
// HttpOnly: the value is a non-sensitive list id, re-validated on read.

export const LAUNCH_PARAM = "launch";
export const DEFAULT_LIST_COOKIE = "default-list";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readDefaultListId(cookieHeader: string | null | undefined) {
  const value = cookieHeader
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === DEFAULT_LIST_COOKIE)?.[1];
  return value && UUID.test(value) ? value : null;
}

// Browsers cap cookie lifetime at 400 days; refreshed on every launch.
const MAX_AGE = 400 * 24 * 60 * 60;

export function serializeDefaultListCookie(listId: string | null) {
  return listId
    ? `${DEFAULT_LIST_COOKIE}=${listId}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`
    : `${DEFAULT_LIST_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
