import { Suspense, useEffect, useRef } from "react";
import {
  href,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useNavigation,
  useRouteError,
} from "react-router";
import { getToast, toastMiddleware } from "remix-toast/middleware";
import { initWebVitalsTracking, reportRouteNavigationMetric } from "~/lib/performance.client";
import { supabaseMiddleware } from "~/lib/supabase.middleware";
import type { Route } from "./+types/root";
import "~/styles/reset.css";

import "./app.css";
import "~/styles/typography.css";

import "~/components/conform-input";

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

export function Layout({ children }: { children: React.ReactNode }) {
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

  useEffect(function unregisterStaleServiceWorkers() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
  }, []);

  useEffect(function handleRouteModuleErrors() {
    const handleError = (event: ErrorEvent) => {
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

  return (
    <main className={styles.main}>
      <h1>Something went wrong</h1>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    </main>
  );
}
