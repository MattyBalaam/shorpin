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

  useEffect(
    function syncIncomingOrder() {
      if (!incomingChange) {
        return;
      }

      handleSyncIncomingOrder();
    },
    [incomingChange],
  );

  function handleReorder(newOrder: string[]) {
    setOptimisticOrder(newOrder);
    onReorder?.(newOrder);
  }

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
