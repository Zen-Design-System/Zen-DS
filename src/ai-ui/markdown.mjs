// Markdown → a Zen UI spec of catalogued components, so a model's prose answer renders with the same text styles,
// lists, links and tables as the UI it sits next to. A deliberate subset: headings, paragraphs with **bold**, *em*,
// `code` and [links](url), bullet and numbered lists, pipe tables, fenced code, quotes and rules. Anything else stays
// text. Isomorphic, no imports.
//
//   const spec = markdownToSpec("# Title\n\nSome **bold** text.\n\n- a\n- b");   → { version: 1, root: Stack… }
//   const node = markdownToNode(markdown, { idPrefix: "answer" });               → the Stack node alone (to place in a bubble)

const HEADING_LEVEL = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 5, 6: 6 }; // a chat answer never carries the page title (h1)

export function markdownToSpec(markdown, options = {}) {
  return { version: 1, root: markdownToNode(markdown, options) };
}

export function markdownToNode(markdown, { idPrefix = "md", gap = "md" } = {}) {
  let counter = 0;
  const id = (kind) => `${idPrefix}-${kind}-${++counter}`;
  const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "col";
  const blocks = parseBlocks(String(markdown ?? "").replace(/\r\n?/g, "\n"));
  const children = [];
  let lastHeading = null;
  for (const block of blocks) {
    switch (block.kind) {
      case "heading": lastHeading = block.text; children.push({ type: "Heading", id: id("heading"), props: { level: HEADING_LEVEL[block.level] ?? 4 }, children: inline(block.text, id) }); break;
      case "paragraph": children.push({ type: "Text", id: id("text"), children: inline(block.text, id) }); break;
      case "quote": children.push({ type: "Text", id: id("quote"), props: { tone: "light" }, children: inline(block.text, id) }); break;
      case "code": children.push({ type: "Text", id: id("code"), props: { as: "code" }, children: [block.text] }); break;
      case "rule": children.push({ type: "Divider", id: id("rule") }); break;
      case "list": children.push({ type: "List", id: id("list"), children: block.items.map((item, index) => ({ type: "ListItem", id: id("item"), props: { title: inline(block.ordered ? `${index + 1}. ${item}` : item, id) } })) }); break;
      case "table": {
        const used = new Set();
        const columns = block.header.map((header) => { let base = slug(header), key = base, n = 1; while (used.has(key)) key = `${base}-${++n}`; used.add(key); return { id: key, header }; });
        const rows = block.rows.map((cells, index) => Object.fromEntries([["id", `row-${index + 1}`], ...columns.map((column, c) => [column.id, cells[c] ?? ""])]));
        children.push({ type: "Table", id: id("table"), props: { "aria-label": lastHeading ?? "Table", columns, rows } });
        break;
      }
      default: break;
    }
  }
  return { type: "Stack", id: `${idPrefix}-root`, props: { gap }, children };
}

/* ── blocks ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

function parseBlocks(text) {
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;
  const paragraph = [];
  const flush = () => { if (paragraph.length) { blocks.push({ kind: "paragraph", text: paragraph.join(" ") }); paragraph.length = 0; } };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { flush(); i++; continue; }
    const fence = /^\s*```/.exec(line);
    if (fence) {
      flush();
      const body = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++]);
      i++;
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) { flush(); blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] }); i++; continue; }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { flush(); blocks.push({ kind: "rule" }); i++; continue; }
    if (/^\s*>\s?/.test(line)) {
      flush();
      const quote = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push({ kind: "quote", text: quote.join(" ") });
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
      flush();
      const cells = (row) => row.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
      const header = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      blocks.push({ kind: "table", header, rows });
      continue;
    }
    const item = /^\s*(?:([-*+])|(\d+)[.)])\s+(.+)$/.exec(line);
    if (item) {
      flush();
      const ordered = Boolean(item[2]);
      const items = [];
      while (i < lines.length) {
        const next = /^\s*(?:([-*+])|(\d+)[.)])\s+(.+)$/.exec(lines[i]);
        if (next && Boolean(next[2]) === ordered) { items.push(next[3]); i++; continue; }
        if (/^\s{2,}\S/.test(lines[i] ?? "") && items.length) { items[items.length - 1] += ` ${lines[i].trim()}`; i++; continue; }
        break;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }
    paragraph.push(line.trim());
    i++;
  }
  flush();
  return blocks;
}

/* ── inline ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

const INLINE = /(\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|(?<![\w*])\*([^*\s][^*]*?)\*(?!\w)|(?<![\w_])_([^_\s][^_]*?)_(?!\w))/g;

/** Inline Markdown → children: strings and Text / Link nodes. */
export function inline(text, id = (kind) => `${kind}`) {
  const out = [];
  let last = 0;
  for (const match of String(text).matchAll(INLINE)) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const [, , bold, bold2, code, linkText, href, em, em2] = match;
    if (bold ?? bold2) out.push({ type: "Text", id: id("strong"), props: { as: "strong", textStyle: "Body/Base/Bold" }, children: inline(bold ?? bold2, id) });
    else if (code) out.push({ type: "Text", id: id("code"), props: { as: "code" }, children: [code] });
    else if (linkText) out.push({ type: "Link", id: id("link"), props: { href, external: /^https?:\/\//.test(href) }, children: inline(linkText, id) });
    else if (em ?? em2) out.push({ type: "Text", id: id("em"), props: { as: "em" }, children: inline(em ?? em2, id) });
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length ? out : [""];
}
