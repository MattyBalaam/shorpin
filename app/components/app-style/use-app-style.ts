import { useMatches, useRouteLoaderData } from "react-router";
import { DEFAULT_APP_STYLE, isAppStyle } from "~/lib/app-style";
import type { loader as rootLoader } from "~/root";

// Two layers decide the style on <html>:
//
// 1. The account's own choice, stored on its profile and cached in a cookie
//    so the server renders <html> with it (no flash of the default on load).
//    The root loader returns it; saving on home is online-only and applies
//    once the root loader revalidates (see root.tsx).
// 2. A per-list override, stored on the list (`lists.theme_style`). Routes
//    expose it as `appStyleOverride` in their loader data. Saving it is
//    online-only too, and applies once the list loader revalidates.

/** The account's chosen style, ignoring any list override. */
export function useAccountAppStyle() {
  return useRouteLoaderData<typeof rootLoader>("root")?.appStyle ?? DEFAULT_APP_STYLE;
}

function useLoaderOverride() {
  const matches = useMatches();
  for (const { loaderData } of [...matches].reverse()) {
    if (loaderData && typeof loaderData === "object" && "appStyleOverride" in loaderData) {
      const { appStyleOverride } = loaderData;
      return isAppStyle(appStyleOverride) ? appStyleOverride : null;
    }
  }
  return null;
}

/** The style the page should render in: a list's override, else the account's. */
export function useEffectiveAppStyle() {
  const account = useAccountAppStyle();
  return useLoaderOverride() ?? account;
}
