import React, { useEffect, useState } from "react";
import { List } from "lucide-react";
import type { Lang } from "../types/hub";
import type { TocItem } from "../utils/markdown";
import { L } from "../utils/i18n";

export const TableOfContents: React.FC<{
  items: TocItem[];
  lang: Lang;
}> = ({ items, lang }) => {
  const [activeId, setActiveId] = useState<string>(() => items[0]?.id || "");

  useEffect(() => {
    setActiveId(items[0]?.id || "");
  }, [items]);

  useEffect(() => {
    if (items.length === 0) return;

    let frame = 0;
    const updateActive = () => {
      frame = 0;
      let current = items[0].id;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= 140) {
          current = item.id;
        }
      }
      setActiveId(current);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateActive);
    };

    updateActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [items]);

  if (items.length === 0) return null;

  const handleJump = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  };

  return (
    <aside
      data-testid="article-toc"
      className="print:hidden lg:sticky lg:top-24 rounded-2xl border border-[var(--hub-border)] hub-subtle p-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--hub-text-muted)]">
        <List className="w-3.5 h-3.5 text-[var(--hub-secondary)]" />
        <span>{L("Table of Contents", "جدول المحتويات", lang)}</span>
      </div>

      <nav aria-label={L("Table of Contents", "جدول المحتويات", lang)}>
        <ol className="space-y-1 border-s border-[var(--hub-border)]">
          {items.map((item) => {
            const isActive = activeId === item.id;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => handleJump(e, item.id)}
                  aria-current={isActive ? "location" : undefined}
                  className={`block py-1 -ms-px border-s-2 transition-colors leading-snug ${
                    item.level === 3 ? "ps-5 text-xs" : "ps-3 text-sm"
                  } ${
                    isActive
                      ? "border-[var(--hub-secondary)] text-[var(--hub-text)] font-semibold"
                      : "border-transparent text-[var(--hub-text-muted)] hover:text-[var(--hub-text)] hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {item.title}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    </aside>
  );
};
