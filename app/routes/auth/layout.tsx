import { useEffect } from "react";
import { Outlet, useRouteLoaderData } from "react-router";
import * as styles from "./layout.css";
import { Toaster, toast } from "sonner";
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
    <div className={styles.layout}>
      <Outlet />
      <Toaster position="top-right" />
    </div>
  );
}
