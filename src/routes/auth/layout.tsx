import { createFileRoute, Outlet } from "@tanstack/solid-router";
import { Notifications } from "~/components/notifications/notifications";
import * as styles from "./layout.css";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <>
      <Notifications />
      <div class={styles.layout}>
        <Outlet />
      </div>
    </>
  );
}
