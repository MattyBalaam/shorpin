// Applies a server-rendered page to the current one without navigating:
// every element marked `data-swap` is replaced by the element with the same
// id in the new page (or removed when the new page doesn't have one). The
// server always renders whole pages; this just keeps focus, scroll and
// in-progress typing where they are. The notification panel isn't swapped
// (it holds the script's own notifications); a flash in the new page joins
// them instead.
import { readFlash, toast } from "./toast.ts";

export function swapFrom(markup: string) {
  const next = new DOMParser().parseFromString(markup, "text/html");
  const apply = () => {
    for (const current of document.querySelectorAll<HTMLElement>("[data-swap]")) {
      const replacement = next.getElementById(current.id);
      if (replacement) current.replaceWith(document.adoptNode(replacement));
      else current.replaceChildren();
    }
  };
  const flash = readFlash(next);
  if (flash) toast(flash.type, flash.message);
  if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return document.startViewTransition(apply).updateCallbackDone;
  }
  apply();
  return Promise.resolve();
}

/** Re-fetches the current page and swaps it in. */
export async function refresh() {
  const response = await fetch(location.href, { headers: { "X-Enhance": "1" } });
  if (response.ok) await swapFrom(await response.text());
}
