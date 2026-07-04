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
