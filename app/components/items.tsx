import { animated, useTransition } from "@react-spring/web";
import { Item } from "./item";

import styles from "./items.module.css";

interface ItemsProps {
	data: Array<{ name: string; value: string | null }>;
	handleSubmit: () => void;
}

export function Items({ data, handleSubmit }: ItemsProps) {
	const keys = data.map(({ name }) => name);

	const transitions = useTransition(data, {
		from: { height: 10, overflow: "hidden" },
		enter: { height: 40 },
		leave: { height: 0, overflow: "hidden" },
		trail: 500 / data.length,
		keys,
	});

	return (
		<div className={styles.items}>
			{transitions((style, item) => (
				<animated.div style={style} className={styles.wrapper}>
					<Item
						name={item.name}
						value={item.value || ""}
						handleSubmit={handleSubmit}
					/>
				</animated.div>
			))}
		</div>
	);
}
