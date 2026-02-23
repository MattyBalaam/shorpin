import { createContext, useContext, useEffect, useRef, useState } from "react";
import * as styles from "./online-status.css";

const OnlineContext = createContext<boolean>(true);

interface UseIsOnlineOptions {
  onOnline?: () => void;
  onOffline?: () => void;
}

export function useIsOnline({ onOnline, onOffline }: UseIsOnlineOptions = {}) {
  const isOnline = useContext(OnlineContext);
  const wasOfflineRef = useRef(false);

  // Keep callbacks current without adding them to the effect dependency array
  const onOnlineRef = useRef(onOnline);
  const onOfflineRef = useRef(onOffline);
  onOnlineRef.current = onOnline;
  onOfflineRef.current = onOffline;

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      onOfflineRef.current?.();
    } else if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      onOnlineRef.current?.();
    }
  }, [isOnline]);

  return isOnline;
}

interface OnlineStatusProviderProps {
  children: React.ReactNode;
}

export function OnlineStatusProvider({ children }: OnlineStatusProviderProps) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(function trackOnlineStatus() {
    setIsOnline(navigator.onLine);

    const controller = new AbortController();
    const { signal } = controller;

    window.addEventListener("online", () => setIsOnline(true), { signal });
    window.addEventListener("offline", () => setIsOnline(false), { signal });

    return () => controller.abort();
  }, []);

  return <OnlineContext.Provider value={isOnline}>{children}</OnlineContext.Provider>;
}

export function OnlineStatusIndicator() {
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return <div className={styles.indicator}>Offline</div>;
}
