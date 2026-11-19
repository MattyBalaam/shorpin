import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "~/components/spinner/spinner";
import * as clickableStyles from "~/components/shared/clickable-element.css";

// No `disabled`: a disabled button can't say why it won't work. Keep it
// clickable and explain instead (e.g. a toast) — see CONTRIBUTING.md.
interface ButtonProps extends Omit<
  React.DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>,
  "disabled"
> {
  isSubmitting?: boolean;
  variant?: Exclude<keyof typeof clickableStyles.variant, "link">;
}

export function Button({
  type = "button",
  className,
  children,
  isSubmitting,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[clickableStyles.variant[variant], className].join(" ")}
      type={type}
      {...props}
    >
      {isSubmitting ? <Spinner /> : children}
    </button>
  );
}
