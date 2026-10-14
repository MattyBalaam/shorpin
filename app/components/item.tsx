import { type FieldMetadata, useFormData } from "@conform-to/react/future";
import { type PointerEventHandler, useEffect, useRef, useState } from "react";
import { useNavigation } from "react-router";
import { getFirstLink } from "~/lib/extract-link";
import { Button } from "./button/button";
import * as styles from "./item.css";
import * as modalStyles from "./modal/modal.css";
import { VisuallyHidden } from "./visually-hidden/visually-hidden";

export interface ItemRenderProps {
  fieldsetMetadata: FieldMetadata<{ id: string; value: string }>;
  edited: boolean;
  isNew: boolean;
  isDismissing: boolean;
  onDragHandlePointerDown: PointerEventHandler<HTMLSpanElement>;
  onRequestDelete: () => void;
  reorderable?: boolean;
}

// This is a row for an item in the list with an input and a delete button
export function Item({
  fieldsetMetadata,
  edited,
  isNew,
  isDismissing,
  onDragHandlePointerDown,
  onRequestDelete,
  reorderable,
}: ItemRenderProps) {
  const navigation = useNavigation();

  const fieldset = fieldsetMetadata.getFieldset();
  const defaultValue = fieldset.value.defaultValue ?? "";
  const currentValue =
    useFormData(
      fieldset.value.formId,
      (formData) => formData.get(fieldset.value.name)?.toString() ?? defaultValue,
      { fallback: defaultValue },
    ) ?? defaultValue;

  const firstLink = getFirstLink(currentValue);

  // Delete is committed locally (intent.remove) only once its exit animation
  // finishes, so by the time any submission is in flight for this row it's
  // already unmounted — any in-flight submission still showing this row is
  // an edit save, never a delete.
  const isSavingEdit = edited && navigation.state !== "idle";

  const valueInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  function saveEdit(nextValue: string) {
    setIsEditing(false);
    const input = valueInputRef.current;
    const value = nextValue.trim();
    if (!input || !value || value === currentValue) return;

    // The value lives in a hidden input so it's submitted with the list like
    // any other field. Programmatic writes fire no events, so dispatch `input`
    // ourselves for Conform's useFormData (`edited`, the shown value) to see it.
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.form?.requestSubmit();
  }

  return (
    <div
      className={[styles.itemContainer, reorderable && styles.itemContainerReorderable]
        .filter(Boolean)
        .join(" ")}
      data-dismissing={isDismissing}
      data-new={isNew}
    >
      <div className={styles.item}>
        <span className={styles.value}>{currentValue}</span>
        <input
          ref={valueInputRef}
          type="hidden"
          name={fieldset.value.name}
          id={fieldset.value.id}
          defaultValue={fieldset.value.defaultValue}
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

        {firstLink ? (
          <a className={styles.linkButton} href={firstLink} target="_blank" rel="noreferrer">
            <VisuallyHidden>Open link</VisuallyHidden>
            <svg
              aria-hidden
              className={styles.linkIcon}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14 5H19V10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 14L19 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19 14V18C19 18.5304 18.7893 19.0391 18.4142 19.4142C18.0391 19.7893 17.5304 20 17 20H6C5.46957 20 4.96086 19.7893 4.58579 19.4142C4.21071 19.0391 4 18.5304 4 18V7C4 6.46957 4.21071 5.96086 4.58579 5.58579C4.96086 5.21071 5.46957 5 6 5H10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        ) : null}

        <button
          type="button"
          className={styles.editButton}
          aria-label={`Edit ${fieldset.value.defaultValue}`}
          onClick={() => setIsEditing(true)}
        >
          <svg aria-hidden className={styles.editIcon} viewBox="0 0 24 24" fill="none">
            <path
              d="M4 20H8L18.5 9.5C19.6 8.4 19.6 6.6 18.5 5.5C17.4 4.4 15.6 4.4 14.5 5.5L4 16V20Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M13.5 6.5L17.5 10.5" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>

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
            className={reorderable ? styles.deleteReorderable : styles.tick}
            type="button"
            onClick={onRequestDelete}
          >
            <VisuallyHidden>Delete {fieldset.value.defaultValue}</VisuallyHidden>
            {reorderable ? "✕" : "☑️"}
          </Button>
        </span>

        {isEditing ? (
          <EditDialog
            defaultValue={currentValue}
            onSave={saveEdit}
            onCancel={() => setIsEditing(false)}
          />
        ) : null}

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

// Rendered inside the list <Form>, so it holds no named fields and no nested
// <form method="dialog">: the textarea is read on save and written into the
// row's hidden input, and every button is type="button".
function EditDialog({
  defaultValue,
  onSave,
  onCancel,
}: {
  defaultValue: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(function openOnMount() {
    const dialog = dialogRef.current;
    const textarea = textareaRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    // Cursor at the end, ready to append — the common edit.
    textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
  }, []);

  function save() {
    onSave(textareaRef.current?.value ?? defaultValue);
  }

  return (
    <dialog
      ref={dialogRef}
      className={modalStyles.dialog}
      aria-label="Edit item"
      onClose={onCancel}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className={modalStyles.content}>
        <textarea
          ref={textareaRef}
          className={styles.editTextarea}
          aria-label="Item"
          defaultValue={defaultValue}
          autoComplete="off"
          rows={3}
          onKeyDown={function saveOnEnter(e) {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              save();
            }
          }}
        />
        <div className={modalStyles.actions}>
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={save}>
            Save
          </Button>
        </div>
      </div>
    </dialog>
  );
}
