import { createSignal, onSettled, Show } from "solid-js";
import { DragGrip } from "~/components/reorderable/drag-grip";
import { getFirstLink } from "~/lib/extract-link";
import { formatItemTag, parseItemTag } from "~/lib/item-tag";
import type { ListItemRef } from "~/lib/offline-merge";
import { Button } from "./button/button";
import { TagCombobox } from "./tag-combobox/tag-combobox";
import * as styles from "./item.css";
import * as modalStyles from "./modal/modal.css";
import { VisuallyHidden } from "./visually-hidden/visually-hidden";

export interface ItemRenderProps {
  item: ListItemRef;
  /** Differs from the last value the server confirmed. */
  edited: boolean;
  /** A save of the list is in flight. */
  isSaving: boolean;
  isNew: boolean;
  isDismissing: boolean;
  onDragHandlePointerDown: (event: PointerEvent) => void;
  onRequestDelete: () => void;
  onEdit: (value: string) => void;
  reorderable?: boolean;
  tags: string[];
}

// A row for an item in the list. Unlike the React version, the row holds no
// form fields: the page's store is the list's state, and the row reports an
// edit through `onEdit` instead of writing a hidden input for the form to
// submit.
export function Item(props: ItemRenderProps) {
  const parsed = () => parseItemTag(props.item.value);
  // Labels name the row by its text alone, so a tag doesn't change how tests
  // and assistive tech find it.
  const label = () => parsed().text;
  const firstLink = () => getFirstLink(parsed().text);
  const isSavingEdit = () => props.edited && props.isSaving;

  const [isEditing, setIsEditing] = createSignal(false);

  function saveEdit(nextValue: string) {
    setIsEditing(false);
    const value = nextValue.trim();
    if (!value || value === props.item.value) return;
    props.onEdit(value);
  }

  return (
    <div
      class={[styles.itemContainer, props.reorderable && styles.itemContainerReorderable]}
      data-dismissing={String(props.isDismissing)}
      data-new={String(props.isNew)}
    >
      <div class={styles.item}>
        {/* The status (saving, edited, new) follows the text inline, wrapping
            with it, rather than sitting in a column of its own. */}
        <span class={styles.value}>
          {parsed().text}
          <Show
            when={props.edited}
            fallback={
              <Show when={props.isNew}>
                <span class={styles.state}>
                  <VisuallyHidden>new since last opening</VisuallyHidden>
                  <span aria-hidden="true" class={styles.newIndicator}>
                    new
                  </span>
                </span>
              </Show>
            }
          >
            <span class={styles.state}>
              <Show
                when={isSavingEdit()}
                fallback={
                  <>
                    <VisuallyHidden> edited</VisuallyHidden>
                    <span aria-hidden="true">✏️</span>
                  </>
                }
              >
                <VisuallyHidden>saving</VisuallyHidden>
                <span aria-hidden="true" class={styles.saving}></span>
              </Show>
            </span>
          </Show>
        </span>
        <Show when={parsed().tag}>
          {(tag) => (
            <span class={styles.tag}>
              <VisuallyHidden>tag: </VisuallyHidden>
              {tag()}
            </span>
          )}
        </Show>

        <Show when={firstLink()}>
          {(link) => (
            <a class={styles.linkButton} href={link()} target="_blank" rel="noreferrer">
              <VisuallyHidden>Open link</VisuallyHidden>
              <svg
                aria-hidden="true"
                class={styles.linkIcon}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14 5H19V10"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M10 14L19 5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M19 14V18C19 18.5304 18.7893 19.0391 18.4142 19.4142C18.0391 19.7893 17.5304 20 17 20H6C5.46957 20 4.96086 19.7893 4.58579 19.4142C4.21071 19.0391 4 18.5304 4 18V7C4 6.46957 4.21071 5.96086 4.58579 5.58579C4.96086 5.21071 5.46957 5 6 5H10"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </a>
          )}
        </Show>

        <button
          type="button"
          class={styles.editButton}
          aria-label={`Edit ${label()}`}
          onClick={() => setIsEditing(true)}
        >
          <svg aria-hidden="true" class={styles.editIcon} viewBox="0 0 24 24" fill="none">
            <path
              d="M4 20H8L18.5 9.5C19.6 8.4 19.6 6.6 18.5 5.5C17.4 4.4 15.6 4.4 14.5 5.5L4 16V20Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path d="M13.5 6.5L17.5 10.5" stroke="currentColor" stroke-width="2" />
          </svg>
        </button>

        <span
          class={styles.dragHandle}
          aria-label={`Reorder ${label()}`}
          onPointerDown={(event) => props.onDragHandlePointerDown(event)}
        >
          <VisuallyHidden>Reorder {label()}</VisuallyHidden>
          <DragGrip />
        </span>

        <span class={styles.deleteButton}>
          <Button
            class={props.reorderable ? styles.deleteReorderable : styles.tick}
            type="button"
            onClick={() => props.onRequestDelete()}
          >
            <VisuallyHidden>Delete {label()}</VisuallyHidden>
            {props.reorderable ? "✕" : "☑️"}
          </Button>
        </span>

        <Show when={isEditing()}>
          <EditDialog
            defaultText={parsed().text}
            defaultTag={parsed().tag}
            tags={props.tags}
            onSave={saveEdit}
            onCancel={() => setIsEditing(false)}
          />
        </Show>
      </div>
    </div>
  );
}

// The textarea and tag combobox are read on save and joined into one value
// (see item-tag.ts). Every button is type="button": no form to submit.
function EditDialog(props: {
  defaultText: string;
  defaultTag: string | null;
  tags: string[];
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  let dialog!: HTMLDialogElement;
  let textarea!: HTMLTextAreaElement;
  // Seeded once from the props: the dialog edits its own copy.
  const [tag, setTag] = createSignal(props.defaultTag ?? "");

  onSettled(function openOnMount() {
    if (dialog.open) return;
    dialog.showModal();
    // Cursor at the end, ready to append — the common edit.
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  });

  function save() {
    props.onSave(formatItemTag(textarea.value, tag()));
  }

  function saveOnEnter(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      save();
    }
  }

  return (
    <dialog
      ref={dialog}
      class={modalStyles.dialog}
      aria-label="Edit item"
      onClose={() => props.onCancel()}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div class={modalStyles.content}>
        <div class={modalStyles.body}>
          <textarea
            ref={textarea}
            class={styles.editTextarea}
            aria-label="Item"
            defaultValue={props.defaultText}
            autocomplete="off"
            rows={3}
            onKeyDown={saveOnEnter}
          />
          <TagCombobox
            label="Tag"
            tags={props.tags}
            value={tag()}
            onChange={setTag}
            onEnter={save}
          />
        </div>
        <div class={modalStyles.actions}>
          <Button variant="outline" type="button" onClick={() => props.onCancel()}>
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
