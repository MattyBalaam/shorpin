/// <reference types="vite/client" />
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
  useMatches,
} from "@tanstack/solid-router";
import { createIsomorphicFn } from "@tanstack/solid-start";
import { getRequestHeader } from "@tanstack/solid-start/server";
import { createEffect, type Element, Loading, onSettled } from "solid-js";
import { ErrorState } from "~/components/error-state/error-state";
import { Spinner } from "~/components/spinner/spinner";
import { APP_STYLE_ATTRIBUTE, isAppStyle, parseAppStyle } from "~/lib/app-style";
import { COLOR_SCHEME_ATTRIBUTE, parseColorScheme } from "~/lib/color-scheme";
import "~/styles/reset.css";
import "~/styles/typography.css";
import "~/styles/app-styles.css";
import * as styles from "./root.css";
import { themeClass } from "./styles/theme.css";

// The same cookie read on both sides: the request's header while server
// rendering, document.cookie once running in the browser. React Router
// needed a server loader plus a clientLoader fallback for offline; an
// isomorphic function never touches the network.
const readCookieHeader = createIsomorphicFn()
  .server(() => getRequestHeader("Cookie") ?? "")
  .client(() => document.cookie);

export const Route = createRootRoute({
  loader: () => {
    const cookieHeader = readCookieHeader();
    // Not yet ported: home re-reading the account's style from its profile
    // (see legacy/README.md). The cookie alone is enough for the spike.
    return {
      colorScheme: parseColorScheme(cookieHeader),
      appStyle: parseAppStyle(cookieHeader),
    };
  },
  head: () => ({
    meta: [
      { charset: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
      },
      { name: "theme-color", content: "#0fc1e5" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Shorpin" },
      { title: "Shorpin" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon-180x180.png" },
    ],
  }),
  shellComponent: RootDocument,
  component: App,
  errorComponent: (props) => (
    <main class={styles.main}>
      <ErrorState error={props.error} reset={props.reset} />
    </main>
  ),
});

/** A list's own style override, else the account's (see app-style.ts). */
function useEffectiveAppStyle() {
  const matches = useMatches();
  const rootData = Route.useLoaderData();
  return () => {
    for (const { loaderData } of [...matches()].reverse()) {
      if (loaderData && typeof loaderData === "object" && "appStyleOverride" in loaderData) {
        const { appStyleOverride } = loaderData;
        if (isAppStyle(appStyleOverride)) return appStyleOverride;
      }
    }
    return rootData().appStyle;
  };
}

function RootDocument(props: { children?: Element }) {
  const rootData = Route.useLoaderData();
  const appStyle = useEffectiveAppStyle();

  return (
    <html
      lang="en"
      class={themeClass}
      {...{
        [APP_STYLE_ATTRIBUTE]: appStyle(),
        [COLOR_SCHEME_ATTRIBUTE]: rootData().colorScheme,
      }}
    >
      <head>
        <HeadContent />
      </head>
      <body>
        <div aria-hidden="true" class={styles.statusBarBackdrop} />
        {props.children}
        <Scripts />
      </body>
    </html>
  );
}

function App() {
  // The location once its loaders have resolved and its matches are on
  // screen: `useLocation` moves as soon as a navigation starts.
  const resolvedPath = useRouterState({ select: (state) => state.resolvedLocation?.pathname });

  // Tests wait on this before interacting (integration-tests/helpers.ts):
  // it's only written once the client is running this route and has
  // rendered it.
  createEffect(resolvedPath, (pathname) => {
    if (pathname !== undefined) document.documentElement.dataset.hydratedPath = pathname;
  });

  onSettled(function trackKeyboardViewport() {
    // TEMPORARY: iOS Safari doesn't support `interactive-widget=resizes-content`
    // yet, so the keyboard doesn't resize the layout — Safari pans the page
    // instead, exposing blank space below it. Size the layout to the visual
    // viewport and undo the pan so the actions bar sits above the keyboard.
    // Delete this once Safari ships `interactive-widget` (see README
    // "On-screen keyboard sizing").
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;

    function sync() {
      if (!viewport) return;
      root.style.setProperty("--visual-viewport-height", `${viewport.height}px`);
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    }

    const controller = new AbortController();
    viewport.addEventListener("resize", sync, { signal: controller.signal });
    viewport.addEventListener("scroll", sync, { signal: controller.signal });
    sync();

    return () => {
      controller.abort();
      root.style.removeProperty("--visual-viewport-height");
    };
  });

  return (
    <Loading
      fallback={
        <main class={styles.loading}>
          <Spinner />
        </main>
      }
    >
      <main class={styles.main}>
        <Outlet />
      </main>
    </Loading>
  );
}
