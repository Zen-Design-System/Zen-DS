/*
 * HTML + CSS snippets (plan docs/research/code-languages-plan-2026-10-03.md §3.B): a specimen's live DOM as markup an
 * app pastes into a page that loads the package's styles.css. The docs' and Studio's attributes and classes leave,
 * React's ids become readable ones (the aria pairs that point at them follow), form fields show what they hold, and
 * the markup is indented only where whitespace cannot render (flex, grid and block parents; SVG), so the pasted markup
 * draws exactly what React drew (tools/code-languages/html-parity.mjs checks it).
 */

/** Docs chrome inside a specimen (a playground's readout beside the component): never part of the snippet. */
export const SNIPPET_SKIP = "data-snippet-skip";
/**
 * A docs wrapper whose children are the snippet's (the phone frame around a mobile example): it leaves, its children
 * stay, and the modes it sets (data-breakpoint="mobile") go to the snippet's header.
 */
export const SNIPPET_UNWRAP = "data-snippet-unwrap";
/** Attributes only the docs, the Studio or the audits read. */
const DROP_ATTRIBUTE = /^data-(zen-src|zen-name|studio-.*|audit-.*|toc-label|snippet-skip|snippet-unwrap)$/;
/** The package's stylesheet styles .zen-* classes only: every other class is the docs' or the Studio's. */
export const isLibraryClass = (token: string) => token.startsWith("zen-");
/** React's useId spellings (18: :r1:, 19.0–19.1: «r1», 19.2: _r_1_), alone or inside a longer id ("«r1»-label"). */
const REACT_ID = /:r[0-9a-z]+:|«r[0-9a-z]+»|_r_[0-9a-z]+_/;
/** Attributes that hold ids (space-separated). */
const ID_REFS = new Set(["aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "aria-activedescendant", "aria-details", "aria-errormessage", "aria-flowto", "for", "list", "form", "headers", "popovertarget"]);
const SVG = "http://www.w3.org/2000/svg";
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
/** The modes ZenProvider sets (on <html> for an app): the snippet's header names the ones in force at the specimen. */
export const MODE_ATTRIBUTES = ["data-theme", "data-brand", "data-component-theme", "data-density", "data-radius", "data-emphasis", "data-contrast", "data-breakpoint", "data-typography"];
/** Where an app that installed @zen-ds/react finds the two stylesheets (package.json "./styles.css", "./reset.css"). */
export const STYLES_HREF = "/node_modules/@zen-ds/react/dist/styles.css";
export const RESET_HREF = "/node_modules/@zen-ds/react/dist/reset.css";

const escapeText = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;");
const escapeAttribute = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/ /g, "&nbsp;");
const skipped = (node: Node) => node instanceof Element && (node.hasAttribute(SNIPPET_SKIP) || (node.localName === "template" && node.hasAttribute("data-zen-overlay-anchor")));
/** The snippet's nodes under `parent`: docs chrome left out, docs wrappers replaced by their own children. */
function nodesOf(nodes: Iterable<Node>): Node[] {
  return [...nodes].flatMap((child) => {
    if (!(child.nodeType === Node.TEXT_NODE || child instanceof Element) || skipped(child)) return [];
    return child instanceof Element && child.hasAttribute(SNIPPET_UNWRAP) ? nodesOf(child.childNodes) : [child];
  });
}
const childrenOf = (element: Element) => nodesOf(element.childNodes);

/** Whether whitespace between `element`'s children can render (an inline formatting context). */
function whitespaceRenders(element: Element): boolean {
  if (element.namespaceURI === SVG) return element.localName === "text" || element.localName === "tspan";
  const display = getComputedStyle(element).display;
  if (/flex|grid/.test(display)) return false;
  if (display === "contents" || element.localName === "pre" || element.localName === "textarea") return true;
  // A block whose children are all blocks: whitespace between them makes no line box.
  return childrenOf(element).some((node) => {
    if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent?.trim());
    return !/^(block|flex|grid|table|list-item|none)$/.test(getComputedStyle(node as Element).display);
  });
}

type Context = { ids: Map<string, string>; used: Set<string> };

/** "trigger", "select-popover", "button-2": from the element's first Zen class, else its tag. */
function readableId(element: Element, context: Context) {
  const zen = [...element.classList].find((name) => name.startsWith("zen-"));
  const base = zen ? zen.slice(4).replace(/__/g, "-").replace(/--.*$/, "") : element.localName;
  let id = base;
  for (let n = 2; context.used.has(id); n += 1) id = `${base}-${n}`;
  context.used.add(id);
  return id;
}

const renameIds = (value: string, context: Context) => value.split(/\s+/).map((id) => context.ids.get(id) ?? id).join(" ");

