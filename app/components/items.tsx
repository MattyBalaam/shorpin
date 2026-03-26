import type { FieldMetadata } from "@conform-to/react/future";
import {
  AnimatePresence,
  Reorder,
  stagger,
  useAnimate,
  useDragControls,
  type Variants,
} from "motion/react";
import { useRef, useState } from "react";
import { Item } from "./item";
import * as styles from "./items.css";
import { useReorderIds } from "./use-reorder-ids";

function ReorderableItem({
  itemId,
  item,
  edited,
  isNew,
}: {
  itemId: string;
  item: FieldMetadata<{ id: string; value: string }>;
  edited: boolean;
  isNew: boolean;
}) {
  const [swiped, setSwiped] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [lockedAxis, setLockedAxis] = useState<"x" | "y" | null>(null);
  const [scope, animate] = useAnimate();
  const dragControls = useDragControls();
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  function handleDragStart() {
    setIsDragging(true);
    setDragWidth(scope.current?.getBoundingClientRect().width ?? null);
  }

  async function handleDragEnd(
    _e: PointerEvent,
    info: { velocity: { x: number }; offset: { x: number } },
  ) {
    if (lockedAxis === "x") {
      if (Math.abs(info.velocity.x) > 200 || Math.abs(info.offset.x) > 350) {
        const direction = info.velocity.x > 0 || info.offset.x > 0 ? 1 : -1;
        setSwiped(true);

        animate(
          scope.current,
          {
            x: direction * window.innerWidth,
            height: 0,
          },
          {
            type: "spring",
            stiffness: 300,
            damping: 30,
            velocity: info.velocity.x,
          },
        );

        deleteButtonRef.current?.click();
      }
    }

    setLockedAxis(null);
    setIsDragging(false);
    setDragWidth(null);
  }

  return (
    <Reorder.Item
      ref={scope}
      as="li"
      value={itemId}
      className={styles.wrapper}
      style={{ width: isDragging && dragWidth ? `${dragWidth}px` : "100%" }}
      initial={{ height: 0 }}
      animate={swiped ? "closed" : "open"}
      exit="closed"
      variants={variants.item}
      drag
      dragListener={false}
      dragControls={dragControls}
      dragDirectionLock
      dragConstraints={lockedAxis === "x" ? { top: 0, bottom: 0, left: 0, right: 0 } : undefined}
      dragElastic={lockedAxis === "x" ? { left: 1, right: 1, top: 0, bottom: 0 } : undefined}
      onDragStart={handleDragStart}
      onDirectionLock={(axis) => setLockedAxis(axis)}
      onDragEnd={handleDragEnd}
    >
      <Item
        fieldsetMetadata={item}
        edited={edited}
        isNew={isNew}
        deleteButtonRef={deleteButtonRef}
        isDismissing={lockedAxis === "x"}
        onDragHandlePointerDown={(event) => dragControls.start(event)}
      />
    </Reorder.Item>
  );
}

interface ItemsProps {
  fieldMetadata: FieldMetadata<Array<{ id: string; value: string }>>;
  edited: Array<string>;
  newItems: Array<string>;
  pendingItem?: string | null;
  isPersisting?: boolean;
  onReorder?: (itemIds: string[]) => void;
  onReorderComplete?: (itemIds: string[]) => void;
}

const variants = {
  container: {
    open: {
      transition: { delayChildren: stagger(0.1), duration: 1 },
    },
    closed: {
      transition: { delayChildren: 0.03, staggerDirection: -1 },
    },
  },
  item: {
    open: {
      height: "auto",
      paddingBottom: "0.1rem",
      transitionEnd: {
        overflow: "visible",
      },
    },
    closed: {
      height: 0,
      paddingBottom: 0,
      overflow: "hidden",
    },
  },
} satisfies Record<"container" | "item", Variants>;

export function Items({
  fieldMetadata,
  edited,
  newItems,
  pendingItem,
  isPersisting = false,
  onReorder,
  onReorderComplete,
}: ItemsProps) {
  const items = fieldMetadata.getFieldList();
  const pendingValue = pendingItem?.trim() || null;
  const incomingIds = items.map((item) => item.getFieldset().id.defaultValue);
  const { itemIds, handleReorder, handleReorderComplete } = useReorderIds({
    incomingIds,
    isPersisting,
    onReorder,
    onReorderComplete,
  });

  const itemRecord = Object.fromEntries(
    items.map((item) => [item.getFieldset().id.defaultValue, item]),
  );
  const newItemSet = new Set(newItems);

  return (
    <Reorder.Group
      as="ul"
      axis="y"
      values={itemIds}
      onReorder={handleReorder}
      layoutScroll
      className={styles.items}
      onPointerUp={handleReorderComplete}
    >
      <AnimatePresence>
        {itemIds
          .filter((itemId) => itemRecord[itemId])
          .map((itemId) => (
            <ReorderableItem
              key={itemId}
              itemId={itemId}
              item={itemRecord[itemId]}
              edited={edited.includes(itemId)}
              isNew={newItemSet.has(itemId)}
            />
          ))}
      </AnimatePresence>
      {itemIds.filter((itemId) => itemRecord[itemId]).length === 0 && !pendingValue && (
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
