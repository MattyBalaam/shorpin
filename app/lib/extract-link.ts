import type { LinkifyIt } from "linkify-it";
import { useSyncExternalStore } from "react";

// linkify-it (~5 KB gzipped) is loaded after the list has hydrated, rather
// than with the list route's chunk. Until then there are no links: the
// server snapshot is null, so hydration matches the server's HTML, and rows
// with a link gain their "Open link" button once it's loaded.
let linkify: LinkifyIt | null = null;
let loading = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loading) {
    loading = true;
    void import("linkify-it").then(({ LinkifyIt }) => {
      linkify = new LinkifyIt();
      for (const notify of listeners) notify();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

function firstLink(matcher: LinkifyIt, text: string): string | null {
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

/** The first link in `text`, or null (always null until linkify-it has loaded). */
export function useFirstLink(text: string): string | null {
  const matcher = useSyncExternalStore(
    subscribe,
    () => linkify,
    () => null,
  );
  return matcher ? firstLink(matcher, text) : null;
}
