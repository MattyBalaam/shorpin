import {
  AnimatePresence,
  Reorder,
  stagger,
  useAnimate,
  Variants,
} from "motion/react";
import { Item } from "./item";
import { useRef, useState } from "react";

import * as styles from "./items.css";
import type { FieldMetadata } from "@conform-to/react/future";

function ReorderableItem({
  itemId,
  item,
  edited,
}: {
  itemId: string;
  item: FieldMetadata<{ id: string; value: string }>;
  edited: boolean;
}) {
  const [swiped, setSwiped] = useState(false);
  const [lockedAxis, setLockedAxis] = useState<"x" | "y" | null>(null);
  const [scope, animate] = useAnimate();
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

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
  }

  return (
    <Reorder.Item
      ref={scope}
      as="li"
      value={itemId}
      className={styles.wrapper}
      initial={{ height: 0 }}
      animate={swiped ? "closed" : "open"}
      exit="closed"
      variants={variants.item}
      drag
      dragDirectionLock
      dragConstraints={
        lockedAxis === "x" ? { top: 0, bottom: 0, left: 0, right: 0 } : undefined
      }
      dragElastic={
        lockedAxis === "x"
          ? { left: 1, right: 1, top: 0, bottom: 0 }
          : undefined
      }
      onDirectionLock={(axis) => setLockedAxis(axis)}
      onDragEnd={handleDragEnd}
    >
      <Item
        fieldsetMetadata={item}
        edited={edited}
        deleteButtonRef={deleteButtonRef}
      />
    </Reorder.Item>
  );
}

interface ItemsProps {
  fieldMetadata: FieldMetadata<Array<{ id: string; value: string }>>;
  edited: Array<string>;
  onReorder?: (itemIds: string[]) => void;
  onReorderComplete?: () => void;
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
} satisfies Record<string, Variants>;

export function Items({
  fieldMetadata,
  edited,
  onReorder,
  onReorderComplete,
}: ItemsProps) {
  const items = fieldMetadata.getFieldList();
  const didReorder = useRef(false);

  // Track item order by IDs
  const [itemIds, setItemIds] = useState(() =>
    items.map((item) => item.getFieldset().id.defaultValue),
  );

  // Sync itemIds when items change from the server (new items, reorder from another client, etc.)
  // but not while the user is actively dragging on this client
  const incomingIds = items.map((item) => item.getFieldset().id.defaultValue);

  if (
    !didReorder.current &&
    (incomingIds.length !== itemIds.length ||
      incomingIds.some((id, i) => id !== itemIds[i]))
  ) {
    setItemIds(incomingIds);
  }

  const handleReorder = (newOrder: string[]) => {
    didReorder.current = true;
    setItemIds(newOrder);
    onReorder?.(newOrder);
  };

  const itemRecord = Object.fromEntries(
    items.map((item) => [item.getFieldset().id.defaultValue, item]),
  );

  return (
    <Reorder.Group
      as="ul"
      axis="y"
      values={itemIds}
      onReorder={handleReorder}
      className={styles.items}
      onPointerUp={() => {
        if (didReorder.current) {
          didReorder.current = false;
          onReorderComplete?.();
        }
      }}
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
            />
          ))}
      </AnimatePresence>
    </Reorder.Group>
  );
}
