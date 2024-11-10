import type * as Route from "./+types.delete";

import fs from "node:fs";
import { redirect } from "react-router";

import { getFileName } from "~/routes/list.server";

export async function action({ request, params }: Route.ActionArgs) {
	const filename = getFileName(params.list);

	fs.renameSync(filename, `${filename}.deleted`);

	return redirect("/");
}