function attributesOf(live: Element, context: Context): string {
  const out: string[] = [];
  for (const name of live.getAttributeNames()) {
    if (DROP_ATTRIBUTE.test(name)) continue;
    // A field's state is its live property (written below), not the attribute React may have set first.
    if (live instanceof HTMLInputElement && (name === "checked" || name === "value")) continue;
    let value = live.getAttribute(name) ?? "";
    if (name === "class") {
      value = value.split(/\s+/).filter(isLibraryClass).join(" ");
      if (!value) continue;
    } else if (name === "id" || ID_REFS.has(name)) value = renameIds(value, context);
    else if (name === "href" && value.startsWith("#")) value = `#${renameIds(value.slice(1), context)}`;
    out.push(value === "" && name !== "value" && name !== "alt" ? name : `${name}="${escapeAttribute(value)}"`);
  }
  if (live instanceof HTMLInputElement) {
    if (live.type === "checkbox" || live.type === "radio") { if (live.checked) out.push("checked"); }
    else if (live.type !== "file" && live.type !== "password" && live.value) out.push(`value="${escapeAttribute(live.value)}"`);
  }
  if (live instanceof HTMLOptionElement && live.selected && !live.hasAttribute("selected")) out.push("selected");
  return out.length ? ` ${out.join(" ")}` : "";
}

/** `node` exactly as it is: no whitespace added or removed (an inline formatting context, where it would show). */
function compact(node: Node, context: Context): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeText(node.textContent ?? "");
  if (!(node instanceof Element) || skipped(node)) return "";
  const tag = node.localName;
  const open = `<${tag}${attributesOf(node, context)}`;
  if (VOID.has(tag)) return `${open}>`;
  if (node instanceof HTMLTextAreaElement) return `${open}>${escapeText(node.value)}</${tag}>`;
  const inner = childrenOf(node).map((child) => compact(child, context)).join("");
  return !inner && node.namespaceURI === SVG ? `${open} />` : `${open}>${inner}</${tag}>`;
}

/** `node` as indented lines, breaking only between children whose whitespace cannot render. */
function lines(node: Node, depth: number, context: Context): string[] {
  const pad = "  ".repeat(depth);
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim();
    return text ? [`${pad}${escapeText(text)}`] : [];
  }
  if (!(node instanceof Element) || skipped(node)) return [];
  const children = childrenOf(node);
  if (VOID.has(node.localName) || !children.length || node instanceof HTMLTextAreaElement || whitespaceRenders(node)) return [`${pad}${compact(node, context)}`];
  const tag = node.localName;
  const open = `<${tag}${attributesOf(node, context)}>`;
  const inner = children.flatMap((child) => lines(child, depth + 1, context));
  // A short element with one short line inside stays on one line.
  if (inner.length === 1 && pad.length + open.length + inner[0].trim().length + tag.length < 110) return [`${pad}${open}${inner[0].trim()}</${tag}>`];
  return [`${pad}${open}`, ...inner, `${pad}</${tag}>`];
}

/** The markup of `roots` (a specimen's children), indented, with readable ids. */
export function markupOf(nodes: Element[]): string {
  const context: Context = { ids: new Map(), used: new Set() };
  const roots = nodesOf(nodes).filter((node): node is Element => node instanceof Element);
  const elements = roots.flatMap((root) => [root, ...root.querySelectorAll("[id]")]);
  // Ids the snippet keeps as they are are taken first, so a readable id never collides with one.
  for (const element of elements) { const id = element.getAttribute("id"); if (id && !REACT_ID.test(id)) context.used.add(id); }
  // Every React id next, so a reference before its target (aria-labelledby on a trigger) is renamed too.
  for (const element of elements) {
    const id = element.getAttribute("id");
    if (id && REACT_ID.test(id) && !context.ids.has(id)) context.ids.set(id, readableId(element, context));
  }
  return roots.flatMap((root) => lines(root, 0, context)).join("\n");
}

/** The modes in force at `element`: the nearest ancestor's value of each, then a docs wrapper's inside it. */
export function modesAt(element: Element): Array<[string, string]> {
  // The innermost wrapper wins (document order: an outer wrapper comes first).
  const wrappers = [...element.querySelectorAll(`[${SNIPPET_UNWRAP}]`)].reverse();
  return MODE_ATTRIBUTES.flatMap((name) => {
    const value = wrappers.find((wrapper) => wrapper.hasAttribute(name))?.getAttribute(name) ?? element.closest(`[${name}]`)?.getAttribute(name);
    return value ? [[name, value] as [string, string]] : [];
  });
}

/**
 * The HTML snippet of a specimen (a playground's preview row, an example's stage): the stylesheets and the modes once,
 * then the specimen's children. `markupOnly` notes that the behaviour needs JavaScript.
 */
export function htmlSnippet(specimen: Element, { markupOnly }: { markupOnly: boolean }): string {
  const modes = modesAt(specimen).map(([name, value]) => `${name}="${value}"`).join(" ");
  return [
    "<!-- Once per page: the Zen styles (and the optional page reset) in <head> -->",
    `<link rel="stylesheet" href="${STYLES_HREF}">`,
    `<link rel="stylesheet" href="${RESET_HREF}">`,
    ...(modes ? [`<!-- The modes (ZenProvider in React) on <html>: ${modes} -->`] : []),
    ...(markupOnly ? ["<!-- Markup only: opening, closing, typing and keyboard need JavaScript (use React). -->"] : []),
    "",
    markupOf([...specimen.children]),
  ].join("\n");
}
