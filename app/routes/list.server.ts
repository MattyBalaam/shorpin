import type { Route } from "./+types/list";

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

	const toUndelete = formData.get("undelete");
	const toDelete = formData.get("delete");
	const list = formData.get("list");

	// just the raw values from the JSON.
	const rawData = JSON.parse(fs.readFileSync(filename, { encoding: "utf-8" }))
		.data as Array<{
		name: string;
		value: string;
		deletedAt?: number;
	}>;

	// saved data which has not been deleted
	const existingData = rawData.filter(({ deletedAt }) => !deletedAt);

	// the current entries from the form - after it has been cleaned
	const newData = Object.entries(Object.fromEntries(formData))
		.map(([name, value]) => ({
			name: name === "new" ? crypto.randomUUID() : name,
			value: value.toString(),
			deletedAt:
				name === toDelete
					? Date.now()
					: // we want to delete any values which may have been delete elsewhere
						existingData.find((data) => data.name === name)?.deletedAt,
		}))
		.filter(({ name, value }) => {
			if (!value) {
				return false;
			}

			return name !== "delete" && name !== "list" && name !== "undelete";
		});

	// the full new data to save and return to client
	const fullData = [
		...existingData.filter(
			({ name }) => !newData.find((newValue) => name === newValue.name),
		),
		...newData,
		...(toUndelete
			? rawData
					.filter(({ name }) => name === toUndelete)
					.map(({ name, value }) => ({ name, value }))
			: []),
	];

	fs.writeFileSync(filename, JSON.stringify({ list, data: fullData }));

	const sortedDeleted = fullData
		.filter(({ deletedAt }) => deletedAt)
		.sort((a, b) => {
			if (
				a.deletedAt === undefined ||
				b.deletedAt === undefined ||
				b.deletedAt > a.deletedAt
			) {
				return -1;
			}

			return 1;
		});

	console.log({ sortedDeleted, fullData });

	return {
		data: fullData.filter(({ deletedAt }) => !deletedAt),
		lastDeleted: sortedDeleted[0],
		debug: fullData,
	};
}
