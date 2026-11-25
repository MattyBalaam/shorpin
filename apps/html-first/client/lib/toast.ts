// Notifications in the server-rendered panel (see notifications() in
// server/views/components.ts). The server renders a flash straight into it;
// scripts add their own here (a live update, going offline, a new version).
// The newest shows, with a count of any behind it; showing one that's
// already queued moves it to the front rather than stacking a copy.
// Successes clear themselves with the same CSS animation the server's use.

type ToastType = "success" | "info" | "warning" | "error";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  action?: { label: string; run: () => void };
}

let toasts: Toast[] = [];

const panel = () => document.querySelector<HTMLElement>(".notifications-panel");

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(label: string, variant: string, onClick: () => void) {
  const node = element("button", `button ${variant}`, label);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
}

function render() {
  const root = panel();
  const status = root?.querySelector<HTMLElement>("[role=status]");
  if (!root || !status) return;
  const [current, ...rest] = toasts;
  if (!current) {
    root.removeAttribute("data-open");
    return;
  }

  const autoDismiss = current.type === "success" && !current.action;
  const text = element("p", "notifications-message");
  if (autoDismiss) {
    const clock = element("span", "notifications-clock");
    clock.ariaHidden = "true";
    text.append(clock);
  }
  text.append(element("span", "", current.message));
  if (rest.length > 0) {
    const count = element("span", "notifications-count", `+${rest.length}`);
    count.append(element("span", "visually-hidden", " more"));
    text.append(count);
  }

  const buttons = element("div", "notifications-buttons");
  if (current.action) {
    const { run } = current.action;
    buttons.append(
      button(current.action.label, "button-primary", () => {
        run();
        clearToast();
      }),
    );
  }
  buttons.append(button("Clear", "button-outline", clearToast));
  if (rest.length > 0) buttons.append(button("Clear all", "button-outline", clearAllToasts));

  const body = element("div", "notifications-body");
  body.append(text, buttons);
  status.className = `notifications-status notifications-notification notifications-${current.type}`;
  status.replaceChildren(body);

  // Re-adding the attribute restarts the dismissal animation.
  root.removeAttribute("data-auto-dismiss");
  void root.offsetWidth;
  root.toggleAttribute("data-auto-dismiss", autoDismiss);
  root.setAttribute("data-open", "");
}

export function toast(type: ToastType, message: string, action?: Toast["action"]) {
  const id = `${type}:${message}`;
  toasts = [{ id, type, message, action }, ...toasts.filter((toast) => toast.id !== id)];
  render();
}

/** Clears the one showing, revealing the next. */
export function clearToast() {
  toasts = toasts.slice(1);
  render();
}

export function clearAllToasts() {
  toasts = [];
  render();
}

/** The flash a server-rendered page carries in its panel, if any. */
export function readFlash(page: ParentNode): Omit<Toast, "id"> | null {
  const status = page.querySelector("#notifications[data-open] [role=status]");
  const message = status?.querySelector(".notifications-message > span:last-child")?.textContent;
  const type = (["success", "info", "warning", "error"] as const).find((name) =>
    status?.classList.contains(`notifications-${name}`),
  );
  return message && type ? { type, message } : null;
}

/**
 * Picks up the flash this page was rendered with, and drops a success once
 * its CSS dismissal has played.
 */
export function adoptServerToast() {
  const flash = readFlash(document);
  if (flash) toasts = [{ id: `${flash.type}:${flash.message}`, ...flash }];
  document.addEventListener("animationend", (event) => {
    if (event.animationName === "notifications-auto-dismiss") clearToast();
  });
}
