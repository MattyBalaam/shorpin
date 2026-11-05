import { children, type Element, Show } from "solid-js";
import { Breadcrumbs } from "~/components/breadcrumbs/breadcrumbs";
import * as styles from "./page-header.css";

// `var(--name)` → `--name`, to set it inline.
const actionCountName = styles.actionCount.slice("var(".length, -1);

/**
 * The breadcrumbs, with the page's actions beside them. When the title
 * leaves too little room, actions show icons only: wrap each one's text in
 * <ActionLabel> so it's hidden visually but stays the accessible name.
 */
export function PageHeader(props: {
  actions?: Element[];
  /** Where the actions drop to icons only (see page-header.css.ts). */
  compactBelow?: styles.CompactBelow;
}) {
  // Reading a JSX prop creates its elements, so read it once: `children`
  // resolves it a single time and memoises the result. Reading
  // props.actions in each place below would build (and hydrate) each
  // action more than once.
  const resolved = children(() => props.actions);
  const actions = () => resolved.toArray();

  return (
    <header class={styles.header}>
      <Breadcrumbs />
      <Show when={actions().length > 0}>
        <div
          class={styles.actions[props.compactBelow ?? "15rem"]}
          style={{ [actionCountName]: String(actions().length) }}
        >
          {actions()}
        </div>
      </Show>
    </header>
  );
}

export function ActionLabel(props: { children?: Element }) {
  return <span class={styles.label}>{props.children}</span>;
}
