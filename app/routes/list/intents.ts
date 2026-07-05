export const ADD_ITEM_INTENT = "add-item";
const DELETE_PREFIX = "delete-item-";
const UNDELETE_PREFIX = "undelete-item-";

export function deleteItemIntent(id: string) {
  return `${DELETE_PREFIX}${id}`;
}

export function undeleteItemIntent(id: string) {
  return `${UNDELETE_PREFIX}${id}`;
}

export function isAddItemIntent(intent: string | null | undefined) {
  return intent === ADD_ITEM_INTENT;
}

export function isDeleteItemIntent(intent: string | null | undefined) {
  return intent?.startsWith(DELETE_PREFIX) ?? false;
}

export function isUndeleteItemIntent(intent: string | null | undefined) {
  return intent?.startsWith(UNDELETE_PREFIX) ?? false;
}
