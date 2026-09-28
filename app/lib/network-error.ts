import { isRouteErrorResponse } from "react-router";

// There's no standard way to tell a network failure apart from any other
// TypeError, so match each engine's wording: Chromium "Failed to fetch",
// WebKit "Load failed", Firefox "NetworkError when attempting to fetch
// resource."
const NETWORK_ERROR_MESSAGE = /fetch|load failed|networkerror/i;

/**
 * A `fetch()` that never got a response (browser TypeError) or a 5xx bubbled
 * up as a route error response — as opposed to the server genuinely
 * answering with a 4xx. Lets clientLoaders and error boundaries tell "can't
 * reach the server" apart from a real application error.
 */
export function isNetworkOrServerError(error: unknown): boolean {
  return (
    (error instanceof TypeError && NETWORK_ERROR_MESSAGE.test(error.message)) ||
    (isRouteErrorResponse(error) && error.status >= 500)
  );
}
