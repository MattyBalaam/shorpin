// Sonner is loaded lazily (see README "Deferred Sentry & Sonner"), so callers
// use this facade instead of importing `toast` from "sonner" directly.
//
// Sonner drops toasts emitted before a <Toaster> has subscribed, and flash
// toasts fire from layout effects on first render — before the lazy Toaster
// has loaded. So toasts wait until <Toaster> (app/components/toaster) reports
// that it has mounted.
//
// Once it has, toasts must fire synchronously, exactly as a direct sonner
// import would. Deferring them (even by a microtask) lets Sonner's setState
// land in the middle of React Router's transition render after an action,
// interrupting it. Conform's useForm applies `lastResult` during render (it
// updates a ref there), so a discarded render means the action's result is
// never applied — e.g. an item added offline silently doesn't appear.

type Sonner = typeof import("sonner");
type ToastType = "success" | "info" | "warning" | "error";

let sonnerPromise: Promise<Sonner> | undefined;
let sonner: Sonner | undefined;
let isToasterReady = false;

let markReady: () => void = () => {};
const toasterReady = new Promise<void>((resolve) => {
  markReady = resolve;
});

// Cached so every caller (including <Toaster>'s use()) gets the same promise.
export function loadSonner() {
  sonnerPromise ??= import("sonner").then((module) => (sonner = module));
  return sonnerPromise;
}

export function markToasterReady() {
  isToasterReady = true;
  markReady();
}

function show(type: ToastType, message: string) {
  if (sonner && isToasterReady) {
    sonner.toast[type](message);
    return;
  }
  void toasterReady.then(loadSonner).then(({ toast: sonnerToast }) => sonnerToast[type](message));
}

export const toast = {
  success: (message: string) => show("success", message),
  info: (message: string) => show("info", message),
  warning: (message: string) => show("warning", message),
  error: (message: string) => show("error", message),
};
