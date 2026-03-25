import { useForm } from "@conform-to/react/future";
import { Reorder, useDragControls } from "motion/react";
import { Suspense, use, useRef } from "react";
import {
  href,
  isRouteErrorResponse,
  type MetaFunction,
  Outlet,
  Form as RouterForm,
  useNavigation,
  useRevalidator,
  useRouteError,
  useSubmit,
} from "react-router";

import { Actions } from "~/components/actions/actions";
import { Button } from "~/components/button/button";
import { Link } from "~/components/link/link";
import { ScrollArea } from "~/components/scroll-area/scroll-area";
import { useReorderIds } from "~/components/use-reorder-ids";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";

import type { Route } from "./+types/home";
import * as styles from "./home.css";
import { REORDER_LISTS_INTENT, zCreate } from "./home.schema";

export { action, loader } from "./home.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Home | Shorpin" },
    { name: "description", content: "We got lists, they’re multiplying" },
  ];
};

export const handle = {
  breadcrumb: {
    label: "Home",
  },
};

type ListItem = {
  id: string;
  name: string;
  slug: string;
  user_id: string;
  unreadCount: number;
  totalCount: number;
};

function ListsSkeleton() {
  return (
    <ul className={styles.list}>
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className={styles.skeletonRow}>
          <div className={styles.skeletonBar} />
        </li>
      ))}
    </ul>
  );
}

function PendingSignUps({ countPromise }: { countPromise: Promise<number> }) {
  const count = use(countPromise);
  if (count === 0) return null;
  return (
    <Link to={href("/sign-ups")}>
      {count} <span className={styles.signUpsLabel}>pending</span>
    </Link>
  );
}

function ReorderableListItem({
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

        {unreadCount > 0 && (
          <span className={styles.unreadBadge} aria-label={`${unreadCount} unread`}>
            {unreadCount}
            <VisuallyHidden> unread</VisuallyHidden>
          </span>
        )}
        <span className={styles.itemTotal}>
          {totalCount}
          <VisuallyHidden> items</VisuallyHidden>
        </span>
      </div>
    </Reorder.Item>
  );
}

function Lists({ listsPromise, userId }: { listsPromise: Promise<ListItem[]>; userId: string }) {
  const lists = use(listsPromise);
  const submit = useSubmit();
  const pendingOrderRef = useRef<string[] | null>(null);
  const incomingIds = lists.map(({ id }) => id);
  const listRecord = Object.fromEntries(lists.map((list) => [list.id, list]));

  const { itemIds, handleReorder, handleReorderComplete } = useReorderIds({
    incomingIds,
    onReorder(newOrder) {
      pendingOrderRef.current = newOrder;
    },
    onReorderComplete() {
      const orderedIds = pendingOrderRef.current;
      pendingOrderRef.current = null;

      if (!orderedIds) {
        return;
      }

      const formData = new FormData();
      formData.set("intent", REORDER_LISTS_INTENT);
      orderedIds.forEach((id) => formData.append("list-order", id));
      submit(formData, { method: "post" });
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

export default function Index({ loaderData, actionData }: Route.ComponentProps) {
  const { form, fields } = useForm(zCreate, {
    lastResult: actionData,
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  const { state } = useNavigation();
  // TODO fix types
  const pendingCount = loaderData.waitlistCount as unknown as Promise<number>;

  return (
    <>
      <div className={styles.pendingSignUps}>
        <Suspense fallback={null}>
          <PendingSignUps countPromise={pendingCount} />
        </Suspense>
      </div>
      <ScrollArea>
        <nav className={styles.listWrapper}>
          <Suspense fallback={<ListsSkeleton />}>
            <Lists
              listsPromise={loaderData.lists as unknown as Promise<ListItem[]>}
              userId={loaderData.userId}
            />
          </Suspense>
        </nav>
      </ScrollArea>

      <Actions>
        <RouterForm {...form.props} method="POST" className={styles.actions}>
          {form.errors?.map((error, i) => (
            <p key={i} className={styles.formError}>
              {error}
            </p>
          ))}
          <div className={styles.newList}>
            <VisuallyHidden>
              <label htmlFor={fields["new-list"].id}>New list</label>
            </VisuallyHidden>
            <input name={fields["new-list"].name} id={fields["new-list"].id} autoComplete="off" />

            <Button type="submit" isSubmitting={state === "submitting"}>
              Add
            </Button>
          </div>
        </RouterForm>
      </Actions>
      <Outlet />
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { revalidate, state } = useRevalidator();

  const message =
    isRouteErrorResponse(error) && error.status === 503
      ? "Couldn't reach the server."
      : "Something went wrong.";

  return (
    <div className={styles.errorState}>
      <p>{message}</p>
      <Button onClick={revalidate} isSubmitting={state === "loading"}>
        Retry
      </Button>
    </div>
  );
}
