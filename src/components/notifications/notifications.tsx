import { createEffect, createSignal, onSettled, Show, untrack } from "solid-js";
import { Button } from "~/components/button/button";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";
import {
  AUTO_DISMISS_MS,
  dismissAllNotifications,
  dismissNotification,
  getNotifications,
  getServerNotifications,
  getTimeLeft,
  holdNotifications,
  type Notification,
  startCountdown,
  subscribeToNotifications,
} from "~/lib/toast";
import * as styles from "./notifications.css";

/** Counts down to the notification clearing itself. */
function DismissClock(props: { id: string }) {
  let clock!: HTMLSpanElement;

  // Starts the store's countdown the first time it's shown, or picks it up
  // part way through for one that was covered and has come back. Rendered
  // keyed on the showing (see below), so each repeat gets a fresh clock.
  onSettled(() => {
    const id = untrack(() => props.id);
    startCountdown(id);
    const elapsed = AUTO_DISMISS_MS - (getTimeLeft(id) ?? AUTO_DISMISS_MS);
    clock.style.setProperty("animation-delay", `${-elapsed}ms`);
  });

  return <span ref={clock} aria-hidden="true" class={styles.clock} />;
}

/**
 * A panel under the header showing the newest notification, with a count of
 * any others behind it. Place it in a page grid with a `notifications` row
 * (see root.css.ts).
 */
export function Notifications() {
  // The store is client-only: empty on the server and through hydration.
  const [notifications, setNotifications] = createSignal(getServerNotifications());
  onSettled(() => {
    setNotifications(getNotifications());
    return subscribeToNotifications(() => setNotifications(getNotifications()));
  });

  const current = () => notifications().at(0);
  const rest = () => notifications().slice(1);
  const isOpen = () => current() !== undefined;
  let panel!: HTMLElement;
  const holds = { hovered: false, focused: false };

  function hold(reason: "hovered" | "focused", held: boolean) {
    holds[reason] = held;
    const isHeld = holds.hovered || holds.focused;
    holdNotifications(isHeld);
    // Pauses the clock in step with the store's timer (see notifications.css.ts).
    panel.toggleAttribute("data-held", isHeld);
  }

  // Keeps the last notification on screen while the panel animates closed.
  // A writable derived signal: follows `current` while there is one, and
  // keeps its last value until the close animation clears it.
  const [shown, setShown] = createSignal<Notification | undefined>(
    (previous) => current() ?? previous,
  );

  createEffect(isOpen, (open) => {
    if (open) return;
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
  });

  return (
    <section
      ref={panel}
      aria-label="Notifications"
      class={styles.panel}
      data-open={isOpen() || undefined}
      onPointerEnter={() => hold("hovered", true)}
      onPointerLeave={() => hold("hovered", false)}
      onFocusIn={() => hold("focused", true)}
      onFocusOut={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          hold("focused", false);
        }
      }}
    >
      <div class={styles.clip}>
        {/* Always rendered, so screen readers announce what's put in it. */}
        <div role="status" class={[styles.status, shown() && styles.type[shown()?.type ?? "info"]]}>
          <Show when={shown()} keyed>
            {(notification) => (
              <div class={styles.body}>
                <p class={styles.message}>
                  <Show when={notification.autoDismiss}>
                    <DismissClock id={notification.id} />
                  </Show>
                  <span>{notification.message}</span>
                  <Show when={rest().length > 0}>
                    <span class={styles.count}>
                      +{rest().length}
                      <VisuallyHidden> more</VisuallyHidden>
                    </span>
                  </Show>
                </p>
                {/* inert while closing, so a click can't land on the old one. */}
                <div class={styles.buttons} inert={!isOpen()}>
                  <Show when={notification.action}>
                    {(action) => (
                      <Button
                        onClick={() => {
                          action().onClick();
                          dismissNotification(notification.id);
                        }}
                      >
                        {action().label}
                      </Button>
                    )}
                  </Show>
                  <Button variant="outline" onClick={() => dismissNotification(notification.id)}>
                    Clear
                  </Button>
                  <Show when={rest().length > 0}>
                    <Button variant="outline" onClick={dismissAllNotifications}>
                      Clear all
                    </Button>
                  </Show>
                </div>
              </div>
            )}
          </Show>
        </div>
      </div>
    </section>
  );
}
