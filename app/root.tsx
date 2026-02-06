import { AnimatePresence, motion, stagger, Variants } from "motion/react";

import {
  href,
  Links,
  type LinksFunction,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { getToast, setToast, toastMiddleware } from "remix-toast/middleware";
import type { Route } from "./+types/root";
import { useEffect } from "react";
import "~/styles/reset.css";

import { Toaster, toast } from "sonner";

import "./app.css";

import "~/components/conform-input";

import { Link } from "./components/link/link";
import { Breadcrumbs } from "./components/breadcrumbs/breadcrumbs";

import * as styles from "./root.css";
import { themeClass } from "./theme.css";

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

const navVariants = {
  open: {
    transition: { delayChildren: stagger(0.07, { startDelay: 0.2 }) },
  },
  closed: {
    transition: { delayChildren: stagger(0.05, { from: "last" }) },
  },
};

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
    <>
      {/* <Test /> */}
      <main className={styles.main}>
        <Breadcrumbs />
        <Outlet />
      </main>

      <Toaster />
    </>
  );
}
