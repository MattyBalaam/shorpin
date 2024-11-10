import { useRef } from "react";
import { animated, useSpring } from "@react-spring/web";

import { useDrag } from "@use-gesture/react";
// import Linkify from "linkifyjs/react";

import styles from "./item.module.css";

export interface ItemProps {
	id: string;
	name: string;
	finished: boolean;
}

export interface ItemRenderProps {
	// state: string;
	name: string;
	value: string | null;
	handleSubmit: () => void;
}

export function Item({ name, value, handleSubmit }: ItemRenderProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const cancelRef = useRef<HTMLInputElement>(null);

	const [{ x }, api] = useSpring(() => ({ x: 0 }));

	const bind = useDrag(({ active, movement: [mx], cancel }) => {
		if (
			document.activeElement === inputRef.current &&
			inputRef.current?.selectionEnd &&
			inputRef.current?.selectionStart &&
			inputRef.current?.selectionEnd - inputRef.current?.selectionStart > 0
		)
			cancel();

		if (mx < -200) {
			cancelRef.current?.click();
		}

		api.start({ x: active ? mx * 0.8 : 0, immediate: active });
	});

	const dragHandlers = value !== "" ? bind() : undefined;

	return (
		<animated.div
			style={{
				display: "grid",
				gridTemplateColumns: "subgrid",
				gridColumn: "1 / span 3",
				x,
			}}
			{...dragHandlers}
		>
			<input
				name={name}
				defaultValue={value || ""}
				style={{
					gridColumn: "input",
					padding: "0.5em",
				}}
				ref={inputRef}
			/>

			{value ? (
				<label style={{ gridColumn: "cancel" }} className={styles.tick}>
					✅
					<input
						type="radio"
						name="delete"
						value={name}
						ref={cancelRef}
						onClick={handleSubmit}
						style={{
							appearance: "none",
						}}
					/>
				</label>
			) : null}
		</animated.div>
	);
}
