import type { FieldMetadata } from "@conform-to/react/future";
import { AnimatePresence, Reorder, useAnimate, useDragControls } from "motion/react";
import { useRef } from "react";
import { Item } from "./item";
import * as styles from "./items.css";
import { useReorderable } from "./reorderable/use-reorderable";

function ReorderableItem({
  itemId,
  item,
  edited,
  isNew,
  onDelete,
  reorderable,
}: {
  itemId: string;
  item: FieldMetadata<{ id: string; value: string }>;
  edited: boolean;
  isNew: boolean;
  onDelete?: (value: string) => void;
  reorderable?: boolean;
}) {
  const dragControls = useDragControls();
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const [scope, animate] = useAnimate();

  // Reorder (vertical) and swipe-to-delete (horizontal) both start from the drag
  // handle via dragControls + dragDirectionLock. This only reacts once the
  // gesture ENDS — it deliberately adds NO width/size/layout manipulation during
  // the drag, which is what perturbed motion's measurement and caused the
  // reorder-position drift.
  function handleDragEnd(
    _event: PointerEvent,
    info: { offset: { x: number }; velocity: { x: number } },
  ) {
    if (!scope.current) return;

    const flung = Math.abs(info.offset.x) > 140 || Math.abs(info.velocity.x) > 500;
    if (flung) {
      const direction = info.offset.x > 0 ? 1 : -1;
      animate(
        scope.current,
        { x: direction * window.innerWidth, opacity: 0 },
        { duration: 0.2 },
      ).then(() => deleteButtonRef.current?.click());
    } else {
      // Not a delete — spring any horizontal offset back to rest.
      animate(scope.current, { x: 0 }, { type: "spring", stiffness: 500, damping: 40 });
    }
  }

  return (
    <Reorder.Item
      ref={scope}
      as="li"
      value={itemId}
      className={styles.wrapper}
      exit={{ opacity: 0, height: 0 }}
      drag
      dragListener={false}
      dragControls={dragControls}
      dragDirectionLock
      onDragEnd={handleDragEnd}
      // Tactile lift while dragging (prototype behaviour). A one-off scale is
      // safe here — unlike the removed width/layout machinery it doesn't
      // accumulate offset, so reorder tracking stays true to the pointer.
      whileDrag={reorderable ? { scale: 1.03 } : undefined}
    >
      <Item
        fieldsetMetadata={item}
        edited={edited}
        isNew={isNew}
        deleteButtonRef={deleteButtonRef}
        isDismissing={false}
        onDragHandlePointerDown={(event) => dragControls.start(event)}
        onDelete={onDelete}
        reorderable={reorderable}
      />
    </Reorder.Item>
  );
}

interface ItemsProps {
  fieldMetadata: FieldMetadata<Array<{ id: string; value: string }>>;
  edited: Array<string>;
  newItems: Array<string>;
  pendingItem?: string | null;
  onReorder?: (itemIds: string[]) => void;
  onReorderComplete?: (itemIds: string[]) => void;
  onDelete?: (value: string) => void;
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
  reorderable,
}: ItemsProps) {
  const items = fieldMetadata.getFieldList();
  const pendingValue = pendingItem?.trim() || null;
  const incomingIds = items.map((item) => item.getFieldset().id.defaultValue);
  const { orderedIds, getGroupProps } = useReorderable({
    incomingIds,
    onReorder,
    onComplete: onReorderComplete,
  });

  const itemRecord = Object.fromEntries(
    items.map((item) => [item.getFieldset().id.defaultValue, item]),
  );
  const newItemSet = new Set(newItems);

  return (
    <Reorder.Group as="ul" axis="y" className={styles.items} {...getGroupProps()}>
      <AnimatePresence>
        {orderedIds
          .filter((itemId) => itemRecord[itemId])
          .map((itemId) => (
            <ReorderableItem
              key={itemId}
              itemId={itemId}
              item={itemRecord[itemId]}
              edited={edited.includes(itemId)}
              isNew={newItemSet.has(itemId)}
              onDelete={onDelete}
              reorderable={reorderable}
            />
          ))}
      </AnimatePresence>
      {orderedIds.filter((itemId) => itemRecord[itemId]).length === 0 && !pendingValue && (
        <li className={styles.emptyState}>No items yet — add one below</li>
      )}
      {pendingValue && (
        <li className={styles.skeletonItem}>
          <div className={styles.skeletonContent}>
            <span className={styles.pendingValue}>{pendingValue}</span>
            <span className={styles.pendingState}>saving...</span>
          </div>
        </li>
      )}
    </Reorder.Group>
  );
}
