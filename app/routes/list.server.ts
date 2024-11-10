import type * as Route from "./+types.list";

import fs from "node:fs";

import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

export const fileDir = `${path.dirname(__filename)}/files`;

export const getFileName = (list: string) => `${fileDir}/${list}.json`;

export async function loader({ params }: Route.LoaderArgs) {
	const filename = getFileName(params.list);

	if (!fs.existsSync(filename)) {
		console.log({ filename });

		return {
			list: params.list,
			data: [],
			error: "List does not exist",
		};
	}

	const { list, data } = JSON.parse(
		fs.readFileSync(filename, { encoding: "utf-8" }),
	) as {
		list: string;
		data: Array<{
			name: string;
			value: string;
		}>;
	};

	return {
		list,
		data: data,
	};
}

export async function action({ request, params }: Route.ActionArgs) {
	const filename = getFileName(params.list);

	const formData = await request.formData();

	const toDelete = formData.get("delete");
	const list = formData.get("list");

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
			if (name === "list" || name === "delete" || name === toDelete)
				return false;

			return !!value;
		});

	fs.writeFileSync(filename, JSON.stringify({ list, data }));

	return {
		data,
	};
}
