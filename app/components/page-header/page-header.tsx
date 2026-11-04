import type { CSSProperties, ReactNode } from "react";
import { Breadcrumbs } from "~/components/breadcrumbs/breadcrumbs";
import * as styles from "./page-header.css";

// `var(--name)` → `--name`, to set it inline.
const actionCountName = styles.actionCount.slice("var(".length, -1);

/**
 * The breadcrumbs, with the page's actions beside them. When the title
 * leaves too little room, actions show icons only: wrap each one's text in
 * <ActionLabel> so it's hidden visually but stays the accessible name.
 */
export function PageHeader({
  actions = [],
  compactBelow = "15rem",
}: {
  actions?: ReactNode[];
  /** Where the actions drop to icons only (see page-header.css.ts). */
  compactBelow?: styles.CompactBelow;
}) {
  return (
    <header className={styles.header}>
      <Breadcrumbs />
      {actions.length > 0 ? (
        <div
          className={styles.actions[compactBelow]}
          style={{ [actionCountName]: actions.length } as CSSProperties}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function ActionLabel({ children }: { children: ReactNode }) {
  return <span className={styles.label}>{children}</span>;
}
