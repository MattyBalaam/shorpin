import fs from "node:fs";
import type * as Route from "./+types.home";

import type { MetaFunction } from "react-router";
import { useState } from "react";
import { animated, useTransition } from "@react-spring/web";

export const meta: MetaFunction = () => {
	return [
		{ title: "Shorpin" },
		{ name: "description", content: "Welcome to React Router!" },
	];
};

export async function loader(args: Route.LoaderArgs) {
	return {
		dir: fs.existsSync("/files/") ? fs.readdirSync("/files/") : [],
	};
}

export async function action({ request }: Route.ActionArgs) {}

export default function Index({ loaderData }: Route.ComponentProps) {
	const [test, setTest] = useState([{ value: "1", id: crypto.randomUUID() }]);

	const transitions = useTransition(test, {
		from: { opacity: 0 },
		enter: { opacity: 1 },
		leave: { opacity: 0 },
	});

	return (
		<div>
			{transitions((style, item) => (
				<animated.div style={style}>
					<p>{item.value}</p>
					<button
						type="button"
						onClick={() => setTest(test.filter((old) => old.id !== item.id))}
					>
						remove
					</button>
				</animated.div>
			))}
			<button
				type="button"
				onClick={() =>
					setTest([
						...test,
						{ value: test.length.toString(), id: crypto.randomUUID() },
					])
				}
			>
				add
			</button>
			<u>
				{loaderData.dir.map((item) => (
					<li key={item}>{item}</li>
				))}
			</u>
		</div>
	);
}
