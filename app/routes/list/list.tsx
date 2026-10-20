import { parseSubmission, report, useForm, useFormData } from "@conform-to/react/future";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  href,
  isRouteErrorResponse,
  type ShouldRevalidateFunctionArgs,
  useFetcher,
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
import { formDataToPairs } from "~/lib/form-data-codec";
import { isNetworkOrServerError } from "~/lib/network-error";
import { rebaseListItems, type ListItemRef } from "~/lib/offline-merge";
import {
  dequeueMutations,
  enqueueMutation,
  getListSnapshot,
  listQueuedMutations,
  putListSnapshot,
  updateListDesired,
} from "~/lib/offline-store.client";
import { withStaleVersionRetry } from "~/lib/version-guard.client";
import type { Route } from "./+types/list";
import { LIST_STYLE_DEFAULT, zList } from "./data";

export { action, loader } from "./list.server";

import { toast } from "~/lib/toast";

type ListLoaderData = Awaited<ReturnType<typeof import("./list.server").loader>>;

function toItemRefs(items: ReadonlyArray<{ id: string; value: string }>): ListItemRef[] {
  return items.map(({ id, value }) => ({ id, value }));
}

function listRouteKey(slug: string): `list:${string}` {
  return `list:${slug}`;
}

/**
 * Keeps the IndexedDB snapshot for this list in sync with a freshly-loaded
 * server payload. If nothing's queued, serverData/baseline/desired all track
 * fresh state 1:1. If an offline session is in flight (a queued mutation
 * exists), baseline/desired are left untouched — they only advance once that
 * session's rebased edit has actually been resubmitted (see the reconnect
 * sync effect in the component below).
 */
async function reconcileListSnapshot(slug: string, freshData: ListLoaderData) {
  const [queued, existing] = await Promise.all([
    listQueuedMutations(listRouteKey(slug)),
    getListSnapshot<ListLoaderData>(slug),
  ]);
  const freshItems = toItemRefs(freshData.defaultValue.items);
  const hasPendingSession = queued.length > 0;

  await putListSnapshot<ListLoaderData>({
    slug,
    listId: freshData.listId,
    serverData: freshData,
    baseline: hasPendingSession ? (existing?.baseline ?? freshItems) : freshItems,
    baselineFetchedAt: hasPendingSession ? (existing?.baselineFetchedAt ?? Date.now()) : Date.now(),
    desired: hasPendingSession ? (existing?.desired ?? freshItems) : freshItems,
    cachedAt: Date.now(),
  });
}

export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  const slug = params.list;

  // Cached fallbacks are flagged so reconnect sync never mistakes them for
  // fresh server state (see performRebaseSync).
  if (!navigator.onLine) {
    const cached = await getListSnapshot<ListLoaderData>(slug);
    if (cached) return { ...cached.serverData, fromCache: true };
  }

  try {
    const data = await serverLoader();
    await reconcileListSnapshot(slug, data);
    return { ...data, fromCache: false };
  } catch (error) {
    console.error("Error in clientLoader", error);

    if (isNetworkOrServerError(error)) {
      const cached = await getListSnapshot<ListLoaderData>(slug);
      if (cached) return { ...cached.serverData, fromCache: true };
    }
    throw error;
  }
}

clientLoader.hydrate = true as const;

async function queueOfflineEdit(slug: string, request: Request) {
  const formData = await request.formData();
  const submission = parseSubmission(formData);

  const result = v.safeParse(zList, submission.payload);

  if (!result.success) {
    return {
      lastResult: report(submission, { error: { issues: result.issues } }),
    };
  }

  const cached = await getListSnapshot<ListLoaderData>(slug);
  if (!cached) {
    // No cached snapshot to offline-edit against — surface the original
    // connectivity failure rather than fabricate state we don't have.
    throw new Response("Service unavailable", { status: 503 });
  }

  const currentItems = result.output.items;
  const toAdd = Boolean(result.output.new);

  if (toAdd && result.output.new) {
    currentItems.push({
      // Reuse the add's own id: if this is the fallback for a request whose
      // response was lost, the server may already hold a row with it, and
      // the reconnect sync's replay then becomes a no-op.
      id: result.output.newId ?? crypto.randomUUID(),
      value: result.output.new,
    });
  }

  await updateListDesired(slug, currentItems);
  await enqueueMutation({
    route: request.url,
    routeKey: listRouteKey(slug),
    kind: "list-mutate",
    fields: formDataToPairs(formData),
    clientId: String(formData.get("clientId") ?? ""),
  });

  toast.info("You're offline - changes saved locally");

  return {
    queuedOffline: true,
    lastResult: report(submission, {
      reset: toAdd && Boolean(result.output.new),
      targetValue: {
        ...submission.payload,
        new: toAdd ? "" : (result.output.new ?? ""),
        items: currentItems,
      },
    }),
  };
}

