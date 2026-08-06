import type { RefObject } from "react";
import type { SubmitFunction } from "react-router";

/**
 * Persistence strategies for `useReorderable`. Each factory returns the
 * `onReorder` / `onComplete` callbacks for a given way of saving order, so the
 * route only declares *what* it submits, not the drag plumbing.
 */

// Minimal structural type for Conform's `intent` so we don't couple to its
// internals — we only ever call `update`.
interface ReorderIntent {
  update: (options: { name: string; value: unknown }) => void;
}

/**
 * Persist via a Conform-managed form: update the items field live during the
 * drag, then submit the form once the gesture settles.
 */
export function reorderViaConform({
  fieldName,
  items,
  intent,
  submit,
  formRef,
}: {
  fieldName: string;
  items: Array<{ id: string; value: string }>;
  intent: ReorderIntent;
  submit: SubmitFunction;
  formRef: RefObject<HTMLFormElement | null>;
}) {
  return {
    onReorder(orderedIds: string[]) {
      const itemRecord = Object.fromEntries(items.map((item) => [item.id, item]));
      intent.update({ name: fieldName, value: orderedIds.map((id) => itemRecord[id]) });
    },
    onComplete() {
      // Wait for React to flush intent.update() before submitting.
      requestAnimationFrame(() => {
        if (formRef.current) {
          submit(formRef.current);
        }
      });
    },
  };
}

// Minimal structural type for Conform's `intent` so we don't couple to its
// internals — we only ever call `remove`.
interface RemoveIntent {
  remove: (options: { name: string; index: number }) => void;
}

/**
 * Persist a delete via a Conform-managed form: shrink the items field, then
 * submit. Callers must only invoke this once the item's exit animation has
 * already removed it from the DOM.
 *
 * Every item's live value is snapshotted from the DOM *before* intent.remove()
 * runs — at that point every field name still matches `items` 1:1, since
 * nothing has been renumbered yet. This preserves any unsaved edit on another
 * row (the whole array — not just the one being deleted — gets persisted by
 * this same submission; see integration-tests/list.spec.ts's "edited icon"
 * test) while sidestepping a real race: AnimatePresence unmounts the outgoing
 * row on its own schedule, independent of Conform's synchronous array-shrink,
 * so a read taken *after* intent.remove() can still find the just-vacated
 * field name claimed by both the stale outgoing node and the sibling
 * renumbered into it, corrupting whichever the browser serializes last
 * (observed in CI as the recreated item's slot silently losing its id and
 * value — see the same file's recreate test). Reading first and mutating
 * second avoids that window entirely rather than racing it.
 */
export function removeViaConform({
  fieldName,
  items,
  intent,
  submit,
  formRef,
}: {
  fieldName: string;
  items: Array<{ id: string; value: string }>;
  intent: RemoveIntent;
  submit: SubmitFunction;
  formRef: RefObject<HTMLFormElement | null>;
}) {
  return function onRemove(index: number) {
    const formElement = formRef.current;
    if (!formElement) {
      intent.remove({ name: fieldName, index });
      return;
    }

    const formData = new FormData(formElement);
    const liveValues = items.map(
      (item, i) => String(formData.get(`${fieldName}[${i}].value`) ?? "") || item.value,
    );

    intent.remove({ name: fieldName, index });

    const itemFieldPattern = new RegExp(`^${fieldName}\\[\\d+\\]\\.(id|value)$`);
    for (const key of Array.from(formData.keys())) {
      if (itemFieldPattern.test(key)) {
        formData.delete(key);
      }
    }
    let position = 0;
    items.forEach((item, i) => {
      if (i === index) return;
      formData.append(`${fieldName}[${position}].id`, item.id);
      formData.append(`${fieldName}[${position}].value`, liveValues[i]);
      position += 1;
    });

    submit(formData, { method: "POST" });
  };
}

/**
 * Persist via a freshly-built FormData submission carrying an intent and the
 * ordered ids (used by routes without a Conform field for the list, e.g. home).
 */
export function reorderViaFormData({
  submit,
  intent,
  fieldName,
  method = "post",
}: {
  submit: SubmitFunction;
  intent: string;
  fieldName: string;
  method?: "post" | "get";
}) {
  return {
    onComplete(orderedIds: string[]) {
      requestAnimationFrame(() => {
        const formData = new FormData();
        formData.set("intent", intent);
        orderedIds.forEach((id) => formData.append(fieldName, id));
        submit(formData, { method });
      });
    },
  };
}
