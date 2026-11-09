// Only ever loaded via dynamic import from monitoring.client.ts. Named imports
// (rather than `await import("@sentry/react-router")`) keep tree-shaking
// working, so unused integrations like feedback stay out of the chunk.
import {
  addIntegration,
  captureException,
  getClient,
  init,
  reactRouterTracingIntegration,
} from "@sentry/react-router";

export { captureException };

/** Sessions recorded from the start, whether or not they hit an error. */
const REPLAY_SESSION_SAMPLE_RATE = 0.1;

export function initSentry() {
  init({
    dsn: import.meta.env.VITE_SENTRY_DSN,

    integrations: [reactRouterTracingIntegration()],

    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
  });

  // Replay is loaded lazily (see sentry-replay.client.ts): for the sampled
  // sessions straight away, and for the rest on their first error, from
  // where it records the rest of the session. The trade-off: an error's
  // replay starts at the error, without the lead-up that Sentry's on-error
  // buffer would have kept, since that buffer needs replay loaded from the
  // start of every session.
  if (Math.random() < REPLAY_SESSION_SAMPLE_RATE) {
    void startReplay();
    return;
  }
  const stop = getClient()?.on("afterSendEvent", (event) => {
    // Errors are the events without a type (transactions, replays… have one).
    if (event.type !== undefined) return;
    stop?.();
    void startReplay();
  });
}

let replayStarted = false;

async function startReplay() {
  if (replayStarted) return;
  replayStarted = true;
  const { replayIntegration } = await import("./sentry-replay.client");
  const replay = replayIntegration({
    maskAllText: false,
    blockAllMedia: false,
  });
  addIntegration(replay);
  // No replay sample rates in init(), so it records only once started.
  replay.start();
}
