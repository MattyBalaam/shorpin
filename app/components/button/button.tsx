import type { ButtonHTMLAttributes } from "react";
import * as clickableStyles from "~/components/shared/clickable-element.css";

export function Button({
  type = "button",
  className,
  ...props
}: React.DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>) {
  return (
    <button
      className={[clickableStyles.clickable, className].join(" ")}
      type={type}
      {...props}
    />
  );
}
