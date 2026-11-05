import { For, Show } from "solid-js";
import { Link } from "~/components/link/link";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";
import * as styles from "./home.css";
import type { ListItem } from "./home.schema";

// Not yet ported: drag to reorder, the launch-list star and the config link.
function ListRow(props: { list: ListItem }) {
  return (
    <li data-reorder-id={props.list.id} class={styles.itemWrapper}>
      <div class={styles.item}>
        <Link class={styles.itemLink} to="/lists/$list" params={{ list: props.list.slug }}>
          {props.list.name}
        </Link>

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

export function Lists(props: { lists: ListItem[] }) {
  return (
    <ul class={styles.list}>
      <For each={props.lists} keyed={(list) => list.id}>
        {(list) => <ListRow list={list()} />}
      </For>
    </ul>
  );
}
