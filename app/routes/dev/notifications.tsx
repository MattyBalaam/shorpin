import { Button } from "~/components/button/button";
import { toast } from "~/lib/toast";
import * as styles from "./notifications.css";

// Mock/preview only (see routes.ts): fires notifications on demand, so the
// panel can be checked by hand without going offline or redeploying.

export const handle = {
  breadcrumbs: [{ label: "Notifications" }],
};

export const meta = () => [{ title: "Notifications | Shorpin" }];

// Mirrors the "new version" prompt in root.tsx, which otherwise only shows
// after a redeploy.
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

export default function NotificationsDemo() {
  return (
    <div className={styles.page}>
      <h1>Notifications</h1>
      <div className={styles.buttons}>
        <Button variant="solid" onClick={() => Object.values(samples).forEach((show) => show())}>
          Show all
        </Button>
        {Object.entries(samples).map(([name, show]) => (
          <Button key={name} variant="outline" onClick={show}>
            {name}
          </Button>
        ))}
      </div>
    </div>
  );
}
