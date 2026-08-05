import { parseSubmission, report, useForm, useFormData } from "@conform-to/react/future";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  href,
  isRouteErrorResponse,
  type ShouldRevalidateFunctionArgs,
  useNavigation,
  useRevalidator,
  useRouteError,
  useSubmit,
} from "react-router";
import * as v from "valibot";
import { breadcrumb } from "~/components/breadcrumbs/breadcrumbs";
import { Form } from "~/components/form/form";
import { Items } from "~/components/items";
import { Link } from "~/components/link/link";
import { removeViaConform, reorderViaConform } from "~/components/reorderable/reorder-strategies";
import type { Route } from "./+types/list";
import { zList } from "./data";

export { action, loader } from "./list.server";

import { toast } from "sonner";

// Cache loader data for offline support
let cachedLoaderData: Awaited<ReturnType<typeof import("./list.server").loader>> | null = null;

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  if (!navigator.onLine && cachedLoaderData) {
    return cachedLoaderData;
  }

  try {
    const data = await serverLoader();
    cachedLoaderData = data;
    return data;
  } catch (error) {
    console.error("Error in clientLoader", error);

    const isNetworkOrServerError =
      (error instanceof TypeError && error.message.includes("fetch")) ||
      (isRouteErrorResponse(error) && error.status >= 500);

    if (isNetworkOrServerError && cachedLoaderData) {
      return cachedLoaderData;
    }
    throw error;
  }
}

clientLoader.hydrate = true as const;

// Queue of form data submitted while offline, drained on reconnect by the
// component's reconnect effect (which replays each write, then revalidates so
// the open page converges on canonical server state).
const pendingOfflineSubmissions: FormData[] = [];

export async function clientAction({ request, serverAction }: Route.ClientActionArgs) {
  if (!navigator.onLine) {
    const formData = await request.formData();
    const submission = parseSubmission(formData);

    const result = v.safeParse(zList, submission.payload);

    if (!result.success) {
      return {
        lastResult: report(submission, { error: { issues: result.issues } }),
      };
    }

    const currentItems = result.output.items;
    const toAdd = Boolean(result.output.new);

    if (result.output.new && toAdd) {
      currentItems.push({
        id: crypto.randomUUID(),
        value: result.output.new,
      });
    }

    pendingOfflineSubmissions.push(formData);

    toast.info("You're offline - changes saved locally");

    return {
      lastResult: report(submission, {
        reset: toAdd && Boolean(result.output.new),
        value: {
          ...submission.payload,
          new: toAdd ? "" : (result.output.new ?? ""),
          items: currentItems,
        },
      }),
    };
  }

  return serverAction();
}

// Prevent revalidation when offline, but allow initial navigation to this route
export function shouldRevalidate({ currentUrl, nextUrl }: ShouldRevalidateFunctionArgs) {
  const isRevalidation = currentUrl.pathname === nextUrl.pathname;
  if (isRevalidation && typeof navigator !== "undefined" && !navigator.onLine) {
    return false;
  }
  return true;
}

import { Actions } from "~/components/actions/actions";
import { Button } from "~/components/button/button";
import * as itemsStyles from "~/components/items.css";
import { useIsOnline } from "~/components/online-status/online-status";
import { ScrollArea } from "~/components/scroll-area/scroll-area";
import { Theme } from "~/components/theme/theme";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";
import * as styles from "./list.css";

