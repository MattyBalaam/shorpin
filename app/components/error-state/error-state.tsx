import { useEffect, useRef } from "react";
import { useRevalidator } from "react-router";
import { Button } from "~/components/button/button";
import * as styles from "~/components/modal/modal.css";
import { isNetworkOrServerError } from "~/lib/network-error";

/**
 * Distinguishes "you have no connection" from "the app's server couldn't be
 * reached" (host down, DNS failure, etc. while the browser is otherwise
 * online) — same tone as the service worker's offline.html shell, but for
 * errors that reach React Router's error boundaries instead of a hard
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

export function ErrorState({ error }: { error: unknown }) {
  const { revalidate, state } = useRevalidator();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog ref={ref} className={styles.dialog}>
      <div className={styles.content}>
        <p>{getErrorMessage(error)}</p>
        <div className={styles.actions}>
          <Button onClick={revalidate} isSubmitting={state === "loading"}>
            Retry
          </Button>
        </div>
      </div>
    </dialog>
  );
}
