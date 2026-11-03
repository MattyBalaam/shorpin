import { useEffect } from "react";
import { Outlet, useRouteLoaderData } from "react-router";
import * as styles from "./layout.css";
import { Notifications } from "~/components/notifications/notifications";
import { toast } from "~/lib/toast";
import type { loader as rootLoader } from "~/root";

export default function AuthLayout() {
  const rootData = useRouteLoaderData<typeof rootLoader>("root");
  const notification = rootData?.toast;

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
      <Notifications />
      <div className={styles.layout}>
        <Outlet />
      </div>
    </>
  );
}
