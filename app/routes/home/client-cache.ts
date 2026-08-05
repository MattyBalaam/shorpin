import React, { useEffectEvent } from "react";
import { isRouteErrorResponse, useRevalidator } from "react-router";

import {
  getHomeSnapshot,
  type HomeSnapshot,
  listQueuedMutations,
  putHomeSnapshot,
} from "~/lib/offline-store.client";
import type { Route } from "./+types/home";
import { type ListItem } from "./home.schema";

function snapshotToLoaderData(snapshot: HomeSnapshot<ListItem>) {
  return {
    userId: snapshot.userId,
    lists: Promise.resolve(snapshot.lists),
    updatedKey: Promise.resolve(snapshot.updatedKey),
    waitlistCount: Promise.resolve(snapshot.waitlistCount),
    revalidatePromise: Promise.resolve("up-to-date" as const),
  } as const;
}

// clientLoader - returns cached instantly, fetches fresh in background
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const cached = await getHomeSnapshot<ListItem>();

  if (!navigator.onLine && cached) {
    return snapshotToLoaderData(cached);
  }

  try {
    const serverData = await serverLoader();

    return {
      ...serverData,
      lists: cached && cached.lists.length > 0 ? Promise.resolve(cached.lists) : serverData.lists,
      revalidatePromise: (async () => {
        const freshLists = await serverData.lists;
        const freshKey = await serverData.updatedKey;
        const freshWaitlistCount = await serverData.waitlistCount;

        // An offline create/reorder hasn't synced yet — don't clobber the
        // locally-pending state with server truth until it has (mirrors
        // list.tsx's reconcileListSnapshot).
        const queued = await listQueuedMutations("home");
        if (queued.length > 0) {
          return "up-to-date" as const;
        }

        // Cache is stale if server has different data
        if (!cached || freshKey !== cached.updatedKey) {
          await putHomeSnapshot<ListItem>({
            id: "home",
            userId: serverData.userId,
            updatedKey: freshKey,
            lists: freshLists,
            waitlistCount: freshWaitlistCount ?? 0,
            cachedAt: Date.now(),
          });
          return "stale" as const;
        }

        return "up-to-date" as const;
      })(),
    } as const;
  } catch (error) {
    console.error("Error in home clientLoader", error);

    const isNetworkOrServerError =
      (error instanceof TypeError && error.message.includes("fetch")) ||
      (isRouteErrorResponse(error) && error.status >= 500);

    if (isNetworkOrServerError && cached) {
      return snapshotToLoaderData(cached);
    }
    throw error;
  }
}

clientLoader.hydrate = true;

export const Revalidator = ({ data }: { data: Promise<"stale" | "up-to-date"> }) => {
  const revalidator = useRevalidator();

  const handleRevalidate = useEffectEvent(() => {
    revalidator.revalidate();
  });

  const state = React.use(data);

  React.useEffect(() => {
    if (state === "stale") {
      handleRevalidate();
    }
  }, [state]);

  return null;
};
