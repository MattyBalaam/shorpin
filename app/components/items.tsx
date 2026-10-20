import type { FieldMetadata } from "@conform-to/react/future";
import { type PointerEvent, useRef, useState } from "react";
import { Item } from "./item";
import * as styles from "./items.css";
import type { StartDragOptions } from "./reorderable/use-drag-list";
import { useReorderable } from "./reorderable/use-reorderable";

function ReorderableItem({
  itemId,
  item,
  index,
  edited,
  isNew,
  onDelete,
  onRemove,
  reorderable,
  startDrag,
  collapse,
  scrollIntoViewOnMount,
}: {
  itemId: string;
  item: FieldMetadata<{ id: string; value: string }>;
  index: number;
  edited: boolean;
  isNew: boolean;
  onDelete?: (value: string) => void;
  onRemove: (index: number) => void;
  reorderable?: boolean;
  startDrag: (event: PointerEvent<HTMLElement>, options?: StartDragOptions) => void;
  collapse: (element: HTMLElement) => Promise<void>;
  scrollIntoViewOnMount: boolean;
}) {
  const rowRef = useRef<HTMLLIElement>(null);
  const [isDismissing, setIsDismissing] = useState(false);

  // Only shrink Conform's tracked array (which renumbers every later item's
  // field name) once this row's exit animation has actually finished. Doing it
  // any earlier would let a sibling get renumbered into this row's field name
  // while its inputs are still mounted — see mutate_list's diff-based delete,
  // which relies on the submitted items array being trustworthy.
  function commitRemoval() {
    onDelete?.(item.getFieldset().value.defaultValue ?? "");
    onRemove(index);
  }

  function handleDeleteClick() {
    if (!rowRef.current) {
      commitRemoval();
      return;
    }
    setIsDismissing(true);
    collapse(rowRef.current).then(commitRemoval);
  }

  return (
    <li
      ref={(node) => {
        rowRef.current = node;
        if (node && scrollIntoViewOnMount) node.scrollIntoView({ block: "nearest" });
      }}
      data-reorder-id={itemId}
      className={styles.wrapper}
    >
      <Item
        fieldsetMetadata={item}
        edited={edited}
        isNew={isNew}
        isDismissing={isDismissing}
        // Reorder (vertical) and swipe-to-delete (horizontal) both start from
        // the drag handle; the gesture locks to whichever axis moves first.
        onDragHandlePointerDown={(event) =>
          startDrag(event, {
            // Tactile lift while dragging (prototype behaviour).
            liftScale: reorderable ? 1.03 : 1,
            swipe: {
              onDismissStart: () => setIsDismissing(true),
              onDismiss: commitRemoval,
            },
          })
        }
        onRequestDelete={handleDeleteClick}
        reorderable={reorderable}
      />
    </li>
  );
}

interface ItemsProps {
  fieldMetadata: FieldMetadata<Array<{ id: string; value: string }>>;
  edited: Array<string>;
  newItems: Array<string>;
  /** An add in flight; `id` is the id the saved row will have. */
  pendingItem?: { id: string; value: string } | null;
  onReorder?: (itemIds: string[]) => void;
  onReorderComplete?: (itemIds: string[]) => void;
  onDelete?: (value: string) => void;
  onRemove: (index: number) => void;
  reorderable?: boolean;
}

export function Items({
  fieldMetadata,
  edited,
  newItems,
  pendingItem,
  onReorder,
  onReorderComplete,
  onDelete,
  onRemove,
  reorderable,
}: ItemsProps) {
  const items = fieldMetadata.getFieldList();
  const incomingIds = items.map((item) => item.getFieldset().id.defaultValue);
  const { orderedIds, groupRef, startDrag, collapse } = useReorderable<HTMLUListElement>({
    incomingIds,
    onReorder,
    onComplete: onReorderComplete,
  });

  const itemRecord = Object.fromEntries(
    items.map((item, index) => [item.getFieldset().id.defaultValue, { item, index }]),
  );
  const newItemSet = new Set(newItems);
  const visibleIds = orderedIds.filter((itemId) => itemRecord[itemId]);

  // The placeholder stays until the saved row is rendered (visibleIds, not
  // the form's items: useReorderable picks new ids up a commit later), so
  // the list never drops it early. That would shrink the list and clamp the
  // scroll position, leaving the row below the fold when it arrives.
  const pending = pendingItem && !visibleIds.includes(pendingItem.id) ? pendingItem : null;
  const pendingValue = pending?.value.trim() || null;

  // Adds land at the end of the list, below the fold on a long list. The
  // placeholder scrolls itself into view, and the saved row that replaces it
  // (same id) does the same as it mounts — it can be taller. Other members'
  // adds don't move the list.
  const [arrivingId, setArrivingId] = useState<string | null>(null);
  if (pending && pending.id !== arrivingId) setArrivingId(pending.id);

  return (
    <ul ref={groupRef} className={styles.items}>
      {visibleIds.map((itemId) => (
        <ReorderableItem
          key={itemId}
          itemId={itemId}
          item={itemRecord[itemId].item}
          index={itemRecord[itemId].index}
          edited={edited.includes(itemId)}
          isNew={newItemSet.has(itemId)}
          onDelete={onDelete}
          onRemove={onRemove}
          reorderable={reorderable}
          startDrag={startDrag}
          collapse={collapse}
          scrollIntoViewOnMount={itemId === arrivingId}
        />
      ))}
      {visibleIds.length === 0 && !pendingValue && (
        <li className={styles.emptyState}>No items yet — add one below</li>
      )}
      {pending && pendingValue && (
        // React Compiler hoists this ref so it only runs on mount.
        <li
          key={pending.id}
          ref={(node) => node?.scrollIntoView({ block: "nearest" })}
          className={styles.skeletonItem}
        >
          <div className={styles.skeletonContent}>
            <span className={styles.pendingValue}>{pendingValue}</span>
            <span className={styles.pendingState}>saving...</span>
          </div>
        </li>
      )}
    </ul>
  );
}
