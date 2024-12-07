import type { ButtonHTMLAttributes } from "react";
import clickableStyles from "~/components/shared/clickable-element.module.css";

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
