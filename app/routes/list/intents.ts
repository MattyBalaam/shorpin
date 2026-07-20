import type { IntentHandler } from "@conform-to/react/future";

export const ADD_ITEM_INTENT = "add-item";

export const addItemIntent: IntentHandler = {
  parse([formData]) {
    const submitter = formData.get("__INTENT__");
    if (submitter === ADD_ITEM_INTENT) {
      return {};
    }
    throw new Error("Not an add-item intent");
  },
};

const DELETE_PREFIX = "delete-item-";

export function deleteItemIntent(id: string) {
  return `${DELETE_PREFIX}${id}`;
}

export const deleteItemIntentHandler: IntentHandler = {
  parse([formData]) {
    const submitter = formData.get("__INTENT__");
    if (typeof submitter === "string" && submitter?.startsWith(DELETE_PREFIX)) {
      return { id: submitter.slice(DELETE_PREFIX.length) };
    }
    throw new Error("Not a delete-item intent");
  },
};

export function isAddItemIntent(intent: string | null | undefined) {
  return intent === ADD_ITEM_INTENT;
}

export function isDeleteItemIntent(intent: string | null | undefined) {
  return intent?.startsWith(DELETE_PREFIX) ?? false;
}
