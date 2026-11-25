export type ContentBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "ul"; items: string[] }
  | { type: "p"; text: string };

export function parseMarkdownBlocks(raw: string): ContentBlock[] {
  if (!raw || !raw.trim()) return [];
  const normalized = raw.replace(/\r\n/g, "\n");
  const blocks: ContentBlock[] = [];
  const lines = normalized.split("\n");
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
      blocks.push({ type: "h3", text: trimmed.slice(4).trim() });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: trimmed.slice(3).trim() });
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

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith("## ") &&
      !lines[i].trim().startsWith("### ") &&
      !lines[i].trim().startsWith("> ") &&
      !lines[i].trim().startsWith("- ") &&
      !lines[i].trim().startsWith("* ")
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
