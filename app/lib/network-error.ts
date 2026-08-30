import { isRouteErrorResponse } from "react-router";

/**
 * A `fetch()` that never got a response (browser TypeError) or a 5xx bubbled
 * up as a route error response — as opposed to the server genuinely
 * answering with a 4xx. Lets clientLoaders and error boundaries tell "can't
 * reach the server" apart from a real application error.
 */
export function isNetworkOrServerError(error: unknown): boolean {
  return (
    (error instanceof TypeError && error.message.includes("fetch")) ||
    (isRouteErrorResponse(error) && error.status >= 500)
  );
}
