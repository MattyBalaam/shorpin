import { createFileRoute, Outlet } from "@tanstack/solid-router";
import { Notifications } from "~/components/notifications/notifications";
import {
  OnlineStatusIndicator,
  OnlineStatusProvider,
} from "~/components/online-status/online-status";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

// Each page renders its own header (see PageHeader), so it can put its
// actions beside the breadcrumbs.
function AppLayout() {
  return (
    <OnlineStatusProvider>
      <OnlineStatusIndicator />
      <Notifications />
      <Outlet />
    </OnlineStatusProvider>
  );
}
