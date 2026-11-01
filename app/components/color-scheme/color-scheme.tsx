import { useSyncExternalStore } from "react";
import { useRouteLoaderData } from "react-router";
import { Button } from "~/components/button/button";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";
import {
  type ColorScheme,
  colorSchemes,
  DEFAULT_COLOR_SCHEME,
  parseColorScheme,
  serializeColorSchemeCookie,
} from "~/lib/color-scheme";
import type { loader as rootLoader } from "~/root";

// The cookie is the store. The root loader's value is the server snapshot, so
// <html> is server-rendered and hydrated in the saved scheme; after that the
// cookie is read directly, so a change applies at once, even offline.
// `document.cookie` rather than `cookieStore`: the snapshot must be read
// synchronously, and `cookieStore` only exists in secure contexts.

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setColorScheme(scheme: ColorScheme) {
  document.cookie = serializeColorSchemeCookie(scheme);
  for (const listener of listeners) listener();
}

export function useColorScheme() {
  const serverValue =
    useRouteLoaderData<typeof rootLoader>("root")?.colorScheme ?? DEFAULT_COLOR_SCHEME;
  return useSyncExternalStore(
    subscribe,
    () => parseColorScheme(document.cookie),
    () => serverValue,
  );
}

const schemeNames = Object.keys(colorSchemes) as ColorScheme[];

/** Cycles Auto → Light → Dark, showing the current choice. */
export function ColorSchemeToggle() {
  const scheme = useColorScheme();
  const next = schemeNames[(schemeNames.indexOf(scheme) + 1) % schemeNames.length];

  return (
    <Button variant="outline" onClick={() => setColorScheme(next)}>
      <VisuallyHidden>Colour scheme: </VisuallyHidden>
      {colorSchemes[scheme].label}
    </Button>
  );
}
