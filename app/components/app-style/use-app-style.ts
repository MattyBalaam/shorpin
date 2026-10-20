import { useEffect, useState, useSyncExternalStore } from "react";
import { useMatches, useRouteLoaderData } from "react-router";
import { type AppStyle, DEFAULT_APP_STYLE, isAppStyle } from "~/lib/app-style";
import type { loader as rootLoader } from "~/root";

// Two layers decide the style on <html>:
//
// 1. The account's own choice, stored on its profile and cached in a cookie
//    so the server renders <html> with it (no flash of the default on load).
//    The root loader returns it; saving on home is online-only and applies
//    once the root loader revalidates (see root.tsx).
// 2. A per-list override, stored on the list (`lists.theme_style`). Routes
//    expose it as `appStyleOverride` in their loader data, which covers
//    server rendering; while a list is mounted it also publishes its local
//    (possibly unsynced) choice here, so a save applies straight away, even
//    offline.

function createStore<T>(initial: T) {
  let value = initial;
  const changes = new EventTarget();
  return {
    get: () => value,
    set(next: T) {
      value = next;
      changes.dispatchEvent(new Event("change"));
    },
    subscribe(onChange: () => void) {
      const controller = new AbortController();
      changes.addEventListener("change", onChange, { signal: controller.signal });
      return () => controller.abort();
    },
  };
}

/** The account's chosen style, ignoring any list override. */
export function useAccountAppStyle() {
  return useRouteLoaderData<typeof rootLoader>("root")?.appStyle ?? DEFAULT_APP_STYLE;
}

// `undefined` while no list is mounted; `{ style: null }` is a mounted list
// with no override, which must still win over a stale loader value.
const localOverride = createStore<{ style: AppStyle | null } | undefined>(undefined);

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
  const fromLoader = useLoaderOverride();
  const local = useSyncExternalStore(localOverride.subscribe, localOverride.get, () => undefined);
  return (local ? local.style : fromLoader) ?? account;
}

/**
 * A list's style override, starting from the saved value and updated
 * optimistically on save. Published for root to render while mounted.
 */
export function useListAppStyle(saved: AppStyle | null) {
  const [style, setStyle] = useState(saved);

  // A revalidation (this or another device saving) wins over a local value.
  useEffect(
    function syncSavedListStyle() {
      setStyle(saved);
    },
    [saved],
  );

  useEffect(
    function publishListStyle() {
      localOverride.set({ style });
      return () => localOverride.set(undefined);
    },
    [style],
  );

  return [style, setStyle] as const;
}
