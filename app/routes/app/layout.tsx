import { Form, Outlet, href } from "react-router";
import { Breadcrumbs } from "~/components/breadcrumbs/breadcrumbs";
import {
  OnlineStatusIndicator,
  OnlineStatusProvider,
} from "~/components/online-status/online-status";
import { Button } from "~/components/button/button";
import * as styles from "./layout.css";
import { LazyMotion } from "motion/react";

const loadFeatures = () => import("~/motion-features").then((m) => m.default);

export default function AppLayout() {
  return (
    <LazyMotion features={loadFeatures} strict>
      <OnlineStatusProvider>
        <OnlineStatusIndicator />
        <Breadcrumbs />
        <Form method="POST" action={href("/logout")} className={styles.logOut}>
          <Button type="submit" aria-label="Sign out">
            <span className={styles.logOutLabel}>Sign out</span>
            <span aria-hidden="true" className={styles.logOutIcon}>
              ⏻
            </span>
          </Button>
        </Form>
        <Outlet />
      </OnlineStatusProvider>
    </LazyMotion>
  );
}
