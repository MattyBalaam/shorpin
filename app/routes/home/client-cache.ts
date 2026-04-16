import React from "react";
import { useRevalidator } from "react-router";

import type { Route } from "./+types/home";

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
	const serverData = await serverLoader();

	return {
		...serverData,
		revalidatePromise: Promise.resolve("stale" as const),
	} as const;
}

clientLoader.hydrate = true;

export const Revalidator = () => {
	const revalidator = useRevalidator();

	React.useEffect(() => {
		revalidator.revalidate();
	}, [revalidator]);

	return null;
};
