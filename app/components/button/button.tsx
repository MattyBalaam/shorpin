import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "~/components/spinner/spinner";
import * as clickableStyles from "~/components/shared/clickable-element.css";

interface ButtonProps extends React.DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> {
  isSubmitting?: boolean;
  variant?: Exclude<keyof typeof clickableStyles.variant, "link">;
}

export function Button({
  type = "button",
  className,
  children,
  isSubmitting,
  disabled,
  variant = "outline",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[clickableStyles.variant[variant], className].join(" ")}
      type={type}
      // test if we need to disable here, I think react router might handle this
      // disabled={disabled || isSubmitting}
      {...props}
    >
      {isSubmitting ? <Spinner /> : children}
    </button>
  );
}
