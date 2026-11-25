import type { ArticleRecord, JournalIssueRecord, Lang } from "../types/hub";
import { calculateReadingTimeMinutes } from "./analytics";
import { loc } from "./i18n";
import { parseMarkdownBlocks, tokenizeInlineMarkdown } from "./markdown";

export interface PdfArticleSection {
  title: string;
  subtitle?: string;
  byline?: string;
  abstractText?: string;
  markdownContent: string;
  tags?: string[];
}

export interface PdfDocumentInput {
  kicker: string;
  title: string;
  subtitle?: string;
  metadataLine: string;
  editorialNote?: string;
  sections: PdfArticleSection[];
  footerCredit?: string;
}

interface PdfLine {
  text: string;
  font: "F1" | "F2" | "F3";
  size: number;
  leading: number;
  indent: number;
  colorRgb?: [number, number, number];
  ruleBelow?: boolean;
  pageBreakBefore?: boolean;
}

function toPdfAscii(input: string): string {
  // PDF standard Type1 Helvetica/Courier expects 8-bit WinAnsi; normalize typography & mark non-Latin runs cleanly.
  const normalized = input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00B7/g, " | ")
    .replace(/\r?\n/g, " ");
  let out = "";
  for (const ch of normalized) {
    const code = ch.charCodeAt(0);
    if (code >= 32 && code <= 126) {
      out += ch;
    } else if (code >= 160 && code <= 255) {
      out += ch;
    } else {
      out += " ";
    }
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function escapePdfLiteral(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(text: string, maxChars: number): string[] {
  const clean = toPdfAscii(text);
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word.length > maxChars ? word.slice(0, maxChars) : word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word.length > maxChars ? word.slice(0, maxChars) : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function stripInline(raw: string): string {
  return tokenizeInlineMarkdown(raw)
    .map((t) => t.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildPdfLines(doc: PdfDocumentInput): PdfLine[] {
  const lines: PdfLine[] = [];

  if (doc.kicker) {
    lines.push({
      text: toPdfAscii(doc.kicker.toUpperCase()),
      font: "F2",
      size: 9,
      leading: 14,
      indent: 0,
      colorRgb: [0.15, 0.39, 0.92],
    });
  }

  for (const w of wrapLine(doc.title, 54)) {
    lines.push({ text: w, font: "F2", size: 20, leading: 25, indent: 0, colorRgb: [0.06, 0.09, 0.16] });
  }

  if (doc.subtitle) {
    for (const w of wrapLine(doc.subtitle, 78)) {
      lines.push({ text: w, font: "F1", size: 11.5, leading: 16, indent: 0, colorRgb: [0.28, 0.33, 0.41] });
    }
  }

  if (doc.metadataLine) {
    lines.push({
      text: toPdfAscii(doc.metadataLine),
      font: "F3",
      size: 9,
      leading: 16,
      indent: 0,
      colorRgb: [0.39, 0.45, 0.54],
      ruleBelow: true,
    });
  }

  if (doc.editorialNote) {
    lines.push({ text: " ", font: "F1", size: 8, leading: 8, indent: 0 });
    lines.push({ text: "EDITORIAL FOREWORD", font: "F2", size: 9.5, leading: 14, indent: 0, colorRgb: [0.15, 0.39, 0.92] });
    for (const w of wrapLine(doc.editorialNote, 84)) {
      lines.push({ text: w, font: "F1", size: 10.5, leading: 15, indent: 0, colorRgb: [0.15, 0.2, 0.28] });
    }
    lines.push({ text: " ", font: "F1", size: 8, leading: 10, indent: 0, ruleBelow: true });
  }

  if (doc.sections.length > 1) {
    lines.push({ text: " ", font: "F1", size: 8, leading: 10, indent: 0 });
    lines.push({ text: "CONTENTS IN THIS EDITION", font: "F2", size: 10, leading: 16, indent: 0, colorRgb: [0.06, 0.09, 0.16] });
    doc.sections.forEach((sec, idx) => {
      for (const w of wrapLine(`${String(idx + 1).padStart(2, "0")}. ${sec.title}`, 82)) {
        lines.push({ text: w, font: "F1", size: 10, leading: 14, indent: 10, colorRgb: [0.2, 0.25, 0.33] });
      }
    });
  }

  doc.sections.forEach((sec, secIdx) => {
    if (secIdx > 0 || doc.sections.length > 1) {
      lines.push({ text: " ", font: "F1", size: 8, leading: 12, indent: 0, pageBreakBefore: secIdx > 0 });
    }
    if (doc.sections.length > 1) {
      lines.push({
        text: `CHAPTER ${String(secIdx + 1).padStart(2, "0")}`,
        font: "F2",
        size: 8.5,
        leading: 13,
        indent: 0,
        colorRgb: [0.15, 0.39, 0.92],
      });
      for (const w of wrapLine(sec.title, 60)) {
        lines.push({ text: w, font: "F2", size: 16, leading: 21, indent: 0, colorRgb: [0.06, 0.09, 0.16] });
      }
      if (sec.subtitle) {
        for (const w of wrapLine(sec.subtitle, 82)) {
          lines.push({ text: w, font: "F1", size: 10.5, leading: 15, indent: 0, colorRgb: [0.35, 0.4, 0.48] });
        }
      }
      if (sec.byline) {
        lines.push({
          text: toPdfAscii(sec.byline),
          font: "F3",
          size: 8.5,
          leading: 15,
          indent: 0,
          colorRgb: [0.42, 0.47, 0.56],
          ruleBelow: true,
        });
      }
    }

    if (sec.abstractText) {
      lines.push({ text: " ", font: "F1", size: 8, leading: 8, indent: 0 });
      lines.push({ text: "KEY SUMMARY", font: "F2", size: 9, leading: 14, indent: 8, colorRgb: [0.15, 0.39, 0.92] });
      for (const w of wrapLine(sec.abstractText, 82)) {
        lines.push({ text: w, font: "F1", size: 10, leading: 14.5, indent: 8, colorRgb: [0.2, 0.25, 0.33] });
      }
    }

    const blocks = parseMarkdownBlocks(sec.markdownContent || "");
    for (const block of blocks) {
      if (block.type === "h2") {
        lines.push({ text: " ", font: "F1", size: 6, leading: 8, indent: 0 });
        for (const w of wrapLine(stripInline(block.text), 66)) {
          lines.push({ text: w, font: "F2", size: 13.5, leading: 18, indent: 0, colorRgb: [0.06, 0.09, 0.16] });
        }
      } else if (block.type === "h3") {
        lines.push({ text: " ", font: "F1", size: 5, leading: 6, indent: 0 });
        for (const w of wrapLine(stripInline(block.text), 72)) {
          lines.push({ text: w, font: "F2", size: 11.5, leading: 16, indent: 0, colorRgb: [0.12, 0.16, 0.23] });
        }
      } else if (block.type === "blockquote") {
        lines.push({ text: " ", font: "F1", size: 4, leading: 4, indent: 0 });
        for (const w of wrapLine(`" ${stripInline(block.text)} "`, 78)) {
          lines.push({ text: w, font: "F1", size: 10.5, leading: 15, indent: 14, colorRgb: [0.28, 0.33, 0.41] });
        }
      } else if (block.type === "ul") {
        for (const item of block.items) {
          const wrapped = wrapLine(`* ${stripInline(item)}`, 82);
          wrapped.forEach((w, idx) => {
            lines.push({
              text: idx === 0 ? w : `  ${w}`,
              font: "F1",
              size: 10.5,
              leading: 15,
              indent: 10,
              colorRgb: [0.1, 0.14, 0.21],
            });
          });
        }
      } else if (block.type === "code") {
        lines.push({ text: " ", font: "F3", size: 4, leading: 5, indent: 0 });
        const rawCodeLines = block.code.split("\n");
        for (const codeRow of rawCodeLines) {
          const cleanRow = toPdfAscii(codeRow) || " ";
          const chunks = cleanRow.length > 76 ? cleanRow.match(/.{1,76}/g) || [cleanRow] : [cleanRow];
          for (const chunk of chunks) {
            lines.push({ text: chunk, font: "F3", size: 8.5, leading: 12, indent: 12, colorRgb: [0.12, 0.16, 0.23] });
          }
        }
        lines.push({ text: " ", font: "F3", size: 4, leading: 5, indent: 0 });
      } else if (block.type === "embed") {
        lines.push({
          text: toPdfAscii(`[Embedded Media Asset: ${block.assetId}${block.caption ? ` - ${block.caption}` : ""}]`),
          font: "F3",
          size: 9,
          leading: 15,
          indent: 8,
          colorRgb: [0.15, 0.39, 0.92],
        });
      } else if (block.type === "img") {
        lines.push({
          text: toPdfAscii(`[Figure: ${block.alt || block.src}]`),
          font: "F3",
          size: 9,
          leading: 14,
          indent: 8,
          colorRgb: [0.39, 0.45, 0.54],
        });
      } else {
        lines.push({ text: " ", font: "F1", size: 4, leading: 5, indent: 0 });
        for (const w of wrapLine(stripInline(block.text), 86)) {
          lines.push({ text: w, font: "F1", size: 10.5, leading: 15.5, indent: 0, colorRgb: [0.1, 0.14, 0.21] });
        }
      }
    }

    if (sec.tags && sec.tags.length > 0) {
      lines.push({ text: " ", font: "F1", size: 4, leading: 6, indent: 0 });
      lines.push({
        text: toPdfAscii(`Tags: ${sec.tags.map((t) => `#${t}`).join(" ")}`),
        font: "F3",
        size: 8.5,
        leading: 14,
        indent: 0,
        colorRgb: [0.39, 0.45, 0.54],
      });
    }
  });

  return lines;
}

export function generatePdfBytes(doc: PdfDocumentInput): Uint8Array {
  const PAGE_W = 595.28; // A4 pt
  const PAGE_H = 841.89;
  const MARGIN_X = 52;
  const TOP_Y = 786;
  const BOTTOM_Y = 58;

  const lines = buildPdfLines(doc);
  const pageStreams: string[] = [];
  let currentCmds: string[] = [];
  let y = TOP_Y;

  const pushPage = () => {
    pageStreams.push(currentCmds.join("\n"));
    currentCmds = [];
    y = TOP_Y;
  };

  for (const line of lines) {
    if (line.pageBreakBefore && currentCmds.length > 0) {
      pushPage();
    }
    if (y - line.leading < BOTTOM_Y && currentCmds.length > 0) {
      pushPage();
    }
    const [r, g, b] = line.colorRgb || [0.08, 0.1, 0.15];
    const x = MARGIN_X + line.indent;
    const escaped = escapePdfLiteral(line.text || " ");
    currentCmds.push(
      `BT /${line.font} ${line.size} Tf ${r.toFixed(2)} ${g.toFixed(2)} ${b.toFixed(2)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${escaped}) Tj ET`
    );
    y -= line.leading;
    if (line.ruleBelow) {
      currentCmds.push(
        `0.82 0.85 0.90 RG 0.7 w ${MARGIN_X.toFixed(2)} ${(y + 3).toFixed(2)} m ${(PAGE_W - MARGIN_X).toFixed(2)} ${(y + 3).toFixed(2)} l S`
      );
      y -= 6;
    }
  }

  if (currentCmds.length > 0 || pageStreams.length === 0) {
    pushPage();
  }

  // Stamp consistent running footers on every page
  const totalPages = pageStreams.length;
  const footerText = toPdfAscii(doc.footerCredit || doc.kicker || "ABDO Personal Digital Hub");
  const stampedStreams = pageStreams.map((stream, idx) => {
    const footerCmd = [
      `0.85 0.88 0.92 RG 0.5 w ${MARGIN_X} 42 m ${PAGE_W - MARGIN_X} 42 l S`,
      `BT /F3 8 Tf 0.45 0.50 0.58 rg ${MARGIN_X} 29 Td (${escapePdfLiteral(footerText)}) Tj ET`,
      `BT /F3 8 Tf 0.45 0.50 0.58 rg ${(PAGE_W - MARGIN_X - 58).toFixed(2)} 29 Td (Page ${idx + 1} / ${totalPages}) Tj ET`,
    ].join("\n");
    return `${stream}\n${footerCmd}`;
  });

  // Assemble PDF objects:
  // 1 = Catalog, 2 = Pages, 3 = F1 (Helvetica), 4 = F2 (Helvetica-Bold), 5 = F3 (Courier)
  // Then for each page i: content stream obj, page obj
  const objects: string[] = [];
  const pageObjNums: number[] = [];
  let nextId = 6;
  const contentObjIds: number[] = [];

  for (let i = 0; i < stampedStreams.length; i += 1) {
    const contentId = nextId++;
    const pageId = nextId++;
    contentObjIds.push(contentId);
    pageObjNums.push(pageId);
  }

  objects[1] = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageObjNums.length} >>\nendobj\n`;
  objects[3] = "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n";
  objects[4] = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n";
  objects[5] = "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>\nendobj\n";

  const encoder = new TextEncoder();
  for (let i = 0; i < stampedStreams.length; i += 1) {
    const cId = contentObjIds[i];
    const pId = pageObjNums[i];
    const streamBody = stampedStreams[i];
    const streamBytes = encoder.encode(streamBody).byteLength;
    objects[cId] = `${cId} 0 obj\n<< /Length ${streamBytes} >>\nstream\n${streamBody}\nendstream\nendobj\n`;
    objects[pId] = `${pId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${cId} 0 R >>\nendobj\n`;
  }

  let pdfStr = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let id = 1; id < nextId; id += 1) {
    offsets[id] = encoder.encode(pdfStr).byteLength;
    pdfStr += objects[id];
  }

  const xrefStart = encoder.encode(pdfStr).byteLength;
  pdfStr += `xref\n0 ${nextId}\n0000000000 65535 f \n`;
  for (let id = 1; id < nextId; id += 1) {
    pdfStr += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdfStr += `trailer\n<< /Size ${nextId} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return encoder.encode(pdfStr);
}

export function triggerPdfDownload(filename: string, bytes: Uint8Array): void {
  const safeName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildArticlePdfInput(
  article: ArticleRecord,
  lang: Lang,
  siteName: string,
  abstractText?: string
): PdfDocumentInput {
  const content = loc(article.content, lang);
  const readMin = calculateReadingTimeMinutes(content);
  const author = article.author || "Abdo Kamel";
  return {
    kicker: `${siteName} | ${article.type}`,
    title: loc(article.title, lang),
    subtitle: loc(article.subtitle, lang),
    metadataLine: `By ${author} ${article.authorHandle || ""} | Published ${article.publishedAt} | ${readMin} min read`,
    sections: [
      {
        title: loc(article.title, lang),
        abstractText,
        markdownContent: content,
        tags: article.tags,
      },
    ],
    footerCredit: `${siteName} - Article PDF`,
  };
}

export function buildIssuePdfInput(
  issue: JournalIssueRecord,
  articles: ArticleRecord[],
  lang: Lang,
  siteName: string
): PdfDocumentInput {
  const sections: PdfArticleSection[] = articles.map((art) => {
    const content = loc(art.content, lang);
    const readMin = calculateReadingTimeMinutes(content);
    return {
      title: loc(art.title, lang),
      subtitle: loc(art.subtitle, lang),
      byline: `${art.author || "Abdo Kamel"} | ${art.publishedAt} | ${readMin} min read`,
      abstractText: art.abstract ? loc(art.abstract, lang) : undefined,
      markdownContent: content,
      tags: art.tags,
    };
  });

  return {
    kicker: `${siteName} | ${issue.issueNumber} | ${issue.cadence.toUpperCase()} ISSUE`,
    title: loc(issue.title, lang),
    subtitle: loc(issue.subtitle, lang),
    metadataLine: `Period: ${issue.periodKey} | Published: ${issue.publishedAt} | Articles: ${articles.length}`,
    editorialNote: loc(issue.editorialNote, lang) || undefined,
    sections,
    footerCredit: `${siteName} - ${issue.issueNumber}`,
  };
}
