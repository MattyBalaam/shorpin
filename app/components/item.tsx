import { useRef } from "react";
import { type DragControls, motion, useAnimate } from "motion/react";

import * as styles from "./item.css";
import { type FieldMetadata } from "@conform-to/react/future";
import { useNavigation } from "react-router";
import { VisuallyHidden } from "./visually-hidden/visually-hidden";

export interface ItemRenderProps {
  fieldsetMetadata: FieldMetadata<{ id: string; value: string }>;
  edited: boolean;
  reorderControls: DragControls;
  isDragging: boolean;
  onSwipeDelete: () => void;
}

// This is a row for an item in the list with an input and a delete button
export function Item({
  fieldsetMetadata,
  edited,
  reorderControls,
  isDragging,
  onSwipeDelete,
}: ItemRenderProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [scope, animate] = useAnimate();

  const navigation = useNavigation();

  const fieldset = fieldsetMetadata.getFieldset();

  async function handleDragEnd(
    _e: PointerEvent,
    info: { velocity: { x: number }; offset: { x: number } },
  ) {
    if (Math.abs(info.velocity.x) > 200 || Math.abs(info.offset.x) > 350) {
      const direction = info.velocity.x > 0 || info.offset.x > 0 ? 1 : -1;

      onSwipeDelete();

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

      cancelRef.current?.click();
    }
  }

  return (
    <motion.div
      ref={scope}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={styles.itemContainer}
    >
      <div className={styles.item}>
        <input
          className={styles.input}
          name={fieldset.value.name}
          id={fieldset.value.id}
          defaultValue={fieldset.value.defaultValue}
          autoComplete="none"
          onBlur={function submitIfEdited(e) {
            if (edited) {
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />

        <span className={styles.state}>
          {edited ? (
            navigation.state === "idle" ? (
              <>
                <VisuallyHidden> edited</VisuallyHidden>
                <span aria-hidden>✏️</span>
              </>
            ) : (
              <>
                <VisuallyHidden>saving</VisuallyHidden>
                <span aria-hidden className={styles.saving}></span>
              </>
            )
          ) : (
            <>
              <VisuallyHidden>saved</VisuallyHidden>
              <span aria-hidden>✔️</span>
            </>
          )}
        </span>

        <span
          className={`${styles.dragHandle} }`}
          onPointerDown={(event) => {
            reorderControls.start(event);
          }}
        >
          <VisuallyHidden>swipe to remove</VisuallyHidden>
          <span aria-hidden>||||||||||</span>
        </span>

        <span className={styles.deleteButton}>
          <button
            className={styles.tick}
            type="submit"
            name="__INTENT__"
            value={`delete-item-${fieldset.id.defaultValue}`}
            ref={cancelRef}
          >
            <VisuallyHidden>delete item</VisuallyHidden>🗑️
          </button>
        </span>

        {/* passes up the items id */}
        <input
          name={fieldset.id.name}
          id={fieldset.id.id}
          defaultValue={fieldset.id.defaultValue}
          type="hidden"
        />
      </div>
    </motion.div>
  );
}
