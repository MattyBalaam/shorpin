import type { FieldMetadata } from "@conform-to/react/future";
import { type PointerEventHandler, type RefObject, useRef } from "react";
import { useNavigation } from "react-router";
import { deleteItemIntent, isDeleteItemIntent, isUndeleteItemIntent } from "~/routes/list/intents";
import { Button } from "./button/button";
import * as styles from "./item.css";
import { VisuallyHidden } from "./visually-hidden/visually-hidden";

export interface ItemRenderProps {
  fieldsetMetadata: FieldMetadata<{ id: string; value: string }>;
  edited: boolean;
  isNew: boolean;
  deleteButtonRef: RefObject<HTMLButtonElement | null>;
  isDismissing: boolean;
  onDragHandlePointerDown: PointerEventHandler<HTMLSpanElement>;
}

// This is a row for an item in the list with an input and a delete button
export function Item({
  fieldsetMetadata,
  edited,
  isNew,
  deleteButtonRef,
  isDismissing,
  onDragHandlePointerDown,
}: ItemRenderProps) {
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

  const autoResize = (element: HTMLTextAreaElement) => {
    const startHeight = element.offsetHeight;
    const computed = window.getComputedStyle(element);
    const borderTop = Number.parseFloat(computed.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(computed.borderBottomWidth) || 0;
    const contentHeight = element.scrollHeight + borderTop + borderBottom;
    const endHeight = Math.max(startHeight, contentHeight);

    element.style.height = `${startHeight}px`;
    requestAnimationFrame(() => {
      element.style.height = `${endHeight}px`;
    });
  };

  return (
    <div
      className={styles.itemContainer}
      data-dismissing={isDismissing}
      data-deleting={isDeleting}
      data-new={isNew}
    >
      <div className={styles.item}>
        <textarea
          className={styles.input}
          name={fieldset.value.name}
          id={fieldset.value.id}
          defaultValue={fieldset.value.defaultValue}
          aria-label={`Edit ${fieldset.value.defaultValue}`}
          autoComplete="none"
          rows={1}
          onFocus={function expandOnFocus(e) {
            autoResize(e.currentTarget);
          }}
          onInput={function expandOnInput(e) {
            autoResize(e.currentTarget);
          }}
          onKeyDown={function submitOnEnter(e) {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          onBlur={function submitIfEdited(e) {
            e.currentTarget.style.height = "";
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
        ) : isNew ? (
          <span className={styles.state}>
            <VisuallyHidden>new since last opening</VisuallyHidden>
            <span aria-hidden className={styles.newIndicator}>
              new
            </span>
          </span>
        ) : null}

        <span
          className={styles.dragHandle}
          aria-label={`Reorder ${fieldset.value.defaultValue}`}
          onPointerDown={onDragHandlePointerDown}
        >
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
            <VisuallyHidden>Delete {fieldset.value.defaultValue}</VisuallyHidden>
            ☑️
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