export async function clientAction({ params, request, serverAction }: Route.ClientActionArgs) {
  const slug = params.list;

  if (!navigator.onLine) return queueOfflineEdit(slug, request);

  // navigator.onLine lags a dropped connection by seconds on mobile, so a
  // request can still fail with the browser reporting online. Fall back to
  // queueing instead of hitting the error boundary. A clone, because
  // serverAction consumes the original body. Safe even if the server did
  // apply the request and only the response was lost: the reconnect sync
  // rebases rather than replays, and adds carry a stable id.
  const fallbackRequest = request.clone();

  try {
    return await withStaleVersionRetry(serverAction);
  } catch (error) {
    if (!isNetworkOrServerError(error)) throw error;
    return queueOfflineEdit(slug, fallbackRequest);
  }
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
import { SUBMIT_ACTION, useIsSubmitting } from "~/components/button/use-is-submitting";
import { ErrorState } from "~/components/error-state/error-state";
import * as errorStateStyles from "~/components/error-state/error-state.css";
import * as itemsStyles from "~/components/items.css";
import { useIsOnline } from "~/components/online-status/online-status";
import { ScrollArea } from "~/components/scroll-area/scroll-area";
import { Theme } from "~/components/theme/theme";
import { StylePicker } from "~/components/app-style/style-picker";
import { useAccountAppStyle, useListAppStyle } from "~/components/app-style/use-app-style";
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

export default function listNew({ actionData, loaderData, params }: Route.ComponentProps) {
  const defaultValue = loaderData.defaultValue;
  const lastResult = actionData?.lastResult;
  const slug = params.list;

  const { state, formData } = useNavigation();
  const isAdding = useIsSubmitting("add");

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

  // Fetches fresh server state independently of this route's own loader, so
  // reconnect sync can rebase queued offline edits (see the effect below,
  // defined after useForm) without disturbing what's currently on screen.
  const syncFetcher = useFetcher<typeof clientLoader>();

  // Kicks off the fresh-data fetch when there's a queued edit to rebase —
  // the actual rebase-and-resubmit happens once syncFetcher resolves, in
  // the effect below. Wrapped in useEffectEvent so it can be triggered both
  // by a genuine offline→online transition (the common case, via onOnline)
  // and once on mount (covers a queue left behind by a stale-session
  // redirect mid-sync — see performRebaseSync's route check below — where
  // no further online/offline transition occurs once the user
  // re-authenticates and comes back).
  const syncIfPending = useEffectEvent(async () => {
    const queued = await listQueuedMutations(listRouteKey(slug));
    if (queued.length === 0) return;

    // Backoff retries (see performRebaseSync) come back through here too —
    // only announce the first attempt.
    if (syncRetryRef.current.attempt === 0) toast.success("Back online - syncing changes");
    syncFetcher.load(window.location.pathname);
  });

  const isOnline = useIsOnline({
    onOnline: () => {
      void syncIfPending();
    },
  });

  useEffect(() => {
    if (isOnline) void syncIfPending();
    // Mount-only: retries whatever's already queued, regardless of how it
    // got left there. Online/offline transitions are covered by onOnline
    // above.
  }, []);

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
    // Give every add a client-generated id (see toIdempotentAdd in
    // list.server.ts) so a retried or offline-queued add can't duplicate.
    // Set here rather than as a hidden input, since reorder/delete submit
    // the whole form and would carry a stale id along.
    onSubmit(event) {
      const { submitter } = event.nativeEvent as SubmitEvent;
      const addData = new FormData(event.currentTarget, submitter);
      if (addData.get(SUBMIT_ACTION) !== "add") return;

      event.preventDefault();
      addData.set(fields.newId.name, crypto.randomUUID());
      void submit(addData, { method: "POST" });
    },
  });

  // Once the independent fresh-data fetch above resolves, rebase our queued
  // offline edits onto it and resubmit as a single, collapsed submission —
  // see rebaseListItems for why we can't just replay the stale snapshot(s).
  // Resilient to flapping connectivity: if the fetch fails, clientLoader
  // falls back to cached data, which is never rebased onto (see below) — the
  // sync retries until it gets genuinely fresh data. If the resubmission
  // itself goes out offline, clientAction re-queues it for the next reconnect.
  //
  // Additions need special handling: mutate_list never creates a row from an
  // items[] entry with an unrecognized id (an offline add's client-generated
  // uuid) — an id it doesn't recognize is just a no-op there, not an insert.
  // So we rebase items[] as usual (harmless to include our own fake-id
  // addition rows — the RPC's delete pass runs *before* its insert passes,
  // so an unmatched id can't cause a real row to be deleted), and separately
  // carry every offline addition's value through the `newItems` array field
  // (mutate_list migration 20260806000000), one real row minted per entry.
  // Each addition's client-generated id goes along in the parallel
  // `newItemIds` field and becomes the row's id (migration 20261011000000):
  // the queue is only dropped once the response arrives, so a reload while
  // the request is in flight replays additions the server already applied —
  // the stable id makes that replay a no-op instead of a duplicate.
  // `new` (the single-value field the live add-input and recreateLastDeleted
  // use) is explicitly cleared here — offline additions are carried through
  // `newItems` instead, and leaving `new` untouched would resubmit whatever
  // happens to be sitting in the live add-input's DOM snapshot as a phantom
  // extra add.
  //
  // Guarded against re-entrancy: React Router revalidates every active
  // fetcher (including syncFetcher) after any action submission, so our own
  // resubmission below re-fires the effect that calls this function again —
  // syncInFlightRef ignores that re-entrant call rather than racing a second
  // rebase against the queue before the first one has dequeued it.
  const syncInFlightRef = useRef(false);
  const syncRetryRef = useRef({ attempt: 0, timer: 0 });

  useEffect(() => () => window.clearTimeout(syncRetryRef.current.timer), []);

  const performRebaseSync = useEffectEvent(
    async (freshData: ListLoaderData & { fromCache: boolean }) => {
      if (syncInFlightRef.current) return;

      // The fetch can fail just after reconnecting (the connection is still
      // settling) while the submit a moment later succeeds. clientLoader then
      // hands back the cached list, and rebasing onto that would submit a
      // snapshot missing everything other devices added meanwhile — which
      // mutate_list's diff-based delete would wipe. Retry with backoff instead.
      if (freshData.fromCache) {
        const retry = syncRetryRef.current;
        window.clearTimeout(retry.timer);
        const delay = Math.min(1000 * 2 ** retry.attempt, 30_000);
        retry.attempt += 1;
        retry.timer = window.setTimeout(() => {
          if (navigator.onLine) void syncIfPending();
        }, delay);
        return;
      }
      syncRetryRef.current.attempt = 0;

      syncInFlightRef.current = true;

      try {
        const routeKey = listRouteKey(slug);
        const queued = await listQueuedMutations(routeKey);
        if (queued.length === 0) return;

        const cached = await getListSnapshot<ListLoaderData>(slug);
        const baseline = cached?.baseline ?? [];
        const desired = cached?.desired ?? baseline;
        const freshItems = toItemRefs(freshData.defaultValue.items);

        const baselineIds = new Set(baseline.map((item) => item.id));
        const additions = desired.filter((item) => !baselineIds.has(item.id));
        const rebased = rebaseListItems({ baseline, desired, fresh: freshItems });

        // Update Conform's local state for immediate visual feedback, but
        // don't rely on it having flushed to the DOM by the time we build the
        // submission below — unlike reorderViaConform/removeViaConform (fired
        // synchronously from a DOM event, reliably flushed within one
        // requestAnimationFrame), this runs from an effect, and a single rAF
        // isn't a reliable enough signal here (observed working in dev but not
        // in a production build). Instead, build the submitted FormData
        // directly from `rebased`, replacing just the items[] entries on a
        // snapshot of the form's current fields — this can never race the
        // render and stays correct regardless of when/whether React commits.
        intent.update({ name: fields.items.name, value: rebased });

        if (!formRef.current) return;

        const syncData = new FormData(formRef.current);
        for (const key of Array.from(syncData.keys())) {
          if (/^items\[\d+\]\.(id|value)$/.test(key)) {
            syncData.delete(key);
          }
        }
        rebased.forEach((item, index) => {
          syncData.append(`items[${index}].id`, item.id);
          syncData.append(`items[${index}].value`, item.value);
        });
        syncData.set(fields.new.name, "");
        additions.forEach((item, index) => {
          syncData.append(`newItems[${index}]`, item.value);
          syncData.append(`newItemIds[${index}]`, item.id);
        });

        try {
          await submit(syncData, { method: "POST" });

          // submit() doesn't throw on a redirected response — React Router's
          // data router just follows it as a normal completed navigation
          // (e.g. a stale session bouncing this POST to /login). Checking we
          // actually stayed on this list is what tells a genuine delivery
          // apart from a redirect masquerading as one; see
          // app/lib/mutation-replay.ts for the equivalent check on the raw
          // fetch()-based replay paths (home.tsx, app/sw.ts).
          if (window.location.pathname !== href("/lists/:list", { list: slug })) {
            return;
          }

          // Only drop the queue once the resubmission has actually completed —
          // if we're still offline (or go offline again mid-request), leave it
          // intact so the next reconnect retries automatically.
          await dequeueMutations(queued.map((entry) => entry.seq));
        } catch (error) {
          console.error("Error syncing offline edits", error);
        }
      } finally {
        syncInFlightRef.current = false;
      }
    },
  );

  useEffect(
    function replayRebasedOfflineEdits() {
      if (syncFetcher.state === "idle" && syncFetcher.data) {
        void performRebaseSync(syncFetcher.data);
      }
    },
    [syncFetcher.state, syncFetcher.data],
  );

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

  // An edit queued because its request failed while navigator.onLine still
  // said online (see clientAction) gets no offline→online transition to
  // trigger the sync, so start it here; performRebaseSync backs off until
  // the server is reachable again.
  useEffect(
    function syncFallbackQueuedEdit() {
      if (actionData && "queuedOffline" in actionData && navigator.onLine) {
        void syncIfPending();
      }
    },
    [actionData],
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
    items: defaultValue.items,
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

  const accountStyle = useAccountAppStyle();
  const [listStyle, setListStyle] = useListAppStyle(loaderData.appStyleOverride);
  // Sent only while a saved style hasn't reached the server yet, so a stale
  // tab adding an item can't reset another member's choice — but still part
  // of the form, so an offline save survives the reconnect rebase.
  const isListStylePending = listStyle !== loaderData.appStyleOverride;

  function saveListStyle(style: typeof listStyle) {
    setListStyle(style);
    const formElement = formRef.current;
    if (!formElement) return;
    const styleData = new FormData(formElement);
    styleData.set(fields.new.name, "");
    styleData.set(fields.themeStyle.name, style ?? LIST_STYLE_DEFAULT);
    submit(styleData, { method: "POST" });
  }

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
    recreateData.set(fields.newId.name, crypto.randomUUID());
    recreateData.set(SUBMIT_ACTION, "recreate");
    submit(recreateData, { method: "POST" });
    setLastDeletedValue(null);
  }

  // Spans the add's action and the revalidation after it, not just
  // "submitting": Items keeps the placeholder until the saved row arrives.
  const submitAction = state === "idle" ? null : formData?.get(SUBMIT_ACTION);
  const pendingAdd =
    submitAction === "add" || submitAction === "recreate"
      ? {
          id: String(formData?.get(fields.newId.name) ?? ""),
          value: String(formData?.get(fields.new.name) ?? ""),
        }
      : null;

  return (
    <Theme
      defaultPrimary={defaultValue.themePrimary}
      defaultSecondary={defaultValue.themeSecondary}
    >
      <div className={styles.topActions}>
        <StylePicker
          title="List style"
          value={listStyle}
          inherit={accountStyle}
          onSave={saveListStyle}
        />
        <Theme.Button formId={form.id} />
      </div>

      <Form {...form.props} ref={formRef} method="POST" className={styles.form}>
        {/* hidden submit button captures Enter key presses to add a new item.
            submitAction is a plain (non-reserved) field used only to tell
            client-side "was this particular submission an add" for the
            pendingItem skeleton and Add spinner below — the server infers add
            purely from fields.new having a value. */}
        <VisuallyHidden>
          <button type="submit" name={SUBMIT_ACTION} value="add">
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
        {isListStylePending && (
          <input
            name={fields.themeStyle.name}
            value={listStyle ?? LIST_STYLE_DEFAULT}
            type="hidden"
          />
        )}
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
            pendingItem={pendingAdd}
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
              name={SUBMIT_ACTION}
              isSubmitting={isAdding}
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

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className={errorStateStyles.errorState}>
        <p>{error.data?.message ?? "List not found."}</p>
        <Link to={href("/")}>Back to home</Link>
      </div>
    );
  }

  return <ErrorState error={error} />;
}
