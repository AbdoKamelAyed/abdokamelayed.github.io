export type CodeTokenType =
  | "comment"
  | "string"
  | "keyword"
  | "number"
  | "type"
  | "function"
  | "property"
  | "operator"
  | "punctuation"
  | "plain";

export interface CodeToken {
  type: CodeTokenType;
  value: string;
}

const LANGUAGE_ALIASES: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  md: "markdown",
  htm: "html",
  xml: "html",
};

const KEYWORDS_BY_LANG: Record<string, Set<string>> = {
  common: new Set([
    "import",
    "from",
    "export",
    "default",
    "const",
    "let",
    "var",
    "function",
    "return",
    "if",
    "else",
    "for",
    "while",
    "switch",
    "case",
    "break",
    "continue",
    "try",
    "catch",
    "finally",
    "throw",
    "async",
    "await",
    "new",
    "class",
    "extends",
    "implements",
    "interface",
    "type",
    "enum",
    "public",
    "private",
    "protected",
    "readonly",
    "as",
    "in",
    "of",
    "typeof",
    "keyof",
    "true",
    "false",
    "null",
    "undefined",
    "void",
    "def",
    "elif",
    "pass",
    "with",
    "yield",
    "lambda",
    "None",
    "True",
    "False",
    "and",
    "or",
    "not",
    "is",
    "SELECT",
    "FROM",
    "WHERE",
    "INSERT",
    "INTO",
    "VALUES",
    "UPDATE",
    "SET",
    "DELETE",
    "CREATE",
    "TABLE",
    "ORDER",
    "BY",
    "GROUP",
    "JOIN",
    "ON",
    "LIMIT",
    "AS",
    "AND",
    "OR",
    "NOT",
    "echo",
    "fi",
    "then",
    "do",
    "done",
    "esac",
    "local",
    "sudo",
    "npm",
    "npx",
    "git",
    "curl",
  ]),
};

const BUILTIN_TYPES = new Set([
  "string",
  "number",
  "boolean",
  "unknown",
  "never",
  "any",
  "object",
  "Record",
  "Array",
  "Promise",
  "Partial",
  "Map",
  "Set",
  "React",
  "Date",
  "Error",
  "URL",
  "Blob",
  "File",
  "Response",
  "Request",
  "HTMLElement",
  "Uint8Array",
  "int",
  "float",
  "str",
  "dict",
  "list",
  "tuple",
  "bool",
]);

export function normalizeCodeLanguage(raw?: string): string {
  const key = (raw || "").trim().toLowerCase();
  if (!key) return "text";
  return LANGUAGE_ALIASES[key] || key;
}

function pushToken(tokens: CodeToken[], type: CodeTokenType, value: string) {
  if (!value) return;
  const last = tokens[tokens.length - 1];
  if (last && last.type === type) {
    last.value += value;
  } else {
    tokens.push({ type, value });
  }
}

