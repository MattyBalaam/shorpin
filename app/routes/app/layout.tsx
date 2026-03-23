import { LazyMotion } from "motion/react";
import { useEffect } from "react";
import { Form, href, Outlet, useLocation, useRouteLoaderData } from "react-router";
import { Toaster, toast } from "sonner";
import { Breadcrumbs } from "~/components/breadcrumbs/breadcrumbs";
import { Button } from "~/components/button/button";
import {
  OnlineStatusIndicator,
  OnlineStatusProvider,
} from "~/components/online-status/online-status";
import type { loader as rootLoader } from "~/root";
import * as styles from "./layout.css";

const loadFeatures = () => import("~/motion-features").then((m) => m.default);

export default function AppLayout() {
  const rootData = useRouteLoaderData<typeof rootLoader>("root");
  const notification = rootData?.toast;
  const { pathname } = useLocation();
  const showLogout =
    pathname === "/" || pathname === "/sign-ups" || pathname.startsWith("/config/");

  useEffect(
    function showNewToast() {
      if (notification) {
        toast[notification.type](notification.message);
      }
    },
    [notification],
  );

  return (
    <LazyMotion features={loadFeatures} strict>
      <OnlineStatusProvider>
        <OnlineStatusIndicator />
        <Breadcrumbs />
        {showLogout ? (
          <Form method="POST" action={href("/logout")} className={styles.logOut}>
            <Button type="submit" aria-label="Sign out">
              <span className={styles.logOutLabel}>Sign out</span>
              <span aria-hidden="true" className={styles.logOutIcon}>
                ⏻
              </span>
            </Button>
          </Form>
        ) : null}
        <Outlet />
        <Toaster position="top-right" />
      </OnlineStatusProvider>
    </LazyMotion>
  );
}
