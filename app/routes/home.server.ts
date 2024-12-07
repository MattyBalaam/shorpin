import type { Route } from "./+types/home";

import fs from "node:fs";
import { redirect } from "react-router";
import { fileDir, getFileName } from "~/routes/list.server";

export async function loader(args: Route.LoaderArgs) {
	const files = (fs.existsSync(fileDir) ? fs.readdirSync(fileDir) : []).filter(
		(file) => file.endsWith(".json"),
	);

	const dir = files.map((file) => ({
		file: file.replace(".json", ""),
		list: JSON.parse(
			fs.readFileSync(`${fileDir}/${file}`, { encoding: "utf-8" }),
		).list,
	}));

	return {
		dir,
	};
}

export async function action({ request }: Route.ActionArgs) {
	const list = (await request.formData()).get("new-list")?.toString();

	if (!list) {
		throw new Error("No list name provided");
	}

	const newList = list.replace(" ", "-");

	if (newList) {
		if (!fs.existsSync(fileDir)) {
			fs.mkdirSync(fileDir);
		}

		const fileName = getFileName(newList);

		if (!fs.existsSync(fileName)) {
			fs.writeFileSync(fileName, JSON.stringify({ list, data: [] }));
		}
	}

	return redirect(`/lists/${newList}`);
}
