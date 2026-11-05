import type { Element } from "solid-js";
import * as styles from "./visually-hidden.css";

export function VisuallyHidden(props: { children?: Element }) {
  return <span class={styles.visuallyHidden}>{props.children}</span>;
}
