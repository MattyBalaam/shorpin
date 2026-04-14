import { Reorder, useDragControls } from "motion/react";
import { use } from "react";
import { href, useNavigation, useSubmit } from "react-router";

import { Link } from "~/components/link/link";
import { useReorderIds } from "~/components/use-reorder-ids";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";

import * as styles from "./home.css";
import { ListItem, REORDER_LISTS_INTENT } from "./home.schema";

export function PendingSignUps({ countPromise }: { countPromise: Promise<number> }) {
  const count = use(countPromise);
  if (count === 0) return null;
  return (
    <Link to={href("/sign-ups")}>
      {count} <span className={styles.signUpsLabel}>pending</span>
    </Link>
  );
}

export function ReorderableListItem({
  list,
  userId,
  onDrop,
}: {
  list: ListItem;
  userId: string;
  onDrop: () => void;
}) {
  const dragControls = useDragControls();
  const { id, name, slug, user_id, unreadCount, totalCount } = list;
  const isOwner = user_id === userId;

  return (
    <Reorder.Item
      as="li"
      value={id}
      className={styles.itemWrapper}
      drag
      dragDirectionLock
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDrop}
    >
      <div className={styles.item}>
        <Link className={styles.itemLink} to={href("/lists/:list", { list: slug })}>
          {name}
        </Link>

        <span
          className={styles.itemDragHandle}
          aria-label={`Reorder ${name}`}
          onPointerDown={(event) => dragControls.start(event)}
        >
          <VisuallyHidden>Reorder {name}</VisuallyHidden>
          <span aria-hidden>|-|-|-|-|</span>
        </span>

        {isOwner && (
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
    </Reorder.Item>
  );
}

export function Lists({
  listsPromise,
  userId,
}: {
  listsPromise: Promise<ListItem[]>;
  userId: string;
}) {
  const lists = use(listsPromise);
  const navigation = useNavigation();
  const submit = useSubmit();
  const incomingIds = lists.map(({ id }) => id);
  const listRecord = Object.fromEntries(lists.map((list) => [list.id, list]));

  const { itemIds, handleReorder, handleReorderComplete } = useReorderIds({
    incomingIds,
    isPersisting: navigation.state !== "idle",
    onReorderComplete(orderedIds) {
      if (!orderedIds) {
        return;
      }

      requestAnimationFrame(() => {
        const formData = new FormData();
        formData.set("intent", REORDER_LISTS_INTENT);
        orderedIds.forEach((id) => formData.append("list-order", id));
        submit(formData, { method: "post" });
      });
    },
  });

  return (
    <Reorder.Group
      as="ul"
      axis="y"
      values={itemIds}
      onReorder={handleReorder}
      layoutScroll
      className={styles.list}
    >
      {itemIds
        .filter((id) => listRecord[id])
        .map((id) => (
          <ReorderableListItem
            key={id}
            list={listRecord[id]}
            userId={userId}
            onDrop={handleReorderComplete}
          />
        ))}
    </Reorder.Group>
  );
}
