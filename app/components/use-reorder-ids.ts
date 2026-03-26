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
  const [optimisticOrder, setOptimisticOrder] = useState<string[] | null>(null);
  const hasLocalChange = useRef(false);
  const latestItemIds = useRef(itemIds);
  // We only want to let server data replace the optimistic order after the
  // reorder request has actually entered the submit/revalidate cycle.
  const didStartPersistingOptimisticOrder = useRef(false);

  useEffect(
    function trackLatestItemIds() {
      latestItemIds.current = itemIds;
    },
    [itemIds],
  );

  useEffect(
    function syncIncomingOrder() {
      if (!optimisticOrder) {
        setItemIds((current) => (sameOrder(current, incomingIds) ? current : incomingIds));
        return;
      }

      if (sameOrder(incomingIds, optimisticOrder)) {
        didStartPersistingOptimisticOrder.current = false;
        setOptimisticOrder(null);
        setItemIds((current) => (sameOrder(current, incomingIds) ? current : incomingIds));
        return;
      }

      if (isPersisting) {
        didStartPersistingOptimisticOrder.current = true;
        return;
      }

      // If we get here without ever persisting, this is still the same local
      // interaction and we should keep showing the dropped order.
      if (!didStartPersistingOptimisticOrder.current) {
        return;
      }

      didStartPersistingOptimisticOrder.current = false;
      setOptimisticOrder(null);
      setItemIds((current) => (sameOrder(current, incomingIds) ? current : incomingIds));
    },
    [incomingIds, isPersisting, optimisticOrder],
  );

  function handleReorder(newOrder: string[]) {
    hasLocalChange.current = true;
    latestItemIds.current = newOrder;
    setItemIds(newOrder);
    onReorder?.(newOrder);
  }

  function handleReorderComplete() {
    if (!hasLocalChange.current) {
      return;
    }

    const nextOrder = latestItemIds.current;

    hasLocalChange.current = false;
    didStartPersistingOptimisticOrder.current = false;
    setOptimisticOrder(nextOrder);
    onReorderComplete?.(nextOrder);
  }

  return {
    itemIds,
    handleReorder,
    handleReorderComplete,
  };
}
