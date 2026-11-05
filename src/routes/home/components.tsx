import { createMemo, For, Show } from "solid-js";
import { Link } from "~/components/link/link";
import type { StartDragOptions } from "~/components/reorderable/create-drag-list";
import { createReorderable } from "~/components/reorderable/create-reorderable";
import { DragGrip } from "~/components/reorderable/drag-grip";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";
import * as styles from "./home.css";
import type { ListItem } from "./home.schema";

function StarButton(props: { name: string; isDefault: boolean; onToggle: () => void }) {
  return (
    <div class={styles.itemStar}>
      <button
        type="button"
        class={styles.itemStarButton}
        aria-pressed={props.isDefault ? "true" : "false"}
        title={props.isDefault ? "Opens when the app launches" : "Open when the app launches"}
        onClick={() => props.onToggle()}
      >
        <VisuallyHidden>Open {props.name} on launch</VisuallyHidden>
        <span aria-hidden="true">{props.isDefault ? "★" : "☆"}</span>
      </button>
    </div>
  );
}

function ListRow(props: {
  list: ListItem;
  userId: string;
  isDefault: boolean;
  onToggleDefault: (id: string) => void;
  startDrag: (event: PointerEvent, options?: StartDragOptions) => void;
}) {
  const isOwner = () => props.list.user_id === props.userId;

  return (
    <li data-reorder-id={props.list.id} class={styles.itemWrapper}>
      <div class={styles.item}>
        <Show
          when={!props.list.pending}
          fallback={
            <span class={styles.pendingItemLink}>
              {props.list.name}{" "}
              <VisuallyHidden>(pending — will sync when back online)</VisuallyHidden>
            </span>
          }
        >
          <Link class={styles.itemLink} to="/lists/$list" params={{ list: props.list.slug }}>
            {props.list.name}
          </Link>
        </Show>

        <Show when={isOwner() && !props.list.pending}>
          {/* A plain anchor until the config route is ported (stage 2):
              the router's Link only accepts routes that exist. */}
          <a class={`${styles.itemConfig}`} href={`/config/${props.list.slug}`}>
            <VisuallyHidden>Configure</VisuallyHidden>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.22-1.12.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.51.41 1.05.72 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.22 1.12-.53 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
            </svg>
          </a>
        </Show>

        <Show when={!props.list.pending}>
          <StarButton
            name={props.list.name}
            isDefault={props.isDefault}
            onToggle={() => props.onToggleDefault(props.list.id)}
          />
        </Show>

        <span
          class={styles.itemDragHandle}
          aria-label={`Reorder ${props.list.name}`}
          onPointerDown={(event) => props.startDrag(event, { liftScale: 1.03 })}
        >
          <VisuallyHidden>Reorder {props.list.name}</VisuallyHidden>
          <DragGrip />
        </span>

        <span class={styles.itemStatus}>
          <Show when={props.list.unreadCount > 0}>
            <span class={styles.unreadBadge} aria-label={`${props.list.unreadCount} unread`}>
              {props.list.unreadCount}
              <VisuallyHidden> unread of </VisuallyHidden>
            </span>
          </Show>
          <span class={styles.itemTotal}>
            {props.list.totalCount}
            <VisuallyHidden> items</VisuallyHidden>
          </span>
        </span>
      </div>
    </li>
  );
}

export function Lists(props: {
  lists: ListItem[];
  userId: string;
  defaultListId: string | null;
  onToggleDefault: (id: string) => void;
  onReorder: (ids: string[]) => void;
}) {
  const byId = createMemo(() => new Map(props.lists.map((list) => [list.id, list])));
  const { orderedIds, ref, startDrag } = createReorderable({
    incomingIds: () => props.lists.map(({ id }) => id),
    onComplete: (ids) => props.onReorder(ids),
  });

  return (
    <ul ref={ref} class={styles.list}>
      <For each={orderedIds()}>
        {(id) => (
          <Show when={byId().get(id)}>
            {(list) => (
              <ListRow
                list={list()}
                userId={props.userId}
                isDefault={props.defaultListId === id}
                onToggleDefault={props.onToggleDefault}
                startDrag={startDrag}
              />
            )}
          </Show>
        )}
      </For>
    </ul>
  );
}
