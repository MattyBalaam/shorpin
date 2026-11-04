// An item's optional tag is stored inside its value as a trailing `[tag]`
// (e.g. "Milk [dairy]"), so tags need no schema change and survive every
// existing path that carries a value: add, edit, undo, offline replay.

const trailingTag = /^(?<text>.*?)\s*\[(?<tag>[^[\]]*)\]\s*$/s;

export function parseItemTag(value: string) {
  const match = trailingTag.exec(value);
  const text = match?.groups?.text.trim() ?? "";
  const tag = match?.groups?.tag.trim() ?? "";

  // A value that's only "[tag]" (or has an empty "[]") isn't tagged — show it
  // as typed rather than as an empty item.
  if (!text || !tag) return { text: value.trim(), tag: null };

  return { text, tag };
}

export function formatItemTag(text: string, tag: string | null) {
  const cleanText = text.trim();
  // Brackets would end the tag early, or start a second one.
  const cleanTag = tag?.replace(/[[\]]/g, "").trim();
  return cleanTag ? `${cleanText} [${cleanTag}]` : cleanText;
}

// Orders items so each tag's items sit together. Groups keep the order of
// their first item, and items keep their order within a group, so the user's
// own arrangement survives and grouping an already grouped list is a no-op.
// Untagged items form a group of their own, like any tag.
export function groupByTag<Item extends { id: string; value: string }>(items: Item[]) {
  const groups = Map.groupBy(items, (item) => parseItemTag(item.value).tag);
  return [...groups.values()].flat().map((item) => item.id);
}

// Every tag in use, once each and alphabetically, for the tag pickers.
export function listTags(items: Array<{ value: string }>) {
  const tags = new Set(
    items.map((item) => parseItemTag(item.value).tag).filter((tag) => tag !== null),
  );
  return [...tags].sort((a, b) => a.localeCompare(b));
}

// Adds a picked tag to a typed value, unless the value already has its own
// `[tag]`, which wins as the more specific choice.
export function withPickedTag(value: string, pickedTag: string) {
  if (!value.trim() || !pickedTag || parseItemTag(value).tag) return value;
  return formatItemTag(value, pickedTag);
}
