import { parseSubmission, report } from "@conform-to/react/future";
import { toast } from "sonner";
import * as v from "valibot";

import { formDataToPairs } from "~/lib/form-data-codec";
import {
  dequeueMutations,
  enqueueMutation,
  getHomeSnapshot,
  listQueuedMutations,
  putHomeSnapshot,
} from "~/lib/offline-store.client";
import { resolveSlug, slugify } from "~/lib/slugify";
import type { Route } from "./+types/home";
import { type ListItem, REORDER_LISTS_INTENT, zCreate } from "./home.schema";

export async function clientAction({ request, serverAction }: Route.ClientActionArgs) {
  if (navigator.onLine) return serverAction();

  const formData = await request.formData();

  if (formData.get("intent") === REORDER_LISTS_INTENT) {
    const orderedIds = formData.getAll("list-order").map(String);
    const cached = await getHomeSnapshot<ListItem>();

    if (cached) {
      const byId = new Map(cached.lists.map((list) => [list.id, list]));
      const reordered = orderedIds
        .map((id) => byId.get(id))
        .filter((list): list is ListItem => Boolean(list));
      await putHomeSnapshot({ ...cached, lists: reordered });
    }

    // Only the latest reorder matters: home.server.ts's reorder branch
    // updates each row's sort_order independently (no diff against a
    // submitted array like list.tsx's mutate_list), so it structurally
    // can't resurrect or delete anything — last-write-wins is correct here,
    // not just simpler. Collapse the queue to the latest attempt.
    const queued = await listQueuedMutations("home");
    const priorReorders = queued.filter((entry) => entry.kind === "reorder-lists");
    if (priorReorders.length > 0) {
      await dequeueMutations(priorReorders.map((entry) => entry.seq));
    }

    await enqueueMutation({
      route: request.url,
      routeKey: "home",
      kind: "reorder-lists",
      fields: formDataToPairs(formData),
      clientId: "",
    });

    return null;
  }

  const submission = parseSubmission(formData);
  const result = v.safeParse(zCreate, submission.payload);

  if (!result.success) {
    return report(submission, { error: { issues: result.issues } });
  }

  const listName = result.output["new-list"];
  const cached = await getHomeSnapshot<ListItem>();
  const existingSlugs = (cached?.lists ?? []).map((list) => list.slug);
  const slug = resolveSlug(slugify(listName), existingSlugs);

  const pendingList: ListItem = {
    id: crypto.randomUUID(),
    name: listName,
    slug,
    user_id: cached?.userId ?? "",
    unreadCount: 0,
    totalCount: 0,
    pending: true,
  };

  if (cached) {
    await putHomeSnapshot({ ...cached, lists: [pendingList, ...cached.lists] });
  }

  // Creation is append-only and slugs are de-duplicated server-side, so
  // (unlike list-item mutations) queued creates can just replay verbatim in
  // order — no rebase needed.
  await enqueueMutation({
    route: request.url,
    routeKey: "home",
    kind: "create-list",
    fields: formDataToPairs(formData),
    clientId: "",
  });

  toast.info("You're offline - list will be created when back online");

  // The online action redirects into the new list once the server confirms
  // a real slug. Offline there's nothing to redirect into yet, so stay on
  // `/` (the pending row above stands in) and reset the form for reuse.
  return report(submission, { reset: true });
}
