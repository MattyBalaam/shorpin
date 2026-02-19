import { type ReactNode } from "react";
import * as styles from "./scroll-area.css";

export function ScrollArea({ children }: { children: ReactNode }) {
  return (
    <div className={styles.outer}>
      <div className={styles.inner}>{children}</div>
    </div>
  );
}
