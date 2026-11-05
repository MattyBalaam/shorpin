import { createSignal } from "solid-js";
import { createDragList } from "./create-drag-list";

/**
 * Headless reorder state shared by every draggable list. Owns the order
 * while a drag is under way; persistence is the caller's, through
 * `onComplete`.
 *
 * Attach `ref` to the list element, mark each row with `data-reorder-id`,
 * and call `startDrag` from a row's drag handle (see `create-drag-list.ts`).
 * The gesture reports order changes back here and completes on pointer
 * release.
 *
 * Simpler than the React version, which had to hold the dragged order until
 * the server's matched it, so a revalidation mid-save couldn't snap rows
 * back. Here the caller applies the new order to its own state as soon as
 * the drag ends (see the list page), so there's nothing to hold.
 */
export function createReorderable(options: {
  incomingIds: () => string[];
  onReorder?: (itemIds: string[]) => void;
  onComplete?: (itemIds: string[]) => void;
}) {
  const [dragOrder, setDragOrder] = createSignal<string[] | null>(null);
  // Solid 2 batches writes: a signal read straight after its setter still
  // returns the old value. The gesture ends synchronously after its last
  // move, so keep the latest order in a plain variable too.
  let latestOrder: string[] | null = null;

  function handleReorder(order: string[]) {
    latestOrder = order;
    setDragOrder(order);
    options.onReorder?.(order);
  }

  function complete() {
    const order = latestOrder;
    latestOrder = null;
    if (!order) return;
    // Same batch: the caller's new order and clearing ours land together.
    options.onComplete?.(order);
    setDragOrder(null);
  }

  const { ref, startDrag, collapse } = createDragList({
    onReorder: handleReorder,
    onDragEnd: complete,
  });

  const orderedIds = () => dragOrder() ?? options.incomingIds();

  return { orderedIds, ref, startDrag, collapse };
}
