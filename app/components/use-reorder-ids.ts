import { useReorderable } from "./reorderable/use-reorderable";

/**
 * @deprecated Backwards-compatible shim over {@link useReorderable}. New code
 * should use `useReorderable` directly. Home still consumes this; it is removed
 * once home migrates (see follow-up plan).
 */
export function useReorderIds({
  incomingIds,
  onReorder,
  onReorderComplete,
}: {
  incomingIds: string[];
  onReorder?: (itemIds: string[]) => void;
  onReorderComplete?: (itemIds: string[]) => void;
}) {
  const { orderedIds, handleReorder, complete } = useReorderable({
    incomingIds,
    onReorder,
    onComplete: onReorderComplete,
  });

  return {
    itemIds: orderedIds,
    handleReorder,
    handleReorderComplete: complete,
  };
}
