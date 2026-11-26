import React, { useEffect, useState } from "react";
import { calculateScrollProgressState } from "../utils/analytics";

interface ReadingProgressBarProps {
  targetRef: React.RefObject<HTMLElement | null>;
  label: string;
  contentKey?: string | number;
  showOnlyWhenScrollable?: boolean;
}

export const ReadingProgressBar: React.FC<ReadingProgressBarProps> = ({
  targetRef,
  label,
  contentKey,
  showOnlyWhenScrollable = false,
}) => {
  const [state, setState] = useState<{ progress: number; scrollable: boolean }>({
    progress: 0,
    scrollable: false,
  });

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      frame = 0;
      const el = targetRef.current;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const targetBottomInDoc = el
        ? el.getBoundingClientRect().bottom + scrollY
        : document.documentElement.scrollHeight;
      const next = calculateScrollProgressState(
        scrollY,
        targetBottomInDoc,
        window.innerHeight,
        document.documentElement.scrollHeight
      );
      setState((prev) =>
        prev.progress === next.progress && prev.scrollable === next.scrollable
          ? prev
          : next
      );
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && targetRef.current) {
      resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(targetRef.current);
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      resizeObserver?.disconnect();
    };
  }, [targetRef, contentKey]);

  if (showOnlyWhenScrollable && !state.scrollable) {
    return null;
  }

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={state.progress}
      data-testid="reading-progress-bar"
      className="print:hidden fixed top-0 inset-x-0 h-[3px] z-50 bg-slate-200/55 dark:bg-slate-800/65 pointer-events-none"
    >
      <div
        className="h-full w-full origin-left rtl:origin-right transition-transform duration-100 ease-out"
        style={{
          transform: `scaleX(${state.progress / 100})`,
          backgroundColor: "var(--hub-secondary)",
        }}
      />
    </div>
  );
};
