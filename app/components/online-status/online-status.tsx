import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useSyncExternalStore,
} from "react";
import * as styles from "./online-status.css";

const OnlineContext = createContext<boolean>(true);

interface UseIsOnlineOptions {
  onOnline?: () => void;
  onOffline?: () => void;
}

export function useIsOnline({ onOnline, onOffline }: UseIsOnlineOptions = {}) {
  const isOnline = useContext(OnlineContext);
  const wasOfflineRef = useRef(false);

  const handleOnline = useEffectEvent(() => onOnline?.());
  const handleOffline = useEffectEvent(() => onOffline?.());

  useEffect(
    function syncOnlineCallbacks() {
      if (!isOnline) {
        wasOfflineRef.current = true;
        handleOffline();
      } else if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        handleOnline();
      }
    },
    [isOnline],
  );

  return isOnline;
}

interface OnlineStatusProviderProps {
  children: React.ReactNode;
}

// navigator.onLine is an external store: subscribe to the browser's events,
// read the value synchronously during render. On the server (and during
// hydration) assume online; React re-renders with the client snapshot after
// hydration if they differ.
function subscribeToOnlineStatus(onStoreChange: () => void) {
  const controller = new AbortController();
  const { signal } = controller;

  window.addEventListener("online", onStoreChange, { signal });
  window.addEventListener("offline", onStoreChange, { signal });

  return () => controller.abort();
}

export function OnlineStatusProvider({ children }: OnlineStatusProviderProps) {
  const isOnline = useSyncExternalStore(
    subscribeToOnlineStatus,
    () => navigator.onLine,
    () => true,
  );

  return <OnlineContext.Provider value={isOnline}>{children}</OnlineContext.Provider>;
}

export function OnlineStatusIndicator() {
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return <div className={styles.indicator}>Offline</div>;
}
