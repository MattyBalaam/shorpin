import type * as Route from "./+types.list";

import fs from "node:fs";
import { Form, useFetcher } from "react-router";
import { Item } from "~/components/item";
import { useTransition, animated } from "@react-spring/web";
import { Items } from "~/components/items";
import { useRef, useState } from "react";

export async function loader({ params }: Route.LoaderArgs) {
	const filename = `/files/${params.list}`;

	const data = (fs.existsSync(filename)
		? fs.readdirSync(filename)
		: []) as unknown as Array<{
		name: string;
		value: string;
	}>;

	return {
		list: params.list,
		data: data,
	};
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();

	const toDelete = formData.get("delete");

	const data = Object.entries(Object.fromEntries(formData))
		.map(
			//server indicates the value has been stored already.
			// use this to track items when dragging to delete
			([name, value]) => ({
				name: name === "new" ? crypto.randomUUID() : name,
				value: value.toString(),
			}),
		)
		.filter(({ name, value }) => {
			if (name === "delete" || name === toDelete) return false;

			return !!value;
		});

	return {
		data,
	};
}

export default function list({ actionData, loaderData }: Route.ComponentProps) {
	const data = actionData ? actionData.data : loaderData.data;

	const buttonRef = useRef<HTMLButtonElement>(null);

	return (
		<div>
			<h1>{loaderData.list}</h1>
			<Form
				method="POST"
				style={{
					display: "grid",
					gridTemplateColumns: "[input] 1fr [done] auto",
					gap: "0 1em",
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
				<Items
					data={data}
					handleSubmit={() => {
						buttonRef.current?.click();
					}}
				/>

				<input
					name="new"
					style={{
						gridColumn: "input",
						padding: "0.5em",
						zIndex: -1,
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
						width: 100, //TODO
					}}
					ref={buttonRef}
				>
					submit
				</button>
			</Form>
		</div>
	);
}
