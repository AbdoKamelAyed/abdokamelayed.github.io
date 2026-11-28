import React from "react";
import type { Lang, MediaAssetRecord } from "../types/hub";
import { safeUrl } from "../utils/analytics";
import { L } from "../utils/i18n";
import { parseMarkdownBlocks, tokenizeInlineMarkdown } from "../utils/markdown";
import { HighlightedCodeBlock } from "./HighlightedCodeBlock";
import { CustomMediaViewer } from "./media/CustomMediaViewer";

const InlineRuns: React.FC<{ text: string }> = ({ text }) => {
  const tokens = tokenizeInlineMarkdown(text);
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.type === "bold") return <strong key={i}>{tok.text}</strong>;
        if (tok.type === "italic") return <em key={i}>{tok.text}</em>;
        if (tok.type === "code") {
          return (
            <code
              key={i}
              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[0.88em]"
            >
              {tok.text}
            </code>
          );
        }
        if (tok.type === "link") {
          const clean = safeUrl(tok.href);
          if (!clean) return <span key={i}>{tok.text}</span>;
          return (
            <a
              key={i}
              href={clean}
              target={clean.startsWith("http") ? "_blank" : undefined}
              rel={clean.startsWith("http") ? "noopener noreferrer" : undefined}
              className="text-[var(--hub-secondary)] underline underline-offset-2"
            >
              {tok.text}
            </a>
          );
        }
        return <React.Fragment key={i}>{tok.text}</React.Fragment>;
      })}
    </>
  );
};

export const RichContentView: React.FC<{
  content: string;
  mediaAssets?: MediaAssetRecord[];
  lang?: Lang;
  onImageClick?: (src: string, alt: string) => void;
}> = ({ content, mediaAssets = [], lang = "en", onImageClick }) => {
  const blocks = parseMarkdownBlocks(content);
  const assetMap = new Map(mediaAssets.map((a) => [a.id, a]));

  return (
    <div
      data-testid="article-rich-content"
      style={{ fontSize: "var(--hub-article-font-size, 16px)", lineHeight: 1.75 }}
      className="space-y-5 text-[var(--hub-text)]"
    >
      {blocks.map((block, idx) => {
        if (block.type === "h2") {
          return (
            <h2 key={idx} id={block.id} className="scroll-mt-24 font-display text-[1.45em] font-bold tracking-tight pt-3 leading-snug">
              <InlineRuns text={block.text} />
            </h2>
          );
        }
        if (block.type === "h3") {
          return (
            <h3 key={idx} id={block.id} className="scroll-mt-24 font-display text-[1.2em] font-semibold tracking-tight pt-2 leading-snug">
              <InlineRuns text={block.text} />
            </h3>
          );
        }
        if (block.type === "blockquote") {
          return (
            <blockquote
              key={idx}
              className="pl-4 border-s-2 border-[var(--hub-secondary)] italic text-[var(--hub-text-muted)]"
            >
              <InlineRuns text={block.text} />
            </blockquote>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={idx} className="list-disc ps-6 space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j}>
                  <InlineRuns text={item} />
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "code") {
          return (
            <HighlightedCodeBlock
              key={idx}
              code={block.code}
              language={block.lang}
              lang={lang}
            />
          );
        }
        if (block.type === "embed") {
          const asset = assetMap.get(block.assetId);
          if (!asset) {
            return (
              <div
                key={idx}
                className="rounded-xl border border-dashed border-[var(--hub-border)] p-4 text-xs font-mono text-[var(--hub-text-muted)]"
              >
                {L("Embedded media asset not found:", "لم يتم العثور على العنصر المضمن:", lang)} {block.assetId}
              </div>
            );
          }
          return (
            <CustomMediaViewer
              key={`${asset.id}-${idx}`}
              asset={asset}
              lang={lang}
              captionOverride={block.caption}
              onImageExpand={onImageClick}
            />
          );
        }
        if (block.type === "img") {
          const cleanSrc = safeUrl(block.src);
          if (!cleanSrc) return null;
          const imgEl = (
            <img
              src={cleanSrc}
              alt={block.alt || "Article illustration"}
              referrerPolicy="no-referrer"
              className="w-full max-h-[540px] object-contain bg-slate-50 dark:bg-slate-900"
            />
          );
          return (
            <figure key={idx} className="space-y-2">
              <div className="overflow-hidden rounded-xl border border-[var(--hub-border)]">
                {onImageClick ? (
                  <button
                    type="button"
                    onClick={() => onImageClick(cleanSrc, block.alt)}
                    aria-label={`View ${block.alt || "article image"} full screen`}
                    className="block w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    {imgEl}
                  </button>
                ) : (
                  imgEl
                )}
              </div>
              {block.alt && (
                <figcaption className="text-xs text-[var(--hub-text-muted)] text-center">
                  {block.alt}
                </figcaption>
              )}
            </figure>
          );
        }
        return (
          <p key={idx}>
            <InlineRuns text={block.text} />
          </p>
        );
      })}
    </div>
  );
};
