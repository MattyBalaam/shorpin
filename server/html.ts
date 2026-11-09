import { html as honoHtml, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

export { raw };

/** What every view returns: escaped HTML, possibly still resolving. */
export type Html = HtmlEscapedString | Promise<HtmlEscapedString>;

// Templates are indented for reading. The indentation in their static text
// is collapsed once per template (whitespace runs render as one space
// anyway); interpolated values — user text included — are left exactly as
// they are, so a multi-line item keeps its line breaks.
const compacted = new WeakMap<TemplateStringsArray, TemplateStringsArray>();

function compact(strings: TemplateStringsArray) {
  let result = compacted.get(strings);
  if (!result) {
    const parts = strings.map((part) => part.replace(/\n\s+/g, "\n"));
    result = Object.assign(parts, { raw: parts }) as unknown as TemplateStringsArray;
    compacted.set(strings, result);
  }
  return result;
}

/** Hono's escaping html tag, with template indentation collapsed. */
export function html(strings: TemplateStringsArray, ...values: unknown[]): Html {
  return honoHtml(compact(strings), ...values);
}

/** Joins class names, skipping falsy ones. */
export function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(" ");
}
