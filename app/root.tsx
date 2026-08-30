import * as Sentry from "@sentry/react-router";
import { Suspense, useEffect, useRef } from "react";
import {
  href,
  isRouteErrorResponse,
  LayoutRouteProps,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type ShouldRevalidateFunctionArgs,
  useLocation,
  useNavigation,
  useRouteError,
} from "react-router";
import { getToast, toastMiddleware } from "remix-toast/middleware";
import { toast } from "sonner";
import { initWebVitalsTracking, reportRouteNavigationMetric } from "~/lib/performance.client";
import { isNetworkOrServerError } from "~/lib/network-error";
import { supabaseMiddleware } from "~/lib/supabase.middleware";
import type { Route } from "./+types/root";
import "~/styles/reset.css";

import "./app.css";
import "~/styles/typography.css";

import { ErrorState } from "./components/error-state/error-state";
import { Link } from "./components/link/link";
import { Spinner } from "./components/spinner/spinner";
import * as styles from "./root.css";
import { themeClass } from "./styles/theme.css";

export const middleware = [toastMiddleware(), supabaseMiddleware];

// export const links: LinksFunction = () => [
//   { rel: "preconnect", href: "https://fonts.googleapis.com" },
//   {
//     rel: "preconnect",
//     href: "https://fonts.gstatic.com",
//     crossOrigin: "anonymous",
//   },
//   {
//     rel: "stylesheet",
//     href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
//   },
// ];

export const loader = async ({ context }: Route.LoaderArgs) => {
  const toast = getToast(context);
  return { toast };
};

// Skip revalidation while offline — the .data fetch would fail and throw the
// whole app into the error boundary (e.g. after an offline clientAction on
// the list route). Route-level shouldRevalidate guards only cover their own route;
// the root loader revalidates after every action without this.
export function shouldRevalidate({ defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return false;
  }
  return defaultShouldRevalidate;
}

export const meta: Route.MetaFunction = () => {
  return [{ title: "Shorpin" }];
};

export function Layout({ children }: LayoutRouteProps) {
  return (
    <html lang="en" className={themeClass}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#A9CBB7" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Shorpin" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const navigation = useNavigation();
  const pendingNavigation = useRef<{
    start: number;
    fromPathname: string;
    toPathname: string;
  } | null>(null);

  useEffect(function bootstrapPerformanceTracking() {
    initWebVitalsTracking();
  }, []);

  useEffect(
    function trackRouteNavigation() {
      const toPathname = navigation.location?.pathname;

      if (navigation.state !== "idle" && toPathname) {
        if (!pendingNavigation.current || pendingNavigation.current.toPathname !== toPathname) {
          pendingNavigation.current = {
            start: performance.now(),
            fromPathname: pathname,
            toPathname,
          };
        }
        return;
      }

      const pending = pendingNavigation.current;
      if (!pending) {
        return;
      }

      pendingNavigation.current = null;

      if (pathname === pending.toPathname) {
        reportRouteNavigationMetric({
          pathname,
          durationMs: performance.now() - pending.start,
          fromPathname: pending.fromPathname,
        });
      }
    },
    [navigation.state, navigation.location?.pathname, pathname],
  );

  useEffect(
    function signalHydration() {
      document.documentElement.dataset.hydratedPath = pathname;
    },
    [pathname],
  );

  useEffect(function manageServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    // Clean up any pre-existing registration that isn't our current SW
    // (e.g. the splash-screen SW removed in 4d22c02, still registered in
    // some returning users' browsers) — but leave our own alone, unlike the
    // old unconditional unregister-everything effect this replaces, which
    // would have killed this SW on every load too.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        const scriptUrl =
          registration.active?.scriptURL ??
          registration.installing?.scriptURL ??
          registration.waiting?.scriptURL;
        if (scriptUrl && !scriptUrl.endsWith("/sw.js")) {
          registration.unregister();
        }
      }
    });

    // Only registered for real builds — vite-plugin-pwa's devOptions.enabled
    // is false, so there's no compiled sw.js to register under `pnpm dev`.
    if (import.meta.env.PROD) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // installing/waiting is only set while a *new* worker is taking
          // over (first-ever install, or an update after a redeploy) — on
          // an ordinary page load where the SW is already active and
          // controlling, both are null and this is a no-op. Surfacing this
          // is mostly for confirming, without digging into DevTools,
          // exactly when a rebuilt SW has actually taken over — the
          // precache/runtime cache it's responsible for isn't usable until
          // this fires.
          const worker = registration.installing ?? registration.waiting;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "activated") {
              toast.success("Offline support ready");
            }
          });
        })
        .catch((error) => {
          console.error("Service worker registration failed", error);
        });
    }
  }, []);

  useEffect(function handleRouteModuleErrors() {
    // Recover from stale/deployed chunk mismatches by clearing Cache Storage
    // and reloading when route module scripts fail to load.
    const handleError = (event: ErrorEvent) => {
      // A module failing to load while genuinely offline isn't a stale
      // deployed chunk — it's just the network being down. Clearing caches
      // here would destroy the offline.html precache and the shorpin-pages
      // runtime cache (see app/sw.ts) right when they're needed most, and
      // the reload this triggers can itself fail to load a chunk offline,
      // re-firing this same handler in a loop.
      if (!navigator.onLine) return;

      if (
        event.message.includes("Error loading route module") ||
        event.message.includes("Importing a module script failed")
      ) {
        console.error("Route module load error, clearing caches and reloading...");
        if ("caches" in window) {
          window.caches.keys().then((names) => {
            names.forEach((name) => window.caches.delete(name));
          });
        }
        window.location.reload();
      }
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  return (
    <Suspense
      fallback={
        <main className={styles.loading}>
          <Spinner />
        </main>
      }
    >
      <main className={styles.main}>
        <Outlet />
      </main>
    </Suspense>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  // A dead server or no connection reaches every route the same way — a
  // fetch() that never got a response, or a 5xx bubbled up as a route error
  // response. Routes without their own boundary (auth, /sign-ups, etc.) fall
  // through to this one, so it needs the same network-awareness home.tsx and
  // list.tsx already have, rather than dumping a raw fetch-failure message.
  if (isNetworkOrServerError(error)) {
    return (
      <main className={styles.main}>
        <ErrorState error={error} />
      </main>
    );
  }

  if (isRouteErrorResponse(error)) {
    const message = typeof error.data === "string" ? error.data : error.data?.message;

    return (
      <main className={styles.main}>
        <h1>{error.status}</h1>
        <p>{message}</p>
        <Link to={href("/")}>Back to home</Link>
      </main>
    );
  }

  if (error && error instanceof Error) {
    Sentry.captureException(error);
  }

  return (
    <main className={styles.main}>
      <h1>Something went wrong</h1>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    </main>
  );
}
