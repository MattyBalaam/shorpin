import type { ComponentProps } from "react";
import { Link as RouterLink } from "react-router";

import clickableStyles from "~/components/shared/clickable-element.module.css";

interface LinkProps extends ComponentProps<typeof RouterLink> {
	variant?: "default" | "button";
}

export function Link({ variant = "default", ...props }: LinkProps) {
	return (
		<RouterLink
			className={variant === "button" ? clickableStyles.clickable : ""}
			{...props}
		/>
	);
}
