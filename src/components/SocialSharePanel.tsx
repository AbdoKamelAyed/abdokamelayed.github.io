import React, { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Image as ImageIcon, Share2 } from "lucide-react";
import type { Lang } from "../types/hub";
import { L } from "../utils/i18n";
import {
  buildSocialShareLinks,
  resolveAbsoluteShareUrl,
  resolveLinkPreviewImage,
} from "../utils/socialShare";

interface SocialSharePanelProps {
  lang: Lang;
  domain: string;
  hashPath: string;
  title: string;
  summary: string;
  previewImageCandidate?: string | null;
  fallbackPreviewImage?: string | null;
  tags?: string[];
  siteName?: string;
}

export const SocialSharePanel: React.FC<SocialSharePanelProps> = ({
  lang,
  domain,
  hashPath,
  title,
  summary,
  previewImageCandidate,
  fallbackPreviewImage,
  tags = [],
  siteName = "ABDO — Personal Digital Hub",
}) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(
    () => resolveAbsoluteShareUrl(domain, hashPath),
    [domain, hashPath]
  );

  const previewImage = useMemo(
    () => resolveLinkPreviewImage(previewImageCandidate, fallbackPreviewImage, domain),
    [previewImageCandidate, fallbackPreviewImage, domain]
  );

  const shareLinks = useMemo(
    () =>
      buildSocialShareLinks({
        url: shareUrl,
        title,
        summary,
        tags,
      }),
    [shareUrl, title, summary, tags]
  );

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") return;
    try {
      await navigator.share({
        title,
        text: summary,
        url: shareUrl,
      });
    } catch {
      // User dismissed native share dialog
    }
  };

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  let displayHost = "abdokamelayed.github.io";
  try {
    displayHost = new URL(shareUrl).hostname;
  } catch {
    // Keep fallback host
  }

  return (
    <section
      data-testid="social-share-panel"
      aria-label={L("Share and Link Preview", "المشاركة ومعاينة الرابط", lang)}
      className="print:hidden rounded-2xl border border-[var(--hub-border)] hub-surface p-5 sm:p-6 space-y-5 min-w-0 overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <h2 className="font-display text-base sm:text-lg font-semibold inline-flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[var(--hub-secondary)] shrink-0" />
            <span>{L("Share & Social Link Preview", "مشاركة ومعاينة الرابط على الشبكات", lang)}</span>
          </h2>
          <p className="text-xs text-[var(--hub-text-muted)]">
            {L(
              "Direct sharing links and OpenGraph preview image used when this page is shared on social platforms.",
              "روابط مشاركة مباشرة وصورة المعاينة المعتمدة عند مشاركة هذا الرابط على منصات التواصل.",
              lang
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="copy-share-link-btn"
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center gap-1.5 hover:border-[var(--hub-secondary)] cursor-pointer whitespace-nowrap"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? L("Link Copied", "تم النسخ", lang) : L("Copy Link", "نسخ الرابط", lang)}</span>
          </button>

          {canNativeShare && (
            <button
              type="button"
              data-testid="native-share-btn"
              onClick={handleNativeShare}
              className="px-3 py-1.5 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{L("Share", "مشاركة", lang)}</span>
            </button>
          )}
        </div>
      </div>

      {/* Platform Share Buttons */}
      <div className="flex flex-wrap gap-2" data-testid="social-share-links">
        {shareLinks.map((item) => (
          <a
            key={item.id}
            href={item.href}
            target={item.id === "email" ? undefined : "_blank"}
            rel={item.id === "email" ? undefined : "noopener noreferrer"}
            data-testid={`share-link-${item.id}`}
            className="px-3 py-2 rounded-lg border border-[var(--hub-border)] hub-subtle text-xs font-semibold text-[var(--hub-text)] hover:border-[var(--hub-secondary)] hover:text-[var(--hub-secondary)] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>{item.label[lang]}</span>
            {item.id !== "email" && <ExternalLink className="w-3 h-3 opacity-70" />}
          </a>
        ))}
      </div>

      {/* Rich Link Preview Card (Visualizes og:image + canonical card) */}
      <div
        data-testid="link-preview-card"
        className="rounded-xl border border-[var(--hub-border)] overflow-hidden hub-subtle grid grid-cols-1 sm:grid-cols-[200px_1fr] items-stretch"
      >
        <div className="aspect-[16/9] sm:aspect-auto sm:h-full bg-slate-900 overflow-hidden border-b sm:border-b-0 sm:border-e border-[var(--hub-border)]">
          <img
            src={previewImage.displaySrc}
            alt={`${title} preview`}
            data-testid="link-preview-image"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-4 min-w-0 flex flex-col justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--hub-text-muted)]">
              <ImageIcon className="w-3.5 h-3.5 text-[var(--hub-secondary)] shrink-0" />
              <span className="truncate">{displayHost} · {siteName}</span>
            </div>
            <h3 className="font-display text-sm font-semibold text-[var(--hub-text)] line-clamp-1 break-words">
              {title}
            </h3>
            {summary && (
              <p className="text-xs text-[var(--hub-text-muted)] line-clamp-2 break-words">
                {summary}
              </p>
            )}
          </div>
          <div
            dir="ltr"
            className="text-[11px] font-mono text-[var(--hub-secondary)] truncate"
            title={previewImage.absoluteUrl}
          >
            og:image → {previewImage.absoluteUrl}
          </div>
        </div>
      </div>
    </section>
  );
};
