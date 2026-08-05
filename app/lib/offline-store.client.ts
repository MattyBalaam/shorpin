import type { SerializedFormData } from "./form-data-codec";
import { requestToPromise, STORES, tx } from "./idb.client";
import type { ListItemRef } from "./offline-merge";

export interface HomeSnapshot<TListItem = unknown> {
  id: "home";
  userId: string;
  updatedKey: number;
  lists: TListItem[];
  waitlistCount: number;
  cachedAt: number;
}

export interface ListSnapshot<TLoaderData = unknown> {
  slug: string;
  listId: string;
  /** Last successful loader payload, cached verbatim for offline reads. */
  serverData: TLoaderData;
  /** id/value projection of serverData's items, frozen the moment we go offline. */
  baseline: ListItemRef[];
  baselineFetchedAt: number;
  /** Net local edits — what we'd submit right now if asked to. */
  desired: ListItemRef[];
  cachedAt: number;
}

export type QueuedMutationKind = "list-mutate" | "create-list" | "reorder-lists";

export interface QueuedMutation {
  seq: number;
  route: string;
  routeKey: "home" | `list:${string}`;
  kind: QueuedMutationKind;
  fields: SerializedFormData;
  clientId: string;
  queuedAt: number;
}

export async function getHomeSnapshot<TListItem>(): Promise<HomeSnapshot<TListItem> | undefined> {
  return tx(STORES.homeCache, "readonly", (transaction) =>
    requestToPromise(
      transaction.objectStore(STORES.homeCache).get("home") as IDBRequest<
        HomeSnapshot<TListItem> | undefined
      >,
    ),
  );
}

export async function putHomeSnapshot<TListItem>(snapshot: HomeSnapshot<TListItem>): Promise<void> {
  await tx(STORES.homeCache, "readwrite", (transaction) => {
    transaction.objectStore(STORES.homeCache).put(snapshot);
  });
}

export async function getListSnapshot<TLoaderData>(
  slug: string,
): Promise<ListSnapshot<TLoaderData> | undefined> {
  return tx(STORES.listSnapshots, "readonly", (transaction) =>
    requestToPromise(
      transaction.objectStore(STORES.listSnapshots).get(slug) as IDBRequest<
        ListSnapshot<TLoaderData> | undefined
      >,
    ),
  );
}

export async function putListSnapshot<TLoaderData>(
  snapshot: ListSnapshot<TLoaderData>,
): Promise<void> {
  await tx(STORES.listSnapshots, "readwrite", (transaction) => {
    transaction.objectStore(STORES.listSnapshots).put(snapshot);
  });
}

export async function updateListDesired(slug: string, desired: ListItemRef[]): Promise<void> {
  await tx(STORES.listSnapshots, "readwrite", async (transaction) => {
    const store = transaction.objectStore(STORES.listSnapshots);
    const existing = await requestToPromise(
      store.get(slug) as IDBRequest<ListSnapshot | undefined>,
    );
    if (!existing) return;
    store.put({ ...existing, desired });
  });
}

/**
 * Pins `baseline` for future reconnect rebases. No-op if no snapshot exists
 * yet for this slug — callers should have already run `putListSnapshot` at
 * least once (e.g. from a successful clientLoader fetch).
 */
export async function freezeListBaseline(slug: string, baseline: ListItemRef[]): Promise<void> {
  await tx(STORES.listSnapshots, "readwrite", async (transaction) => {
    const store = transaction.objectStore(STORES.listSnapshots);
    const existing = await requestToPromise(
      store.get(slug) as IDBRequest<ListSnapshot | undefined>,
    );
    if (!existing) return;
    store.put({ ...existing, baseline, baselineFetchedAt: Date.now() });
  });
}

export async function enqueueMutation(
  entry: Omit<QueuedMutation, "seq" | "queuedAt">,
): Promise<number> {
  return tx(STORES.mutationQueue, "readwrite", (transaction) =>
    requestToPromise(
      transaction.objectStore(STORES.mutationQueue).add({
        ...entry,
        queuedAt: Date.now(),
      }) as IDBRequest<number>,
    ),
  );
}

export async function listQueuedMutations(routeKey?: string): Promise<QueuedMutation[]> {
  return tx(STORES.mutationQueue, "readonly", (transaction) => {
    const store = transaction.objectStore(STORES.mutationQueue);
    const source = routeKey
      ? (store.index("routeKey").getAll(routeKey) as IDBRequest<QueuedMutation[]>)
      : (store.getAll() as IDBRequest<QueuedMutation[]>);
    return requestToPromise(source);
  });
}

export async function dequeueMutations(seqs: number[]): Promise<void> {
  await tx(STORES.mutationQueue, "readwrite", (transaction) => {
    const store = transaction.objectStore(STORES.mutationQueue);
    for (const seq of seqs) store.delete(seq);
  });
}

/**
 * Drains whatever's queued for `routeKey` via `replay`, dequeuing only on
 * success. `replay` receives the full grouped batch so route-specific
 * callers can decide how to collapse it (e.g. list.tsx rebases onto a single
 * submission; home.tsx's create-list replays every row in order).
 */
export async function drainQueueForRoute(
  routeKey: string,
  replay: (grouped: QueuedMutation[]) => Promise<"ok" | "retry-later">,
): Promise<void> {
  const grouped = await listQueuedMutations(routeKey);
  if (grouped.length === 0) return;

  const outcome = await replay(grouped);
  if (outcome === "ok") {
    await dequeueMutations(grouped.map((entry) => entry.seq));
  }
}
