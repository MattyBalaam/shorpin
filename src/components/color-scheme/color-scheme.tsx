import { rootRouteId, useLoaderData } from "@tanstack/solid-router";
import { createSignal, type Element } from "solid-js";
import { Button } from "~/components/button/button";
import { ContrastIcon, MoonIcon, SunIcon } from "~/components/icon/icons";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";
import { type ColorScheme, colorSchemes, serializeColorSchemeCookie } from "~/lib/color-scheme";

// The cookie is the store. The root loader reads it (the request's header
// on the server, document.cookie in the browser), so <html> is
// server-rendered and hydrated in the saved scheme. A change writes the
// cookie and this signal, so it applies at once, even offline, without
// re-running any loader. The signal is only ever written in the browser
// (from a click), so the server, where module state is shared between
// requests, always reads the loader's value.
const [chosen, setChosen] = createSignal<ColorScheme | null>(null);

function setColorScheme(scheme: ColorScheme) {
  document.cookie = serializeColorSchemeCookie(scheme);
  setChosen(scheme);
}

export function useColorScheme(): () => ColorScheme {
  const rootData = useLoaderData({ from: rootRouteId });
  return () => chosen() ?? rootData().colorScheme;
}

const schemeNames = Object.keys(colorSchemes) as ColorScheme[];

const schemeIcons = {
  system: ContrastIcon,
  light: SunIcon,
  dark: MoonIcon,
} satisfies Record<ColorScheme, () => Element>;

/** Cycles Auto → Light → Dark, showing the current choice. */
export function ColorSchemeToggle() {
  const scheme = useColorScheme();
  const next = () => schemeNames[(schemeNames.indexOf(scheme()) + 1) % schemeNames.length];

  return (
    <Button variant="outline" onClick={() => setColorScheme(next())}>
      {schemeIcons[scheme()]()}
      <VisuallyHidden>Colour scheme: </VisuallyHidden>
      {colorSchemes[scheme()].label}
    </Button>
  );
}
