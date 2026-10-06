/*
 * Syntax tokens for the Studio code view: a hand-written, linear-time scanner per language that never throws (bad
 * input degrades to plain text). TSX/TS track a small mode stack (code, template literal, JSX tag, JSX children) so
 * JSX colours correctly inside expressions and expressions inside JSX.
 */

export type CodeLanguage = "tsx" | "ts" | "css" | "json" | "bash";

export type TokenType =
  | "plain" | "punct" | "comment" | "keyword" | "string" | "number" | "literal" | "regex" | "function" | "type" | "property"
  | "component" | "tag" | "attr" | "text" | "interp" | "selector" | "value" | "variable";

export type Token = { type: TokenType; text: string };
/** One source line: its tokens in order (no line breaks inside). */
export type CodeLine = Token[];

class Output {
  readonly tokens: Token[] = [];
  push(type: TokenType, text: string) {
    if (!text) return;
    const last = this.tokens[this.tokens.length - 1];
    if (last && last.type === type) last.text += text;
    else this.tokens.push({ type, text });
  }
}

/** Splits tokens at line breaks (\r\n, \n, \r): always as many lines as the text has. */
function toLines(tokens: Token[]): CodeLine[] {
  const lines: CodeLine[] = [[]];
  for (const token of tokens) {
    const parts = token.text.split(/\r\n|\n|\r/);
    parts.forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ type: token.type, text: part });
    });
  }
  return lines;
}

/** Tokens per line. Never throws: on an internal error the text comes back plain. */
export function tokenize(code: string, language: CodeLanguage = "tsx"): CodeLine[] {
  const out = new Output();
  try {
    if (language === "css") scanCss(code, out);
    else if (language === "json") scanJson(code, out);
    else if (language === "bash") scanBash(code, out);
    else scanScript(code, out, language === "tsx");
    return toLines(out.tokens);
  } catch {
    return toLines([{ type: "plain", text: code }]);
  }
}

/* ── shared scanners (each returns the index after what it read) ────────────────────────────────────────────────── */

const isSpace = (c: string) => c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f" || c === "\v" || c === " " || c === "﻿";
const IDENT_START = /[A-Za-z_$À-￿]/;
const IDENT_PART = /[\w$À-￿]/;

function readSpaces(src: string, i: number) {
  while (i < src.length && isSpace(src[i])) i += 1;
  return i;
}

function readWhile(src: string, i: number, test: RegExp) {
  while (i < src.length && test.test(src[i])) i += 1;
  return i;
}

/** A quoted string with backslash escapes; stops at an unescaped line break when `multiline` is false. */
function readQuoted(src: string, i: number, multiline: boolean, escapes = true) {
  const quote = src[i];
  let j = i + 1;
  while (j < src.length) {
    const c = src[j];
    if (escapes && c === "\\") { j += 2; continue; }
    if (c === quote) return j + 1;
    if (!multiline && (c === "\n" || c === "\r")) return j;
    j += 1;
  }
  return src.length;
}

function readBlockComment(src: string, i: number) {
  const end = src.indexOf("*/", i + 2);
  return end < 0 ? src.length : end + 2;
}

function readLineComment(src: string, i: number) {
  let j = i;
  while (j < src.length && src[j] !== "\n" && src[j] !== "\r") j += 1;
  return j;
}

const NUMBER = /0[xX][\da-fA-F_]+n?|0[bB][01_]+n?|0[oO][0-7_]+n?|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?n?/y;

function readNumber(src: string, i: number) {
  NUMBER.lastIndex = i;
  const match = NUMBER.exec(src);
  return match && match[0] ? i + match[0].length : i + 1;
}

/** Index of the next non-blank character on the same line (bounded lookahead), or -1. */
function peekIndex(src: string, i: number) {
  const limit = Math.min(src.length, i + 64);
  for (let j = i; j < limit; j += 1) if (src[j] !== " " && src[j] !== "\t") return j;
  return -1;
}

/* ── TS / TSX ────────────────────────────────────────────────────────────────────────────────────────────────────── */

