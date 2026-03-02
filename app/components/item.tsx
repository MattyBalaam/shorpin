import { useRef, type RefObject } from "react";

import * as styles from "./item.css";
import { type FieldMetadata } from "@conform-to/react/future";
import { useNavigation } from "react-router";
import { VisuallyHidden } from "./visually-hidden/visually-hidden";
import { Button } from "./button/button";
import { deleteItemIntent, isDeleteItemIntent, isUndeleteItemIntent } from "~/routes/list/intents";

export interface ItemRenderProps {
  fieldsetMetadata: FieldMetadata<{ id: string; value: string }>;
  edited: boolean;
  deleteButtonRef: RefObject<HTMLButtonElement | null>;
  isDismissing: boolean;
}

// This is a row for an item in the list with an input and a delete button
export function Item({ fieldsetMetadata, edited, deleteButtonRef, isDismissing }: ItemRenderProps) {
  const navigation = useNavigation();

  const fieldset = fieldsetMetadata.getFieldset();

  const intent = navigation.formData?.get("__INTENT__") as string | null;

  // Persist the last known intent through the full navigation cycle.
  // navigation.formData (and therefore intent) is only populated during
  // "submitting" — it becomes null during "loading". Without this ref,
  // isSavingEdit incorrectly flips true for any edited item while a delete
  // navigates through its loading phase.
  const lastIntentRef = useRef<string | null>(null);
  if (navigation.state === "submitting") {
    lastIntentRef.current = intent;
  } else if (navigation.state === "idle") {
    lastIntentRef.current = null;
  }
  const effectiveIntent = navigation.state === "submitting" ? intent : lastIntentRef.current;

  const isDeleting =
    navigation.state === "submitting" &&
    intent === deleteItemIntent(fieldset.id.defaultValue ?? "");

  const isSavingEdit =
    edited &&
    navigation.state !== "idle" &&
    !isDeleteItemIntent(effectiveIntent) &&
    !isUndeleteItemIntent(effectiveIntent);

  return (
    <div className={styles.itemContainer} data-dismissing={isDismissing} data-deleting={isDeleting}>
      <div className={styles.item}>
        <input
          className={styles.input}
          name={fieldset.value.name}
          id={fieldset.value.id}
          defaultValue={fieldset.value.defaultValue}
          aria-label={`Edit ${fieldset.value.defaultValue}`}
          autoComplete="none"
          onBlur={function submitIfEdited(e) {
            if (edited) {
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />

        {edited && (isSavingEdit || navigation.state === "idle") ? (
          <span className={styles.state}>
            {isSavingEdit ? (
              <>
                <VisuallyHidden>saving</VisuallyHidden>
                <span aria-hidden className={styles.saving}></span>
              </>
            ) : (
              <>
                <VisuallyHidden> edited</VisuallyHidden>
                <span aria-hidden>✏️</span>
              </>
            )}
          </span>
        ) : null}

        <span className={styles.dragHandle}>
          <VisuallyHidden>Reorder {fieldset.value.defaultValue}</VisuallyHidden>
          <span aria-hidden>|-|-|-|-|</span>
        </span>

        <span className={styles.deleteButton}>
          <Button
            className={styles.tick}
            type="submit"
            name="__INTENT__"
            value={deleteItemIntent(fieldset.id.defaultValue ?? "")}
            ref={deleteButtonRef}
          >
            <VisuallyHidden>Delete {fieldset.value.defaultValue}</VisuallyHidden>☑️
          </Button>
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
