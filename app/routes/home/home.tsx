import { useForm } from "@conform-to/react/future";
import { Suspense, useEffect, useEffectEvent } from "react";
import {
  isRouteErrorResponse,
  type MetaFunction,
  Outlet,
  Form as RouterForm,
  useNavigation,
  useRevalidator,
  useRouteError,
} from "react-router";
import { toast } from "sonner";

import { Actions } from "~/components/actions/actions";
import { Button } from "~/components/button/button";
import { useIsOnline } from "~/components/online-status/online-status";
import { ScrollArea } from "~/components/scroll-area/scroll-area";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";
import { pairsToFormData } from "~/lib/form-data-codec";
import { isSuccessfulReplay } from "~/lib/mutation-replay";
import { dequeueMutations, listQueuedMutations } from "~/lib/offline-store.client";

import type { Route } from "./+types/home";
import * as styles from "./home.css";
import { zCreate } from "./home.schema";

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
  return <p>Loading...</p>;
}

clientLoader.hydrate = true;

export default function Index({ loaderData, actionData }: Route.ComponentProps) {
  const { form, fields } = useForm(zCreate, {
    lastResult: actionData,
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  const { state } = useNavigation();
  const { revalidate } = useRevalidator();

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
      </div>
      <ScrollArea>
        <nav className={styles.listWrapper}>
          <Suspense fallback={<Spinner />}>
            <Lists listsPromise={loaderData.lists} userId={loaderData.userId} />
          </Suspense>{" "}
        </nav>
      </ScrollArea>

      <Actions>
        <RouterForm {...form.props} method="POST" className={styles.actions}>
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

            <Button type="submit" isSubmitting={state === "submitting"}>
              Add
            </Button>
          </div>
        </RouterForm>
      </Actions>
      <Outlet />
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { revalidate, state } = useRevalidator();

  const message =
    isRouteErrorResponse(error) && error.status === 503
      ? "Couldn't reach the server."
      : "Something went wrong.";

  return (
    <div className={styles.errorState}>
      <p>{message}</p>
      <Button onClick={revalidate} isSubmitting={state === "loading"}>
        Retry
      </Button>
    </div>
  );
}
