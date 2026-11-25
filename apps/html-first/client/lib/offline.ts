// Pages' side of the offline queue. The page replays it whenever it's open
// and the connection comes back (the service worker only replays through
// Background Sync, for when no page is open), retrying with backoff while
// the connection settles, then refreshes to show the result.
import { listQueued, replayQueue } from "./queue.ts";
import { refresh } from "./swap.ts";
import { toast } from "./toast.ts";

let schedule: (() => void) | undefined;

/**
 * Retries the queue soon: for a post that failed while the browser still
 * thought it was online, so no "online" event will come to replay it.
 */
export function replaySoon() {
  schedule?.();
}

export function replayWhenOnline(onReplayed: () => Promise<void> = refresh) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void attempt(), 1000);
  };

  async function attempt(delay = 1000, announce = false) {
    clearTimeout(timer);
    if (announce && (await listQueued()).length > 0) {
      toast("success", "Back online - syncing changes");
    }
    const { sent, signedOut } = await replayQueue();
    // The queue keeps until after signing back in, when the next page load
    // replays it.
    if (signedOut) return location.assign("/login");
    if (sent > 0) await onReplayed();
    if (navigator.onLine && (await listQueued()).length > 0) {
      timer = setTimeout(() => void attempt(Math.min(delay * 2, 30_000)), delay);
    }
  }

  addEventListener("online", () => void attempt(1000, true));
  // Anything left from an earlier visit (e.g. a replay stopped by an expired
  // session) goes as soon as the page is open and online.
  if (navigator.onLine) void attempt();
}

export function showQueued() {
  toast("info", "You're offline - changes saved locally");
}