const KEYWORDS = new Set([
  "abstract", "as", "async", "await", "break", "case", "catch", "class", "const", "continue", "debugger", "declare", "default",
  "delete", "do", "else", "enum", "export", "extends", "finally", "for", "from", "function", "if", "implements", "import", "in",
  "instanceof", "interface", "keyof", "let", "namespace", "new", "of", "private", "protected", "public", "readonly", "return",
  "satisfies", "static", "super", "switch", "this", "throw", "try", "typeof", "var", "void", "while", "with", "yield",
]);
const LITERALS = new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]);
const PRIMITIVE_TYPES = new Set(["string", "number", "boolean", "bigint", "symbol", "object", "unknown", "any", "never"]);
const PUNCTUATORS = [">>>=", "...", "===", "!==", "**=", "<<=", ">>=", ">>>", "&&=", "||=", "??=", "=>", "==", "!=", "<=", ">=", "&&", "||", "??", "?.", "++", "--", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "**", "<<", ">>"];
/** After these a `<` opens JSX and a `/` opens a regex (an expression may start). */
const EXPRESSION_START = new Set(["(", ",", "=", ":", "?", "[", "{", "&&", "||", "??", "=>", "!", ";", "${", "+", "-", "*", "%", "<", ">", "==", "===", "!=", "!==", "+=", "-=", "&", "|", "^", "~", "...", "return"]);
const EXPRESSION_KEYWORDS = new Set(["return", "yield", "await", "case", "default", "do", "else", "in", "of", "new", "delete", "void", "throw", "typeof", "instanceof"]);
/** After these an `identifier:` is an object key (or a parameter / interface member). */
const KEY_CONTEXT = new Set(["{", ",", "(", ";"]);

type Frame =
  | { kind: "code"; depth: number }
  | { kind: "template" }
  | { kind: "tag"; closing: boolean; named: boolean }
  | { kind: "children" };

type Significant = { type: TokenType; text: string } | null;

function expressionCanStart(prev: Significant) {
  if (!prev) return true;
  if (prev.type === "punct" || prev.type === "interp") return EXPRESSION_START.has(prev.text);
  if (prev.type === "keyword") return EXPRESSION_KEYWORDS.has(prev.text);
  return false;
}

