import type * as Route from "./+types.home";

import { Form, Link, type MetaFunction } from "react-router";

import styles from "./home.module.css";

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
			<ul>
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
				<label htmlFor="new-list">New List</label>
				<input id="new-list" name="new-list" type="text" />
				<button type="submit">Create</button>
			</Form>
		</div>
	);
}
