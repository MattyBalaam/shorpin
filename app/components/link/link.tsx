import type { ComponentProps } from "react";
import { Link as RouterLink } from "react-router";

import * as clickableStyles from "~/components/shared/clickable-element.css";

interface LinkProps extends ComponentProps<typeof RouterLink> {
  variant?: keyof typeof clickableStyles.variant;
}

export function Link({ variant = "link", className, ...props }: LinkProps) {
  return (
    <RouterLink
      className={`${className} ${clickableStyles.variant[variant]}`}
      viewTransition
      {...props}
    />
  );
}
