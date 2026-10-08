// Zen DS usage harness — the scanner. Finds Zen JSX elements and CSS rules in source text and runs the rule registry
// (check-usage.mjs) on them. No file-system access and no side effects on import, so the CLI (cli.mjs), the ESLint
// plugin (eslint.mjs) and the MCP server share it.
//
//   const checker = createChecker(rules, { consumer: true });
//   checker.checkFile(sourceText, "src/App.tsx") → [{ rule, message, line, column, index, tag, file }]
//
// Repo mode (default) checks every tag named in a rule. Consumer mode (apps using the package) checks only the tags
// imported from "@zen-ds/react" — named imports (aliases resolved) and namespace imports (<Zen.Button>) — so an
// app's own <Button> is never judged by Zen's rules.

/** Selectors that style an interaction state; their classes count as actionable containers (border rule §6). */
export const interactionRe = /:(hover|active|focus|focus-visible|focus-within|checked)\b|\[(data-state|data-selected|aria-selected|aria-pressed|aria-checked|aria-expanded)/;
export const classesOf = (selector) => [...selector.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);

/**
 * Layout facts per CSS class — which classes stretch their children across the row (grid / flex column), which
 * stretch themselves, which opt out. Rules read it (button/small-full-width); callers feed it every stylesheet in
 * scope with learnLayoutClasses().
 */
export const layoutClasses = { grid: new Set(), column: new Set(), fullWidth: new Set(), hugX: new Set(), hugY: new Set(), keepsAlign: new Set(), keepsJustify: new Set() };

export function learnLayoutClasses(css) {
  for (const [, sel, body] of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    // Only plain class selectors (".a" / ".a.b") describe the class itself; contextual overrides don't.
    const own = sel.split(",").flatMap((part) => /^\s*(\.[\w-]+)+\s*$/.test(part) ? classesOf(part) : []);
    const add = (set) => own.forEach((c) => set.add(c));
    if (/flex-direction\s*:\s*column|flex-flow\s*:\s*column/.test(body)) add(layoutClasses.column);
    if (/display\s*:\s*(inline-)?grid/.test(body) && !/grid-auto-flow\s*:\s*column/.test(body)) add(layoutClasses.grid);
    if (/(^|[;\s])align-items\s*:\s*(?!stretch|normal)/.test(body)) add(layoutClasses.keepsAlign);
    if (/(^|[;\s])justify-items\s*:\s*(?!stretch|normal)/.test(body)) add(layoutClasses.keepsJustify);
    if (/(^|[;\s])(width|inline-size)\s*:\s*100%/.test(body) || /(^|[;\s])flex\s*:\s*1\b|flex-grow\s*:\s*[1-9]/.test(body)) add(layoutClasses.fullWidth);
    if (/justify-self\s*:\s*(?!stretch|normal|auto)/.test(body)) add(layoutClasses.hugX);
    if (/align-self\s*:\s*(?!stretch|normal|auto)/.test(body)) add(layoutClasses.hugY);
  }
}

/** Serialisable form of layoutClasses (shipped as dist/usage-context.json so the packaged harness knows Zen's own classes). */
export const layoutClassesJson = () => Object.fromEntries(Object.entries(layoutClasses).map(([key, set]) => [key, [...set].sort()]));
export function loadLayoutClasses(json) {
  for (const [key, list] of Object.entries(json ?? {})) for (const c of list) layoutClasses[key]?.add(c);
}

/** Scan `<Tag …>` from index `start`; returns { attrs, end, selfClosing } honouring {…}, strings and template literals. */
function readTag(src, start) {
  let i = start, depth = 0, quote = null;
  while (i < src.length) {
    const ch = src[i];
    // Escapes (\` inside code-sample template strings) never open or close anything.
    if (ch === "\\") { i += 2; continue; }
    if (quote) { if (ch === quote) quote = null; }
    else if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0 && src[i - 1] !== "=") return { attrs: src.slice(start, i), end: i + 1, selfClosing: src[i - 1] === "/" };
    i++;
  }
  return null;
}

