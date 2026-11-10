// Drag to reorder with the browser's own drag and drop. The grip is the
// draggable element (draggable="true" in the markup), and dragging it moves
// its whole row, so text selection and links elsewhere in the row behave
// normally. The ↑/↓ buttons stay as the keyboard (and no-script) route.
//
// The browser's drag image is replaced by a ghost: browsers draw their own
// image translucent and fade a wide one, so a full-width row never looks
// solid. The native image is a transparent pixel, and a copy of the row,
// full width and fully opaque, follows the pointer vertically, in line with
// the list. The real row stays in the list as a faint placeholder.

// Loaded up front: setDragImage needs an image that's ready.
const blank = new Image();
blank.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** A copy of the row to drag around: inert, and without ids or dialogs. */
function createGhost(row: HTMLElement) {
  const ghost = row.cloneNode(true) as HTMLElement;
  ghost.querySelectorAll("dialog").forEach((dialog) => dialog.remove());
  for (const element of [ghost, ...ghost.querySelectorAll("[id]")]) element.removeAttribute("id");
  ghost.removeAttribute("data-reorder-id");
  ghost.removeAttribute("data-dragging");
  ghost.style.removeProperty("view-transition-name");
  ghost.classList.add("reorder-ghost");
  ghost.inert = true;
  ghost.ariaHidden = "true";
  const { left, width } = row.getBoundingClientRect();
  ghost.style.left = `${left}px`;
  ghost.style.width = `${width}px`;
  document.body.append(ghost);
  return ghost;
}

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

/**
 * Runs `change` (which moves rows in the DOM), then slides every row that
 * moved from where it was to where it now is (FLIP). Positions are read off
 * the screen, so a row already mid-slide carries on from where it is rather
 * than jumping.
 */
function shuffle(rows: HTMLElement[], change: () => void) {
  const before = new Map(rows.map((row) => [row, row.getBoundingClientRect().top]));
  change();
  if (reducedMotion.matches) return;
  for (const [row, top] of before) {
    for (const animation of row.getAnimations()) animation.cancel();
    const delta = top - row.getBoundingClientRect().top;
    if (Math.abs(delta) < 1) continue;
    row.animate([{ translate: `0 ${delta}px` }, { translate: "0 0" }], {
      duration: 220,
      // A little overshoot, so rows settle rather than stop.
      easing: "cubic-bezier(0.2, 0.9, 0.3, 1.15)",
    });
  }
}

export function enableReorder(
  list: HTMLElement,
  onReorder: (id: string, afterId: string, ids: string[]) => void,
) {
  document.documentElement.dataset.dragEnabled = "";
  let dragged: HTMLElement | null = null;
  let ghost: HTMLElement | null = null;
  let grabOffset = 0;
  let before = "";

  const rows = () => [...list.querySelectorAll<HTMLElement>(":scope > [data-reorder-id]")];
  const ids = () => rows().map((row) => row.dataset.reorderId ?? "");
  const rowOf = (target: EventTarget | null) =>
    target instanceof Element ? target.closest<HTMLElement>("[data-reorder-id]") : null;

  // dragover rather than the source's drag event: Firefox reports no
  // coordinates on drag.
  const follow = (event: DragEvent) => {
    if (ghost && event.clientY > 0) ghost.style.top = `${event.clientY - grabOffset}px`;
  };

  list.addEventListener("dragstart", (event) => {
    const handle = event.target instanceof Element && event.target.closest("[data-drag-handle]");
    const row = rowOf(event.target);
    if (!handle || !row || !event.dataTransfer) return;
    dragged = row;
    before = ids().join();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", row.dataset.reorderId ?? "");
    event.dataTransfer.setDragImage(blank, 0, 0);

    grabOffset = event.clientY - row.getBoundingClientRect().top;
    ghost = createGhost(row);
    follow(event);
    row.dataset.dragging = "";
    document.addEventListener("dragover", follow);
  });

  list.addEventListener("dragover", (event) => {
    if (!dragged) return;
    event.preventDefault();
    const over = rowOf(event.target);
    if (!over || over === dragged || over.parentElement !== list) return;
    const row = dragged;
    // Layout position, not on-screen: a row mid-slide mustn't flip its half.
    const middle = over.offsetTop + over.offsetHeight / 2;
    const pointer = event.clientY - list.getBoundingClientRect().top + list.offsetTop;
    const after = pointer > middle;
    // dragover fires continuously: only act when the order would change.
    if ((after ? over.nextElementSibling : over.previousElementSibling) === row) return;
    shuffle(rows(), () => (after ? over.after(row) : over.before(row)));
  });

  list.addEventListener("drop", (event) => event.preventDefault());

  list.addEventListener("dragend", () => {
    document.removeEventListener("dragover", follow);
    ghost?.remove();
    ghost = null;
    if (!dragged) return;
    const row = dragged;
    dragged = null;
    delete row.dataset.dragging;
    if (ids().join() === before) return;
    const previous = row.previousElementSibling as HTMLElement | null;
    onReorder(row.dataset.reorderId ?? "", previous?.dataset.reorderId ?? "", ids());
  });
}
