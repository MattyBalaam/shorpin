const DELETE_PREFIX = "delete-item-";
const UNDELETE_PREFIX = "undelete-item-";

export function deleteItemIntent(id: string) {
  return `${DELETE_PREFIX}${id}`;
}

export function undeleteItemIntent(id: string) {
  return `${UNDELETE_PREFIX}${id}`;
}

export function isDeleteItemIntent(intent: string | null | undefined): boolean {
  return intent?.startsWith(DELETE_PREFIX) ?? false;
}

export function isUndeleteItemIntent(intent: string | null | undefined): boolean {
  return intent?.startsWith(UNDELETE_PREFIX) ?? false;
}

export function parseDeleteItemIntent(intent: string | null | undefined): string | undefined {
  return isDeleteItemIntent(intent) ? intent!.slice(DELETE_PREFIX.length) : undefined;
}

export function parseUndeleteItemIntent(intent: string | null | undefined): string | undefined {
  return isUndeleteItemIntent(intent) ? intent!.slice(UNDELETE_PREFIX.length) : undefined;
}
