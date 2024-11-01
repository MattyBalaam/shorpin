import { animated, useTransition } from "@react-spring/web";
import styles from "./Undo.module.css";

interface Props {
	undo: string | null | false;
	onUndo: () => void;
}

export function Undo({ lastChange }: Props) {
	const transitions = useTransition(!!lastChange, null, {
		from: { opacity: 0, transform: "translateY(5em)" },
		enter: { opacity: 1, transform: "translateY(0em)" },
		leave: { opacity: 0, transform: "translateY(5em)" },
	});

	return (
		<>
			{transitions.map(
				({ item, key, props }) =>
					item && (
						<animated.aside
							key={key}
							className={`${styles.undo}`}
							style={props}
						>
							<button type="submit" className={styles.undoButton}>
								Undo for: {lastChange}
							</button>
						</animated.aside>
					),
			)}
		</>
	);
}
