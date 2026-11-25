import type { Page, Route } from "@playwright/test";

/**
 * Matches the URL of a request the app makes. A plain function so it works
 * with `page.route()` and `page.unroute()` as well as response predicates.
 */
export type RequestMatcher = (url: URL) => boolean;

/** What `route.fulfill()` takes, for faking a response. */
export type FulfillOptions = Parameters<Route["fulfill"]>[0];

/**
 * Everything the shared specs need to know about one app's implementation.
 *
 * Specs describe behaviour through what a user sees: roles, labels and
 * URLs, which every app must share. They reach for an adapter only when a
 * test has to touch the wire: waiting for a save, cutting the network to one
 * endpoint, faking a server answer. Keep it to that. A difference a user can
 * see is a parity gap, not an adapter field.
 */
export interface AppAdapter {
  /** Workspace package that holds the app, for `pnpm --filter`. */
  package: string;

  /**
   * Shell commands that serve the app on `$PORT` against the mock server,
   * whose URL arrives as `VITE_SUPABASE_URL`. Run from the repo root.
   */
  server: {
    /** A production build: what CI and the pre-commit hook run. */
    built: string;
    /** A dev server, for `test:integration --dev`. */
    dev: string;
    /** The real-Supabase e2e build (`test:e2e`). */
    e2e: string;
  };

  /** Requests the specs wait for, block or fake, by what they do. */
  requests: {
    /** A list's data: loading it (GET) and saving changes to it (POST). */
    list(slug: string): RequestMatcher;
    /** A list's style dialog: loading and saving the list's own style. */
    listStyle(slug: string): RequestMatcher;
    /** Home's in-page saves, such as starring a list. */
    home: RequestMatcher;
    /** Home changes replayed from the offline queue once back online. */
    homeReplay: RequestMatcher;
    /** The app-wide style dialog's save. */
    style: RequestMatcher;
    /** The sign-ups dialog's data. */
    signUps: RequestMatcher;
    /** Every data request a client-side navigation makes. */
    navigationData: RequestMatcher;
  };

  /**
   * How a save endpoint matched by `requests.list` answers with a redirect,
   * e.g. to /login for an expired session. React Router's single fetch
   * encodes it as a 204 with headers rather than a 3xx.
   */
  redirect(location: string): FulfillOptions;

  /**
   * The live-update channel that tells an open list another member changed
   * it, for specs that wait on it or cut it off.
   */
  realtime: {
    /**
     * Counts the list subscriptions `page` opens from now on. A test that
     * expects an update waits for one first, or the change can land before
     * anyone is listening.
     */
    trackJoins(page: Page): Promise<() => number>;
    /** Keeps `page`'s live-update connection from opening, as for a suspended tab. */
    block(page: Page): Promise<void>;
  };

  /** Where the client keeps changes made offline until they sync. */
  offlineQueue: { database: string; store: string };

  /**
   * Specs this app doesn't pass yet, by test title. Each is marked
   * `test.fixme` with the reason, so gaps stay visible in every report
   * rather than being deleted. Remove an entry when the app catches up.
   */
  parityGaps: ReadonlyArray<{ title: string | RegExp; reason: string }>;
}
