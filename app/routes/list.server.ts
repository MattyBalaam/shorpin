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
			deleted?: boolean;
		}>;
	};

	return {
		list,
		data: data.filter(({ deleted }) => !deleted),
	};
}

export async function action({ request, params }: Route.ActionArgs) {
	const filename = getFileName(params.list);

	const formData = await request.formData();

	const toDelete = formData.get("delete");
	const list = formData.get("list");

	const existingData = (
		JSON.parse(fs.readFileSync(filename, { encoding: "utf-8" })).data as Array<{
			name: string;
			value: string;
			deleted?: boolean;
		}>
	).filter(({ deleted }) => !deleted);

	const newData = Object.entries(Object.fromEntries(formData))
		.map(([name, value]) => ({
			name: name === "new" ? crypto.randomUUID() : name,
			value: value.toString(),
			deleted: Boolean(
				name === toDelete ||
					// we want to delete any values which may have been delete elsewhere
					existingData.find((data) => data.name === name)?.deleted,
			),
		}))
		.filter(({ name, value }) => {
			if (!value) {
				return false;
			}

			return name !== "delete" && name !== "list";
		});

	const fullData = [
		...existingData.filter(
			({ name }) => !newData.find((newValue) => name === newValue.name),
		),
		...newData,
	];

	fs.writeFileSync(filename, JSON.stringify({ list, data: fullData }));

	return {
		data: fullData.filter(({ deleted }) => !deleted),
		debug: fullData,
	};
}
