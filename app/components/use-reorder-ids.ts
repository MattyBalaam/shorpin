import { useEffect, useRef, useState } from "react";

function sameOrder(left: string[], right: string[]) {
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
  const [itemIds, setItemIds] = useState(() => incomingIds);
  const didReorder = useRef(false);
  const latestItemIds = useRef(itemIds);

  useEffect(
    function trackLatestItemIds() {
      latestItemIds.current = itemIds;
    },
    [itemIds],
  );

  useEffect(
    function syncIncomingOrder() {
      if (didReorder.current) {
        return;
      }

      setItemIds((current) => (sameOrder(current, incomingIds) ? current : incomingIds));
    },
    [incomingIds],
  );

  function handleReorder(newOrder: string[]) {
    didReorder.current = true;
    setItemIds(newOrder);
    onReorder?.(newOrder);
  }

  function handleReorderComplete() {
    if (!didReorder.current) {
      return;
    }

    didReorder.current = false;
    onReorderComplete?.(latestItemIds.current);
  }

  return {
    itemIds,
    handleReorder,
    handleReorderComplete,
  };
}
