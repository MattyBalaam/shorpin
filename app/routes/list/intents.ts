import { defineIntent } from "@conform-to/react/future";

export const ADD_ITEM_INTENT = "add-item";

// Dispatched via a plain submit button (name="__INTENT__" value={ADD_ITEM_INTENT}).
// With no args, Conform's transport format is the bare type string ("add-item"),
// so parse() is called with no arguments.
export const addItemIntent = defineIntent({
  parse() {
    return {};
  },
});

export const DELETE_ITEM_INTENT = "delete-item";

// Dispatched imperatively via the form's intent dispatcher (useIntent(formId)["delete-item"](id)),
// which serializes to `delete-item("<uuid>")` — a fixed type name with the id as a transport
// arg, since Conform resolves custom intents by an exact type-name lookup (no wildcard support
// for a dynamic per-item type like the old "delete-item-<uuid>").
export const deleteItemIntent = defineIntent<(id: string) => void, { id: string }>({
  parse(id) {
    return { id };
  },
});

const DELETE_ITEM_PREFIX = `${DELETE_ITEM_INTENT}("`;
const DELETE_ITEM_SUFFIX = '")';

export function isDeleteItemIntent(intent: string | null | undefined) {
  return (intent ?? "").startsWith(DELETE_ITEM_PREFIX);
}

// Reads the item id back out of a raw `__INTENT__` field value (e.g. from
// navigation.formData) without re-parsing the whole submission — mirrors the
// wire format Conform's dispatcher produces for the "delete-item" intent above.
export function deleteItemIdFromIntent(intent: string | null | undefined): string | null {
  if (!intent || !intent.startsWith(DELETE_ITEM_PREFIX) || !intent.endsWith(DELETE_ITEM_SUFFIX)) {
    return null;
  }
  return intent.slice(DELETE_ITEM_PREFIX.length, -DELETE_ITEM_SUFFIX.length);
}
