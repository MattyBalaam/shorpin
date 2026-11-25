// Home's enhancements: drag to reorder lists, starring without a reload,
// and creating a list while offline.
import { replaySoon, replayWhenOnline, showQueued } from "../lib/offline.ts";
import { enableReorder } from "../lib/reorder.ts";
import { send } from "../lib/submit.ts";
import { refresh } from "../lib/swap.ts";

const lists = () => document.getElementById("home-lists");

/** The list element is replaced when the page refreshes itself. */
function setUpReorder() {
  const list = lists();
  if (!list || list.dataset.reorderReady) return;
  list.dataset.reorderReady = "";
  enableReorder(list, (_id, _after, ids) => {
    const data = new FormData();
    for (const id of ids) data.append("order", id);
    void send("/lists-order", data);
  });
}
setUpReorder();

document.addEventListener("submit", (event) => {
  const form = event.target as HTMLFormElement;

  // ☆/★: one list at most opens on launch.
  if (form.matches("form[action='/default-list']")) {
    event.preventDefault();
    const data = new FormData(form);
    const chosen = String(data.get("list-id"));
    void send(form.action, data);
    for (const star of document.querySelectorAll<HTMLFormElement>("form[action='/default-list']")) {
      const button = star.querySelector("button");
      const input = star.elements.namedItem("list-id") as HTMLInputElement;
      const id = star.closest<HTMLElement>("[data-reorder-id]")?.dataset.reorderId ?? "";
      const pressed = chosen !== "" && id === chosen;
      button?.setAttribute("aria-pressed", String(pressed));
      const glyph = button?.querySelector("[aria-hidden]");
      if (glyph) glyph.textContent = pressed ? "★" : "☆";
      input.value = pressed ? "" : id;
    }
    return;
  }

  // Offline, a new list is queued and shown as pending; online the post
  // simply navigates to it.
  if (form.matches("[data-offline-queue=home]") && !navigator.onLine) {
    event.preventDefault();
    const input = form.elements.namedItem("new-list") as HTMLInputElement;
    const name = input.value.trim();
    if (!name) return;
    void send(form.action, new FormData(form)).then((result) => {
      if (result !== "queued") return;
      showQueued();
      if (navigator.onLine) replaySoon();
      const row = document.createElement("li");
      row.className = "home-item-wrapper";
      row.innerHTML = '<div class="home-item"><span class="home-pending-item-link"></span></div>';
      const label = row.querySelector("span");
      if (label) label.textContent = `${name} (pending — will sync when back online)`;
      lists()?.append(row);
      input.value = "";
    });
  }
});

replayWhenOnline(async () => {
  await refresh();
  setUpReorder();
});

// iOS home-screen apps ignore the manifest's `/?launch` start_url and open
// plain `/`. A fresh load of home in standalone mode (not a reload, not a
// link from inside the app) is a launch, so let the server redirect it.
const standalone =
  matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
const fromInsideApp = document.referrer && new URL(document.referrer).origin === location.origin;
if (
  standalone &&
  entry?.type === "navigate" &&
  !fromInsideApp &&
  /(?:^|; )default-list=/.test(document.cookie)
) {
  location.replace("/?launch");
}
