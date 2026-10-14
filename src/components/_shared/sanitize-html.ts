/**
 * Allowlist HTML sanitiser for content that enters a contentEditable (RichTextField's `value` / `defaultValue`).
 * The value is usually HTML the field emitted earlier and the app stored, so it may have been written by another user:
 * it is treated as untrusted. Parsing happens in an inert `<template>` (no script runs, no image loads), then only the
 * tags, attributes and URL schemes the editor itself produces survive.
 */

/** Tags kept as they are. Anything else is unwrapped (its children stay) unless it is in DROP. */
const ALLOWED: Record<string, readonly string[]> = {
  p: [], br: [], div: [], span: [], h1: [], h2: [], h3: [], h4: [], blockquote: [], pre: [], code: [],
  b: [], strong: [], i: [], em: [], u: [], s: [], strike: [], del: [], sub: [], sup: [],
  ul: [], ol: [], li: [],
  a: ["href", "target", "rel", "title"],
  img: ["src", "alt", "title", "width", "height"],
  video: ["src", "controls", "width", "height"],
};
/** Global attributes kept on any allowed tag. `style` is filtered to the declarations below. */
const GLOBAL_ATTRIBUTES = ["style", "dir", "align"];
/** Inline styles the editor writes (alignment, indent). Values are checked so `url()` / `expression()` never pass. */
const STYLE_PROPERTIES = new Set(["text-align", "margin-left", "margin-right", "padding-left", "padding-right"]);
const SAFE_STYLE_VALUE = /^[a-z0-9.%\s-]+$/i;
/** Removed together with their content. */
const DROP = new Set(["script", "style", "iframe", "frame", "frameset", "object", "embed", "applet", "form", "input", "button",
  "textarea", "select", "option", "link", "meta", "base", "svg", "math", "template", "noscript", "title", "head"]);

/** `href`: http(s), mailto, tel, in-page and relative links. `src`: http(s) and relative only. */
export function safeHtmlUrl(raw: string, kind: "href" | "src"): string | null {
  const url = raw.trim();
  // Browsers ignore control characters and whitespace inside a scheme ("java\tscript:"), so strip them before testing.
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url.replace(/[\u0000- ]/g, ""))?.[1]?.toLowerCase();
  if (!scheme) return url;
  const allowed = kind === "href" ? ["http", "https", "mailto", "tel"] : ["http", "https"];
  return allowed.includes(scheme) ? url : null;
}

function cleanStyle(style: string): string {
  return style.split(";").map((declaration) => {
    const index = declaration.indexOf(":");
    if (index < 0) return null;
    const property = declaration.slice(0, index).trim().toLowerCase();
    const value = declaration.slice(index + 1).trim();
    return STYLE_PROPERTIES.has(property) && SAFE_STYLE_VALUE.test(value) ? `${property}: ${value}` : null;
  }).filter(Boolean).join("; ");
}

function cleanElement(element: Element): void {
  const tag = element.tagName.toLowerCase();
  const allowed = ALLOWED[tag] ?? [];
  for (const { name, value } of Array.from(element.attributes)) {
    const attribute = name.toLowerCase();
    if (!allowed.includes(attribute) && !GLOBAL_ATTRIBUTES.includes(attribute)) { element.removeAttribute(name); continue; }
    if (attribute === "href" || attribute === "src") {
      const url = safeHtmlUrl(value, attribute);
      if (url === null) element.removeAttribute(name);
    } else if (attribute === "style") {
      const style = cleanStyle(value);
      if (style) element.setAttribute("style", style); else element.removeAttribute("style");
    }
  }
  // A link that opens a new tab never gets a handle on this page.
  if (tag === "a" && element.getAttribute("target") === "_blank") element.setAttribute("rel", "noopener noreferrer");
}

function cleanChildren(parent: ParentNode): void {
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === Node.COMMENT_NODE) { node.remove(); continue; }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    if (DROP.has(tag)) { element.remove(); continue; }
    cleanChildren(element);
    if (tag in ALLOWED) cleanElement(element);
    else element.replaceWith(...Array.from(element.childNodes));
  }
}

/** Returns `html` with every tag, attribute and URL outside the allowlist removed. Server-side it returns "". */
export function sanitizeHtml(html: string): string {
  if (typeof document === "undefined") return "";
  const template = document.createElement("template");
  template.innerHTML = html;
  cleanChildren(template.content);
  return template.innerHTML;
}
