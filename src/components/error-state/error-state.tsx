import { useCanGoBack, useRouter } from "@tanstack/solid-router";
import { createSignal, onSettled } from "solid-js";
import { Button } from "~/components/button/button";
import * as styles from "~/components/modal/modal.css";
import { isNetworkOrServerError } from "~/lib/network-error";

/**
 * Distinguishes "you have no connection" from "the app's server couldn't be
 * reached" (host down, DNS failure, etc. while the browser is otherwise
 * online) — same tone as the service worker's offline.html shell, but for
 * errors that reach the router's error boundaries instead of a hard
 * navigation the service worker intercepts directly.
 */
export function getErrorMessage(error: unknown): string {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You're offline.";
  }
  if (isNetworkOrServerError(error)) {
    return "Couldn't reach the server.";
  }
  return "Something went wrong.";
}

export function ErrorState(props: { error: unknown; reset?: () => void }) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const [isRetrying, setIsRetrying] = createSignal(false);
  let dialog!: HTMLDialogElement;

  // Back out to wherever the user came from (home and list both have offline
  // caches to land on); if this was the first entry in the history stack
  // there's nowhere to go back to, so fall back to home.
  function cancel() {
    if (canGoBack()) router.history.back();
    else void router.navigate({ to: "/" });
  }

  async function retry() {
    setIsRetrying(true);
    props.reset?.();
    await router.invalidate();
    setIsRetrying(false);
  }

  onSettled(() => {
    dialog.showModal();
  });

  return (
    <dialog
      ref={dialog}
      class={styles.dialog}
      onCancel={(event) => {
        // Escape would otherwise just close the dialog over a blank page.
        event.preventDefault();
        cancel();
      }}
    >
      <div class={styles.content}>
        <p>{getErrorMessage(props.error)}</p>
        <div class={styles.actions}>
          <Button variant="outline" onClick={cancel}>
            Cancel
          </Button>
          <Button onClick={retry} isSubmitting={isRetrying()}>
            Retry
          </Button>
        </div>
      </div>
    </dialog>
  );
}
