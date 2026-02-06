import {
  AnimatePresence,
  Reorder,
  stagger,
  useDragControls,
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
  const dragControls = useDragControls();
  const [isDragging, setIsDragging] = useState(false);
  const [swiped, setSwiped] = useState(false);

  return (
    <Reorder.Item
      as="li"
      value={itemId}
      className={styles.wrapper}
      initial={{ height: 0 }}
      animate={swiped ? "closed" : "open"}
      exit="closed"
      variants={variants.item}
      dragControls={dragControls}
      dragListener={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
    >
      <Item
        fieldsetMetadata={item}
        edited={edited}
        reorderControls={dragControls}
        isDragging={isDragging}
        onSwipeDelete={() => setSwiped(true)}
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
      paddingBottom: "0.5em",
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
