import React, { useEffectEvent } from "react";
import { href, isRouteErrorResponse, redirect, useRevalidator } from "react-router";

import { isLaunchUrl, readDefaultListId } from "~/lib/default-list";

import {
  getHomeSnapshot,
  type HomeSnapshot,
  listQueuedMutations,
  putHomeSnapshot,
} from "~/lib/offline-store.client";
import type { Route } from "./+types/home";
import { type ListItem } from "./home.schema";

async function snapshotToLoaderData(request: Request, snapshot: HomeSnapshot<ListItem>) {
  const defaultListId = await readDefaultListId(document.cookie);

  // Offline mirror of home.server.ts's launchRedirect: the service worker
  // serves the cached `/` HTML for `/?launch`, so the server never got to
  // redirect. The cookie refresh waits for the next online launch.
  if (isLaunchUrl(new URL(request.url))) {
    const list = snapshot.lists.find(({ id, pending }) => id === defaultListId && !pending);
    throw redirect(list ? href("/lists/:list", { list: list.slug }) : href("/"));
  }

  return {
    userId: snapshot.userId,
    defaultListId,
    lists: Promise.resolve(snapshot.lists),
    updatedKey: Promise.resolve(snapshot.updatedKey),
    waitlistCount: Promise.resolve(snapshot.waitlistCount),
    revalidatePromise: Promise.resolve("up-to-date" as const),
  } as const;
}

// clientLoader - returns cached instantly, fetches fresh in background
export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  const cached = await getHomeSnapshot<ListItem>();

  if (!navigator.onLine && cached) {
    return snapshotToLoaderData(request, cached);
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
      return snapshotToLoaderData(request, cached);
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
