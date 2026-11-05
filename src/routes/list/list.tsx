import { isServer } from "@solidjs/web";
import { createFileRoute, isRedirect, Outlet, useRouter } from "@tanstack/solid-router";
import { createEffect, createMemo, createSignal, For, onCleanup, onSettled, Show } from "solid-js";
import type * as v from "valibot";
import { Actions } from "~/components/actions/actions";
import { breadcrumb } from "~/components/breadcrumbs/breadcrumbs";
import { Button } from "~/components/button/button";
import { ErrorState } from "~/components/error-state/error-state";
import * as errorStateStyles from "~/components/error-state/error-state.css";
import { BrushIcon, GroupIcon } from "~/components/icon/icons";
import { Items } from "~/components/items";
import * as itemsStyles from "~/components/items.css";
import { Link } from "~/components/link/link";
import { useIsOnline } from "~/components/online-status/online-status";
import { ActionLabel, PageHeader } from "~/components/page-header/page-header";
import { ScrollArea } from "~/components/scroll-area/scroll-area";
import { TagCombobox } from "~/components/tag-combobox/tag-combobox";
import { Theme, type ThemeColors } from "~/components/theme/theme";
import { VisuallyHidden } from "~/components/visually-hidden/visually-hidden";
import { groupByTag, listTags, withPickedTag } from "~/lib/item-tag";
import { isNetworkOrServerError } from "~/lib/network-error";
import { type ListItemRef, rebaseListItems } from "~/lib/offline-merge";
import {
  dequeueMutations,
  enqueueMutation,
  getListSnapshot,
  listQueuedMutations,
  putListSnapshot,
  updateListDesired,
} from "~/lib/offline-store.client";
import { toast } from "~/lib/toast";
import { withStaleVersionRetry } from "~/lib/version-guard.client";
import type { zList } from "./data";
import * as styles from "./list.css";
import { getList, type ListData, mutateList } from "./list.functions";

type ListPayload = v.InferInput<typeof zList>;

type ListLoaderData = ListData & {
  fromCache: boolean;
  /** Offline only: the local edits on top of the cached server state. */
  localItems?: ListItemRef[];
};

function listRouteKey(slug: string): `list:${string}` {
  return `list:${slug}`;
}

/**
 * Keeps the IndexedDB snapshot for this list in sync with fresh server
 * state. If nothing's queued, serverData/baseline/desired all track fresh
 * state 1:1. If an offline session is in flight (a queued mutation exists),
 * baseline/desired are left untouched — they only advance once that
 * session's rebased edit has actually been resubmitted (see syncIfPending).
 */
async function reconcileListSnapshot(slug: string, fresh: ListData) {
  const [queued, existing] = await Promise.all([
    listQueuedMutations(listRouteKey(slug)),
    getListSnapshot<ListData>(slug),
  ]);
  const hasPendingSession = queued.length > 0;

  await putListSnapshot<ListData>({
    slug,
    listId: fresh.listId,
    serverData: fresh,
    baseline: hasPendingSession ? (existing?.baseline ?? fresh.items) : fresh.items,
    baselineFetchedAt: hasPendingSession ? (existing?.baselineFetchedAt ?? Date.now()) : Date.now(),
    desired: hasPendingSession ? (existing?.desired ?? fresh.items) : fresh.items,
    cachedAt: Date.now(),
  });
}

async function cachedList(slug: string): Promise<ListLoaderData | null> {
  const cached = await getListSnapshot<ListData>(slug);
  return cached ? { ...cached.serverData, localItems: cached.desired, fromCache: true } : null;
}

/**
 * Route loaders in TanStack Router are isomorphic: this runs on the server
 * for the first page load, then in the browser for each client navigation.
 * So the one function does what React Router split between `loader` and
 * `clientLoader`. In the browser, a failed fetch falls back to the cached
 * list. Cached results are flagged so the reconnect sync never mistakes
 * them for fresh server state.
 */
