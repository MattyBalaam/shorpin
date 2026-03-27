import { useEffect, useEffectEvent, useState } from "react";

function sameOrder(left: string[], right: string[] | null) {
  if (!right) return false;
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function useReorderIds({
  incomingIds,
  onReorder,
  onReorderComplete,
}: {
  incomingIds: string[];
  onReorder?: (itemIds: string[]) => void;
  onReorderComplete?: (itemIds: string[]) => void;
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
      if (!incomingChange) {
        return;
      }

      handleSyncIncomingOrder();
    },
    [incomingChange],
  );

  /**
   * Called by the drag component when items are reordered.
   * Updates local state optimistically and marks that a reorder is in flight.
   */
  function handleReorder(newOrder: string[]) {
    setOptimisticOrder(newOrder);
    onReorder?.(newOrder);
  }

  /**
   * Called when the drag ends — triggers the server persistence.
   */
  function handleReorderComplete() {
    if (optimisticOrder) {
      setItemIds(optimisticOrder);
      onReorderComplete?.(optimisticOrder);
      setOptimisticOrder(null);
    }
  }

  return {
    itemIds: optimisticOrder ?? itemIds,
    handleReorder,
    handleReorderComplete,
  };
}
