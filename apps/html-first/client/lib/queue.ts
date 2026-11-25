// The offline queue: form posts the service worker couldn't deliver, kept in
// IndexedDB until they can be replayed in order. Shared by sw.ts (which
// writes and replays it) and the pages (which only read its length).

export interface QueuedPost {
  seq?: number;
  url: string;
  body: string;
  queuedAt: number;
}

const DB = "shorpin-offline";
const STORE = "posts";

function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      // v1 belonged to the React app's stores; nothing in it is replayable.
      for (const name of Array.from(db.objectStoreNames)) db.deleteObjectStore(name);
      db.createObjectStore(STORE, { keyPath: "seq", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const enqueue = (post: QueuedPost) => run("readwrite", (store) => store.add(post));
export const listQueued = () => run<QueuedPost[]>("readonly", (store) => store.getAll());
export const dequeue = (seq: number) => run("readwrite", (store) => store.delete(seq));

/** Posts that change data and are safe to replay later. */
export function isQueueable(pathname: string) {
  return (
    /^\/lists\/[^/]+\/items$/.test(pathname) || pathname === "/" || pathname === "/lists-order"
  );
}

export interface ReplayResult {
  sent: number;
  /** Stopped by a lapsed session: what's left waits for a sign-in. */
  signedOut: boolean;
}

let replaying: Promise<ReplayResult> | null = null;

/**
 * Sends queued posts in order and says how many went; stops at the first
 * that can't go yet (still offline, or a lapsed session — kept for after
 * signing back in). Runs in the service worker or, when no worker is in
 * control yet, in the page.
 */
export function replayQueue() {
  replaying ??= (async () => {
    let sent = 0;
    let signedOut = false;
    try {
      for (const post of await listQueued()) {
        let response: Response;
        try {
          response = await fetch(post.url, {
            method: "POST",
            body: post.body,
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "X-Enhance": "1",
              // Tells the service worker not to queue it a second time.
              "X-Replay": "1",
            },
          });
        } catch {
          break;
        }
        if (response.status === 401 || new URL(response.url).pathname === "/login") {
          signedOut = true;
          break;
        }
        if (post.seq !== undefined) await dequeue(post.seq);
        sent++;
      }
    } finally {
      replaying = null;
    }
    return { sent, signedOut };
  })();
  return replaying;
}
