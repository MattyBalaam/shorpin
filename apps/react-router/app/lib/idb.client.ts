// Small promisifying wrapper around IndexedDB — deliberately hand-rolled
// rather than pulling in a dependency like `idb`: one schema version, only
// get/put/delete/cursor/index operations, no versioned migrations yet.

const DB_NAME = "shorpin-offline";
const DB_VERSION = 1;

export const STORES = {
  homeCache: "home-cache",
  listSnapshots: "list-snapshots",
  mutationQueue: "mutation-queue",
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORES.homeCache)) {
        db.createObjectStore(STORES.homeCache, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.listSnapshots)) {
        db.createObjectStore(STORES.listSnapshots, { keyPath: "slug" });
      }
      if (!db.objectStoreNames.contains(STORES.mutationQueue)) {
        const queueStore = db.createObjectStore(STORES.mutationQueue, {
          keyPath: "seq",
          autoIncrement: true,
        });
        queueStore.createIndex("routeKey", "routeKey");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Runs `run` inside a transaction over `storeNames`, resolving once the
 * transaction completes. `run` should only issue IDBRequests (optionally
 * awaited via `requestToPromise`) without yielding to unrelated async work —
 * an IndexedDB transaction auto-commits once its request queue empties.
 */
export async function tx<T>(
  storeNames: StoreName | StoreName[],
  mode: IDBTransactionMode,
  run: (transaction: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, mode);
    let result: T;

    Promise.resolve(run(transaction))
      .then((value) => {
        result = value;
      })
      .catch(reject);

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}
