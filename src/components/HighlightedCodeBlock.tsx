import React, { useMemo, useState } from "react";
import { Check, Copy, WrapText } from "lucide-react";
import type { Lang } from "../types/hub";
import { tokenizeCode, type CodeTokenType } from "../utils/codeHighlight";
import { L } from "../utils/i18n";

const TOKEN_CLASSES: Record<CodeTokenType, string> = {
  comment: "text-slate-400 italic",
  string: "text-emerald-300",
  keyword: "text-fuchsia-300 font-semibold",
  number: "text-amber-300",
  type: "text-sky-300",
  function: "text-blue-300",
  property: "text-cyan-300",
  operator: "text-slate-300",
  punctuation: "text-slate-400",
  plain: "text-slate-100",
};

export const HighlightedCodeLines: React.FC<{
  code: string;
  language?: string;
  wrapLines?: boolean;
  showLineNumbers?: boolean;
}> = ({ code, language, wrapLines = false, showLineNumbers = true }) => {
  const { lines } = useMemo(() => tokenizeCode(code, language), [code, language]);

  return (
    <div className="p-4 space-y-0.5 min-w-full font-mono text-xs sm:text-sm leading-relaxed">
      {lines.map((tokens, idx) => (
        <div
          key={idx}
          className={
            showLineNumbers
              ? "grid grid-cols-[2.5rem_1fr] gap-3"
              : "block"
          }
        >
          {showLineNumbers && (
            <span className="text-slate-500 select-none text-end tabular-nums">
              {idx + 1}
            </span>
          )}
          <span className={wrapLines ? "whitespace-pre-wrap break-all" : "whitespace-pre"}>
            {tokens.length === 0 ? (
              " "
            ) : (
              tokens.map((tok, tIdx) => (
                <span key={tIdx} className={TOKEN_CLASSES[tok.type]} data-token={tok.type}>
                  {tok.value}
                </span>
              ))
            )}
          </span>
        </div>
      ))}
    </div>
  );
};

export const HighlightedCodeBlock: React.FC<{
  code: string;
  language?: string;
  lang?: Lang;
}> = ({ code, language, lang = "en" }) => {
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const { normalizedLanguage } = useMemo(
    () => tokenizeCode(code, language),
    [code, language]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Ignore clipboard restriction
    }
  };

  return (
    <div
      data-testid="highlighted-code-block"
      data-code-lang={normalizedLanguage}
      dir="ltr"
      className="my-4 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 overflow-hidden"
    >
      <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 text-xs print:hidden">
        <span className="font-mono text-slate-300 lowercase">{normalizedLanguage}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setWrapLines((prev) => !prev)}
            aria-pressed={wrapLines}
            className="px-2 py-1 rounded border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <WrapText className="w-3.5 h-3.5" />
            <span>{L("Wrap", "التفاف", lang)}</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="px-2 py-1 rounded border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? L("Copied", "تم النسخ", lang) : L("Copy", "نسخ", lang)}</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <HighlightedCodeLines
          code={code}
          language={normalizedLanguage}
          wrapLines={wrapLines}
          showLineNumbers
        />
      </div>
    </div>
  );
};