async function loadList(slug: string, recordVisit: boolean): Promise<ListLoaderData> {
  if (isServer) return { ...(await getList({ data: { slug, recordVisit } })), fromCache: false };

  if (!navigator.onLine) {
    const cached = await cachedList(slug);
    if (cached) return cached;
  }

  try {
    return { ...(await getList({ data: { slug, recordVisit } })), fromCache: false };
  } catch (error) {
    if (isNetworkOrServerError(error)) {
      const cached = await cachedList(slug);
      if (cached) return cached;
    }
    throw error;
  }
}

export const Route = createFileRoute("/_app/lists/$list")({
  // `stay` is a refetch on the same page (router.invalidate after another
  // member's change): not a visit. See recordVisit in list.functions.ts.
  loader: ({ params, cause }) => loadList(params.list, cause === "enter"),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.name} | Shorpin` : "List | Shorpin" }],
  }),
  staticData: {
    breadcrumb: breadcrumb<ListLoaderData | undefined>({ label: (data) => data?.name ?? "List" }),
  },
  pendingComponent: ListSkeleton,
  notFoundComponent: () => (
    <div class={errorStateStyles.errorState}>
      <p>List does not exist</p>
      <Link to="/">Back to home</Link>
    </div>
  ),
  errorComponent: (props) => <ErrorState error={props.error} reset={props.reset} />,
  component: ListPage,
});

function ListSkeleton() {
  return (
    <ScrollArea>
      <ul class={itemsStyles.items}>
        <For each={Array.from({ length: 6 })}>
          {() => (
            <li class={itemsStyles.skeletonItem}>
              <div class={itemsStyles.skeletonContent}>
                <div class={itemsStyles.skeletonBar} />
                <div class={itemsStyles.skeletonBar} />
                <div class={itemsStyles.skeletonBar} />
              </div>
            </li>
          )}
        </For>
      </ul>
    </ScrollArea>
  );
}

/** Identifies this tab, so it can ignore its own realtime broadcasts. */
function getClientId() {
  const stored = sessionStorage.getItem("clientId");
  if (stored) return stored;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  sessionStorage.setItem("clientId", id);
  return id;
}

function ListPage() {
  const data = Route.useLoaderData();
  const params = Route.useParams();
  const router = useRouter();
  const slug = () => params().list;
  const clientId = isServer ? "" : getClientId();

  // React Router + Conform kept the list's state in form fields, and spent
  // a lot of code reconciling them with loader revalidations and action
  // results. Here two signals hold it:
  //
  // - serverItems: what the server last confirmed — the loader's items,
  //   then each save's response.
  // - items: what's on screen — serverItems plus local changes not yet
  //   confirmed (in flight, or queued offline).
  //
  // Both are writable derived signals: they reset whenever the loader
  // delivers new data (another list, or a refetch after another member's
  // change), and a save writes them in between.
  const [serverItems, setServerItems] = createSignal<ListItemRef[]>(() => data().items);
  const [items, setItems] = createSignal<ListItemRef[]>(() => data().localItems ?? data().items);

  const edited = createMemo(() => {
    const confirmed = new Map(serverItems().map(({ id, value }) => [id, value]));
    return new Set(
      items()
        .filter(({ id, value }) => confirmed.has(id) && confirmed.get(id) !== value)
        .map(({ id }) => id),
    );
  });

  const tags = createMemo(() => listTags(items()));

  // The list's palette: the loader's, until the picker sets a new one (saved
  // with the list, so every later save carries it too).
  const [colors, setColors] = createSignal<ThemeColors | null>(() => {
    const { themePrimary: primary, themeSecondary: secondary } = data();
    return primary && secondary ? { primary, secondary } : null;
  });

  // Saves run one at a time, in order, so a slow response can never land
  // after a newer save's and overwrite it. React Router achieved the same by
  // cancelling the older navigation.
  let saveChain: Promise<void> = Promise.resolve();
  let latestSave = 0;
  const [savesInFlight, setSavesInFlight] = createSignal(0);
  const isSaving = () => savesInFlight() > 0;
  // An add in flight, shown as a placeholder row until the saved row arrives.
  const [pendingAdd, setPendingAdd] = createSignal<ListItemRef | null>(null);

  function payload(next: ListItemRef[], extra: Partial<ListPayload> = {}): ListPayload {
    const list = data();
    return {
      name: list.name,
      items: next,
      themePrimary: colors()?.primary ?? list.themePrimary,
      themeSecondary: colors()?.secondary ?? list.themeSecondary,
      ...extra,
    };
  }

  /** Follows a server function's redirect, e.g. a stale session to /login. */
  async function followRedirect(error: unknown) {
    if (!isRedirect(error)) return false;
    await router.navigate(router.resolveRedirect(error).options);
    return true;
  }

  async function queueOfflineEdit(desired: ListItemRef[]) {
    if (!(await getListSnapshot(slug()))) {
      // No cached snapshot to edit against — don't fabricate state we don't have.
      setItems(serverItems());
      toast.error("Couldn't save - you're offline");
      return;
    }

    setItems(desired);
    await updateListDesired(slug(), desired);
    await enqueueMutation({
      route: window.location.pathname,
      routeKey: listRouteKey(slug()),
      kind: "list-mutate",
      // Unused: the reconnect sync rebases the snapshot rather than
      // replaying what was submitted (see syncIfPending).
      fields: [],
      clientId,
    });

    toast.info("You're offline - changes saved locally");

    // navigator.onLine lags a dropped connection by seconds on mobile, so a
    // request can fail with the browser still reporting online. No
    // offline→online transition will follow, so start the sync (and its
    // backoff) now.
    if (navigator.onLine) void syncIfPending();
  }

  async function send(next: ListItemRef[], extra: Partial<ListPayload>, ticket: number) {
    const desired = extra.new
      ? [...next, { id: extra.newId ?? crypto.randomUUID(), value: extra.new }]
      : next;

    if (!navigator.onLine) return queueOfflineEdit(desired);

    try {
      const result = await withStaleVersionRetry(() =>
        mutateList({ data: { slug: slug(), clientId, payload: payload(next, extra) } }),
      );
      setServerItems(result.items);
      // A newer save is queued behind this one and carries newer local state.
      if (ticket === latestSave) setItems(result.items);
      void reconcileListSnapshot(slug(), { ...data(), items: result.items });
    } catch (error) {
      if (await followRedirect(error)) return;
      // Safe even if the server did apply the request and only the response
      // was lost: the reconnect sync rebases rather than replays, and adds
      // carry a stable id.
      if (isNetworkOrServerError(error)) return queueOfflineEdit(desired);
      setItems(serverItems());
      toast.error(error instanceof Error ? error.message : "Failed to update list");
    }
  }

  function save(next: ListItemRef[], extra: Partial<ListPayload> = {}) {
    const ticket = ++latestSave;
    setItems(next);
    setSavesInFlight((count) => count + 1);
    saveChain = saveChain
      .then(() => send(next, extra, ticket))
      .finally(() => setSavesInFlight((count) => count - 1));
    return saveChain;
  }

  // ---- Reconnect sync -----------------------------------------------------

  // Once fresh server state arrives, rebase the queued offline edits onto it
  // and resubmit them as one save — see rebaseListItems for why replaying
  // the stale snapshot isn't safe. Additions go through `newItems` (with
  // their ids in `newItemIds`): mutate_list never creates a row from an
  // items[] entry it doesn't recognise. The queue is only dropped once the
  // save has landed, so a reload mid-request retries it, and the stable ids
  // make that retry a no-op.
  //
  // React Router needed a fetcher for the fresh data, effects to react to
  // it, and a re-entrancy guard against its own revalidation. Here it's one
  // async function: call the server, rebase, call the server again.
  const retry = { attempt: 0, timer: 0 };
  let syncInFlight = false;
  // The global, not window's: cleanup also runs when the server disposes
  // the render, where there's no window.
  onCleanup(() => clearTimeout(retry.timer));

  // The fetch can fail just after reconnecting (the connection is still
  // settling). Rebasing onto the cached list instead would submit a snapshot
  // missing everything other devices added meanwhile — which mutate_list's
  // diff-based delete would wipe. Retry with backoff instead.
  function scheduleRetry() {
    window.clearTimeout(retry.timer);
    const delay = Math.min(1000 * 2 ** retry.attempt, 30_000);
    retry.attempt += 1;
    retry.timer = window.setTimeout(() => {
      if (navigator.onLine) void syncIfPending();
    }, delay);
  }

  async function syncIfPending() {
    if (syncInFlight) return;
    const routeKey = listRouteKey(slug());
    const queued = await listQueuedMutations(routeKey);
    if (queued.length === 0) return;

    // Backoff retries come back through here too — only announce the first.
    if (retry.attempt === 0) toast.success("Back online - syncing changes");
    syncInFlight = true;

    try {
      const fresh = await getList({ data: { slug: slug(), recordVisit: false } });

      const cached = await getListSnapshot<ListData>(slug());
      const baseline = cached?.baseline ?? [];
      const desired = cached?.desired ?? baseline;
      const baselineIds = new Set(baseline.map(({ id }) => id));
      const additions = desired.filter(({ id }) => !baselineIds.has(id));
      const rebased = rebaseListItems({ baseline, desired, fresh: fresh.items });
      setItems(rebased);

      const result = await mutateList({
        data: {
          slug: slug(),
          clientId,
          payload: payload(rebased, {
            new: "",
            newItems: additions.map(({ value }) => value),
            newItemIds: additions.map(({ id }) => id),
          }),
        },
      });

      retry.attempt = 0;
      await dequeueMutations(queued.map(({ seq }) => seq));
      setServerItems(result.items);
      setItems(result.items);
      await reconcileListSnapshot(slug(), { ...fresh, items: result.items });
    } catch (error) {
      // A stale session: the queue stays, and drains when the user's back.
      if (await followRedirect(error)) return;
      if (isNetworkOrServerError(error)) {
        scheduleRetry();
        return;
      }
      console.error("Error syncing offline edits", error);
    } finally {
      syncInFlight = false;
    }
  }

  useIsOnline({ onOnline: () => void syncIfPending() });

  // Also on mount: retries a queue left behind by a stale-session redirect
  // mid-sync, where no further online/offline transition happens once the
  // user signs back in.
  onSettled(() => {
    if (navigator.onLine) void syncIfPending();
  });

  // Effects only run in the browser, so this is the client half of the
  // loader: cache what the server sent, including on the first page load,
  // which React Router covered with `clientLoader.hydrate`.
  createEffect(
    () => ({ list: data(), slug: slug() }),
    ({ list: { fromCache, localItems: _localItems, ...fresh }, slug }) => {
      if (!fromCache) void reconcileListSnapshot(slug, fresh);
    },
  );

  // ---- Realtime -----------------------------------------------------------

  createEffect(
    () => data().listId,
    (listId) => {
      let cancelled = false;
      let unsubscribe: (() => void) | undefined;

      import("~/lib/supabase.client")
        .then(({ realtimeClient }) => {
          if (cancelled) return;
          const channel = realtimeClient
            .channel(`list-${listId}`)
            .on("broadcast", { event: "changed" }, ({ payload }) => {
              if ((payload as { clientId?: string }).clientId === clientId) return;
              toast.info("List updated by another user");
              void router.invalidate();
            })
            .subscribe();
          unsubscribe = () => void realtimeClient.removeChannel(channel);
        })
        .catch((error) => {
          console.error("Failed to load Supabase realtime client:", error);
        });

      return () => {
        cancelled = true;
        unsubscribe?.();
      };
    },
  );

  // ---- Actions --------------------------------------------------------------

  let newInput!: HTMLInputElement;
  let addButton!: HTMLButtonElement;
  // A signal rather than a form field, so it survives each add: the tag
  // stays for the next add (until a reload), for adding a run of items with
  // one tag.
  const [newTag, setNewTag] = createSignal("");

  function add(value: string) {
    // The tag combobox has no field of its own: its tag is folded into the
    // typed value as `[tag]` (see item-tag.ts).
    const tagged = withPickedTag(value, newTag());
    if (!tagged.trim()) return;
    const id = crypto.randomUUID();
    newInput.value = "";
    setPendingAdd({ id, value: tagged });
    void save(items(), { new: tagged, newId: id }).finally(() =>
      setPendingAdd((pending) => (pending?.id === id ? null : pending)),
    );
  }

  function remove(id: string) {
    void save(items().filter((item) => item.id !== id));
  }

  function edit(id: string, value: string) {
    void save(items().map((item) => (item.id === id ? { ...item, value } : item)));
  }

  function reorder(ids: string[]) {
    const byId = new Map(items().map((item) => [item.id, item]));
    void save(ids.flatMap((id) => byId.get(id) ?? []));
  }

  // A one-off reorder, saved like a drag, so the grouped order is shared
  // with every member rather than being a local view.
  function applyColors(next: ThemeColors) {
    setColors(next);
    void save(items());
  }

  function groupItemsByTag() {
    if (isSaving()) {
      toast.info("Still saving - try again in a moment");
      return;
    }
    const grouped = groupByTag(items());
    if (grouped.every((id, index) => id === items()[index]?.id)) {
      toast.info("Already grouped by tag");
      return;
    }
    reorder(grouped);
  }

  // Browser-only "recreate last deleted": the deleted value is captured as
  // the row goes, and re-added through the normal add path, so it returns as
  // a fresh item at the end of the list — hence "recreate", not "undo".
  const [lastDeletedValue, setLastDeletedValue] = createSignal<string | null>(null);

  function recreateLastDeleted() {
    const value = lastDeletedValue();
    if (!value) return;
    if (isSaving()) {
      toast.info("Still saving - try again in a moment");
      return;
    }
    setLastDeletedValue(null);
    const id = crypto.randomUUID();
    setPendingAdd({ id, value });
    void save(items(), { new: value, newId: id }).finally(() =>
      setPendingAdd((pending) => (pending?.id === id ? null : pending)),
    );
  }

  return (
    <Theme primary={colors()?.primary} secondary={colors()?.secondary}>
      <PageHeader
        compactBelow="27rem"
        actions={[
          <Link variant="outline" to="/lists/$list/style" params={{ list: slug() }}>
            <BrushIcon />
            <ActionLabel>Style</ActionLabel>
          </Link>,
          <Theme.Button onConfirm={applyColors} />,
          <Button variant="outline" type="button" onClick={groupItemsByTag}>
            <GroupIcon />
            <ActionLabel>Group by tag</ActionLabel>
          </Button>,
        ]}
      />

      <form
        class={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          add(newInput.value);
        }}
      >
        <ScrollArea>
          <Items
            items={items()}
            edited={edited()}
            isSaving={isSaving()}
            newItems={data().newItemIds}
            pendingItem={pendingAdd()}
            onReorderComplete={reorder}
            onDelete={setLastDeletedValue}
            onRemove={remove}
            onEdit={edit}
            tags={tags()}
            reorderable
          />
        </ScrollArea>

        <Actions>
          <div class={styles.actions}>
            <VisuallyHidden>
              <label for="new-item">New item</label>
            </VisuallyHidden>
            <input
              ref={newInput}
              id="new-item"
              autofocus
              autocomplete="off"
              class={styles.addInput}
            />
            <TagCombobox
              label="Tag"
              hideLabel
              placeholder="No tag"
              class={styles.addTag}
              inputClass={`${styles.addInput} ${styles.addTagInput}`}
              tags={tags()}
              value={newTag()}
              onChange={setNewTag}
              // Enter adds, like Enter in the item input.
              onEnter={() => addButton.form?.requestSubmit(addButton)}
            />
            <Button
              ref={addButton}
              type="submit"
              isSubmitting={pendingAdd() !== null}
              variant="solid"
              class={styles.addButton}
            >
              Add
            </Button>

            <Show when={lastDeletedValue()}>
              <Button variant="outline" onClick={recreateLastDeleted} class={styles.undoButton}>
                <VisuallyHidden>Recreate last deleted</VisuallyHidden>
                <svg aria-hidden="true" class={styles.undoIcon} viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 14L4 9L9 4"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M4 9H14.5C17.5376 9 20 11.4624 20 14.5C20 17.5376 17.5376 20 14.5 20H11"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </Button>
            </Show>
          </div>
        </Actions>
      </form>

      {/* The style dialog (routes/list/style.tsx), outside the list form. */}
      <Outlet />
    </Theme>
  );
}
