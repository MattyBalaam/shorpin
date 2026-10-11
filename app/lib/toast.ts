// Sonner is loaded lazily (see README "Deferred Sentry & Sonner"), so callers
// use this facade instead of importing `toast` from "sonner" directly.
//
// Sonner drops toasts emitted before a <Toaster> has subscribed, and flash
// toasts fire from layout effects on first render — before the lazy Toaster
// has loaded. So toasts wait until <Toaster> (app/components/toaster) reports
// that it has mounted.

type ToastType = "success" | "info" | "warning" | "error";

let markReady: () => void = () => {};
const toasterReady = new Promise<void>((resolve) => {
  markReady = resolve;
});

export function markToasterReady() {
  markReady();
}

function show(type: ToastType, message: string) {
  void toasterReady
    .then(() => import("sonner"))
    .then(({ toast: sonnerToast }) => sonnerToast[type](message));
}

export const toast = {
  success: (message: string) => show("success", message),
  info: (message: string) => show("info", message),
  warning: (message: string) => show("warning", message),
  error: (message: string) => show("error", message),
};
