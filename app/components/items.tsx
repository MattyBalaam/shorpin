import type { FieldMetadata } from "@conform-to/react/future";
import { AnimatePresence, Reorder, useAnimate, useDragControls } from "motion/react";
import { useState } from "react";
import { Item } from "./item";
import * as styles from "./items.css";
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
}: {
  itemId: string;
  item: FieldMetadata<{ id: string; value: string }>;
  index: number;
  edited: boolean;
  isNew: boolean;
  onDelete?: (value: string) => void;
  onRemove: (index: number) => void;
  reorderable?: boolean;
}) {
  const dragControls = useDragControls();
  const [scope, animate] = useAnimate();
  const [isDismissing, setIsDismissing] = useState(false);

  // Only shrink Conform's tracked array (which renumbers every later item's
  // field name) once this row's exit animation has actually finished and it's
  // gone from the DOM. Doing it any earlier races AnimatePresence keeping the
  // outgoing node's inputs mounted under their old name while a sibling gets
  // renumbered into that same name — see mutate_list's diff-based delete,
  // which relies on the submitted items array being trustworthy.
  function commitRemoval() {
    onDelete?.(item.getFieldset().value.defaultValue ?? "");
    onRemove(index);
  }

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
      setIsDismissing(true);
      const direction = info.offset.x > 0 ? 1 : -1;
      animate(
        scope.current,
        { x: direction * window.innerWidth, opacity: 0 },
        { duration: 0.2 },
      ).then(commitRemoval);
    } else {
      // Not a delete — spring any horizontal offset back to rest, and
      // explicitly reset whileDrag's scale. Framer doesn't reliably revert
      // whileDrag's own scale on this node once a manual animate() (this
      // one) has written to its transform, so leaving scale unset here
      // stranded it at 1.03 after every plain reorder release.
      animate(scope.current, { x: 0, scale: 1 }, { type: "spring", stiffness: 500, damping: 40 });
    }
  }

  function handleDeleteClick() {
    if (!scope.current) {
      commitRemoval();
      return;
    }
    setIsDismissing(true);
    animate(scope.current, { opacity: 0, height: 0 }, { duration: 0.2 }).then(commitRemoval);
  }

  return (
    <Reorder.Item
      ref={scope}
      as="li"
      value={itemId}
      className={styles.wrapper}
      // duration: 0 — the visible fade-out already happened via the manual
      // animate() calls above, before intent.remove() ever fires (see
      // handleDeleteClick/handleDragEnd). Without this, AnimatePresence
      // plays its own *second* exit transition after removal, keeping this
      // node's stale FieldMetadata mounted for its full duration — long
      // enough for a sibling to get renumbered into its old field name.
      exit={{ opacity: 0, height: 0, transition: { duration: 0 } }}
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
        isDismissing={isDismissing}
        onDragHandlePointerDown={(event) => dragControls.start(event)}
        onRequestDelete={handleDeleteClick}
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
  const pendingValue = pendingItem?.trim() || null;
  const incomingIds = items.map((item) => item.getFieldset().id.defaultValue);
  const { orderedIds, getGroupProps } = useReorderable({
    incomingIds,
    onReorder,
    onComplete: onReorderComplete,
  });

  const itemRecord = Object.fromEntries(
    items.map((item, index) => [item.getFieldset().id.defaultValue, { item, index }]),
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
              item={itemRecord[itemId].item}
              index={itemRecord[itemId].index}
              edited={edited.includes(itemId)}
              isNew={newItemSet.has(itemId)}
              onDelete={onDelete}
              onRemove={onRemove}
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
