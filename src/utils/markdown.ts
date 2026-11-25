export type ContentBlock =
  | { type: "h2"; text: string; id: string }
  | { type: "h3"; text: string; id: string }
  | { type: "blockquote"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "ul"; items: string[] }
  | { type: "img"; alt: string; src: string }
  | { type: "embed"; assetId: string; caption?: string }
  | { type: "p"; text: string };

export interface TocItem {
  id: string;
  level: 2 | 3;
  title: string;
}

const EMBED_LINE_RE = /^\[\[embed:([a-zA-Z0-9_-]+)(?:\|([^\]]+))?\]\]$/;

function headingPlainText(raw: string): string {
  return tokenizeInlineMarkdown(raw)
    .map((t) => t.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function makeUniqueHeadingId(raw: string, used: Map<string, number>, fallbackIndex: number): string {
  const plain = headingPlainText(raw)
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = plain || `section-${fallbackIndex}`;
  const seen = used.get(base) || 0;
  used.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen + 1}`;
}

export function parseMarkdownBlocks(raw: string): ContentBlock[] {
  if (!raw || !raw.trim()) return [];
  const normalized = raw.replace(/\r\n/g, "\n");
  const blocks: ContentBlock[] = [];
  const lines = normalized.split("\n");
  const usedIds = new Map<string, number>();
  let headingCounter = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: "code", lang, code: codeLines.join("\n") });
      continue;
    }

    if (trimmed.startsWith("### ")) {
      const text = trimmed.slice(4).trim();
      headingCounter += 1;
      blocks.push({ type: "h3", text, id: makeUniqueHeadingId(text, usedIds, headingCounter) });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      const text = trimmed.slice(3).trim();
      headingCounter += 1;
      blocks.push({ type: "h2", text, id: makeUniqueHeadingId(text, usedIds, headingCounter) });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteLines.push(lines[i].trim().slice(2));
        i += 1;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join(" ") });
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))
      ) {
        items.push(lines[i].trim().slice(2).trim());
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    const embedMatch = trimmed.match(EMBED_LINE_RE);
    if (embedMatch) {
      blocks.push({
        type: "embed",
        assetId: embedMatch[1].trim(),
        caption: embedMatch[2]?.trim() || undefined,
      });
      i += 1;
      continue;
    }

    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (imgMatch) {
      blocks.push({ type: "img", alt: imgMatch[1].trim(), src: imgMatch[2].trim() });
      i += 1;
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith("## ") &&
      !lines[i].trim().startsWith("### ") &&
      !lines[i].trim().startsWith("> ") &&
      !lines[i].trim().startsWith("- ") &&
      !lines[i].trim().startsWith("* ") &&
      !EMBED_LINE_RE.test(lines[i].trim()) &&
      !/^!\[([^\]]*)\]\(([^)\s]+)\)$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "p", text: paraLines.join(" ") });
    }
  }

  return blocks;
}

export interface InlineToken {
  type: "text" | "bold" | "italic" | "code" | "link";
  text: string;
  href?: string;
}

export function tokenizeInlineMarkdown(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith("**") && raw.endsWith("**")) {
      tokens.push({ type: "bold", text: raw.slice(2, -2) });
    } else if (raw.startsWith("*") && raw.endsWith("*")) {
      tokens.push({ type: "italic", text: raw.slice(1, -1) });
    } else if (raw.startsWith("`") && raw.endsWith("`")) {
      tokens.push({ type: "code", text: raw.slice(1, -1) });
    } else if (raw.startsWith("[")) {
      const sep = raw.indexOf("](");
      const label = raw.slice(1, sep);
      const href = raw.slice(sep + 2, -1);
      tokens.push({ type: "link", text: label, href });
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", text: text.slice(lastIndex) });
  }
  return tokens;
}

export function extractTableOfContents(raw: string): TocItem[] {
  const blocks = parseMarkdownBlocks(raw);
  const items: TocItem[] = [];
  for (const block of blocks) {
    if (block.type === "h2" || block.type === "h3") {
      const title = headingPlainText(block.text);
      if (title) {
        items.push({
          id: block.id,
          level: block.type === "h2" ? 2 : 3,
          title,
        });
      }
    }
  }
  return items;
}
