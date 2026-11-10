// The list page's enhancements: saves without reloads, live updates from
// other members, drag to reorder and offline replay. Everything here has a
// plain-HTML fallback in the server-rendered page.
import { replaySoon, replayWhenOnline, showQueued } from "../lib/offline.ts";
import { enableReorder } from "../lib/reorder.ts";
import { afterPending, enhanceForms, send } from "../lib/submit.ts";
import { refresh } from "../lib/swap.ts";
import { toast } from "../lib/toast.ts";

const page = document.querySelector<HTMLElement>("[data-list]");

function items() {
  return document.getElementById("list-items");
}

function rowFor(id: FormDataEntryValue | null) {
  return document.getElementById(`item-${String(id)}`);
}

/** A queued add, shown like a saved row (editing waits for the sync). */
function queuedRow(id: string, text: string) {
  const row = document.createElement("li");
  row.className = "items-wrapper";
  row.id = `item-${id}`;
  row.innerHTML =
    '<div class="item-container item-container-reorderable"><div class="item-swipe-track"><div class="item-row"><span class="item-value"></span><button type="button" class="item-edit-button"></button></div></div></div>';
  const value = row.querySelector(".item-value");
  if (value) value.textContent = text;
  row.querySelector(".item-edit-button")?.setAttribute("aria-label", `Edit ${text}`);
  return row;
}

enhanceForms(
  (form, data) => {
    const op = data.get("op");
    if (op === "add") {
      const text = form.elements.namedItem("text") as HTMLInputElement;
      const id = form.elements.namedItem("id") as HTMLInputElement;
      // A placeholder until the saved row arrives; the tag stays for the
      // next add, the text clears and the next add gets its own id.
      const pending = document.createElement("li");
      pending.className = "items-skeleton-item";
      pending.dataset.pendingId = id.value;
      pending.innerHTML =
        '<div class="items-skeleton-content"><span class="items-pending-value"></span><span class="items-pending-state">saving...</span></div>';
      const value = pending.querySelector(".items-pending-value");
      if (value) value.textContent = text.value;
      items()?.querySelector(".items-empty-state")?.remove();
      items()?.append(pending);
      pending.scrollIntoView({ block: "nearest" });
      text.value = "";
      id.value = crypto.randomUUID();
    } else if (op === "delete") {
      const row = rowFor(data.get("id"));
      if (row) row.hidden = true;
    } else if (op === "move" && data.has("direction")) {
      const row = rowFor(data.get("id"));
      if (data.get("direction") === "up") row?.previousElementSibling?.before(row);
      else row?.nextElementSibling?.after(row);
    }
  },
  (_form, data, result) => {
    const op = data.get("op");
    if (result === "saved" && op === "add") {
      // Adds land at the end, below the fold on a long list.
      rowFor(data.get("id"))?.scrollIntoView({ block: "nearest" });
    }
    if (result !== "queued") return;
    showQueued();
    if (navigator.onLine) replaySoon();
    // Offline, the page shows the change itself until the queue replays
    // and the server's version replaces it.
    if (op === "add") {
      items()
        ?.querySelector(`[data-pending-id="${String(data.get("id"))}"]`)
        ?.replaceWith(queuedRow(String(data.get("id")), String(data.get("text"))));
    } else if (op === "edit") {
      const row = rowFor(data.get("id"));
      const value = row?.querySelector(".item-value");
      const edit = row?.querySelector(".item-edit-button");
      const text = String(data.get("text")).trim();
      if (value) value.textContent = text;
      edit?.setAttribute("aria-label", `Edit ${text}`);
    }
  },
);

// A cancelled edit starts afresh next time.
document.addEventListener(
  "close",
  (event) => {
    const target = event.target;
    if (target instanceof HTMLDialogElement) target.querySelector("form")?.reset();
  },
  true,
);

// Enter saves an edit; Shift+Enter is a new line.
document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (
    target instanceof HTMLTextAreaElement &&
    target.form?.matches("[data-edit-form]") &&
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.isComposing
  ) {
    event.preventDefault();
    target.form.requestSubmit();
  }
});

// Drag to reorder: the drop is saved as "put this after that".
function setUpReorder() {
  const list = items();
  if (!list || list.dataset.reorderReady) return;
  list.dataset.reorderReady = "";
  enableReorder(list, (id, after) => {
    const data = new FormData();
    data.set("op", "move");
    data.set("id", id);
    data.set("after", after);
    void send(list.dataset.reorderAction ?? location.pathname, data);
  });
}
setUpReorder();
// The list element is replaced on every swap.
new MutationObserver(setUpReorder).observe(document.body, { childList: true, subtree: true });

// Live updates: the server says when someone else changed the list, and the
// page re-renders itself — after any of its own saves, and not while an edit
// dialog is open (the swap would close it).
if (page) {
  const events = new EventSource(
    `/lists/${page.dataset.slug}/events?client=${page.dataset.clientId}`,
  );
  let waiting = false;
  events.addEventListener("changed", () => {
    if (waiting) return;
    waiting = true;
    void afterPending(async () => {
      const open = items()?.querySelector<HTMLDialogElement>("dialog[open]");
      if (open)
        await new Promise((resolve) => open.addEventListener("close", resolve, { once: true }));
      waiting = false;
      await refresh();
      toast("info", "List updated by another user");
    });
  });
}

replayWhenOnline();
