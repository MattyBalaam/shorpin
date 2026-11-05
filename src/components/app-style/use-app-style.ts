import { rootRouteId, useLoaderData, useMatches } from "@tanstack/solid-router";
import { type AppStyle, isAppStyle } from "~/lib/app-style";

// Two layers decide the style on <html>:
//
// 1. The account's own choice, stored on its profile and cached in a cookie
//    so the server renders <html> with it (no flash of the default on load).
//    The root loader reads the cookie; home's loader returns the profile's
//    value as `accountAppStyle`, so a change made on another device shows
//    here as soon as home loads. Saving is online-only, and applies once
//    the loaders run again (see routes/home/style.tsx).
// 2. A per-list override, stored on the list (`lists.theme_style`). Routes
//    expose it as `appStyleOverride` in their loader data. Saving it is
//    online-only too, and applies once the list loader runs again.

/** The deepest match's value for `key`, if it's a style (or null). */
function fromMatches(matches: readonly { loaderData?: unknown }[], key: string) {
  for (const { loaderData } of matches.toReversed()) {
    if (loaderData && typeof loaderData === "object" && key in loaderData) {
      const value: unknown = (loaderData as Record<string, unknown>)[key];
      return isAppStyle(value) ? value : null;
    }
  }
  return null;
}

/** The account's chosen style, ignoring any list override. */
export function useAccountAppStyle(): () => AppStyle {
  const matches = useMatches();
  const rootData = useLoaderData({ from: rootRouteId });
  return () => fromMatches(matches(), "accountAppStyle") ?? rootData().appStyle;
}

/** The style the page should render in: a list's override, else the account's. */
export function useEffectiveAppStyle(): () => AppStyle {
  const matches = useMatches();
  const account = useAccountAppStyle();
  return () => fromMatches(matches(), "appStyleOverride") ?? account();
}
