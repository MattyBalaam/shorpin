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
  autoDismiss: boolean;
  /** Changes each time it's shown, so a repeat restarts its countdown. */
  key: number;
}

let notifications: readonly Notification[] = [];
let nextKey = 0;
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

export const AUTO_DISMISS_MS = 5000;

// While held, timers are stopped and keep their time left, so a countdown
// shown for one (see <Notifications>) can pause and resume in step.
type Timer = { timeLeft: number; startedAt: number; timeout?: ReturnType<typeof setTimeout> };
const timers = new Map<string, Timer>();
let isHeld = false;

function startTimer(id: string, timer: Timer) {
  timer.startedAt = performance.now();
  timer.timeout = setTimeout(() => dismissNotification(id), timer.timeLeft);
}

function scheduleDismiss(id: string) {
  cancelDismiss(id);
  const timer: Timer = { timeLeft: AUTO_DISMISS_MS, startedAt: 0 };
  timers.set(id, timer);
  if (!isHeld) startTimer(id, timer);
}

function cancelDismiss(id: string) {
  clearTimeout(timers.get(id)?.timeout);
  timers.delete(id);
}

/** Pauses auto-dismissal while the user is reading or using the panel. */
export function holdNotifications(held: boolean) {
  if (held === isHeld) return;
  isHeld = held;
  for (const [id, timer] of timers) {
    if (held) {
      clearTimeout(timer.timeout);
      timer.timeLeft -= performance.now() - timer.startedAt;
    } else {
      startTimer(id, timer);
    }
  }
}

/** Milliseconds until the notification clears itself, if it will. */
export function getTimeLeft(id: string) {
  const timer = timers.get(id);
  if (!timer) return undefined;
  return isHeld ? timer.timeLeft : timer.timeLeft - (performance.now() - timer.startedAt);
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
  const autoDismiss = type === "success" && !options.action;
  if (autoDismiss) scheduleDismiss(id);
  else cancelDismiss(id);
  update([
    { ...options, id, type, message, autoDismiss, key: nextKey++ },
    ...notifications.filter((notification) => notification.id !== id),
  ]);
}

export const toast = {
  success: (message: string, options?: NotificationOptions) => show("success", message, options),
  info: (message: string, options?: NotificationOptions) => show("info", message, options),
  warning: (message: string, options?: NotificationOptions) => show("warning", message, options),
  error: (message: string, options?: NotificationOptions) => show("error", message, options),
};
