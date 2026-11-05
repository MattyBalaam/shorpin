import type { JSX } from "@solidjs/web";
import { type Element, omit } from "solid-js";
import * as styles from "./checkbox-field.css";

interface CheckboxFieldProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type"> {
  id: string;
  children?: Element;
}

export function CheckboxField(props: CheckboxFieldProps) {
  const rest = omit(props, "children", "id", "class");

  return (
    <div class={styles.wrapper}>
      <input type="checkbox" id={props.id} class={styles.checkbox} {...rest} />
      <label for={props.id}>{props.children}</label>
    </div>
  );
}