function scanScript(src: string, out: Output, jsx: boolean) {
  const stack: Frame[] = [{ kind: "code", depth: 0 }];
  const top = () => stack[stack.length - 1];
  const pop = () => {
    stack.pop();
    if (!stack.length) stack.push({ kind: "code", depth: 0 });
  };
  let prev: Significant = null;
  let i = 0;
  const n = src.length;

  while (i < n) {
    const frame = top();
    const c = src[i];

    if (frame.kind === "template") {
      let j = i;
      while (j < n && src[j] !== "`" && !(src[j] === "$" && src[j + 1] === "{")) j += src[j] === "\\" ? 2 : 1;
      j = Math.min(j, n);
      out.push("string", src.slice(i, j));
      if (j >= n) break;
      if (src[j] === "`") {
        out.push("string", "`");
        pop();
        prev = { type: "string", text: "`" };
        i = j + 1;
      } else {
        out.push("interp", "${");
        stack.push({ kind: "code", depth: 0 });
        prev = { type: "interp", text: "${" };
        i = j + 2;
      }
      continue;
    }

    if (frame.kind === "children") {
      if (c === "<") {
        const closing = src[i + 1] === "/";
        out.push("punct", closing ? "</" : "<");
        stack.push({ kind: "tag", closing, named: false });
        i += closing ? 2 : 1;
      } else if (c === "{") {
        out.push("punct", "{");
        stack.push({ kind: "code", depth: 0 });
        prev = { type: "punct", text: "{" };
        i += 1;
      } else {
        let j = i;
        while (j < n && src[j] !== "<" && src[j] !== "{") j += 1;
        out.push("text", src.slice(i, j));
        i = j;
      }
      continue;
    }

    if (frame.kind === "tag") {
      if (isSpace(c)) {
        const j = readSpaces(src, i);
        out.push("plain", src.slice(i, j));
        i = j;
      } else if (!frame.named) {
        frame.named = true;
        if (IDENT_START.test(c)) {
          const j = readWhile(src, i, /[\w$.:\-À-￿]/);
          const name = src.slice(i, j);
          out.push(/^[A-Z]/.test(name) || name.includes(".") ? "component" : "tag", name);
          i = j;
        }
      } else if (c === "/" && src[i + 1] === ">") {
        out.push("punct", "/>");
        pop();
        prev = { type: "component", text: "/>" };
        i += 2;
      } else if (c === ">") {
        out.push("punct", ">");
        pop();
        if (frame.closing) {
          if (top().kind === "children") pop();
          prev = { type: "component", text: ">" };
        } else stack.push({ kind: "children" });
        i += 1;
      } else if (c === "{") {
        out.push("punct", "{");
        stack.push({ kind: "code", depth: 0 });
        prev = { type: "punct", text: "{" };
        i += 1;
      } else if (c === '"' || c === "'") {
        const j = readQuoted(src, i, true, false);
        out.push("string", src.slice(i, j));
        i = j;
      } else if (c === "/" && (src[i + 1] === "*" || src[i + 1] === "/")) {
        const j = src[i + 1] === "*" ? readBlockComment(src, i) : readLineComment(src, i);
        out.push("comment", src.slice(i, j));
        i = j;
      } else if (IDENT_START.test(c)) {
        const j = readWhile(src, i, /[\w$:\-À-￿]/);
        out.push("attr", src.slice(i, j));
        i = j;
      } else if (c === ";") {
        // A `;` cannot sit inside a tag: the `<` was a comparison after all.
        pop();
        out.push("punct", c);
        prev = { type: "punct", text: c };
        i += 1;
      } else {
        out.push("punct", c);
        i += 1;
      }
      continue;
    }

    // Code.
    if (isSpace(c)) {
      const j = readSpaces(src, i);
      out.push("plain", src.slice(i, j));
      i = j;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      const j = readLineComment(src, i);
      out.push("comment", src.slice(i, j));
      i = j;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const j = readBlockComment(src, i);
      out.push("comment", src.slice(i, j));
      i = j;
      continue;
    }
    if (c === '"' || c === "'") {
      const j = readQuoted(src, i, false);
      out.push("string", src.slice(i, j));
      prev = { type: "string", text: c };
      i = j;
      continue;
    }
    if (c === "`") {
      out.push("string", "`");
      stack.push({ kind: "template" });
      i += 1;
      continue;
    }
    if (/\d/.test(c) || (c === "." && /\d/.test(src[i + 1] ?? ""))) {
      const j = readNumber(src, i);
      out.push("number", src.slice(i, j));
      prev = { type: "number", text: "0" };
      i = j;
      continue;
    }
    if (IDENT_START.test(c)) {
      const j = readWhile(src, i, IDENT_PART);
      const word = src.slice(i, j);
      const nextIndex = peekIndex(src, j);
      const next = nextIndex < 0 ? "" : src[nextIndex];
      const member = prev?.type === "punct" && (prev.text === "." || prev.text === "?.");
      // `key:` and optional `key?:` after { , ( ; are object keys, parameters or interface members.
      const keyLike = (next === ":" || (next === "?" && src[nextIndex + 1] === ":")) && (prev === null || (prev.type === "punct" && KEY_CONTEXT.has(prev.text)));
      let type: TokenType;
      if (member) type = next === "(" ? "function" : "plain";
      else if (keyLike) type = "property";
      else if (KEYWORDS.has(word)) type = "keyword";
      else if (LITERALS.has(word)) type = "literal";
      else if (PRIMITIVE_TYPES.has(word)) type = "type";
      else if (next === "(") type = "function";
      else if (/^[A-Z][A-Z0-9_]+$/.test(word)) type = "literal";
      else if (/^[A-Z]/.test(word)) type = "type";
      else if (word === "type" && (prev === null || (prev.type === "punct" && (prev.text === ";" || prev.text === "}")) || prev?.text === "export" || prev?.text === "declare")) type = "keyword";
      else type = "plain";
      out.push(type, word);
      prev = { type, text: word };
      i = j;
      continue;
    }
    if (c === "<" && jsx && expressionCanStart(prev)) {
      // JSX when a tag name (or a fragment's ">") follows and the name ends like a tag, not like `<T,>` generics.
      const nameEnd = readWhile(src, i + 1, /[\w$.:\-À-￿]/);
      const after = src[nameEnd] ?? "";
      const isFragment = src[i + 1] === ">";
      if (isFragment || (nameEnd > i + 1 && IDENT_START.test(src[i + 1]) && (isSpace(after) || after === ">" || after === "/" || after === "{"))) {
        out.push("punct", "<");
        stack.push({ kind: "tag", closing: false, named: false });
        i += 1;
        continue;
      }
    }
    if (c === "/" && expressionCanStart(prev)) {
      let j = i + 1;
      let inClass = false;
      while (j < n && src[j] !== "\n" && src[j] !== "\r") {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === "[") inClass = true;
        else if (src[j] === "]") inClass = false;
        else if (src[j] === "/" && !inClass) break;
        j += 1;
      }
      if (j < n && src[j] === "/") {
        j = readWhile(src, j + 1, /[a-z]/);
        out.push("regex", src.slice(i, j));
        prev = { type: "regex", text: "/" };
        i = j;
        continue;
      }
    }
    if (c === "{") {
      if (frame.kind === "code") frame.depth += 1;
      out.push("punct", c);
      prev = { type: "punct", text: c };
      i += 1;
      continue;
    }
    if (c === "}") {
      if (frame.kind === "code" && frame.depth === 0 && stack.length > 1) {
        pop();
        const parent = top();
        out.push(parent.kind === "template" ? "interp" : "punct", c);
        prev = { type: "punct", text: "}" };
      } else {
        if (frame.kind === "code") frame.depth = Math.max(0, frame.depth - 1);
        out.push("punct", c);
        prev = { type: "punct", text: c };
      }
      i += 1;
      continue;
    }
    const punctuator = PUNCTUATORS.find((p) => src.startsWith(p, i)) ?? c;
    out.push(/[\wÀ-￿]/.test(punctuator) ? "plain" : "punct", punctuator);
    prev = { type: "punct", text: punctuator };
    i += punctuator.length;
  }
}