export function HydrateFallback() {
  return (
    <ScrollArea>
      <ul className={itemsStyles.items}>
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className={itemsStyles.skeletonItem}>
            <div className={itemsStyles.skeletonContent}>
              <div className={itemsStyles.skeletonBar} />
              <div className={itemsStyles.skeletonBar} />
              <div className={itemsStyles.skeletonBar} />
            </div>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}

export const handle = {
  breadcrumb: breadcrumb<Route.ComponentProps["loaderData"]>({
    label: (data) => data?.defaultValue?.name ?? "List",
  }),
};

export const meta: Route.MetaFunction = ({ loaderData }) => {
  const listName = loaderData?.defaultValue?.name;
  return [{ title: listName ? `${listName} | Shorpin` : "List | Shorpin" }];
};

export default function listNew({ actionData, loaderData }: Route.ComponentProps) {
  const defaultValue = loaderData.defaultValue;
  const lastResult = actionData?.lastResult;

  const { state, formData } = useNavigation();

  const { revalidate } = useRevalidator();
  const [clientId] = useState(() => {
    if (typeof sessionStorage !== "undefined") {
      const stored = sessionStorage.getItem("clientId");
      if (stored) return stored;
    }
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    const id = Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("clientId", id);
    }
    return id;
  });

  const submit = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);

  // Replay writes queued by the offline clientAction once we reconnect: drain
  // the queue to persist the offline edits, then revalidate once so the live
  // page converges on canonical server state (real item IDs replacing the
  // client UUIDs) — this re-fires updateFormWithNewValues (below) via itemsKey.
  async function syncOfflineSubmissions() {
    if (pendingOfflineSubmissions.length === 0) return;

    toast.success("Back online - syncing changes");

    // Replay in submission order so server-side ordering is preserved.
    let formData = pendingOfflineSubmissions.shift();
    while (formData) {
      try {
        await fetch(window.location.href, { method: "POST", body: formData });
      } catch {
        // Went offline again mid-sync — put the unsent write back and bail;
        // the next reconnect retries it. Skip revalidation while offline.
        pendingOfflineSubmissions.unshift(formData);
        return;
      }
      formData = pendingOfflineSubmissions.shift();
    }

    revalidate();
  }

  // useIsOnline fires onOnline only on a genuine offline→online transition,
  // driven off the shared navigator.onLine store.
  const isOnline = useIsOnline({ onOnline: syncOfflineSubmissions });

  // Event response, separated from the subscription so the channel's lifetime
  // depends only on listId — reacting to a message shouldn't be reactive to
  // clientId/revalidate identity.
  const onBroadcastChanged = useEffectEvent((payload: { clientId?: string | null }) => {
    if (payload.clientId !== clientId) {
      toast.info("List updated by another user");
      revalidate();
    }
  });

  // Subscribe to broadcast for real-time updates
  useEffect(
    function subscribeToBroadcast() {
      const listId = loaderData.listId;
      if (!listId) return;

      let cancelled = false;
      let cleanup: (() => void) | undefined;

      import("~/lib/supabase.client")
        .then(({ realtimeClient }) => {
          if (cancelled) return;

          const channel = realtimeClient
            .channel(`list-${listId}`)
            .on("broadcast", { event: "changed" }, ({ payload }) => onBroadcastChanged(payload))
            .subscribe();

          cleanup = () => realtimeClient.removeChannel(channel);
        })
        .catch((error) => {
          console.error("Failed to load Supabase realtime client:", error);
        });

      return () => {
        cancelled = true;
        cleanup?.();
      };
    },
    [loaderData.listId],
  );

  const { form, fields, intent } = useForm(zList, {
    defaultValue,
    lastResult,
    shouldValidate: "onBlur",
  });

  const itemsKey = defaultValue.items.map((i) => `${i.id}:${i.value}`).join(",");

  // Track the actionData last seen by the sync below, to detect when an items
  // change came from our own action (Conform already applied it via lastResult).
  const prevActionDataRef = useRef(actionData);

  // Push server items into Conform. An effect-event so the sync can read
  // isOnline/actionData/fields without making the effect reactive to them —
  // the only signal that should re-run it is the items themselves changing.
  const applyServerItems = useEffectEvent(() => {
    // Don't overwrite local changes when offline
    if (!isOnline) {
      return;
    }

    // Skip if this update came from our own action - Conform already handled it via lastResult
    const actionDataJustChanged = prevActionDataRef.current !== actionData;
    if (actionDataJustChanged && actionData?.lastResult) {
      return;
    }

    // Ensure form element exists before updating
    if (!formRef.current) {
      return;
    }

    intent.update({ name: fields.items.name, value: defaultValue.items });
  });

  // Note: deliberately NOT reactive to isOnline — on reconnect, defaultValue is
  // stale (revalidation is blocked offline); the reconnect listener's fetch →
  // revalidate path delivers fresh items, which re-fires this via itemsKey.
  useEffect(
    function updateFormWithNewValues() {
      applyServerItems();
    },
    [itemsKey],
  );

  // Bookkeeping runs after the sync effect in the same commit, so the
  // comparison above sees the previous actionData.
  useEffect(
    function trackActionData() {
      prevActionDataRef.current = actionData;
    },
    [actionData],
  );

  const edited =
    useFormData(form.id, (formData) => {
      const submission = parseSubmission(formData);

      const result = v.safeParse(zList, submission.payload);

      if (!result.success) {
        return [];
      }

      return defaultValue.items
        .filter(
          ({ value, id }) => result.output.items?.find((item) => item?.id === id)?.value !== value,
        )
        .map(({ id }) => id);
    }) || [];

  const reorder = reorderViaConform({
    fieldName: fields.items.name,
    items: defaultValue.items,
    intent,
    submit,
    formRef,
  });

  // Delete shrinks the items field (once the row's exit animation finishes —
  // see items.tsx) then submits; the server infers "delete" from whichever
  // id is now missing from the submitted array (see mutate_list).
  const onRemove = removeViaConform({
    fieldName: fields.items.name,
    intent,
    submit,
    formRef,
  });

  // Browser-only "recreate last deleted": deletion itself is inferred
  // server-side from the submitted array, so we keep the recreate affordance
  // client-side rather than round-tripping the server's soft-deleted row. The
  // deleted value is captured directly in commitRemoval (items.tsx), which
  // fires for both the real click and the swipe path — see Items `onDelete`.
  const [lastDeletedValue, setLastDeletedValue] = useState<string | null>(null);

  // Recreate re-adds the captured value through the normal add path, so it
  // returns as a fresh item at the end of the list — hence "recreate", not "undo".
  // Guarded against firing while the triggering delete's own submission is
  // still in flight: two overlapping navigations to the same route race,
  // and the delete's stale response can land after recreate's and wipe the
  // recreated item back out (see integration-tests/list.spec.ts's recreate test).
  function recreateLastDeleted() {
    const formElement = formRef.current;
    if (!formElement || !lastDeletedValue || state !== "idle") return;

    const recreateData = new FormData(formElement);
    recreateData.set(fields.new.name, lastDeletedValue);
    recreateData.set("submitAction", "add");
    submit(recreateData, { method: "POST" });
    setLastDeletedValue(null);
  }

  return (
    <Theme
      defaultPrimary={defaultValue.themePrimary}
      defaultSecondary={defaultValue.themeSecondary}
    >
      <div className={styles.topActions}>
        <Theme.Button formId={form.id} />
      </div>

      <Form {...form.props} ref={formRef} method="POST" className={styles.form}>
        {/* hidden submit button captures Enter key presses to add a new item.
            submitAction is a plain (non-reserved) field used only to tell
            client-side "was this particular submission an add" for the
            pendingItem skeleton below — the server infers add purely from
            fields.new having a value. */}
        <VisuallyHidden>
          <button type="submit" name="submitAction" value="add">
            Update
          </button>
        </VisuallyHidden>

        <input
          name={fields.name.name}
          id={fields.name.id}
          defaultValue={fields.name.defaultValue}
          type="hidden"
        />
        <input name="clientId" value={clientId} type="hidden" />
        <Theme.Fields
          fieldNames={{
            primary: fields.themePrimary.name,
            secondary: fields.themeSecondary.name,
          }}
        />

        <ScrollArea>
          <Items
            fieldMetadata={fields.items}
            edited={edited}
            newItems={loaderData.newItemIds}
            pendingItem={
              state === "submitting" && formData?.get("submitAction") === "add"
                ? (formData.get(fields.new.name) as string)
                : null
            }
            onReorder={reorder.onReorder}
            onReorderComplete={reorder.onComplete}
            onDelete={setLastDeletedValue}
            onRemove={onRemove}
            reorderable
          />
        </ScrollArea>

        <Actions>
          <div className={styles.actions}>
            <VisuallyHidden>
              <label htmlFor={fields.new.id}>New item</label>
            </VisuallyHidden>
            <input
              name={fields.new.name}
              id={fields.new.id}
              autoFocus
              autoComplete="off"
              className={styles.addInput}
            />
            <Button
              type="submit"
              value="add"
              name="submitAction"
              isSubmitting={state === "submitting"}
              className={styles.addButton}
            >
              Add
            </Button>

            {lastDeletedValue ? (
              <button
                type="button"
                onClick={recreateLastDeleted}
                disabled={state !== "idle"}
                className={styles.undoButton}
              >
                Recreate last deleted
              </button>
            ) : null}
          </div>
        </Actions>
      </Form>
    </Theme>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { revalidate, state } = useRevalidator();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className={styles.errorState}>
        <p>{error.data?.message ?? "List not found."}</p>
        <Link to={href("/")}>Back to home</Link>
      </div>
    );
  }

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
