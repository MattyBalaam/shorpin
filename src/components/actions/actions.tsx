import type { Element } from "solid-js";
import * as style from "./actions.css";

export function Actions(props: { children?: Element }) {
  return <section class={style.actionsWrapper}>{props.children}</section>;
}
