/// <reference types="vite/client" />
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
  useRouterState,
} from "@tanstack/solid-router";
import { isServer } from "@solidjs/web";
import { createIsomorphicFn } from "@tanstack/solid-start";
import { getRequestHeader } from "@tanstack/solid-start/server";
import { createEffect, type Element, Loading, onSettled } from "solid-js";
import { useEffectiveAppStyle } from "~/components/app-style/use-app-style";
import { useColorScheme } from "~/components/color-scheme/color-scheme";
import { ErrorState } from "~/components/error-state/error-state";
import { Spinner } from "~/components/spinner/spinner";
import { APP_STYLE_ATTRIBUTE, DEFAULT_APP_STYLE, readAppStyleCookie } from "~/lib/app-style";
import { getAccountAppStyle } from "~/lib/app-style.functions";
import { initWebVitalsTracking, reportRouteNavigationMetric } from "~/lib/performance.client";
import { activateWaitingWorker, watchForUpdates } from "~/lib/service-worker.client";
import { toast } from "~/lib/toast";
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
  loader: async () => {
    const cookieHeader = readCookieHeader();
    // The cookie caches the account's style (see use-app-style.ts). Without
    // one (signed out, or the first request after signing in) the server
    // asks the profile, which also sets the cookie. In the browser the
    // cookie is all there is: home's loader brings the profile's value.
    const cached = readAppStyleCookie(cookieHeader);
    const appStyle = cached ?? (isServer ? await getAccountAppStyle() : null);
    return {
      colorScheme: parseColorScheme(cookieHeader),
      appStyle: appStyle ?? DEFAULT_APP_STYLE,
    };
  },
  // A match that stays on screen only reloads when it's invalidated, so
  // without this the root would keep the style it read when the app
  // started (or last invalidated) through e.g. a sign-out, which expires
  // the cookie. In the browser it only reads document.cookie, so re-reading
  // on every navigation costs nothing.
  shouldReload: true,
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

function RootDocument(props: { children?: Element }) {
  const appStyle = useEffectiveAppStyle();
  const colorScheme = useColorScheme();

  return (
    <html
      lang="en"
      class={themeClass}
      {...{
        [APP_STYLE_ATTRIBUTE]: appStyle(),
        [COLOR_SCHEME_ATTRIBUTE]: colorScheme(),
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

  const router = useRouter();

  // Web vitals and client navigation times, beaconed to /perf. A
  // navigation is timed from the router starting it to its loaders
  // resolving. Events without an href change are router.invalidate()
  // re-running the same location, not navigations.
  onSettled(function trackPerformance() {
    initWebVitalsTracking();

    let pending: { start: number; fromPathname: string; toPathname: string } | null = null;

    const stopStart = router.subscribe("onBeforeNavigate", (event) => {
      if (!event.fromLocation || !event.hrefChanged) return;
      pending = {
        start: performance.now(),
        fromPathname: event.fromLocation.pathname,
        toPathname: event.toLocation.pathname,
      };
    });

    const stopEnd = router.subscribe("onResolved", (event) => {
      const started = pending;
      // A navigation superseded by a newer one resolves as the newer one.
      if (!started || event.toLocation.pathname !== started.toPathname) return;
      pending = null;
      reportRouteNavigationMetric({
        pathname: started.toPathname,
        durationMs: performance.now() - started.start,
        fromPathname: started.fromPathname,
      });
    });

    return () => {
      stopStart();
      stopEnd();
    };
  });

  onSettled(function manageServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    const controller = new AbortController();

    // Clean up any registration that isn't the current worker (e.g. the
    // splash-screen SW removed in 4d22c02, still registered in some
    // returning users' browsers), leaving our own alone.
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        const scriptUrl =
          registration.active?.scriptURL ??
          registration.installing?.scriptURL ??
          registration.waiting?.scriptURL;
        if (scriptUrl && !scriptUrl.endsWith("/sw.js")) void registration.unregister();
      }
    });

    // Builds only: there's no sw.js under `pnpm dev` (see vite.config.ts).
    if (!import.meta.env.PROD) return () => controller.abort();

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Set only while a new worker is taking over (first install, or an
        // update the user accepted). The precache and page cache aren't
        // usable until it activates, so say when that happens.
        const worker = registration.installing ?? registration.waiting;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "activated") toast.success("Offline support ready");
        });

        watchForUpdates(
          registration,
          () =>
            toast.info("A new version is available", {
              id: "app-update",
              action: {
                label: "Reload",
                onClick: () => {
                  void activateWaitingWorker(registration).then(() => window.location.reload());
                },
              },
            }),
          controller.signal,
        );
      })
      .catch((error: unknown) => {
        console.error("Service worker registration failed", error);
      });

    return () => controller.abort();
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
