import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "~/components/button/button";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";
import {
  dismissAllNotifications,
  dismissNotification,
  getNotifications,
  getServerNotifications,
  holdNotifications,
  subscribeToNotifications,
} from "~/lib/toast";
import * as styles from "./notifications.css";

/**
 * A panel under the header showing the newest notification, with a count of
 * any others behind it. Place it in a page grid with a `notifications` row
 * (see root.css.ts).
 */
export function Notifications() {
  const notifications = useSyncExternalStore(
    subscribeToNotifications,
    getNotifications,
    getServerNotifications,
  );
  const current = notifications.at(0);
  const rest = notifications.slice(1);
  const isOpen = current !== undefined;
  const panelRef = useRef<HTMLElement>(null);
  const holdRef = useRef({ hovered: false, focused: false });

  function hold(reason: "hovered" | "focused", held: boolean) {
    holdRef.current[reason] = held;
    holdNotifications(holdRef.current.hovered || holdRef.current.focused);
  }

  // Keeps the last notification on screen while the panel animates closed.
  const [shown, setShown] = useState(current);
  if (current && current !== shown) setShown(current);

  useEffect(
    function clearAfterClosing() {
      const panel = panelRef.current;
      if (isOpen || !panel) return;
      // Focus is lost when the buttons go inert, without a blur to say so.
      hold("focused", false);
      // Resolves straight away when there's no transition (reduced motion).
      let isCancelled = false;
      void Promise.allSettled(panel.getAnimations().map(({ finished }) => finished)).then(() => {
        if (!isCancelled) setShown(undefined);
      });
      return () => {
        isCancelled = true;
      };
    },
    [isOpen],
  );

  return (
    <section
      ref={panelRef}
      aria-label="Notifications"
      className={styles.panel}
      data-open={isOpen || undefined}
      onPointerEnter={() => hold("hovered", true)}
      onPointerLeave={() => hold("hovered", false)}
      onFocus={() => hold("focused", true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) hold("focused", false);
      }}
    >
      <div className={styles.clip}>
        {/* Always rendered, so screen readers announce what's put in it. */}
        <div role="status" className={shown ? styles.type[shown.type] : undefined}>
          {shown ? (
            <>
              <p className={styles.message}>
                <span>{shown.message}</span>
                {rest.length > 0 ? (
                  <span className={styles.count}>
                    +{rest.length}
                    <VisuallyHidden> more</VisuallyHidden>
                  </span>
                ) : null}
              </p>
              {/* inert while closing, so a click can't land on the old one. */}
              <div className={styles.buttons} inert={!isOpen}>
                {shown.action ? (
                  <Button
                    onClick={() => {
                      shown.action?.onClick();
                      dismissNotification(shown.id);
                    }}
                  >
                    {shown.action.label}
                  </Button>
                ) : null}
                <Button variant="outline" onClick={() => dismissNotification(shown.id)}>
                  Clear
                </Button>
                {rest.length > 0 ? (
                  <Button variant="outline" onClick={dismissAllNotifications}>
                    Clear all
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
