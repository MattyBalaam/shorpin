import { isServer } from "@solidjs/web";
import type { LinkifyIt } from "linkify-it";
import { createSignal } from "solid-js";

// linkify-it (~5 KB gzipped) is loaded after the list has hydrated, rather
// than with the list page's chunk. Until then there are no links, on the
// server too, so the first client render matches the server's; rows with a
// link gain their "Open link" button once it's loaded. It's reactive, so
// callers re-run then.
const [linkify, setLinkify] = createSignal<LinkifyIt | null>(null);
let loading = false;

function loadLinkify() {
  if (isServer || loading) return;
  loading = true;
  void import("linkify-it").then(({ LinkifyIt }) => setLinkify(new LinkifyIt()));
}

export function getFirstLink(text: string): string | null {
  const matcher = linkify();
  if (!matcher) {
    loadLinkify();
    return null;
  }

  const [match] = matcher.match(text) ?? [];

  if (!match) {
    return null;
  }

  try {
    return new URL(match.url).toString();
  } catch {
    return null;
  }
}
