import {
  type Accessor,
  createContext,
  createEffect,
  createSignal,
  type Element,
  onSettled,
  Show,
  useContext,
} from "solid-js";
import * as styles from "./online-status.css";

const OnlineContext = createContext<Accessor<boolean>>(() => true);

interface UseIsOnlineOptions {
  onOnline?: () => void;
  onOffline?: () => void;
}

export function useIsOnline(options: UseIsOnlineOptions = {}) {
  const isOnline = useContext(OnlineContext);

  // Only transitions call back: `defer` skips the first run, so being online
  // on mount isn't reported as coming back online.
  createEffect(
    isOnline,
    (online) => {
      if (online) options.onOnline?.();
      else options.onOffline?.();
    },
    { defer: true },
  );

  return isOnline;
}

// navigator.onLine is an external source: subscribe to the browser's events
// once running in the browser. The server (and hydration) assume online, so
// the server HTML and the first client render agree.
export function OnlineStatusProvider(props: { children?: Element }) {
  const [isOnline, setIsOnline] = createSignal(true);

  onSettled(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const sync = () => setIsOnline(navigator.onLine);

    sync();
    window.addEventListener("online", sync, { signal });
    window.addEventListener("offline", sync, { signal });

    return () => controller.abort();
  });

  return <OnlineContext value={isOnline}>{props.children}</OnlineContext>;
}

export function OnlineStatusIndicator() {
  const isOnline = useIsOnline();

  return (
    <Show when={!isOnline()}>
      <div class={styles.indicator}>Offline</div>
    </Show>
  );
}
