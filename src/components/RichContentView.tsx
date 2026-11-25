import React from "react";
import { safeUrl } from "../utils/analytics";
import { parseMarkdownBlocks, tokenizeInlineMarkdown } from "../utils/markdown";

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
              className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
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

export const RichContentView: React.FC<{ content: string }> = ({ content }) => {
  const blocks = parseMarkdownBlocks(content);
  return (
    <div className="space-y-5 text-base sm:text-lg leading-relaxed text-[var(--hub-text)]">
      {blocks.map((block, idx) => {
        if (block.type === "h2") {
          return (
            <h2 key={idx} className="font-display text-2xl font-bold tracking-tight pt-3">
              <InlineRuns text={block.text} />
            </h2>
          );
        }
        if (block.type === "h3") {
          return (
            <h3 key={idx} className="font-display text-xl font-semibold tracking-tight pt-2">
              <InlineRuns text={block.text} />
            </h3>
          );
        }
        if (block.type === "blockquote") {
          return (
            <blockquote
              key={idx}
              className="pl-4 border-s-2 border-blue-600/60 dark:border-blue-400/60 italic text-[var(--hub-text-muted)]"
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
            <pre
              key={idx}
              dir="ltr"
              className="rounded-xl border border-[var(--hub-border)] bg-slate-950 text-slate-100 p-4 overflow-x-auto text-sm font-mono"
            >
              <code>{block.code}</code>
            </pre>
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
