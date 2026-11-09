// Every page's one script, and none of it is needed for the app to work:
// it upgrades what the server rendered.
import {
  colorSchemes,
  type ColorScheme,
  serializeColorSchemeCookie,
} from "../../lib/color-scheme.ts";
import { adoptServerToast, clearToast, toast } from "../lib/toast.ts";

const root = document.documentElement;
root.dataset.enhanced = "";
// Module scripts have all run by DOMContentLoaded, so the page's own
// enhancements are in place too: the integration tests wait for this.
document.addEventListener("DOMContentLoaded", async () => {
  // …and once any incoming view transition has played, as the page doesn't
  // take input while it does (see the inline script in layout.ts).
  await (self as typeof self & { pageRevealed?: Promise<void> }).pageRevealed?.catch(() => {});
  root.dataset.hydratedPath = root.dataset.path;
});

// --- Route dialogs (/style, /config/:list…) become real modals ------------
// Rendered as a non-modal dialog[open] so they work without this; as a modal
// they take the top layer and focus, and Escape or the backdrop close them.
for (const dialog of document.querySelectorAll<HTMLDialogElement>(
  "dialog[data-route-dialog][open]",
)) {
  // close() queues a close event of its own; only later ones mean the user
  // closed it.
  dialog.close();
  dialog.showModal();
  dialog.addEventListener(
    "close",
    () =>
      dialog.addEventListener("close", () => {
        // A form post inside navigates by itself; anything else goes back.
        if (dialog.returnValue !== "submitted") location.assign(dialog.dataset.closeUrl ?? "/");
      }),
    { once: true },
  );
  dialog.addEventListener("submit", (event) => {
    if ((event as SubmitEvent).submitter?.getAttribute("formmethod") !== "dialog") {
      dialog.returnValue = "submitted";
    }
  });
}

// --- Notifications --------------------------------------------------------
adoptServerToast();
document.addEventListener("click", (event) => {
  if ((event.target as Element).closest("[data-clear-notification]")) clearToast();
});

// --- Colour scheme: applied in place, so it works offline too ---------------
const schemeIcons: Record<ColorScheme, string> = {
  system: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  light:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  dark: '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
};
const schemeNames = Object.keys(colorSchemes) as ColorScheme[];

document.addEventListener("submit", (event) => {
  const form = event.target as HTMLFormElement;
  if (!form.matches("[data-color-scheme-form]")) return;
  event.preventDefault();
  const input = form.elements.namedItem("scheme") as HTMLInputElement;
  const scheme = input.value as ColorScheme;
  document.cookie = serializeColorSchemeCookie(scheme);
  root.dataset.colorScheme = scheme;
  input.value = schemeNames[(schemeNames.indexOf(scheme) + 1) % schemeNames.length];
  const button = form.querySelector("button");
  if (button) {
    button.innerHTML = `<svg aria-hidden="true" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${schemeIcons[scheme]}</svg><span class="visually-hidden">Colour scheme: </span>${colorSchemes[scheme].label}`;
  }
});

// --- Online status -----------------------------------------------------------
function syncOnline() {
  for (const indicator of document.querySelectorAll<HTMLElement>("[data-offline-indicator]")) {
    indicator.hidden = navigator.onLine;
  }
}
addEventListener("online", syncOnline);
addEventListener("offline", syncOnline);
syncOnline();

// --- iOS keyboard (TEMPORARY) -------------------------------------------------
// Safari doesn't support `interactive-widget=resizes-content` yet, so the
// keyboard pans the page instead of resizing it. Size the layout to the
// visual viewport until it does (see README "On-screen keyboard sizing").
const viewport = visualViewport;
if (viewport) {
  const sync = () => {
    root.style.setProperty("--visual-viewport-height", `${viewport.height}px`);
    if (scrollY !== 0) scrollTo(0, 0);
  };
  viewport.addEventListener("resize", sync);
  viewport.addEventListener("scroll", sync);
  sync();
}

// --- Service worker (offline pages and queued changes) -----------------------
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  void navigator.serviceWorker.register("/sw.js").then((registration) => {
    // A new build waits behind the current worker until the user says so,
    // so a page never runs one build's markup under another build's worker.
    const offerUpdate = () => {
      const waiting = registration.waiting;
      if (!waiting || !navigator.serviceWorker.controller) return;
      toast("info", "A new version is available", {
        label: "Reload",
        run: () => {
          navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), {
            once: true,
          });
          waiting.postMessage({ type: "SKIP_WAITING" });
        },
      });
    };
    offerUpdate();
    registration.addEventListener("updatefound", () => {
      registration.installing?.addEventListener("statechange", offerUpdate);
    });
  });
}
