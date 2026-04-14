import React from "react";
import { useRevalidator } from "react-router";

import type { Route } from "./+types/home";

let _cachedLists: any;

// clientLoader - returns cached instantly, runs background fetch
// Returns revalidatePromise that resolves to "revalidate" if data changed
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const serverData = await serverLoader();

  const lists = serverData.lists;

  if (_cachedLists) {
    serverData.lists = Promise.resolve(_cachedLists);
  }

  return {
    ...serverData,
    revalidatePromise: lists.then(async (freshLists: any) => {
      if (JSON.stringify(freshLists) !== JSON.stringify(_cachedLists)) {
        _cachedLists = freshLists;
        return "revalidate";
      }

      return "up-to-date";
    }),
  } as const;
}

clientLoader.hydrate = true;

export const Revalidator = ({ data }: { data: Promise<string> }) => {
  const revalidator = useRevalidator();

  const state = React.use(data);

  React.useEffect(() => {
    console.log("useRevalidateOnPromise state", state);
    if (state === "revalidate") {
      console.log("Triggering revalidation");

      revalidator.revalidate();
    }
  }, [state, revalidator]);

  return null;
};
