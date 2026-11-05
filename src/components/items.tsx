import { createMemo, createSignal, For, onSettled, Show, untrack } from "solid-js";
import { parseItemTag } from "~/lib/item-tag";
import type { ListItemRef } from "~/lib/offline-merge";
import { Item } from "./item";
import * as styles from "./items.css";
import type { StartDragOptions } from "./reorderable/create-drag-list";
import { createReorderable } from "./reorderable/create-reorderable";

function ReorderableItem(props: {
  item: ListItemRef;
  edited: boolean;
  isSaving: boolean;
  isNew: boolean;
  onDelete?: (value: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, value: string) => void;
  reorderable?: boolean;
  startDrag: (event: PointerEvent, options?: StartDragOptions) => void;
  collapse: (element: HTMLElement) => Promise<void>;
  scrollIntoViewOnMount: boolean;
  tags: string[];
}) {
  let row!: HTMLLIElement;
  const [isDismissing, setIsDismissing] = createSignal(false);

  // Adds land at the end of the list, below the fold on a long list: the
  // saved row scrolls itself into view as it mounts. After mount, since a
  // ref callback runs before the row is in the document.
  onSettled(() => {
    if (untrack(() => props.scrollIntoViewOnMount)) row.scrollIntoView({ block: "nearest" });
  });

  // Removal is by id, so it can happen whenever the exit animation ends:
  // nothing else gets renumbered meanwhile, as Conform's field names did.
  function commitRemoval() {
    props.onDelete?.(props.item.value);
    props.onRemove(props.item.id);
  }

  function handleDeleteClick() {
    setIsDismissing(true);
    void props.collapse(row).then(commitRemoval);
  }

  return (
    <li ref={row} data-reorder-id={props.item.id} class={styles.wrapper}>
      <Item
        item={props.item}
        edited={props.edited}
        isSaving={props.isSaving}
        isNew={props.isNew}
        isDismissing={isDismissing()}
        // Reorder (vertical) and swipe-to-delete (horizontal) both start from
        // the drag handle; the gesture locks to whichever axis moves first.
        onDragHandlePointerDown={(event) =>
          props.startDrag(event, {
            // Tactile lift while dragging (prototype behaviour).
            liftScale: props.reorderable ? 1.03 : 1,
            swipe: {
              onDismissStart: () => setIsDismissing(true),
              onDismiss: commitRemoval,
            },
          })
        }
        onRequestDelete={handleDeleteClick}
        onEdit={(value) => props.onEdit(props.item.id, value)}
        reorderable={props.reorderable}
        tags={props.tags}
      />
    </li>
  );
}

interface ItemsProps {
  items: ListItemRef[];
  /** Ids whose value differs from what the server last confirmed. */
  edited: ReadonlySet<string>;
  isSaving: boolean;
  newItems: string[];
  /** An add in flight; `id` is the id the saved row will have. */
  pendingItem?: ListItemRef | null;
  onReorder?: (itemIds: string[]) => void;
  onReorderComplete?: (itemIds: string[]) => void;
  onDelete?: (value: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, value: string) => void;
  /** The list's tags, offered when editing an item's tag. */
  tags?: string[];
  reorderable?: boolean;
}

export function Items(props: ItemsProps) {
  const itemsById = createMemo(() => new Map(props.items.map((item) => [item.id, item])));
  const { orderedIds, ref, startDrag, collapse } = createReorderable({
    incomingIds: () => props.items.map(({ id }) => id),
    onReorder: (ids) => props.onReorder?.(ids),
    onComplete: (ids) => props.onReorderComplete?.(ids),
  });

  const newItemSet = createMemo(() => new Set(props.newItems));
  const visibleIds = () => orderedIds().filter((id) => itemsById().has(id));

  // The placeholder stays until the saved row is rendered, so the list never
  // drops it early. That would shrink the list and clamp the scroll
  // position, leaving the row below the fold when it arrives.
  const pending = () => {
    const item = props.pendingItem;
    return item && !itemsById().has(item.id) ? item : null;
  };
  const pendingValue = () => {
    const item = pending();
    return (item && parseItemTag(item.value).text) || null;
  };

  // The id of the add in flight, kept after it lands so the saved row (same
  // id) scrolls itself into view as it mounts. Other members' adds don't
  // move the list.
  const arrivingId = createMemo<string | null>(
    (previous) => props.pendingItem?.id ?? previous ?? null,
  );

  return (
    <ul ref={ref} class={styles.items}>
      {/* Keyed by id (the default): a reorder moves the existing rows, which
          is what the drag list's FLIP animation watches for. */}
      <For each={visibleIds()}>
        {(id) => (
          <Show when={itemsById().get(id)}>
            {(item) => (
              <ReorderableItem
                item={item()}
                edited={props.edited.has(id)}
                isSaving={props.isSaving}
                isNew={newItemSet().has(id)}
                onDelete={props.onDelete}
                onRemove={props.onRemove}
                onEdit={props.onEdit}
                reorderable={props.reorderable}
                startDrag={startDrag}
                collapse={collapse}
                scrollIntoViewOnMount={id === arrivingId()}
                tags={props.tags ?? []}
              />
            )}
          </Show>
        )}
      </For>
      <Show when={visibleIds().length === 0 && !pendingValue()}>
        <li class={styles.emptyState}>No items yet — add one below</li>
      </Show>
      <Show when={pending()} keyed>
        {(item) => <PendingRow value={parseItemTag(item.value).text} />}
      </Show>
    </ul>
  );
}

function PendingRow(props: { value: string }) {
  let row!: HTMLLIElement;
  // A block body: scrollIntoView now returns a Promise in Chromium, and
  // onSettled rejects anything but a cleanup function.
  onSettled(() => {
    row.scrollIntoView({ block: "nearest" });
  });

  return (
    <li ref={row} class={styles.skeletonItem}>
      <div class={styles.skeletonContent}>
        <span class={styles.pendingValue}>{props.value}</span>
        <span class={styles.pendingState}>saving...</span>
      </div>
    </li>
  );
}
