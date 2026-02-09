import { createContext, useContext, useEffect, useState } from "react";
import * as styles from "./online-status.css";

const OnlineContext = createContext<boolean>(true);

export function useIsOnline() {
  return useContext(OnlineContext);
}

interface OnlineStatusProviderProps {
  children: React.ReactNode;
}

export function OnlineStatusProvider({ children }: OnlineStatusProviderProps) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(function trackOnlineStatus() {
    setIsOnline(navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <OnlineContext.Provider value={isOnline}>{children}</OnlineContext.Provider>
  );
}

export function OnlineStatusIndicator() {
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return <div className={styles.indicator}>Offline</div>;
}
