import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

// One-shot messages across a redirect: set by an action, shown (and spent)
// by the next page render. A cookie rather than a query string so a reload
// or a shared URL never repeats it.

export type FlashType = "success" | "info" | "warning" | "error";
export interface Flash {
  type: FlashType;
  message: string;
}

const COOKIE = "shorpin-flash";

export function setFlash(c: Context, type: FlashType, message: string) {
  setCookie(c, COOKIE, encodeURIComponent(JSON.stringify({ type, message })), {
    path: "/",
    sameSite: "Lax",
    httpOnly: true,
    maxAge: 60,
  });
}

export function takeFlash(c: Context): Flash | null {
  const value = getCookie(c, COOKIE);
  if (!value) return null;
  deleteCookie(c, COOKIE, { path: "/" });
  try {
    const flash = JSON.parse(decodeURIComponent(value)) as Flash;
    return typeof flash.message === "string" ? flash : null;
  } catch {
    return null;
  }
}

/** Redirects with a flash, the usual ending of a successful action. */
export function redirectWithFlash(c: Context, location: string, type: FlashType, message: string) {
  setFlash(c, type, message);
  return c.redirect(location, 303);
}
