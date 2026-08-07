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

// The Background Sync API isn't part of TypeScript's built-in DOM lib.
interface SyncManager {
  register(tag: string): Promise<void>;
}

export async function enqueueMutation(
  entry: Omit<QueuedMutation, "seq" | "queuedAt">,
): Promise<number> {
  const seq = await tx(STORES.mutationQueue, "readwrite", (transaction) =>
    requestToPromise(
      transaction.objectStore(STORES.mutationQueue).add({
        ...entry,
        queuedAt: Date.now(),
      }) as IDBRequest<number>,
    ),
  );

  // Best-effort backstop so a queued mutation can still drain (for the
  // simple kinds app/sw.ts's `sync` listener handles) even if the tab
  // closes before reconnecting. No effect on Safari/iOS (no SyncManager
  // there) — the `online` event listener (useIsOnline) remains the primary,
  // universal trigger regardless. Deliberately NOT awaited: the mutation is
  // already durably queued above, and navigator.serviceWorker.ready has no
  // bound on how long it can take to settle — awaiting it here would let a
  // purely best-effort registration step stall the actual offline write.
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    navigator.serviceWorker.ready
      .then((registration) =>
        (registration as ServiceWorkerRegistration & { sync: SyncManager }).sync.register(
          "drain-mutation-queue",
        ),
      )
      .catch(() => {
        // Best-effort only.
      });
  }

  return seq;
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
 * Wipes all three stores — used on logout so a shared device doesn't leak
 * one account's cached lists/queued edits into the next session.
 */
export async function clearAllOfflineData(): Promise<void> {
  await tx(
    [STORES.homeCache, STORES.listSnapshots, STORES.mutationQueue],
    "readwrite",
    (transaction) => {
      transaction.objectStore(STORES.homeCache).clear();
      transaction.objectStore(STORES.listSnapshots).clear();
      transaction.objectStore(STORES.mutationQueue).clear();
    },
  );
}
