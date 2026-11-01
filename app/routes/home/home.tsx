import { useForm } from "@conform-to/react/future";
import { Suspense, useEffect, useEffectEvent } from "react";
import {
  type MetaFunction,
  Outlet,
  Form as RouterForm,
  useFetcher,
  useRevalidator,
  useRouteError,
} from "react-router";
import { toast } from "~/lib/toast";

import { Actions } from "~/components/actions/actions";
import { AccountStyleSync } from "~/components/app-style/account-style-sync";
import { StylePicker } from "~/components/app-style/style-picker";
import type { AppStyle } from "~/lib/app-style";
import { setAppStyle, useDeviceAppStyle } from "~/components/app-style/use-app-style";
import { Button } from "~/components/button/button";
import { ColorSchemeToggle } from "~/components/color-scheme/color-scheme";
import { SUBMIT_ACTION, useIsSubmitting } from "~/components/button/use-is-submitting";
import { ErrorState } from "~/components/error-state/error-state";
import { useIsOnline } from "~/components/online-status/online-status";
import { ScrollArea } from "~/components/scroll-area/scroll-area";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";
import { pairsToFormData } from "~/lib/form-data-codec";
import { isSuccessfulReplay } from "~/lib/mutation-replay";
import { dequeueMutations, listQueuedMutations } from "~/lib/offline-store.client";

import type { Route } from "./+types/home";
import * as styles from "./home.css";
import { SET_APP_STYLE_INTENT, zCreate } from "./home.schema";

const APP_STYLE_FETCHER_KEY = "app-style";

export { action, loader } from "./home.server";
export { clientAction } from "./client-action";
import { clientLoader, Revalidator } from "./client-cache";
import { Spinner } from "~/components/spinner/spinner";
import { Lists, PendingSignUps } from "./components";

export { clientLoader };

export const meta: MetaFunction = () => {
  return [
    { title: "Home | Shorpin" },
    { name: "description", content: "We got lists, they’re multiplying" },
  ];
};

export const handle = {
  breadcrumb: {
    label: "Home",
  },
};

export function HydrateFallback() {
  return (
    <div role="status" className={styles.hydrateFallback}>
      <VisuallyHidden>Loading...</VisuallyHidden>
      <Spinner />
    </div>
  );
}

clientLoader.hydrate = true;

export default function Index({ loaderData, actionData }: Route.ComponentProps) {
  const { form, fields } = useForm(zCreate, {
    lastResult: actionData,
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  const isAddingList = useIsSubmitting("add-list");
  const deviceStyle = useDeviceAppStyle();
  const appStyleFetcher = useFetcher({ key: APP_STYLE_FETCHER_KEY });
  const { revalidate } = useRevalidator();

  // The cookie write applies the style at once (and offline); the profile
  // write is what makes it follow the account to other devices.
  function saveAppStyle(style: AppStyle) {
    setAppStyle(style);
    void appStyleFetcher.submit(
      { intent: SET_APP_STYLE_INTENT, "app-style": style },
      { method: "POST" },
    );
  }

  // Neither create-list nor reorder-lists needs list.tsx's rebase treatment
  // (creation is append-only and de-duplicated server-side; reorder updates
  // each row's sort_order independently, with no diff-against-submitted-array
  // to resurrect anything) — so queued entries just replay verbatim, in
  // order, same as list.tsx's offline sync did before it needed rebasing.
  //
  // Wrapped in useEffectEvent so it can be called from two triggers below:
  // the online transition (the common case) and once on mount (covers a
  // queue left behind by a stale-session redirect mid-sync — see
  // isSuccessfulReplay — where no further online/offline transition occurs
  // once the user re-authenticates and comes back).
  const syncPendingQueue = useEffectEvent(async () => {
    const queued = await listQueuedMutations("home");
    if (queued.length === 0) return;

    toast.success("Back online - syncing changes");

    for (const entry of queued) {
      let response: Response;
      try {
        response = await fetch(entry.route, {
          method: "POST",
          body: pairsToFormData(entry.fields),
        });
      } catch {
        // Went offline again mid-sync — leave what's left queued for the
        // next reconnect.
        return;
      }
      if (!isSuccessfulReplay(response)) return;
      await dequeueMutations([entry.seq]);
    }

    revalidate();
  });

  const isOnline = useIsOnline({
    onOnline: () => {
      void syncPendingQueue();
    },
  });

  useEffect(() => {
    if (isOnline) void syncPendingQueue();
    // Mount-only: retries whatever's already queued, regardless of how it
    // got left there. Online/offline transitions are covered by onOnline
    // above.
  }, []);

  return (
    <>
      <div className={styles.pendingSignUps}>
        <Suspense fallback={null}>
          <Revalidator data={loaderData.revalidatePromise} />
          <PendingSignUps countPromise={loaderData.waitlistCount} />
        </Suspense>
        <Suspense fallback={null}>
          <AccountStyleSync
            accountStylePromise={loaderData.accountStyle}
            isSaving={appStyleFetcher.state !== "idle"}
          />
        </Suspense>
      </div>
      <ScrollArea>
        <nav className={styles.listWrapper}>
          <Suspense fallback={<Spinner />}>
            <Lists
              listsPromise={loaderData.lists}
              userId={loaderData.userId}
              defaultListId={loaderData.defaultListId}
            />
          </Suspense>{" "}
        </nav>
      </ScrollArea>

      <Actions>
        <div className={styles.actions}>
          <RouterForm {...form.props} method="POST" className={styles.addListForm}>
            {form.errors?.map((error, i) => (
              <p key={i} className={styles.formError}>
                {error}
              </p>
            ))}
            <div className={styles.newList}>
              <VisuallyHidden>
                <label htmlFor={fields["new-list"].id}>New list</label>
              </VisuallyHidden>
              <input name={fields["new-list"].name} id={fields["new-list"].id} autoComplete="off" />

              <Button
                type="submit"
                name={SUBMIT_ACTION}
                value="add-list"
                isSubmitting={isAddingList}
              >
                Add
              </Button>
            </div>
          </RouterForm>
          <div className={styles.appearance}>
            <StylePicker
              title="Style"
              value={deviceStyle}
              onSave={(style) => style && saveAppStyle(style)}
            />
            <ColorSchemeToggle />
          </div>
        </div>
      </Actions>
      <Outlet />
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  return <ErrorState error={error} />;
}
