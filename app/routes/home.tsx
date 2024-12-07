import type { Route } from "./+types/home";

import { Form, type MetaFunction } from "react-router";

import { Link } from "~/components/link/link";

import styles from "./home.module.css";
import { Button } from "~/components/button/button";

export { loader, action } from "./home.server";

export const meta: MetaFunction = () => {
	return [
		{ title: "Shorpin" },
		{ name: "description", content: "Welcome to React Router!" },
	];
};

export default function Index({ loaderData }: Route.ComponentProps) {
	return (
		<div>
			<h1>Lists</h1>
			<ul className={styles.list}>
				{loaderData.dir.map(({ list, file }) => {
					return (
						<li key={list}>
							<Link to={`/lists/${file}`}>{list}</Link>
						</li>
					);
				})}
			</ul>
			<hr />

			<Form className={styles.form} method="post">
				<label
					htmlFor="new-list"
					style={{
						gridColumn: "span 2",
					}}
				>
					New List
				</label>
				<input id="new-list" name="new-list" type="text" required />
				<Button type="submit">Create new list</Button>
			</Form>
		</div>
	);
}
