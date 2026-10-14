import { type PointerEvent, use } from "react";
import { href, useFetcher, useSubmit } from "react-router";

import { Link } from "~/components/link/link";
import { reorderViaFormData } from "~/components/reorderable/reorder-strategies";
import type { StartDragOptions } from "~/components/reorderable/use-drag-list";
import { useReorderable } from "~/components/reorderable/use-reorderable";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";

import * as styles from "./home.css";
import { ListItem, REORDER_LISTS_INTENT, SET_DEFAULT_LIST_INTENT } from "./home.schema";

export function PendingSignUps({ countPromise }: { countPromise: Promise<number> }) {
  const count = use(countPromise);
  if (count === 0) return null;
  return (
    <Link to={href("/sign-ups")}>
      {count} <span className={styles.signUpsLabel}>pending</span>
    </Link>
  );
}

// Shared key so every row sees the in-flight submission and the previously
// starred row un-stars optimistically along with the newly starred one.
const DEFAULT_LIST_FETCHER_KEY = "default-list";

function StarButton({
  id,
  name,
  defaultListId,
}: {
  id: string;
  name: string;
  defaultListId: string | null;
}) {
  const fetcher = useFetcher({ key: DEFAULT_LIST_FETCHER_KEY });
  const pendingId = fetcher.formData?.get("list-id");
  const effectiveDefault = typeof pendingId === "string" ? pendingId || null : defaultListId;
  const isDefault = effectiveDefault === id;

  return (
    <fetcher.Form method="post" className={styles.itemStar}>
      <input type="hidden" name="intent" value={SET_DEFAULT_LIST_INTENT} />
      <input type="hidden" name="list-id" value={isDefault ? "" : id} />
      <button
        type="submit"
        className={styles.itemStarButton}
        aria-pressed={isDefault}
        title={isDefault ? "Opens when the app launches" : "Open when the app launches"}
      >
        <VisuallyHidden>Open {name} on launch</VisuallyHidden>
        <span aria-hidden>{isDefault ? "★" : "☆"}</span>
      </button>
    </fetcher.Form>
  );
}

export function ReorderableListItem({
  list,
  userId,
  defaultListId,
  startDrag,
}: {
  list: ListItem;
  userId: string;
  defaultListId: string | null;
  startDrag: (event: PointerEvent<HTMLElement>, options?: StartDragOptions) => void;
}) {
  const { id, name, slug, user_id, unreadCount, totalCount, pending } = list;
  const isOwner = user_id === userId;

  return (
    <li data-reorder-id={id} className={styles.itemWrapper}>
      <div className={styles.item}>
        {pending ? (
          <span className={styles.pendingItemLink}>
            {name} <VisuallyHidden>(pending — will sync when back online)</VisuallyHidden>
          </span>
        ) : (
          <Link className={styles.itemLink} to={href("/lists/:list", { list: slug })}>
            {name}
          </Link>
        )}

        {!pending && <StarButton id={id} name={name} defaultListId={defaultListId} />}

        <span
          className={styles.itemDragHandle}
          aria-label={`Reorder ${name}`}
          onPointerDown={(event) => startDrag(event, { liftScale: 1.03 })}
        >
          <VisuallyHidden>Reorder {name}</VisuallyHidden>
          <span aria-hidden>|-|-|-|-|</span>
        </span>

        {isOwner && !pending && (
          <Link
            className={styles.itemConfig}
            variant="primary"
            to={href("/config/:list", { list: slug })}
          >
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
          </Link>
        )}

        <span className={styles.itemStatus}>
          {unreadCount > 0 && (
            <span className={styles.unreadBadge} aria-label={`${unreadCount} unread`}>
              {unreadCount}
              <VisuallyHidden> unread of </VisuallyHidden>
            </span>
          )}
          <span className={styles.itemTotal}>
            {totalCount}
            <VisuallyHidden> items</VisuallyHidden>
          </span>
        </span>
      </div>
    </li>
  );
}

export function Lists({
  listsPromise,
  userId,
  defaultListId,
}: {
  listsPromise: Promise<ListItem[]>;
  userId: string;
  defaultListId: string | null;
}) {
  const lists = use(listsPromise);
  const submit = useSubmit();
  const incomingIds = lists.map(({ id }) => id);
  const listRecord = Object.fromEntries(lists.map((list) => [list.id, list]));

  const { orderedIds, groupRef, startDrag } = useReorderable<HTMLUListElement>({
    incomingIds,
    ...reorderViaFormData({ submit, intent: REORDER_LISTS_INTENT, fieldName: "list-order" }),
  });

  return (
    <ul ref={groupRef} className={styles.list}>
      {orderedIds
        .filter((id) => listRecord[id])
        .map((id) => (
          <ReorderableListItem
            key={id}
            list={listRecord[id]}
            userId={userId}
            defaultListId={defaultListId}
            startDrag={startDrag}
          />
        ))}
    </ul>
  );
}
