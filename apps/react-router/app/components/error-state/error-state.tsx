import { useEffect, useRef } from "react";
import { href, useLocation, useNavigate, useRevalidator } from "react-router";
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
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef<HTMLDialogElement>(null);

  // Back out to wherever the user came from (home and list both have offline
  // caches to land on); if this was the first entry in the history stack
  // there's nowhere to go back to, so fall back to home.
  function cancel() {
    if (location.key === "default") {
      void navigate(href("/"));
    } else {
      void navigate(-1);
    }
  }

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onCancel={(event) => {
        // Escape would otherwise just close the dialog over a blank page.
        event.preventDefault();
        cancel();
      }}
    >
      <div className={styles.content}>
        <p>{getErrorMessage(error)}</p>
        <div className={styles.actions}>
          <Button variant="outline" onClick={cancel}>
            Cancel
          </Button>
          <Button onClick={revalidate} isSubmitting={state === "loading"}>
            Retry
          </Button>
        </div>
      </div>
    </dialog>
  );
}
