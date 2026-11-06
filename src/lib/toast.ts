// Notifications shown in the panel under the header (see
// src/components/notifications). A plain external store: anything can call
// `toast.*` — loaders' flash messages, client actions, effects — and
// <Notifications> reads it with useSyncExternalStore.
//
// The newest is shown first, and showing one whose id is already queued moves
// it to the front instead of stacking a duplicate (e.g. repeated "List
// updated by another user"). Successes are confirmations, so they clear
// themselves once shown; anything else, or anything with an action, waits for
// the user.
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
  pruneTimers();
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

// A success starts counting down when the panel first shows it (see
// startCountdown), so one queued behind a newer notification isn't cleared
// before anyone sees it. Once started it keeps going even if covered, so a
// seen one doesn't come back later. A timer belongs to one showing (by
// `key`), so a repeat restarts it.
// While held, timers are stopped and keep their time left, so the countdown
// shown for one (see <Notifications>) can pause and resume in step.
type Timer = {
  key: number;
  timeLeft: number;
  startedAt: number;
  timeout?: ReturnType<typeof setTimeout>;
};
const timers = new Map<string, Timer>();
let isHeld = false;

function startTimer(id: string, timer: Timer) {
  timer.startedAt = performance.now();
  timer.timeout = setTimeout(() => dismissNotification(id), timer.timeLeft);
}

function cancelDismiss(id: string) {
  clearTimeout(timers.get(id)?.timeout);
  timers.delete(id);
}

// Drops timers for notifications that are gone or have been shown again.
function pruneTimers() {
  const keys = new Map(notifications.map(({ id, key }) => [id, key]));
  for (const [id, timer] of timers) {
    if (keys.get(id) !== timer.key) cancelDismiss(id);
  }
}

/** Called by the panel once it shows a notification that clears itself. */
export function startCountdown(id: string) {
  const notification = notifications.find((candidate) => candidate.id === id);
  if (!notification?.autoDismiss || timers.has(id)) return;
  const timer: Timer = { key: notification.key, timeLeft: AUTO_DISMISS_MS, startedAt: 0 };
  timers.set(id, timer);
  if (!isHeld) startTimer(id, timer);
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

/** Milliseconds until the notification clears itself, if it's counting down. */
export function getTimeLeft(id: string) {
  const timer = timers.get(id);
  if (!timer) return undefined;
  return isHeld ? timer.timeLeft : timer.timeLeft - (performance.now() - timer.startedAt);
}

export function dismissNotification(id: string) {
  update(notifications.filter((notification) => notification.id !== id));
}

export function dismissAllNotifications() {
  update([]);
}

function show(type: NotificationType, message: string, options: NotificationOptions = {}) {
  const id = options.id ?? `${type}:${message}`;
  const autoDismiss = type === "success" && !options.action;
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
