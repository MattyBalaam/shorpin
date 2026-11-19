import { useNavigation } from "react-router";

/** Field name a submit button uses to identify itself in the submission. */
export const SUBMIT_ACTION = "submitAction";

/**
 * True only while the pending navigation was submitted by the button carrying
 * `name={SUBMIT_ACTION} value={submitAction}` — not by any other submission on
 * the page (deletes, reorders, theme saves, offline sync, a nested modal…).
 * The submitter's name/value is part of `navigation.formData`, so this needs
 * no extra state.
 */
export function useIsSubmitting(submitAction: string) {
  const { state, formData } = useNavigation();
  return state === "submitting" && formData?.get(SUBMIT_ACTION) === submitAction;
}
