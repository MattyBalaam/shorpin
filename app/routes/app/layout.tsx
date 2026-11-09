import { useEffect } from "react";
import { Outlet, useRouteLoaderData } from "react-router";
import { toast } from "~/lib/toast";
import { Notifications } from "~/components/notifications/notifications";
import {
  OnlineStatusIndicator,
  OnlineStatusProvider,
} from "~/components/online-status/online-status";
import type { loader as rootLoader } from "~/root";

// Each page renders its own header (see PageHeader), so it can put its
// actions beside the breadcrumbs.
export default function AppLayout() {
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
    <OnlineStatusProvider>
      <OnlineStatusIndicator />
      <Notifications />
      <Outlet />
    </OnlineStatusProvider>
  );
}
