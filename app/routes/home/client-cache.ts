import React from "react";
import { useRevalidator } from "react-router";

import type { Route } from "./+types/home";

// Simple clientLoader - no caching for now, ensures tests pass
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
	const serverData = await serverLoader();

	return {
		...serverData,
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
