// No-reload saves. A form marked `data-enhance` is posted with fetch
// instead of navigating; the server answers exactly as it would without a
// script (a 303 back to the page), fetch follows it, and the returned page
// is swapped in (see swap.ts). Posts go one at a time, in order.
import { enqueue, isQueueable } from "./queue.ts";
import { refresh, swapFrom } from "./swap.ts";
import { toast } from "./toast.ts";

let chain: Promise<unknown> = Promise.resolve();

/** Runs `task` once every post sent before it has finished. */
export function afterPending<T>(task: () => Promise<T>) {
  const next = chain.then(task, task);
  chain = next.catch(() => {});
  return next;
}

export type SendResult = "saved" | "queued" | "failed";

/** The id this page's live-update stream knows it by (see realtime.ts). */
const clientId = document.querySelector<HTMLElement>("[data-client-id]")?.dataset.clientId;

export function send(action: string, data: FormData, form?: HTMLFormElement): Promise<SendResult> {
  if (clientId) data.set("client-id", clientId);
  form?.setAttribute("aria-busy", "true");

  const body = new URLSearchParams([...data].map(([key, value]) => [key, String(value)]));

  return afterPending(async (): Promise<SendResult> => {
    try {
      let response: Response;
      try {
        response = await fetch(action, { method: "POST", body, headers: { "X-Enhance": "1" } });
      } catch (error) {
        // No connection and no service worker in control yet (it queues
        // these itself when it is): keep the post for later all the same.
        const { pathname } = new URL(action, location.href);
        if (!isQueueable(pathname)) throw error;
        await enqueue({ url: pathname, body: String(body), queuedAt: Date.now() });
        return "queued";
      }
      // The service worker kept it for later (see sw.ts).
      if (response.status === 202 && response.headers.has("X-Queued")) return "queued";
      if (response.status === 401 || new URL(response.url).pathname === "/login") {
        location.assign("/login");
        return "failed";
      }
      if (response.status === 204) return "saved";
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // Keeps the address in step, e.g. `?deleted=` after a delete. `?tag=`
      // is how a reload keeps the tag without a script; here the field just
      // keeps its value, and a reload starts afresh.
      const url = new URL(response.url);
      url.searchParams.delete("tag");
      if (url.href !== location.href) history.replaceState(null, "", url);
      await swapFrom(await response.text());
      return "saved";
    } catch {
      toast("error", "Couldn't reach the server.", { label: "Retry", run: () => void refresh() });
      return "failed";
    } finally {
      form?.removeAttribute("aria-busy");
    }
  });
}

/**
 * Intercepts `data-enhance` forms. `optimistic` gets a look at each post
 * first, to show its effect before the server confirms it.
 */
export function enhanceForms(
  optimistic: (form: HTMLFormElement, data: FormData) => void,
  onResult: (form: HTMLFormElement, data: FormData, result: SendResult) => void,
) {
  document.addEventListener("submit", (event) => {
    const form = event.target as HTMLFormElement;
    if (!form.matches("form[data-enhance]")) return;
    // Cancel buttons close their dialog natively.
    if (event.submitter?.getAttribute("formmethod") === "dialog") return;
    event.preventDefault();
    const data = new FormData(form, event.submitter);
    form.closest("dialog")?.close();
    optimistic(form, data);
    void send(form.action, data, form).then((result) => onResult(form, data, result));
  });
}
