import { useEffect, useEffectEvent, useState } from "react";

function sameOrder(left: string[], right: string[] | null) {
  if (!right) return false;
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

/**
 * Headless reorder state machine shared by every draggable list (list items,
 * home lists). Owns the optimistic order + snap-back prevention; persistence is
 * injected via `onComplete` (see `reorder-strategies.ts`).
 *
 * Spread `getGroupProps()` onto a `<Reorder.Group>`. Consumers that complete the
 * gesture from an item's `onDragEnd` instead of the group's `onPointerUp` can
 * call `complete()` directly.
 *
 * NOTE: React Router's guidance is to derive optimistic UI from in-flight
 * `formData` rather than mirror server state into React state
 * (https://reactrouter.com/explanation/state-management). This hook is a
 * deliberate exception: a drag needs synchronous local order that follows the
 * pointer, and no `formData` exists until the gesture submits — so we hold the
 * order locally and ignore incoming server order until it confirms our move.
 * Discrete mutations (add/delete) should still follow the RR pattern instead.
 */
export function useReorderable({
  incomingIds,
  onReorder,
  onComplete,
}: {
  incomingIds: string[];
  onReorder?: (itemIds: string[]) => void;
  onComplete?: (itemIds: string[]) => void;
}) {
  const [prevIncomingIds, setPrevIncomingIds] = useState(() => incomingIds);
  const [itemIds, setItemIds] = useState(() => incomingIds);
  const [optimisticOrder, setOptimisticOrder] = useState<string[] | null>(null);

  const incomingChange = !optimisticOrder && !sameOrder(incomingIds, prevIncomingIds);

  const handleSyncIncomingOrder = useEffectEvent(() => {
    setItemIds(incomingIds);
    setPrevIncomingIds(incomingIds);
    setOptimisticOrder(null);
  });

  /**
   * Sync incoming server order with local state.
   *
   * When a reorder is in flight (optimisticOrder set):
   * - If the server has confirmed our order, clear the flag so future server
   *   updates take effect normally.
   * - Otherwise, ignore server data until it confirms our reorder — this prevents
   *   items snapping back during the pending request.
   *
   * When no reorder is in flight, accept server data normally.
   */
  useEffect(
    function syncIncomingOrder() {
      if (!incomingChange) {
        return;
      }

      handleSyncIncomingOrder();
    },
    [incomingChange],
  );

  /**
   * Called by the drag component while items are being reordered.
   * Updates local state optimistically and marks that a reorder is in flight.
   */
  function handleReorder(newOrder: string[]) {
    setOptimisticOrder(newOrder);
    onReorder?.(newOrder);
  }

  /**
   * Called when the gesture ends — triggers persistence with the final order.
   */
  function complete() {
    if (optimisticOrder) {
      setItemIds(optimisticOrder);
      onComplete?.(optimisticOrder);
      setOptimisticOrder(null);
    }
  }

  const orderedIds = optimisticOrder ?? itemIds;

  function getGroupProps() {
    return {
      values: orderedIds,
      onReorder: handleReorder,
      onPointerUp: complete,
    };
  }

  return { orderedIds, getGroupProps, handleReorder, complete };
}
