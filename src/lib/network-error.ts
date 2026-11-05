// There's no standard way to tell a network failure apart from any other
// TypeError, so match each engine's wording: Chromium "Failed to fetch",
// WebKit "Load failed", Firefox "NetworkError when attempting to fetch
// resource."
const NETWORK_ERROR_MESSAGE = /fetch|load failed|networkerror/i;

/**
 * Thrown by server functions when a dependency (Supabase) couldn't answer.
 * Start serialises a thrown Error's message across the wire but not its
 * class or the response status, so the message is the signal.
 */
export const SERVICE_UNAVAILABLE = "Service unavailable";

/**
 * A `fetch()` that never got a response (browser TypeError) or a server
 * function that reported its backend unreachable — as opposed to the server
 * genuinely answering with an error. Lets loaders and error boundaries tell
 * "can't reach the server" apart from a real application error.
 */
export function isNetworkOrServerError(error: unknown): boolean {
  if (error instanceof TypeError && NETWORK_ERROR_MESSAGE.test(error.message)) return true;
  if (error instanceof Error && error.message === SERVICE_UNAVAILABLE) return true;
  return error instanceof Response && error.status >= 500;
}
