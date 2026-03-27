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

  useEffect(
    function syncIncomingOrder() {
      if (didReorder.current) {
        if (isPersisting) {
          didReorder.current = false;
        }

        return;
      }

      setItemIds((current) => (sameOrder(current, incomingIds) ? current : incomingIds));
    },
    [incomingIds, isPersisting],
  );

  function handleReorder(newOrder: string[]) {
    didReorder.current = true;
    latestItemIds.current = newOrder;
    setItemIds(newOrder);
    onReorder?.(newOrder);
  }

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