/* ── CSS ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Whether the statement starting at `i` is a rule (selector + block) rather than a declaration. */
function cssStatementIsRule(src: string, i: number) {
  for (let j = i; j < src.length; j += 1) {
    const c = src[j];
    if (c === '"' || c === "'") { j = readQuoted(src, j, false) - 1; continue; }
    if (c === "/" && src[j + 1] === "*") { j = readBlockComment(src, j) - 1; continue; }
    if (c === "{") return true;
    if (c === ";" || c === "}") return false;
  }
  return false;
}

function scanCss(src: string, out: Output) {
  let i = 0;
  let depth = 0;
  let mode: "start" | "selector" | "atrule" | "property" | "value" = "start";
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (isSpace(c)) {
      const j = readSpaces(src, i);
      out.push("plain", src.slice(i, j));
      i = j;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const j = readBlockComment(src, i);
      out.push("comment", src.slice(i, j));
      i = j;
      continue;
    }
    if (c === "{" || c === "}" || c === ";") {
      depth = c === "{" ? depth + 1 : c === "}" ? Math.max(0, depth - 1) : depth;
      out.push("punct", c);
      mode = "start";
      i += 1;
      continue;
    }
    if (mode === "start") mode = c === "@" ? "atrule" : depth === 0 || cssStatementIsRule(src, i) ? "selector" : "property";
    if (c === '"' || c === "'") {
      const j = readQuoted(src, i, false);
      out.push("string", src.slice(i, j));
      i = j;
      continue;
    }
    if (mode === "selector") {
      if (c === ",") {
        out.push("punct", c);
        i += 1;
      } else {
        let j = i;
        while (j < n && !isSpace(src[j]) && src[j] !== "{" && src[j] !== "," && !(src[j] === "/" && src[j + 1] === "*")) j += 1;
        out.push(/^[>+~]$/.test(src.slice(i, j)) ? "punct" : "selector", src.slice(i, Math.max(j, i + 1)));
        i = Math.max(j, i + 1);
      }
      continue;
    }
    if (mode === "property") {
      if (c === ":") {
        out.push("punct", c);
        mode = "value";
        i += 1;
      } else {
        const j = Math.max(readWhile(src, i, /[-\w]/), i + 1);
        out.push("property", src.slice(i, j));
        i = j;
      }
      continue;
    }
    // At-rule prelude and declaration values.
    if (c === "@") {
      const j = readWhile(src, i + 1, /[-\w]/);
      out.push("keyword", src.slice(i, j));
      i = j;
    } else if (c === "!") {
      const j = readWhile(src, i + 1, /[a-z]/i);
      out.push("keyword", src.slice(i, j));
      i = j;
    } else if (c === "#") {
      const j = readWhile(src, i + 1, /[\da-fA-F]/);
      out.push("number", src.slice(i, j));
      i = j;
    } else if (/\d/.test(c) || ((c === "." || c === "-" || c === "+") && /\d/.test(src[i + 1] ?? ""))) {
      let j = readWhile(src, i + 1, /[\d.]/);
      j = readWhile(src, j, /[a-zA-Z%]/);
      out.push("number", src.slice(i, j));
      i = j;
    } else if (c === "-" && src[i + 1] === "-") {
      const j = readWhile(src, i, /[-\w]/);
      out.push("variable", src.slice(i, j));
      i = j;
    } else if (/[-\w]/.test(c)) {
      const j = readWhile(src, i, /[-\w]/);
      out.push(src[j] === "(" ? "function" : "value", src.slice(i, j));
      i = j;
    } else {
      out.push("punct", c);
      i += 1;
    }
  }
}

