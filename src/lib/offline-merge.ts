export interface ListItemRef {
  id: string;
  value: string;
}

/**
 * Rebases locally-queued list edits onto freshly-fetched server state, so
 * concurrent changes from other devices survive reconnect sync instead of
 * being silently overwritten by a stale full-array replay. mutate_list (the
 * Postgres RPC list mutations go through) diffs the *entire submitted
 * items[] array* against live DB rows — anything active in the DB but
 * missing from what we submit gets soft-deleted — so resubmitting a snapshot
 * captured before we went offline would resurrect-delete anything added
 * concurrently.
 *
 * Bounded: we only assert authority over ids we ourselves touched (deleted,
 * edited, added, or reordered). Anything we didn't touch defers to `fresh`.
 */
export function rebaseListItems({
  baseline,
  desired,
  fresh,
}: {
  baseline: ListItemRef[];
  desired: ListItemRef[];
  fresh: ListItemRef[];
}): ListItemRef[] {
  const baselineById = new Map(baseline.map((item) => [item.id, item]));
  const desiredById = new Map(desired.map((item) => [item.id, item]));
  const freshIds = new Set(fresh.map((item) => item.id));

  const deletedByUs = new Set(
    baseline.filter((item) => !desiredById.has(item.id)).map((item) => item.id),
  );
  const addedByUs = desired.filter((item) => !baselineById.has(item.id));

  const merged: ListItemRef[] = fresh
    .filter((item) => !deletedByUs.has(item.id))
    .map((item) => {
      const ours = desiredById.get(item.id);
      const original = baselineById.get(item.id);
      const weEditedThis = ours && original && ours.value !== original.value;
      return weEditedThis ? { id: item.id, value: ours.value } : item;
    });

  for (const item of addedByUs) {
    if (!freshIds.has(item.id)) merged.push(item);
  }

  // Did we reorder? Compare the relative order of ids common to both
  // baseline and desired — if it changed, we take over ordering below.
  const baselineCommonOrder = baseline.map((item) => item.id).filter((id) => desiredById.has(id));
  const desiredCommonOrder = desired.map((item) => item.id).filter((id) => baselineById.has(id));
  const weReordered = baselineCommonOrder.join(",") !== desiredCommonOrder.join(",");

  if (!weReordered) return merged;

  const desiredIndex = new Map(desired.map((item, index) => [item.id, index]));
  const freshIndex = new Map(fresh.map((item, index) => [item.id, index]));
  const sortKeyFor = (id: string) =>
    desiredIndex.get(id) ?? freshIndex.get(id) ?? Number.MAX_SAFE_INTEGER;

  return [...merged].sort((a, b) => sortKeyFor(a.id) - sortKeyFor(b.id));
}
