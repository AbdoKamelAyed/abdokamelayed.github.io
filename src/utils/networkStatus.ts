import type { Lang } from "../types/hub";

export type NetworkNoticeKind = "none" | "offline" | "reconnected";

export interface NetworkStatusState {
  isOnline: boolean;
  notice: NetworkNoticeKind;
  dismissed: boolean;
}

export type NetworkStatusEvent = "offline" | "online" | "dismiss" | "auto-clear";

export function createInitialNetworkState(initialOnline: boolean): NetworkStatusState {
  return {
    isOnline: initialOnline,
    notice: initialOnline ? "none" : "offline",
    dismissed: false,
  };
}

export function reduceNetworkStatus(
  state: NetworkStatusState,
  event: NetworkStatusEvent
): NetworkStatusState {
  if (event === "offline") {
    return {
      isOnline: false,
      notice: "offline",
      dismissed: false,
    };
  }
  if (event === "online") {
    const wasOffline = !state.isOnline || state.notice === "offline";
    const keepReconnected = state.notice === "reconnected" && !state.dismissed;
    return {
      isOnline: true,
      notice: wasOffline || keepReconnected ? "reconnected" : "none",
      dismissed: state.notice === "reconnected" ? state.dismissed : false,
    };
  }
  if (event === "dismiss") {
    return {
      ...state,
      dismissed: true,
    };
  }
  if (event === "auto-clear" && state.notice === "reconnected") {
    return {
      ...state,
      notice: "none",
      dismissed: false,
    };
  }
  return state;
}

export function getNetworkNoticeCopy(
  notice: NetworkNoticeKind,
  lang: Lang
): { title: string; detail: string } | null {
  if (notice === "offline") {
    return lang === "ar"
      ? {
          title: "انقطع الاتصال بالإنترنت",
          detail: "تتصفح حالياً البيانات المخزنة محلياً في المتصفح.",
        }
      : {
          title: "Connection lost",
          detail: "You are offline — cached hub pages remain available.",
        };
  }
  if (notice === "reconnected") {
    return lang === "ar"
      ? {
          title: "تمت استعادة الاتصال",
          detail: "عاد الاتصال بالإنترنت بشكل طبيعي.",
        }
      : {
          title: "Back online",
          detail: "Network connection restored.",
        };
  }
  return null;
}
