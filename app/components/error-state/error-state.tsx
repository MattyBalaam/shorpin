import { useRevalidator } from "react-router";
import { Button } from "~/components/button/button";
import { isNetworkOrServerError } from "~/lib/network-error";
import * as styles from "./error-state.css";

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

  return (
    <div className={styles.errorState}>
      <p>{getErrorMessage(error)}</p>
      <Button onClick={revalidate} isSubmitting={state === "loading"}>
        Retry
      </Button>
    </div>
  );
}
