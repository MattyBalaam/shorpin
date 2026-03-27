import { Reorder, useDragControls } from "motion/react";

import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";
import * as styles from "./reorderable-item.css";

export type ListItem = {
  id: string;
  value: string;
  edited?: boolean;
};

export interface ReorderableItemProps {
  item: ListItem;
  isDragging?: boolean;
  onDelete: () => void;
  onDragEnd?: React.ComponentProps<(typeof Reorder)["Item"]>["onDragEnd"];
  onDragStart?: () => void;
  onEdit: (value: string) => void;
}

export function ReorderableItem({
  item,
  isDragging,
  onDelete,
  onDragEnd,
  onDragStart,
  onEdit,
}: ReorderableItemProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      as="li"
      value={item.id}
      className={styles.item}
      drag
      dragDirectionLock
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
      exit={{ opacity: 0, transform: "translateX(-100%)" }}
      data-dragging={isDragging ? true : undefined}
    >
      <div className={styles.inner}>
        <textarea
          className={styles.itemInput}
          value={item.value}
          onChange={(e) => onEdit(e.target.value)}
          rows={1}
        />

        <span
          className={styles.dragHandle}
          aria-label={`Reorder ${item.value}`}
          onPointerDown={(event) => dragControls.start(event)}
        >
          <VisuallyHidden>Reorder {item.value}</VisuallyHidden>
          <span aria-hidden>|-|-|-|-|</span>
        </span>

        {item.edited && (
          <span className={styles.editedIndicator} aria-label="edited">
            ✏️
          </span>
        )}

        <button
          className={styles.deleteButton}
          onClick={onDelete}
          aria-label={`Delete ${item.value}`}
          type="button"
        >
          ✕
        </button>
      </div>
    </Reorder.Item>
  );
}
