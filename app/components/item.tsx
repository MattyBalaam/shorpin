import { type RefObject } from "react";

import * as styles from "./item.css";
import { type FieldMetadata } from "@conform-to/react/future";
import { useNavigation } from "react-router";
import { VisuallyHidden } from "./visually-hidden/visually-hidden";

export interface ItemRenderProps {
  fieldsetMetadata: FieldMetadata<{ id: string; value: string }>;
  edited: boolean;
  deleteButtonRef: RefObject<HTMLButtonElement | null>;
  isDismissing: boolean;
}

// This is a row for an item in the list with an input and a delete button
export function Item({
  fieldsetMetadata,
  edited,
  deleteButtonRef,
  isDismissing,
}: ItemRenderProps) {
  const navigation = useNavigation();

  const fieldset = fieldsetMetadata.getFieldset();

  return (
    <div
      className={styles.itemContainer}
      data-dismissing={isDismissing || undefined}
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

        {edited ? (
          <span className={styles.state}>
            {navigation.state === "idle" ? (
              <>
                <VisuallyHidden> edited</VisuallyHidden>
                <span aria-hidden>✏️</span>
              </>
            ) : (
              <>
                <VisuallyHidden>saving</VisuallyHidden>
                <span aria-hidden className={styles.saving}></span>
              </>
            )}
          </span>
        ) : null}

        <span className={styles.dragHandle}>
          <VisuallyHidden>drag to reorder</VisuallyHidden>
          <span aria-hidden>||||||||||</span>
        </span>

        <span className={styles.deleteButton}>
          <button
            className={styles.tick}
            type="submit"
            name="__INTENT__"
            value={`delete-item-${fieldset.id.defaultValue}`}
            ref={deleteButtonRef}
          >
            <VisuallyHidden>delete item</VisuallyHidden>☑️
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
    </div>
  );
}
