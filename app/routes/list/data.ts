import * as v from "valibot";

const zItem = v.object({
  id: v.pipe(v.string(), v.uuid()),
  value: v.string(),
});

const zData = v.object({
  ...zItem.entries,
  state: v.picklist(["deleted", "active"] as const),
  updatedAt: v.number(),
  sortOrder: v.number(),
});

export const zItems = v.array(zData);

export type Items = v.InferOutput<typeof zItems>;

export const zList = v.object({
  name: v.string(),
  new: v.optional(v.string()),
  // Not rendered as its own form field — only ever populated
  // programmatically by list.tsx's performRebaseSync, to carry every
  // addition queued during an offline session (see mutate_list migration
  // 20260806000000). `new` remains the single-value field for the everyday
  // online add.
  newItems: v.optional(v.array(v.string()), []),
  // Parallel to newItems: each addition's client-generated id, so the server
  // can use it as the row id and ignore a replay of an addition it already
  // applied (see mutate_list migration 20261011000000).
  newItemIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
  // Client-generated id for the everyday `new` add, so an add whose response
  // was lost (and so got queued offline too) can't be applied twice — see
  // list.server.ts's toIdempotentAdd.
  newId: v.optional(v.pipe(v.string(), v.uuid())),
  items: v.optional(v.array(zItem), []),
  // Set by a hidden input on every submission from a client that names its
  // deletions in `deletedIds`. Without it the submission is from an older
  // client, whose deletions mutate_list still infers from what's missing
  // from `items` (see list.server.ts's toRpcPayload).
  explicitDeletes: v.optional(v.literal("true")),
  // Ids this submission deletes. Rows missing from `items` are otherwise
  // kept: they're ones this client hasn't seen yet (migration 20261111000000).
  deletedIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
  themePrimary: v.optional(v.string()),
  themeSecondary: v.optional(v.string()),
});

export const sortData = (items: Items) => items.sort((a, b) => a.sortOrder - b.sortOrder);
