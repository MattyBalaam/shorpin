// FormData isn't structured-clone-safe, so queued offline submissions are
// serialized as key/value pairs (not a plain object — some forms repeat a
// key, e.g. home's `list-order`, which an object would collapse) before
// being written to IndexedDB, and rebuilt on replay.

export type SerializedFormData = Array<[string, string]>;

export function formDataToPairs(formData: FormData): SerializedFormData {
  const pairs: SerializedFormData = [];

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") {
      throw new Error(`form-data-codec: expected a string value for "${key}", got a File`);
    }
    pairs.push([key, value]);
  }

  return pairs;
}

export function pairsToFormData(pairs: SerializedFormData): FormData {
  const formData = new FormData();
  for (const [key, value] of pairs) {
    formData.append(key, value);
  }
  return formData;
}
