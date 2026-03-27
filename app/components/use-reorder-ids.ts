import { useEffect, useRef, useState } from "react";

function sameOrder(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function useReorderIds({
  incomingIds,
  isPersisting = false,
  onReorder,
  onReorderComplete,
}: {
  incomingIds: string[];
  isPersisting?: boolean;
  onReorder?: (itemIds: string[]) => void;
  onReorderComplete?: (itemIds: string[]) => void;
}) {
  const [itemIds, setItemIds] = useState(() => incomingIds);
  const didReorder = useRef(false);
  const latestItemIds = useRef(itemIds);

  /**
   * Sync incoming server order with local state.
   *
   * When a reorder is in flight (didReorder = true):
   * - If the server has confirmed our order (incomingIds matches latestItemIds),
   *   clear the flag so future server updates take effect normally.
   * - Otherwise, ignore server data until it confirms our reorder — this prevents
   *   items snapping back during the pending request.
   *
   * When no reorder is in flight, accept server data normally.
   */
  useEffect(
    function syncIncomingOrder() {
      if (didReorder.current) {
        // Only clear the flag when the server confirms our reorder.
        // This guards against the server sending stale data during a pending update.
        if (isPersisting && sameOrder(incomingIds, latestItemIds.current)) {
          didReorder.current = false;
        }

        return;
      }

      setItemIds((current) => (sameOrder(current, incomingIds) ? current : incomingIds));
    },
    [incomingIds, isPersisting],
  );

  /**
   * Called by the drag component when items are reordered.
   * Updates local state optimistically and marks that a reorder is in flight.
   */
  function handleReorder(newOrder: string[]) {
    didReorder.current = true;
    latestItemIds.current = newOrder;
    setItemIds(newOrder);
    onReorder?.(newOrder);
  }

  /**
   * Called when the drag ends — triggers the server persistence.
   */
  function handleReorderComplete() {
    if (!didReorder.current) {
      return;
    }

    onReorderComplete?.(latestItemIds.current);
  }

  return {
    itemIds,
    handleReorder,
    handleReorderComplete,
  };
}
