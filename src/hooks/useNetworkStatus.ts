import { useCallback, useEffect, useState } from "react";
import {
  createInitialNetworkState,
  reduceNetworkStatus,
  type NetworkStatusState,
} from "../utils/networkStatus";

function readNavigatorOnline(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.onLine !== "boolean") {
    return true;
  }
  return navigator.onLine;
}

export function useNetworkStatus(reconnectedDurationMs = 3500) {
  const [state, setState] = useState<NetworkStatusState>(() =>
    createInitialNetworkState(readNavigatorOnline())
  );

  useEffect(() => {
    const handleOffline = () => {
      setState((prev) => reduceNetworkStatus(prev, "offline"));
    };
    const handleOnline = () => {
      setState((prev) => reduceNetworkStatus(prev, "online"));
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Sync once on mount in case state changed before listeners attached
    if (!readNavigatorOnline()) {
      handleOffline();
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    if (state.notice !== "reconnected" || state.dismissed) return;
    const timer = window.setTimeout(() => {
      setState((prev) => reduceNetworkStatus(prev, "auto-clear"));
    }, reconnectedDurationMs);
    return () => window.clearTimeout(timer);
  }, [state.notice, state.dismissed, reconnectedDurationMs]);

  const dismissNotice = useCallback(() => {
    setState((prev) => reduceNetworkStatus(prev, "dismiss"));
  }, []);

  return {
    isOnline: state.isOnline,
    notice: state.notice,
    visible: state.notice !== "none" && !state.dismissed,
    dismissNotice,
  };
}
