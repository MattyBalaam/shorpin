import { Form, Outlet, href } from "react-router";
import { Breadcrumbs } from "~/components/breadcrumbs/breadcrumbs";
import {
  OnlineStatusIndicator,
  OnlineStatusProvider,
} from "~/components/online-status/online-status";
import { Button } from "~/components/button/button";
import * as styles from "./layout.css";

export default function AppLayout() {
  return (
    <OnlineStatusProvider>
      <OnlineStatusIndicator />
      <Breadcrumbs />
      <Form method="POST" action={href("/logout")} className={styles.logOut}>
        <Button type="submit">Sign out</Button>
      </Form>
      <Outlet />
    </OnlineStatusProvider>
  );
}
