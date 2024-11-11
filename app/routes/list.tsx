import type * as Route from "./+types.list";

import { Form, Link } from "react-router";

import { Items } from "~/components/items";
import { useRef } from "react";

export { action, loader } from "./list.server";

export default function list({ actionData, loaderData }: Route.ComponentProps) {
	const data = actionData?.data || loaderData.data;

	const buttonRef = useRef<HTMLButtonElement>(null);

	if (loaderData.error) {
		return (
			<div>
				<h1>{loaderData.list}</h1>
				<p>{loaderData.error}</p>
				<Link to="/">back to dir</Link>
			</div>
		);
	}

	return (
		<div style={{ display: "grid", gap: "2em" }}>
			<h1>{loaderData.list}</h1>

			<Form
				method="POST"
				style={{
					display: "grid",
					gridTemplateColumns: "[input] 1fr [done] auto",
					gap: "1em",
				}}
				onSubmit={(e) => {
					const newInput = e.currentTarget.elements.namedItem("new");

					if (newInput instanceof HTMLInputElement) {
						window.setTimeout(function clear() {
							newInput.value = "";
						}, 1);
					}
				}}
			>
				<input type="hidden" name="list" value={loaderData.list} />

				<Items
					data={data}
					handleSubmit={() => {
						buttonRef.current?.click();
					}}
				/>

				<input
					type="text"
					name="new"
					style={{
						gridColumn: "input",
						padding: "0 0.5em",
					}}
					// biome-ignore lint/a11y/noAutofocus: <explanation>
					autoFocus
				/>

				<button
					type="submit"
					style={{
						gridColumn: "1 ",
						marginTop: "2em",
						alignSelf: "start",
						minWidth: 0,
					}}
					ref={buttonRef}
				>
					submit
				</button>
			</Form>

			{JSON.stringify(data)}

			<hr />

			{JSON.stringify(actionData?.debug)}

			<div
				style={{
					display: "grid",
					gap: "1em",
					gridTemplateColumns: "max-content max-content",
				}}
			>
				<Link to="/">back to dir</Link>

				<Link to="./confirm-delete" relative="route" style={{ color: "red" }}>
					Delete list
				</Link>
			</div>
		</div>
	);
}
