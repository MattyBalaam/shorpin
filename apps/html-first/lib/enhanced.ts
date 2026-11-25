/**
 * The query parameter that marks a script's fetch of a page, as opposed to a
 * navigation to it (server/index.ts adds it to redirects, swap.ts to
 * refreshes). Never left in the address bar.
 */
export const ENHANCED_PARAM = "enhanced";

/** `url` as a script fetches it. */
export function enhancedUrl(url: string | URL) {
  const enhanced = new URL(url);
  enhanced.searchParams.set(ENHANCED_PARAM, "");
  return enhanced;
}
