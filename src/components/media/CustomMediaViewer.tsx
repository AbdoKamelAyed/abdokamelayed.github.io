import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Code2,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Music,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Video,
  Volume2,
  VolumeX,
  WrapText,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Lang, MediaAssetRecord } from "../../types/hub";
import { resolveMediaObjectUrl } from "../../services/mediaLibraryService";
import { formatBytesCompact, safeMediaUrl } from "../../utils/analytics";
import { L, loc } from "../../utils/i18n";

function formatMediaTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "00:00";
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export const CustomMediaViewer: React.FC<{
  asset: MediaAssetRecord;
  lang: Lang;
  captionOverride?: string;
  onImageExpand?: (src: string, alt: string) => void;
}> = ({ asset, lang, captionOverride, onImageExpand }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>(() =>
    asset.storageMode === "indexeddb" ? "" : safeMediaUrl(asset.url)
  );
  const [loadingBlob, setLoadingBlob] = useState(asset.storageMode === "indexeddb");
  const [mediaError, setMediaError] = useState(false);

  // Image controls
  const [imgZoom, setImgZoom] = useState(1);
  const [imgRotate, setImgRotate] = useState(0);

  // PDF controls
  const [pdfZoom, setPdfZoom] = useState(100);
  const [pdfExpanded, setPdfExpanded] = useState(false);

  // Code controls
  const [wrapLines, setWrapLines] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Audio / Video controls
  const avRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    let active = true;
    setMediaError(false);
    if (asset.storageMode === "indexeddb" || asset.url.startsWith("idb://")) {
      const idbKey = asset.url.startsWith("idb://") ? asset.url.slice(6) : asset.id;
      setLoadingBlob(true);
      resolveMediaObjectUrl(idbKey)
        .then((objUrl) => {
          if (!active) return;
          setResolvedUrl(objUrl || "");
          setLoadingBlob(false);
        })
        .catch(() => {
          if (!active) return;
          setResolvedUrl("");
          setLoadingBlob(false);
        });
    } else {
      setResolvedUrl(safeMediaUrl(asset.url));
      setLoadingBlob(false);
    }
    return () => {
      active = false;
    };
  }, [asset.id, asset.storageMode, asset.url]);

  const title = loc(asset.title, lang) || asset.fileName || asset.id;
  const caption = captionOverride || loc(asset.caption, lang);

  const handleDownload = () => {
    if (asset.mediaType === "code" && asset.codeContent !== undefined) {
      const blob = new Blob([asset.codeContent], { type: "text/plain;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = asset.fileName || `${asset.id}.txt`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
      return;
    }
    if (!resolvedUrl) return;
    const a = document.createElement("a");
    a.href = resolvedUrl;
    a.download = asset.fileName || asset.id;
    a.click();
  };

  const togglePlay = () => {
    const el = avRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => setMediaError(true));
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const seekBy = (delta: number) => {
    const el = avRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(duration || 0, el.currentTime + delta));
  };

  const changeRate = (nextRate: number) => {
    setRate(nextRate);
    if (avRef.current) avRef.current.playbackRate = nextRate;
  };

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      if (avRef.current) avRef.current.muted = next;
      return next;
    });
  };

  const typeLabelMap: Record<MediaAssetRecord["mediaType"], string> = {
    pdf: "PDF",
    image: L("Image", "صورة", lang),
    video: L("Video", "فيديو", lang),
    audio: L("Audio", "صوت", lang),
    code: asset.codeLanguage || L("Code", "كود", lang),
  };

  const Icon =
    asset.mediaType === "pdf"
      ? FileText
      : asset.mediaType === "image"
      ? ImageIcon
      : asset.mediaType === "video"
      ? Video
      : asset.mediaType === "audio"
      ? Music
      : Code2;

  return (
    <figure
      data-testid={`custom-viewer-${asset.mediaType}`}
      className="my-6 rounded-2xl border border-[var(--hub-border)] hub-surface overflow-hidden"
    >
      {/* Top Viewer Toolbar */}
      <div className="px-4 py-3 border-b border-[var(--hub-border)] hub-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{title}</div>
            <div className="text-[11px] font-mono tabular-nums text-[var(--hub-text-muted)] flex flex-wrap items-center gap-1.5">
              <span>{typeLabelMap[asset.mediaType]}</span>
              {asset.fileName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{asset.fileName}</span>
                </>
              )}
              {asset.sizeBytes ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{formatBytesCompact(asset.sizeBytes)}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0 print:hidden">
          {asset.mediaType === "image" && (
            <>
              <button
                type="button"
                onClick={() => setImgZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
                aria-label={L("Zoom out image", "تصغير الصورة", lang)}
                className="p-1.5 rounded-lg border border-[var(--hub-border)] text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono tabular-nums px-1 text-[var(--hub-text-muted)]">
                {Math.round(imgZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setImgZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                aria-label={L("Zoom in image", "تكبير الصورة", lang)}
                className="p-1.5 rounded-lg border border-[var(--hub-border)] text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setImgRotate((r) => (r + 90) % 360)}
                aria-label={L("Rotate image", "تدوير الصورة", lang)}
                className="p-1.5 rounded-lg border border-[var(--hub-border)] text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              {(imgZoom !== 1 || imgRotate !== 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setImgZoom(1);
                    setImgRotate(0);
                  }}
                  aria-label={L("Reset image view", "إعادة ضبط العرض", lang)}
                  className="p-1.5 rounded-lg border border-[var(--hub-border)] text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              {onImageExpand && resolvedUrl && (
                <button
                  type="button"
                  onClick={() => onImageExpand(resolvedUrl, title)}
                  aria-label={L("Expand image full screen", "تكبير بملء الشاشة", lang)}
                  className="p-1.5 rounded-lg border border-[var(--hub-border)] text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}

          {asset.mediaType === "pdf" && (
            <>
              <button
                type="button"
                onClick={() => setPdfZoom((z) => Math.max(75, z - 25))}
                aria-label={L("Zoom out PDF", "تصغير PDF", lang)}
                className="p-1.5 rounded-lg border border-[var(--hub-border)] text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono tabular-nums px-1 text-[var(--hub-text-muted)]">
                {pdfZoom}%
              </span>
              <button
                type="button"
                onClick={() => setPdfZoom((z) => Math.min(175, z + 25))}
                aria-label={L("Zoom in PDF", "تكبير PDF", lang)}
                className="p-1.5 rounded-lg border border-[var(--hub-border)] text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPdfExpanded((v) => !v)}
                aria-label={pdfExpanded ? L("Compact PDF height", "تقليص العارض", lang) : L("Expand PDF height", "توسيع العارض", lang)}
                className="p-1.5 rounded-lg border border-[var(--hub-border)] text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {pdfExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </>
          )}

          {asset.mediaType === "code" && (
            <>
              <button
                type="button"
                onClick={() => setWrapLines((w) => !w)}
                aria-pressed={wrapLines}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] text-xs font-medium inline-flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
              >
                <WrapText className="w-3.5 h-3.5" />
                <span>{L("Wrap", "التفاف", lang)}</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(asset.codeContent || "");
                    setCopiedCode(true);
                    window.setTimeout(() => setCopiedCode(false), 1600);
                  } catch {
                    // Ignore clipboard restriction
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] text-xs font-medium inline-flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? L("Copied", "تم النسخ", lang) : L("Copy", "نسخ", lang)}</span>
              </button>
            </>
          )}

          {(resolvedUrl || asset.codeContent) && (
            <button
              type="button"
              onClick={handleDownload}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] text-xs font-medium inline-flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{L("Download", "تحميل", lang)}</span>
            </button>
          )}
        </div>
      </div>

      {/* Viewer Surface */}
      {loadingBlob ? (
        <div className="p-8 text-center text-xs font-mono text-[var(--hub-text-muted)]">
          {L("Loading media asset from local library...", "جارٍ تحميل الوسائط من المكتبة المحلية...", lang)}
        </div>
      ) : asset.mediaType === "code" ? (
        <div dir="ltr" className="bg-slate-950 text-slate-100 overflow-x-auto text-xs sm:text-sm font-mono">
          {(() => {
            const codeLines = (asset.codeContent || "").split("\n");
            return (
              <div className="p-4 space-y-0.5 min-w-full">
                {codeLines.map((lineText, idx) => (
                  <div key={idx} className="grid grid-cols-[2.5rem_1fr] gap-3 leading-relaxed">
                    <span className="text-slate-500 select-none text-end tabular-nums">
                      {idx + 1}
                    </span>
                    <span className={wrapLines ? "whitespace-pre-wrap break-all" : "whitespace-pre"}>
                      {lineText || " "}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      ) : asset.mediaType === "image" ? (
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 overflow-auto flex items-center justify-center min-h-[220px] max-h-[540px]">
          {resolvedUrl && !mediaError ? (
            <img
              src={resolvedUrl}
              alt={title}
              referrerPolicy="no-referrer"
              onError={() => setMediaError(true)}
              style={{
                transform: `scale(${imgZoom}) rotate(${imgRotate}deg)`,
              }}
              className="max-h-[460px] w-auto object-contain rounded-lg transition-transform duration-200 origin-center"
            />
          ) : (
            <div className="py-10 text-center space-y-2 text-[var(--hub-text-muted)]">
              <ImageIcon className="w-8 h-8 mx-auto opacity-60" />
              <div className="text-xs font-mono">{L("Image source unavailable in this browser session.", "مصدر الصورة غير متاح حالياً.", lang)}</div>
            </div>
          )}
        </div>
      ) : asset.mediaType === "pdf" ? (
        <div className="bg-slate-100 dark:bg-slate-900">
          {resolvedUrl && !mediaError ? (
            <object
              data={`${resolvedUrl}#zoom=${pdfZoom}`}
              type="application/pdf"
              aria-label={title}
              className={`w-full block transition-all ${pdfExpanded ? "h-[680px]" : "h-[460px]"}`}
            >
              <div className="p-8 text-center space-y-3">
                <FileText className="w-9 h-9 mx-auto text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-[var(--hub-text-muted)]">
                  {L("Inline PDF preview is unsupported in this browser; download to open.", "المعاينة المباشرة لـ PDF غير مدعومة هنا؛ قم بالتحميل.", lang)}
                </p>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-xs font-semibold cursor-pointer"
                >
                  {L("Download PDF Document", "تحميل ملف PDF", lang)}
                </button>
              </div>
            </object>
          ) : (
            <div className="p-8 text-center text-xs font-mono text-[var(--hub-text-muted)]">
              {L("Upload a local PDF or provide a valid URL to view.", "ارفع ملف PDF محلياً أو أدخل رابطاً صالحاً للعرض.", lang)}
            </div>
          )}
        </div>
      ) : asset.mediaType === "video" ? (
        <div className="bg-slate-950 text-white">
          {resolvedUrl && !mediaError ? (
            <>
              <video
                ref={(node) => {
                  avRef.current = node;
                }}
                src={resolvedUrl}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime || 0)}
                onEnded={() => setPlaying(false)}
                onError={() => setMediaError(true)}
                playsInline
                className="w-full max-h-[480px] bg-black"
              />
              <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center gap-3 print:hidden">
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={playing ? L("Pause video", "إيقاف مؤقت", lang) : L("Play video", "تشغيل الفيديو", lang)}
                  className="h-8 w-8 rounded-lg bg-white text-slate-950 inline-flex items-center justify-center cursor-pointer"
                >
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={Math.min(currentTime, duration || 100)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setCurrentTime(next);
                    if (avRef.current) avRef.current.currentTime = next;
                  }}
                  aria-label={L("Seek video timeline", "شريط التقديم", lang)}
                  className="flex-1 min-w-[120px] accent-blue-500 cursor-pointer"
                />
                <span className="text-xs font-mono tabular-nums text-slate-300">
                  {formatMediaTime(currentTime)} / {formatMediaTime(duration)}
                </span>
                <select
                  value={rate}
                  onChange={(e) => changeRate(Number(e.target.value))}
                  aria-label={L("Playback speed", "سرعة التشغيل", lang)}
                  className="px-2 py-1 rounded bg-slate-800 text-xs font-mono border border-slate-700"
                >
                  {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                    <option key={r} value={r}>
                      {r}x
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? L("Unmute", "إلغاء الكتم", lang) : L("Mute", "كتم الصوت", lang)}
                  className="p-1.5 rounded border border-slate-700 hover:bg-slate-800 cursor-pointer"
                >
                  {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-xs font-mono text-slate-400">
              {L("Video file missing or unavailable in this browser session.", "ملف الفيديو غير متاح في هذه الجلسة.", lang)}
            </div>
          )}
        </div>
      ) : (
        /* Audio Player */
        <div className="p-5 space-y-4">
          {resolvedUrl && !mediaError ? (
            <>
              <audio
                ref={(node) => {
                  avRef.current = node;
                }}
                src={resolvedUrl}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime || 0)}
                onEnded={() => setPlaying(false)}
                onError={() => setMediaError(true)}
              />
              <div className="flex flex-wrap items-center gap-3 print:hidden">
                <button
                  type="button"
                  onClick={() => seekBy(-10)}
                  aria-label={L("Back 10 seconds", "رجوع 10 ثوانٍ", lang)}
                  className="p-2 rounded-lg border border-[var(--hub-border)] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={playing ? L("Pause audio", "إيقاف الصوت", lang) : L("Play audio", "تشغيل الصوت", lang)}
                  className="h-10 w-10 rounded-full bg-[var(--hub-primary)] text-[var(--hub-bg)] inline-flex items-center justify-center cursor-pointer"
                >
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => seekBy(10)}
                  aria-label={L("Forward 10 seconds", "تقديم 10 ثوانٍ", lang)}
                  className="p-2 rounded-lg border border-[var(--hub-border)] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={Math.min(currentTime, duration || 100)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setCurrentTime(next);
                    if (avRef.current) avRef.current.currentTime = next;
                  }}
                  aria-label={L("Audio scrub position", "تقدم المقطع الصوتي", lang)}
                  className="flex-1 min-w-[120px] accent-blue-600 cursor-pointer"
                />
                <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
                  {formatMediaTime(currentTime)} / {formatMediaTime(duration)}
                </span>
                <select
                  value={rate}
                  onChange={(e) => changeRate(Number(e.target.value))}
                  aria-label={L("Audio playback speed", "سرعة الصوت", lang)}
                  className="px-2 py-1 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                >
                  {[1, 1.25, 1.5, 2].map((r) => (
                    <option key={r} value={r}>
                      {r}x
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? L("Unmute audio", "إلغاء كتم الصوت", lang) : L("Mute audio", "كتم الصوت", lang)}
                  className="p-2 rounded-lg border border-[var(--hub-border)] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </>
          ) : (
            <div className="py-4 text-center text-xs font-mono text-[var(--hub-text-muted)]">
              {L("Audio recording unavailable in this browser session.", "الملف الصوتي غير متاح حالياً.", lang)}
            </div>
          )}
        </div>
      )}

      {caption && (
        <figcaption className="px-4 py-2.5 border-t border-[var(--hub-border)] text-xs text-[var(--hub-text-muted)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};
