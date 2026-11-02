// Notifications shown in the panel under the header (see
// app/components/notifications). A plain external store: anything can call
// `toast.*` — loaders' flash messages, client actions, effects — and
// <Notifications> reads it with useSyncExternalStore.
//
// The newest is shown first, and showing one whose id is already queued moves
// it to the front instead of stacking a duplicate (e.g. repeated "List
// updated by another user"). Successes are confirmations, so they clear
// themselves; anything else, or anything with an action, waits for the user.
//
// Updates must stay synchronous. Deferring them (even by a microtask) lets
// the store's re-render land in the middle of React Router's transition
// render after an action, interrupting it. Conform's useForm applies
// `lastResult` during render (it updates a ref there), so a discarded render
// means the action's result is never applied — e.g. an item added offline
// silently doesn't appear.

type NotificationType = "success" | "info" | "warning" | "error";

interface NotificationOptions {
  /** Defaults to the type and message, so repeats of the same one collapse. */
  id?: string;
  action?: { label: string; onClick: () => void };
}

export interface Notification extends NotificationOptions {
  id: string;
  type: NotificationType;
  message: string;
}

let notifications: readonly Notification[] = [];
const listeners = new Set<() => void>();

function update(next: readonly Notification[]) {
  notifications = next;
  for (const listener of listeners) listener();
}

export function subscribeToNotifications(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getNotifications() {
  return notifications;
}

const NO_NOTIFICATIONS: readonly Notification[] = [];

/** Server snapshot: notifications are client-only. */
export function getServerNotifications() {
  return NO_NOTIFICATIONS;
}

const AUTO_DISMISS_MS = 5000;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
// Ids whose time ran out while the panel was held (hovered or focused).
const expired = new Set<string>();
let isHeld = false;

function scheduleDismiss(id: string) {
  clearTimeout(timers.get(id));
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id);
      if (isHeld) expired.add(id);
      else dismissNotification(id);
    }, AUTO_DISMISS_MS),
  );
}

function cancelDismiss(id: string) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  expired.delete(id);
}

/** Holds auto-dismissal while the user is reading or using the panel. */
export function holdNotifications(held: boolean) {
  isHeld = held;
  if (held) return;
  // A fresh full delay, so one doesn't vanish the moment the pointer leaves.
  for (const id of expired) scheduleDismiss(id);
  expired.clear();
}

export function dismissNotification(id: string) {
  cancelDismiss(id);
  update(notifications.filter((notification) => notification.id !== id));
}

export function dismissAllNotifications() {
  for (const { id } of notifications) cancelDismiss(id);
  update([]);
}

function show(type: NotificationType, message: string, options: NotificationOptions = {}) {
  const id = options.id ?? `${type}:${message}`;
  if (type === "success" && !options.action) scheduleDismiss(id);
  else cancelDismiss(id);
  update([
    { ...options, id, type, message },
    ...notifications.filter((notification) => notification.id !== id),
  ]);
}

export const toast = {
  success: (message: string, options?: NotificationOptions) => show("success", message, options),
  info: (message: string, options?: NotificationOptions) => show("info", message, options),
  warning: (message: string, options?: NotificationOptions) => show("warning", message, options),
  error: (message: string, options?: NotificationOptions) => show("error", message, options),
};
