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
  onReorderComplete?: () => void;
}) {
  const [itemIds, setItemIds] = useState(() => incomingIds);
  const didReorder = useRef(false);

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
    onReorderComplete?.();
  }

  return {
    itemIds,
    handleReorder,
    handleReorderComplete,
  };
}
