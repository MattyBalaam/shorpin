// Home's offline support: the cached lists, and the queue of creates and
// reorders made offline. React Router split this between a clientLoader and
// a clientAction; here the loader and the page's handlers call it directly.

import { isServer } from "@solidjs/web";
import { isRedirect } from "@tanstack/solid-router";
import { readDefaultListId } from "~/lib/default-list";
import { pairsToFormData } from "~/lib/form-data-codec";
import { isNetworkOrServerError } from "~/lib/network-error";
import {
  dequeueMutations,
  enqueueMutation,
  getHomeSnapshot,
  type HomeSnapshot,
  listQueuedMutations,
  putHomeSnapshot,
} from "~/lib/offline-store.client";
import { resolveSlug, slugify } from "~/lib/slugify";
import { createList, getHome, type HomeData, reorderLists } from "./home.functions";
import type { ListItem } from "./home.schema";

export type HomeLoaderData = HomeData & { fromCache: boolean };

// Queued entries keep the shape React Router posted to `/`, so the service
// worker's Background Sync backstop (see legacy/sw.ts) can still replay them.
const HOME_ROUTE = "/";
const CREATE_FIELD = "new-list";
const ORDER_FIELD = "list-order";

function fromSnapshot(snapshot: HomeSnapshot<ListItem>): HomeLoaderData {
  return {
    userId: snapshot.userId,
    lists: snapshot.lists,
    defaultListId: readDefaultListId(document.cookie),
    waitlistCount: snapshot.waitlistCount,
    // Not cached: offline, the style cookie is the latest word.
    accountAppStyle: null,
    fromCache: true,
  };
}

/**
 * The home loader. Isomorphic, like the list's: the server just fetches; in
 * the browser a failed fetch falls back to the cached lists, and fresh data
 * is cached for next time. While a queued offline change hasn't synced yet,
 * the cached lists (with their pending rows) win over the server's, so the
 * page doesn't lose them until the replay lands.
 */
export async function loadHome(): Promise<HomeLoaderData> {
  if (isServer) return { ...(await getHome()), fromCache: false };

  const cached = await getHomeSnapshot<ListItem>();
  if (!navigator.onLine && cached) return fromSnapshot(cached);

  try {
    const fresh = await getHome();
    const queued = await listQueuedMutations("home");
    if (queued.length > 0 && cached) {
      return { ...fresh, lists: cached.lists, fromCache: false };
    }
    await cacheHome(fresh);
    return { ...fresh, fromCache: false };
  } catch (error) {
    if (isNetworkOrServerError(error) && cached) return fromSnapshot(cached);
    throw error;
  }
}

/** Caches fresh server data, e.g. after the first (server-rendered) load. */
export async function cacheHome(fresh: HomeData) {
  await putHomeSnapshot<ListItem>({
    id: "home",
    userId: fresh.userId,
    updatedKey: Date.now(),
    lists: fresh.lists,
    waitlistCount: fresh.waitlistCount,
    cachedAt: Date.now(),
  });
}

/** Where an offline launch lands: the starred list, if it's cached. */
export async function offlineLaunchSlug() {
  const id = readDefaultListId(document.cookie);
  const snapshot = await getHomeSnapshot<ListItem>();
  return snapshot?.lists.find((list) => list.id === id && !list.pending)?.slug ?? null;
}

/** Queues a create made offline, and returns the pending row to show. */
export async function queueCreate(name: string, userId: string): Promise<ListItem> {
  const cached = await getHomeSnapshot<ListItem>();
  const existingSlugs = (cached?.lists ?? []).map((list) => list.slug);
  const pendingList: ListItem = {
    id: crypto.randomUUID(),
    name,
    slug: resolveSlug(slugify(name), existingSlugs),
    user_id: userId,
    unreadCount: 0,
    totalCount: 0,
    pending: true,
  };

  if (cached) await putHomeSnapshot({ ...cached, lists: [pendingList, ...cached.lists] });

  // Creation is append-only and slugs are de-duplicated server-side, so
  // (unlike list-item mutations) queued creates can just replay in order —
  // no rebase needed.
  await enqueueMutation({
    route: HOME_ROUTE,
    routeKey: "home",
    kind: "create-list",
    fields: [[CREATE_FIELD, name]],
    clientId: "",
  });

  return pendingList;
}

/** Queues a reorder made offline, replacing any earlier one. */
export async function queueReorder(order: string[]) {
  const cached = await getHomeSnapshot<ListItem>();
  if (cached) {
    const byId = new Map(cached.lists.map((list) => [list.id, list]));
    await putHomeSnapshot({ ...cached, lists: order.flatMap((id) => byId.get(id) ?? []) });
  }

  // Only the latest reorder matters: reorderLists updates each row's
  // sort_order independently (no diff against a submitted array like the
  // list's mutate_list), so it structurally can't resurrect or delete
  // anything — last-write-wins is correct here, not just simpler.
  const queued = await listQueuedMutations("home");
  const priorReorders = queued.filter((entry) => entry.kind === "reorder-lists");
  if (priorReorders.length > 0) await dequeueMutations(priorReorders.map(({ seq }) => seq));

  await enqueueMutation({
    route: HOME_ROUTE,
    routeKey: "home",
    kind: "reorder-lists",
    fields: order.map((id) => [ORDER_FIELD, id]),
    clientId: "",
  });
}

export type ReplayOutcome = "done" | "nothing" | "offline" | { redirect: unknown };

/**
 * Replays the queue in order, dropping each entry once the server has
 * answered it. Stops, leaving the rest queued, if the connection drops
 * again or a stale session redirects to /login (the caller follows that).
 */
export async function replayQueue(): Promise<ReplayOutcome> {
  const queued = await listQueuedMutations("home");
  if (queued.length === 0) return "nothing";

  for (const entry of queued) {
    const fields = pairsToFormData(entry.fields);
    try {
      if (entry.kind === "create-list") {
        // A form error (e.g. the name became invalid) won't succeed on a
        // retry either, so it still counts as answered.
        await createList({ data: { [CREATE_FIELD]: String(fields.get(CREATE_FIELD) ?? "") } });
      } else if (entry.kind === "reorder-lists") {
        await reorderLists({ data: { order: fields.getAll(ORDER_FIELD).map(String) } });
      }
    } catch (error) {
      if (isRedirect(error)) return { redirect: error };
      if (isNetworkOrServerError(error)) return "offline";
      throw error;
    }
    await dequeueMutations([entry.seq]);
  }

  return "done";
}
