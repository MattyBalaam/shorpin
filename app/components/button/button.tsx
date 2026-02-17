import type { ButtonHTMLAttributes } from "react";
import * as clickableStyles from "~/components/shared/clickable-element.css";
import * as styles from "./button.css";

interface ButtonProps extends React.DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> {
  isSubmitting?: boolean;
}

export function Button({
  type = "button",
  className,
  children,
  isSubmitting,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[clickableStyles.clickable, className].join(" ")}
      type={type}
      // test if we need to disable here, I think react router might handle this
      // disabled={disabled || isSubmitting}
      {...props}
    >
      {isSubmitting ? <span className={styles.spinner} /> : children}
    </button>
  );
}
