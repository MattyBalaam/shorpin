import React from "react";
import { useRevalidator } from "react-router";

import type { Route } from "./+types/home";
import { ListItem } from "./home.schema";

const CACHE_KEY = "shorpin-lists-cache";

type CachedData = {
	updatedAt: number;
	lists: Array<ListItem>;
};

const INITIAL_CACHE: CachedData = {
	updatedAt: 0,
	lists: [],
} satisfies CachedData;

function getCachedLists(): CachedData {
	if (typeof window === "undefined") return INITIAL_CACHE;
	try {
		const cached = localStorage.getItem(CACHE_KEY);
		return cached ? (JSON.parse(cached) as CachedData) : INITIAL_CACHE;
	} catch {
		return INITIAL_CACHE;
	}
}

function setCachedLists(data: CachedData): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify(data));
	} catch {
		//Storage full or unavailable
	}
}

// clientLoader - returns cached instantly, fetches fresh in background
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
	const serverData = await serverLoader();
	const cached = getCachedLists();

	return {
		...serverData,
		lists:
			cached.lists.length > 0
				? Promise.resolve(cached.lists)
				: serverData.lists,
		revalidatePromise: serverData.lists.then(async (freshLists) => {
			const freshTimestamp = await serverData.updatedAt;

			// Cache is stale if server has newer data
			if (freshTimestamp > cached.updatedAt) {
				setCachedLists({ lists: freshLists, updatedAt: freshTimestamp });
				return "stale" as const;
			}

			return "up-to-date" as const;
		}),
	} as const;
}

clientLoader.hydrate = true;

export const Revalidator = ({
	data,
}: {
	data: Promise<"stale" | "up-to-date">;
}) => {
	const revalidator = useRevalidator();

	const state = React.use(data);

	React.useEffect(() => {
		if (state === "stale") {
			revalidator.revalidate();
		}
	}, [state, revalidator]);

	return null;
};
