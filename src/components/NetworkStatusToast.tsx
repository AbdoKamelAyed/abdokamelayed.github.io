import React from "react";
import { Wifi, WifiOff, X } from "lucide-react";
import type { Lang } from "../types/hub";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { getNetworkNoticeCopy } from "../utils/networkStatus";
import { L } from "../utils/i18n";

interface NetworkStatusToastProps {
  lang: Lang;
}

export const NetworkStatusToast: React.FC<NetworkStatusToastProps> = ({ lang }) => {
  const { notice, visible, dismissNotice } = useNetworkStatus();
  const copy = getNetworkNoticeCopy(notice, lang);

  if (!visible || !copy) {
    return null;
  }

  const isOffline = notice === "offline";

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="network-status-banner"
      data-network-state={notice}
      className={`print:hidden fixed bottom-4 end-4 z-40 max-w-sm w-[calc(100vw-2rem)] sm:w-auto rounded-xl border px-3.5 py-2.5 shadow-lg backdrop-blur-md transition-all duration-200 ${
        isOffline
          ? "border-amber-500/45 bg-amber-50/95 text-amber-950 dark:bg-amber-950/90 dark:text-amber-100"
          : "border-emerald-500/45 bg-emerald-50/95 text-emerald-950 dark:bg-emerald-950/90 dark:text-emerald-100"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className={`mt-0.5 shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-lg ${
            isOffline
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
        </span>

        <div className="min-w-0 flex-1 text-xs leading-snug">
          <div className="font-semibold">{copy.title}</div>
          <p className="text-[11px] opacity-85 mt-0.5">{copy.detail}</p>
        </div>

        <button
          type="button"
          data-testid="network-status-dismiss"
          onClick={dismissNotice}
          aria-label={L("Dismiss connection notice", "إغلاق إشعار الاتصال", lang)}
          className="h-6 w-6 shrink-0 inline-flex items-center justify-center rounded-md opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
