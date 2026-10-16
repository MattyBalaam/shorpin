import { use, useEffect, useEffectEvent } from "react";
import type { AppStyle } from "~/lib/app-style";
import { listQueuedMutations } from "~/lib/offline-store.client";
import { setAppStyle, useDeviceAppStyle } from "./use-app-style";

/**
 * Brings this device's cookie cache in line with the account's saved style,
 * so a change made on another device shows up here on the next visit home.
 * Skipped while this device has its own save in flight or queued offline,
 * which the server hasn't seen yet and would otherwise be undone.
 */
export function AccountStyleSync({
  accountStylePromise,
  isSaving,
}: {
  accountStylePromise: Promise<AppStyle | null>;
  isSaving: boolean;
}) {
  const accountStyle = use(accountStylePromise);
  const deviceStyle = useDeviceAppStyle();

  const adoptAccountStyle = useEffectEvent(async (style: AppStyle) => {
    const queued = await listQueuedMutations("home");
    if (queued.some((entry) => entry.kind === "set-app-style")) return;
    setAppStyle(style);
  });

  useEffect(
    function syncAccountStyle() {
      if (accountStyle && accountStyle !== deviceStyle && !isSaving) {
        void adoptAccountStyle(accountStyle);
      }
    },
    [accountStyle, deviceStyle, isSaving],
  );

  return null;
}
