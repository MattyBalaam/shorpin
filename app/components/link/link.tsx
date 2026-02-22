import type { ComponentProps } from "react";
import {
  Link as RouterLink,
  useNavigation,
  useResolvedPath,
} from "react-router";

import { Spinner } from "~/components/spinner/spinner";
import * as clickableStyles from "~/components/shared/clickable-element.css";

interface LinkProps extends ComponentProps<typeof RouterLink> {
  variant?: keyof typeof clickableStyles.variant;
}

export function Link({
  variant = "link",
  className,
  children,
  ...props
}: LinkProps) {
  const { state, location } = useNavigation();
  const resolved = useResolvedPath(props.to);

  const isLoading =
    state === "loading" && location.pathname === resolved.pathname;

  return (
    <RouterLink
      className={`${className} ${clickableStyles.variant[variant]}`}
      viewTransition
      {...props}
    >
      {children}
      {isLoading && <Spinner />}
    </RouterLink>
  );
}
