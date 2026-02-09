import { AnimatePresence, motion, stagger, Variants } from "motion/react";

import {
  href,
  isRouteErrorResponse,
  Links,
  type LinksFunction,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "react-router";
import { getToast, setToast, toastMiddleware } from "remix-toast/middleware";
import type { Route } from "./+types/root";
import { useEffect } from "react";
import "~/styles/reset.css";

import { Toaster, toast } from "sonner";

import "./app.css";
import "~/styles/typography.css";

import "~/components/conform-input";

import { Link } from "./components/link/link";
import { Breadcrumbs } from "./components/breadcrumbs/breadcrumbs";
import {
  OnlineStatusIndicator,
  OnlineStatusProvider,
} from "./components/online-status/online-status";

import * as styles from "./root.css";
import { themeClass } from "./styles/theme.css";

export const middleware = [toastMiddleware()];

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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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

export default function App({
  loaderData: { toast: notification },
}: Route.ComponentProps) {
  useEffect(
    function showNewToast() {
      if (notification) {
        toast[notification.type](notification.message);
      }
    },
    [notification],
  );

  return (
    <OnlineStatusProvider>
      <OnlineStatusIndicator />
      <main className={styles.main}>
        <Breadcrumbs />
        <Outlet />
      </main>

      <Toaster />
    </OnlineStatusProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    const message =
      typeof error.data === "string" ? error.data : error.data?.message;

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