/* ── JSON ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

function scanJson(src: string, out: Output) {
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (isSpace(c)) {
      const j = readSpaces(src, i);
      out.push("plain", src.slice(i, j));
      i = j;
    } else if (c === '"') {
      const j = readQuoted(src, i, false);
      out.push(src[readSpaces(src, j)] === ":" ? "property" : "string", src.slice(i, j));
      i = j;
    } else if (c === "-" || /\d/.test(c)) {
      const j = Math.max(readWhile(src, i + 1, /[\d.eE+-]/), i + 1);
      out.push("number", src.slice(i, j));
      i = j;
    } else if (/[a-z]/.test(c)) {
      const j = readWhile(src, i, /[a-z]/);
      const word = src.slice(i, j);
      out.push(word === "true" || word === "false" || word === "null" ? "literal" : "plain", word);
      i = j;
    } else if (c === "/" && (src[i + 1] === "/" || src[i + 1] === "*")) {
      const j = src[i + 1] === "*" ? readBlockComment(src, i) : readLineComment(src, i);
      out.push("comment", src.slice(i, j));
      i = j;
    } else {
      out.push("punct", c);
      i += 1;
    }
  }
}

/* ── bash ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

function scanBash(src: string, out: Output) {
  let i = 0;
  let commandStart = true;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === "\n" || c === "\r") {
      out.push("plain", c);
      commandStart = src[i - 1] !== "\\" || commandStart;
      i += 1;
    } else if (isSpace(c)) {
      const j = readWhile(src, i, /[ \t]/);
      out.push("plain", src.slice(i, Math.max(j, i + 1)));
      i = Math.max(j, i + 1);
    } else if (c === "#" && (i === 0 || isSpace(src[i - 1]))) {
      const j = readLineComment(src, i);
      out.push("comment", src.slice(i, j));
      i = j;
    } else if (c === '"' || c === "'") {
      const j = readQuoted(src, i, true, c === '"');
      out.push("string", src.slice(i, j));
      commandStart = false;
      i = j;
    } else if (c === "$") {
      const j = src[i + 1] === "{" ? Math.min(n, (src.indexOf("}", i) + 1) || n) : Math.max(readWhile(src, i + 1, /[\w@#?*!$-]/), i + 1);
      out.push("variable", src.slice(i, j));
      commandStart = false;
      i = j;
    } else if (/[|&;()<>\\]/.test(c)) {
      const j = readWhile(src, i, /[|&;()<>]/);
      const text = src.slice(i, Math.max(j, i + 1));
      out.push("punct", text);
      if (c !== "\\" && c !== "<" && c !== ">") commandStart = true;
      i = Math.max(j, i + 1);
    } else {
      let j = i;
      while (j < n && !isSpace(src[j]) && !/[|&;()<>"'$\\]/.test(src[j])) j += 1;
      j = Math.max(j, i + 1);
      const word = src.slice(i, j);
      if (commandStart && /^[A-Za-z_]\w*=/.test(word)) out.push("variable", word);
      else if (commandStart) {
        out.push("function", word);
        commandStart = false;
      } else out.push(word.startsWith("-") ? "attr" : "plain", word);
      i = j;
    }
  }
}