/** Children source of a non-self-closing element, balancing nested tags of the same name. */
function readChildren(src, tag, from) {
  const open = new RegExp(`<${tag.replace(".", "\\.")}\\b`, "g"), close = `</${tag}>`;
  let depth = 1, i = from;
  while (depth > 0) {
    const nextClose = src.indexOf(close, i); if (nextClose < 0) return "";
    open.lastIndex = i; const nextOpen = open.exec(src);
    if (nextOpen && nextOpen.index < nextClose) { const inner = readTag(src, nextOpen.index + nextOpen[0].length); if (inner && !inner.selfClosing) depth++; i = inner ? inner.end : nextOpen.index + 1; } else { depth--; i = nextClose + close.length; if (depth === 0) return src.slice(from, nextClose); }
  }
  return "";
}

/** Nearest enclosing JSX opening tag before `index` (skips generics like useState<T>, self-closing and closed siblings; tags inside other template strings (code samples) are ignored). */
function parentTag(src, index) {
  // A tag belongs to the element's own context only when an even number of backticks separates them (same template string, or none).
  const sameString = (i) => (src.slice(i, index).match(/(?<!\\)`/g) ?? []).length % 2 === 0;
  const tokens = [], re = /<(\/?)([A-Za-z][\w.-]*|(?=>))/g; re.lastIndex = Math.max(0, index - 6000); let m;
  while ((m = re.exec(src)) && m.index < index) {
    if ((!m[1] && /[\w$)\]]/.test(src[m.index - 1] ?? "")) || !sameString(m.index)) continue;
    if (m[1]) { tokens.push({ close: true }); continue; }
    const read = readTag(src, m.index + m[0].length); if (!read) continue;
    tokens.push({ tag: m[2] || "Fragment", attrs: read.attrs, self: read.selfClosing });
  }
  for (let i = tokens.length - 1, depth = 0; i >= 0; i--) { const t = tokens[i]; if (t.close) depth++; else if (t.self) continue; else if (depth === 0) return t; else depth--; }
  return null;
}

const position = (src, index) => { const before = src.slice(0, index); const line = before.split("\n").length; return { line, column: index - before.lastIndexOf("\n") }; };
/** A `zen-allow-<token>` comment on the element's line or the four lines above it. */
const allowed = (src, index, token) => src.slice(Math.max(0, src.lastIndexOf("\n", index - 1) - 500), index).split("\n").slice(-5).some((line) => line.includes(`zen-allow-${token}`));
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Local JSX names bound to Zen components by `import … from "@zen-ds/react"`: Map(localName → componentName). */
export function zenImports(src, packageName = "@zen-ds/react") {
  const names = new Map();
  const from = escape(packageName);
  for (const [, list] of src.matchAll(new RegExp(`import\\s+(?:type\\s+)?\\{([^}]*)\\}\\s*from\\s*["']${from}["']`, "g"))) {
    for (const spec of list.split(",")) {
      const [imported, local] = spec.replace(/^\s*type\s+/, "").split(/\s+as\s+/).map((s) => s.trim());
      if (imported) names.set(local || imported, imported);
    }
  }
  for (const [, ns] of src.matchAll(new RegExp(`import\\s+\\*\\s+as\\s+(\\w+)\\s+from\\s*["']${from}["']`, "g"))) names.set(`${ns}.*`, "*");
  return names;
}

/**
 * @param {Array} rules   the registry from check-usage.mjs
 * @param {{ consumer?: boolean, css?: boolean, packageName?: string }} options
 */
export function createChecker(allRules, { consumer = false, css = true, packageName = "@zen-ds/react" } = {}) {
  // `consumerOnly` rules (e.g. api/deprecated-prop) judge apps only; the repo migrates at its own pace.
  // `repoOnly` rules (e.g. interaction/action-without-handler) judge the repo's own examples, never apps.
  const rules = allRules.filter((rule) => (consumer ? !rule.repoOnly : !rule.consumerOnly));
  const byTag = new Map();
  for (const rule of rules) for (const c of rule.components) byTag.set(c, [...(byTag.get(c) ?? []), rule]);
  const cssRules = rules.filter((rule) => rule.css);
  const repoTagRe = new RegExp(`<(${[...byTag.keys()].join("|")})\\b(?![.\\w])`, "g");

  function checkCss(src, file) {
    const findings = [];
    // Flat rule scan: `selector { body }` (nested @media blocks match their inner rules because braces are excluded).
    const cssRe = /([^{}]+)\{([^{}]*)\}/g; let m;
    // Classes that get interaction styles anywhere in this file count as actionable containers.
    const interactive = new Set([...src.matchAll(/([^{}]+)\{[^{}]*\}/g)].filter((r) => interactionRe.test(r[1])).flatMap((r) => classesOf(r[1])));
    while ((m = cssRe.exec(src))) {
      const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
      const at = m.index + m[1].lastIndexOf(selector.split("\n")[0]);
      for (const rule of cssRules) {
        const message = rule.check({ selector, body: m[2], interactive, src, file });
        if (message && !m[1].includes(`zen-allow-${rule.allow}`) && !allowed(src, at, rule.allow)) findings.push({ file, ...position(src, at), index: at, tag: selector.split("\n").pop().slice(0, 60), rule, message });
      }
    }
    return findings;
  }

  function checkJsx(src, file) {
    // Tags quoted in block comments (JSDoc: "usually <Search variant=…/>") are documentation, not usage.
    // A comment opens after whitespace or punctuation, never inside a glob such as accept="image/*" (which would hide
    // every tag up to the next */ from all rules).
    const comments = [...src.matchAll(/(?<![^\s{}()[\];,:=?|&!>])\/\*[\s\S]*?\*\//g)].map((c) => [c.index, c.index + c[0].length]);
    const inComment = (i) => comments.some(([from, to]) => i > from && i < to);
    let tagRe = repoTagRe;
    let canonical = (tag) => tag;
    if (consumer) {
      const imports = zenImports(src, packageName);
      const namespaces = [...imports.keys()].filter((k) => k.endsWith(".*")).map((k) => k.slice(0, -2));
      const locals = [...imports.entries()].filter(([local, imported]) => !local.endsWith(".*") && byTag.has(imported)).map(([local]) => local);
      if (!locals.length && !namespaces.length) return [];
      // In a file that uses Zen, raw elements the rules know (a hand-made <button> with an Icon, a raw <h1>, a flex
      // <div>) are checked too.
      const intrinsic = [...byTag.keys()].filter((t) => /^[a-z]/.test(t));
      const alternatives = [...locals.map(escape), ...namespaces.map((ns) => `${escape(ns)}\\.(?:${[...byTag.keys()].join("|")})`), ...intrinsic];
      tagRe = new RegExp(`<(${alternatives.join("|")})\\b(?![.\\w])`, "g");
      canonical = (tag) => (tag.includes(".") ? tag.slice(tag.indexOf(".") + 1) : imports.get(tag) ?? (/^[a-z]/.test(tag) ? tag : undefined));
    }
    const findings = [];
    let match;
    tagRe.lastIndex = 0;
    while ((match = tagRe.exec(src))) {
      if (inComment(match.index)) continue;
      const written = match[1];
      const tag = canonical(written);
      const read = readTag(src, match.index + match[0].length);
      if (!read || !byTag.has(tag)) continue;
      const children = read.selfClosing ? "" : readChildren(src, written, read.end);
      const end = read.selfClosing ? read.end : src.indexOf(`</${written}>`, read.end + children.length) + written.length + 3;
      for (const rule of byTag.get(tag)) {
        const message = rule.check({ tag, attrs: read.attrs, children, src, start: match.index, end, file, parent: () => parentTag(src, match.index) });
        if (message && !allowed(src, match.index, rule.allow)) findings.push({ file, ...position(src, match.index), index: match.index, tag, rule, message });
      }
    }
    return findings;
  }

  return {
    /** Findings for one file's source text; `file` is only used for display and for CSS rules that look at the path. */
    checkFile(src, file = "input.tsx") {
      // Files that intentionally render wrong usage (the Don't illustrations) opt out with this marker.
      if (/^\/\/ zen-usage-guard: dont-examples/m.test(src)) return [];
      if (/\.css$/.test(file)) return css ? checkCss(src, file) : [];
      return checkJsx(src, file);
    },
  };
}

/** One line per finding, the format the CLI prints and agents parse. */
export const formatFinding = (f) => `${f.rule.severity === "error" ? "✗" : "⚠"} ${f.file}:${f.line} [${f.rule.id}] <${f.tag}> ${f.message}  → ${f.rule.guideline}`;
