import { createFileRoute, notFound } from "@tanstack/solid-router";
import { For } from "solid-js";
import { Button } from "~/components/button/button";
import { PageHeader } from "~/components/page-header/page-header";
import { toast } from "~/lib/toast";
import * as styles from "./notifications.css";

// Mock/preview only: fires notifications on demand, so the panel can be
// checked by hand without going offline or redeploying. React Router left
// the route out of other builds; the virtual route config can't read the
// mode (see login.tsx), so here the route 404s instead.
const IS_DEV_BUILD = import.meta.env.MODE === "mock" || import.meta.env.MODE === "preview";

export const Route = createFileRoute("/_app/dev/notifications")({
  beforeLoad: () => {
    if (!IS_DEV_BUILD) throw notFound();
  },
  head: () => ({ meta: [{ title: "Notifications | Shorpin" }] }),
  staticData: {
    breadcrumb: [{ label: "Notifications" }],
  },
  component: NotificationsDemo,
});

// Mirrors the service worker's "new version" prompt, which otherwise only
// shows after a redeploy. (Legacy root.tsx showed it; it comes back with the
// service worker, stage 6.)
function showUpdate() {
  toast.info("A new version is available", {
    id: "app-update",
    action: { label: "Reload", onClick: () => window.location.reload() },
  });
}

const samples = {
  success: () => toast.success("List saved"),
  info: () => toast.info("List updated by another user"),
  warning: () => toast.warning("You're offline - changes saved locally"),
  error: () => toast.error("Couldn't save your changes"),
  update: showUpdate,
};

function NotificationsDemo() {
  return (
    <>
      <PageHeader />
      <div class={styles.page}>
        <h1>Notifications</h1>
        <div class={styles.buttons}>
          <Button variant="solid" onClick={() => Object.values(samples).forEach((show) => show())}>
            Show all
          </Button>
          <For each={Object.entries(samples)}>
            {([name, show]) => (
              <Button variant="outline" onClick={show}>
                {name}
              </Button>
            )}
          </For>
        </div>
      </div>
    </>
  );
}
