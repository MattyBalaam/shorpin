import { ReactNode } from "react";
import * as styles from "./visually-hidden.css";

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className={styles.visuallyHidden}>{children}</span>;
}