export function tokenizeCodeLine(
  line: string,
  language?: string,
  state: { inBlockComment: boolean } = { inBlockComment: false }
): CodeToken[] {
  const lang = normalizeCodeLanguage(language);
  const tokens: CodeToken[] = [];
  let i = 0;

  const isHashCommentLang =
    lang === "python" || lang === "bash" || lang === "yaml" || lang === "dockerfile" || lang === "toml";
  const isSqlCommentLang = lang === "sql";

  while (i < line.length) {
    if (state.inBlockComment) {
      const endIdx = line.indexOf("*/", i);
      if (endIdx === -1) {
        pushToken(tokens, "comment", line.slice(i));
        break;
      } else {
        pushToken(tokens, "comment", line.slice(i, endIdx + 2));
        state.inBlockComment = false;
        i = endIdx + 2;
        continue;
      }
    }

    // Comments
    if (line.startsWith("//", i) && lang !== "python" && lang !== "yaml") {
      pushToken(tokens, "comment", line.slice(i));
      break;
    }
    if (line.startsWith("/*", i)) {
      const endIdx = line.indexOf("*/", i + 2);
      if (endIdx === -1) {
        pushToken(tokens, "comment", line.slice(i));
        state.inBlockComment = true;
        break;
      } else {
        pushToken(tokens, "comment", line.slice(i, endIdx + 2));
        i = endIdx + 2;
        continue;
      }
    }
    if (isHashCommentLang && line[i] === "#") {
      pushToken(tokens, "comment", line.slice(i));
      break;
    }
    if (isSqlCommentLang && line.startsWith("--", i)) {
      pushToken(tokens, "comment", line.slice(i));
      break;
    }

    // Quoted strings (', ", `)
    const ch = line[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === "\\") {
          j += 2;
          continue;
        }
        if (line[j] === ch) {
          j += 1;
          break;
        }
        j += 1;
      }
      const rawStr = line.slice(i, j);
      // JSON keys vs string values
      const rest = line.slice(j).trimStart();
      if (lang === "json" && rest.startsWith(":")) {
        pushToken(tokens, "property", rawStr);
      } else {
        pushToken(tokens, "string", rawStr);
      }
      i = j;
      continue;
    }

    // Whitespace
    if (/\s/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /\s/.test(line[j])) j += 1;
      pushToken(tokens, "plain", line.slice(i, j));
      i = j;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch) && (i === 0 || !/[A-Za-z0-9_$]/.test(line[i - 1]))) {
      const numMatch = line.slice(i).match(/^(?:0x[0-9a-fA-F_]+|0b[01_]+|[0-9][0-9_]*(?:\.[0-9_]+)?)/);
      if (numMatch) {
        pushToken(tokens, "number", numMatch[0]);
        i += numMatch[0].length;
        continue;
      }
    }

    // HTML / JSX tag names
    if (lang === "html" && ch === "<") {
      const tagMatch = line.slice(i).match(/^<\/?[A-Za-z][A-Za-z0-9:-]*/);
      if (tagMatch) {
        pushToken(tokens, "punctuation", tagMatch[0].startsWith("</") ? "</" : "<");
        pushToken(tokens, "keyword", tagMatch[0].replace(/^<\/?/, ""));
        i += tagMatch[0].length;
        continue;
      }
    }

    // Identifiers
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_$-]/.test(line[j])) {
        if (line[j] === "-" && lang !== "css" && lang !== "yaml") break;
        j += 1;
      }
      const word = line.slice(i, j);
      const after = line.slice(j).trimStart();

      if (lang === "yaml" && after.startsWith(":")) {
        pushToken(tokens, "property", word);
      } else if (KEYWORDS_BY_LANG.common.has(word) || KEYWORDS_BY_LANG.common.has(word.toUpperCase())) {
        pushToken(tokens, "keyword", word);
      } else if (BUILTIN_TYPES.has(word) || /^[A-Z][A-Za-z0-9_]*$/.test(word)) {
        pushToken(tokens, after.startsWith("(") ? "function" : "type", word);
      } else if (after.startsWith("(")) {
        pushToken(tokens, "function", word);
      } else if (i > 0 && line[i - 1] === ".") {
        pushToken(tokens, "property", word);
      } else {
        pushToken(tokens, "plain", word);
      }
      i = j;
      continue;
    }

    // Multi-char operators
    const opMatch = line.slice(i).match(/^(?:===|!==|=>|<=|>=|&&|\|\||\?\?|\+=|-=|\*=|\/=|==|!=|\.\.\.)/);
    if (opMatch) {
      pushToken(tokens, "operator", opMatch[0]);
      i += opMatch[0].length;
      continue;
    }

    if (/[+\-*/%=&|<>!?:]/.test(ch)) {
      pushToken(tokens, "operator", ch);
      i += 1;
      continue;
    }

    if (/[()[\]{}.,;]/.test(ch)) {
      pushToken(tokens, "punctuation", ch);
      i += 1;
      continue;
    }

    pushToken(tokens, "plain", ch);
    i += 1;
  }

  return tokens;
}

export function tokenizeCode(
  code: string,
  language?: string
): { normalizedLanguage: string; lines: CodeToken[][] } {
  const normalizedLanguage = normalizeCodeLanguage(language);
  const rawLines = (code || "").replace(/\r\n/g, "\n").split("\n");
  const state = { inBlockComment: false };
  const lines = rawLines.map((line) => tokenizeCodeLine(line, normalizedLanguage, state));
  return { normalizedLanguage, lines };
}
