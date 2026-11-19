import type { ComponentProps, ReactNode } from "react";
import * as styles from "./checkbox-field.css";

interface CheckboxFieldProps extends Omit<ComponentProps<"input">, "type"> {
  children: ReactNode;
}

export function CheckboxField({ children, id, ...props }: CheckboxFieldProps) {
  return (
    <div className={styles.wrapper}>
      <input type="checkbox" id={id} className={styles.checkbox} {...props} />
      <label htmlFor={id}>{children}</label>
    </div>
  );
}
