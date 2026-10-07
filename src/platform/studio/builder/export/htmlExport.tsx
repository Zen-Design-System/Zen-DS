import { createRoot } from "react-dom/client";
import { ZenProvider } from "../../../../components/Provider";
import resetCss from "../../../../styles/reset.css?inline";
import { componentName } from "../../../../../tools/studio/browser-compile.mjs";
import { zipFiles, type ZipInput } from "../../../../../tools/studio/zip.mjs";
import { loadEngine, zenComponents } from "../engine";
import { LIBRARY_PHOTOS } from "../library/media";
import { ProtoContext, type PageDevice, type ProtoActions } from "../proto/runtime";
import { frameOf, literalOf, type PageFrame } from "../render/frames";
import { renderFrame, type PageNode, type PageTree } from "../render/renderPage";

/*
 * HTML export (Studio builder GĐ5 M2, spec docs/research/studio-builder-handoff-spec-2026-10-07.md §3b'): each Screen and
 * Overlay frame rendered off screen by the canvas's own renderer, its DOM written as `screens/<frame>.html` without the
 * Studio's attributes, and `styles.css`: the library's rules the screens use (read from the CSS this page has loaded:
 * tokens and their modes, `.zen-*` rules, the @font-face and @keyframes they name) after the library's reset. Library
 * photos and the font files go in the zip (`assets/`, `fonts/`). Static markup: what opens, switches or takes input needs
 * the React export. Loaded with the HTML tab (its own chunk).
 */

export type HtmlScreen = { frame: string; title: string; file: string; kind: PageFrame["kind"]; device: PageDevice; width: number };
export type HtmlAsset = { path: string; url: string };
export type HtmlExport = { files: Array<{ path: string; text: string }>; assets: HtmlAsset[]; screens: HtmlScreen[] };

const INERT: ProtoActions = { navigate: () => undefined, open: () => undefined, close: () => undefined, back: () => undefined, toast: () => undefined, link: () => undefined };
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Renders, then waits for effects, the icons (lazy buckets) and the photos: off screen a lazy image never loads, and an
 * Image keeps its loading frame (4:3) until it has, so each loads now and the markup is read once they show.
 */
async function settle(host: HTMLElement) {
  for (let frame = 0; frame < 3; frame += 1) await nextFrame();
  await sleep(150);
  for (let waited = 0; waited < 3000 && host.querySelector('[data-loading="true"]'); waited += 100) await sleep(100);
  const images = [...host.querySelectorAll("img")];
  for (const image of images) if (image.loading === "lazy") image.loading = "eager";
  await Promise.race([
    Promise.all(images.map((image) => (image.complete ? null : new Promise((resolve) => { image.addEventListener("load", resolve, { once: true }); image.addEventListener("error", resolve, { once: true }); })))),
    sleep(5000),
  ]);
  for (let frame = 0; frame < 2; frame += 1) await nextFrame();
}

// ── Markup ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Attributes only the Studio reads (selection, Layers, the board), never part of the page. */
const STUDIO_ATTRIBUTE = /^data-(zen-src|zen-name|studio-.*|screen|screen-state|overlay|export-frame)$/;
/** The builder runtime's wrappers (proto/runtime.tsx) under the names the exported page's own CSS gives them. */
const RENAMED_CLASS: Record<string, string> = { "studio-builder-screen": "screen", "studio-builder-overlay": "overlay", "studio-builder-overlay__portal": "overlay__portal" };

type Assets = Map<string, HtmlAsset>;

const absolute = (url: string, base = document.baseURI) => { try { return new URL(url, base).href; } catch { return url; } };
const photoKeys = new Map(LIBRARY_PHOTOS.map((entry) => [absolute(entry.photo.src), entry.key]));

/** A URL in the markup as the export writes it: a library photo → `../assets/<key>.webp` (in the zip), any other absolute. */
function exportUrl(url: string, assets: Assets): string {
  if (/^(data:|blob:|#)/.test(url)) return url;
  const href = absolute(url);
  const key = photoKeys.get(href);
  if (!key) return href;
  const path = `assets/${key}.webp`;
  assets.set(path, { path, url: href });
  return `../${path}`;
}

/** Form fields show what they hold: a property the markup would not carry (value, checked, selected) as its attribute. */
function syncFields(live: Element, copy: Element) {
  const from = live.querySelectorAll("input, textarea, select");
  const to = copy.querySelectorAll("input, textarea, select");
  from.forEach((field, index) => {
    const target = to[index];
    if (!target) return;
    if (field instanceof HTMLInputElement) {
      if (field.type === "checkbox" || field.type === "radio") target.toggleAttribute("checked", field.checked);
      else if (field.type !== "file" && field.type !== "password") target.setAttribute("value", field.value);
    } else if (field instanceof HTMLTextAreaElement) target.textContent = field.value;
    else if (field instanceof HTMLSelectElement) Array.from(field.options).forEach((option, at) => target.querySelectorAll("option")[at]?.toggleAttribute("selected", option.selected));
  });
}

/** The frame's DOM as exported markup: Studio attributes and anchors out, wrappers renamed, URLs exported. */
function frameMarkup(root: HTMLElement, assets: Assets): string {
  const copy = root.cloneNode(true) as HTMLElement;
  syncFields(root, copy);
  for (const anchor of copy.querySelectorAll("template[data-zen-overlay-anchor]")) anchor.remove();
  for (const element of [copy, ...copy.querySelectorAll("*")]) {
    for (const name of element.getAttributeNames()) if (STUDIO_ATTRIBUTE.test(name)) element.removeAttribute(name);
    for (const [from, to] of Object.entries(RENAMED_CLASS)) if (element.classList.contains(from)) element.classList.replace(from, to);
    for (const name of ["src", "poster", "href", "xlink:href"]) {
      const value = element.getAttribute(name);
      if (value && (name !== "href" || element.namespaceURI === "http://www.w3.org/2000/svg") && element.tagName.toLowerCase() !== "use") element.setAttribute(name, exportUrl(value, assets));
    }
    const srcset = element.getAttribute("srcset");
    if (srcset) element.setAttribute("srcset", srcset.split(",").map((part) => { const [url, ...size] = part.trim().split(/\s+/); return [exportUrl(url, assets), ...size].join(" "); }).join(", "));
    const style = element.getAttribute("style");
    if (style && /url\(/.test(style)) element.setAttribute("style", style.replace(/url\((['"]?)([^'")]+)\1\)/g, (_match, quote: string, url: string) => `url(${quote}${exportUrl(url, assets)}${quote})`));
  }
  return copy.outerHTML;
}

// ── styles.css ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Splits a selector list at its top-level commas. */
function selectorParts(selector: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < selector.length; index++) {
    const char = selector[index];
    if (char === "(" || char === "[") depth++;
    else if (char === ")" || char === "]") depth--;
    else if (char === "," && depth === 0) { parts.push(selector.slice(start, index).trim()); start = index + 1; }
  }
  parts.push(selector.slice(start).trim());
  return parts.filter(Boolean);
}

const classesOf = (part: string) => part.replace(/\[[^\]]*\]/g, "").match(/\.-?[_a-zA-Z][\w-]*/g) ?? [];
/** A token or mode rule: only :root, data-attribute selectors and combinators (`[data-theme="dark"]`, `:root`). */
const isTokenPart = (part: string) => !classesOf(part).length && !/#/.test(part) && !part.replace(/:root|:where\(|:is\(|\)|\[data-[\w-]+(?:[~|^$*]?=(?:"[^"]*"|'[^']*'|[\w-]+))?\]|[\s>+~*]/g, "");
/** A library rule: every class it names is a `zen-` class (no Studio, docs or platform class), or a token rule. */
const isLibraryPart = (part: string) => { const classes = classesOf(part); return classes.length ? classes.every((name) => name.startsWith(".zen-")) : isTokenPart(part); };

/** States and pseudo elements the static markup does not show: the rule counts when its element is there. */
const DYNAMIC = /::?(?:hover|focus(?:-visible|-within)?|active|visited|link|any-link|target|checked|indeterminate|disabled|enabled|placeholder-shown|autofill|read-only|read-write|invalid|valid|user-invalid|user-valid|open|popover-open|modal|default|required|optional|in-range|out-of-range|before|after|placeholder|marker|selection|first-line|first-letter|backdrop|file-selector-button|-webkit-[\w-]+|-moz-[\w-]+)(?:\([^()]*\))?/g;

function usedBy(part: string, roots: HTMLElement[]): boolean {
  const base = part.replace(DYNAMIC, "").trim() || "*";
  try {
    return roots.some((root) => root.matches(base) || root.querySelector(base) !== null);
  } catch {
    return true;
  }
}

/** A style rule as styles.css keeps it, or null: a library rule the screens use; a token rule with its Zen tokens only. */
function styleRule(rule: CSSStyleRule, roots: HTMLElement[]): string | null {
  const parts = selectorParts(rule.selectorText);
  if (!parts.length || !parts.every(isLibraryPart)) return null;
  if (parts.every(isTokenPart)) {
    const declarations: string[] = [];
    for (let index = 0; index < rule.style.length; index++) {
      const name = rule.style[index];
      if (name.startsWith("--") && !name.startsWith("--zen-")) continue;
      const priority = rule.style.getPropertyPriority(name);
      declarations.push(`  ${name}: ${rule.style.getPropertyValue(name).trim()}${priority ? ` !${priority}` : ""};`);
    }
    return declarations.length ? `${rule.selectorText} {\n${declarations.join("\n")}\n}` : null;
  }
  return parts.some((part) => usedBy(part, roots)) ? rule.cssText : null;
}

const rulesOf = (sheet: CSSStyleSheet | null) => { try { return sheet ? Array.from(sheet.cssRules) : []; } catch { return []; } };
const absoluteUrls = (text: string, base: string) => text.replace(/url\((['"]?)([^'")]+)\1\)/g, (match, quote: string, url: string) => (/^(data:|#)/.test(url) ? match : `url(${quote}${absolute(url, base)}${quote})`));

type Collected = { rules: string[]; fonts: Array<{ family: string; text: string; base: string }>; keyframes: Array<{ name: string; text: string }> };

function collect(rules: CSSRule[], base: string, roots: HTMLElement[], into: Collected, out: string[]) {
  for (const rule of rules) {
    if (rule instanceof CSSImportRule) { collect(rulesOf(rule.styleSheet), rule.styleSheet?.href ?? base, roots, into, out); continue; }
    if (rule instanceof CSSStyleRule) { const text = styleRule(rule, roots); if (text) out.push(absoluteUrls(text, base)); continue; }
    if (rule instanceof CSSFontFaceRule) { into.fonts.push({ family: rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim(), text: rule.cssText, base }); continue; }
    if (rule instanceof CSSKeyframesRule) { into.keyframes.push({ name: rule.name, text: rule.cssText }); continue; }
    if (rule instanceof CSSGroupingRule) {
      // @media, @supports, @container, @layer blocks: kept around the rules they hold that are kept.
      const inner: string[] = [];
      collect(Array.from(rule.cssRules), base, roots, into, inner);
      if (inner.length) out.push(`${rule.cssText.slice(0, rule.cssText.indexOf("{")).trim()} {\n${inner.join("\n")}\n}`);
      continue;
    }
    if (rule instanceof CSSPropertyRule && rule.name.startsWith("--zen-")) out.push(rule.cssText);
  }
}

/** A font file's place in the zip: fonts/<its file name>. */
const fontPath = (url: string) => `fonts/${decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "font")}`;

/** styles.css for `roots`: the reset, then the library's rules they use, the fonts and keyframes those name. */
export function libraryCss(roots: HTMLElement[], title: string, assets: Assets): string {
  const into: Collected = { rules: [], fonts: [], keyframes: [] };
  for (const sheet of Array.from(document.styleSheets)) collect(rulesOf(sheet), sheet.href ?? document.baseURI, roots, into, into.rules);
  const kept = into.rules.join("\n");
  const fonts = into.fonts.filter((font, index, all) => font.family && kept.includes(font.family) && all.findIndex((other) => other.text === font.text) === index).map((font) => font.text.replace(/url\((['"]?)([^'")]+)\1\)/g, (match, quote: string, url: string) => {
    if (/^data:/.test(url)) return match;
    const href = absolute(url, font.base);
    // A font this site serves goes in the zip; any other stays a link.
    if (new URL(href).origin !== location.origin) return `url(${quote}${href}${quote})`;
    const path = fontPath(href);
    assets.set(path, { path, url: href });
    return `url(${quote}${path}${quote})`;
  }));
  const keyframes = into.keyframes.filter((frames, index, all) => new RegExp(`(^|[\\s,:])${frames.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([\\s,;]|$)`, "m").test(kept) && all.findIndex((other) => other.text === frames.text) === index).map((frames) => frames.text);
  return [
    `/* Zen Design System styles for "${title.replace(/\*\//g, "* /")}", exported by Zen Studio: the reset, the tokens and their modes, the`,
    "   library rules its screens use, and the fonts and animations those name. An app imports @zen/design-system/styles.css",
    "   (the whole library) instead. */",
    "",
    ...fonts,
    resetCss.trim(),
    kept,
    ...keyframes,
    "",
  ].join("\n");
}

// ── The export ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The page's own CSS around a frame: the device width, the screen's height, an overlay's layer (builder.css). */
const pageCss = (width: number) => [
  "body { margin: 0; }",
  ".zen-provider { min-height: 100vh; }",
  `.screen, .overlay { box-sizing: border-box; max-width: ${width}px; min-height: 100vh; margin-inline: auto; }`,
  ".screen { display: flow-root; }",
  ".overlay { position: relative; overflow: hidden; }",
  ".overlay__portal { position: absolute; inset: 0; overflow: hidden; }",
].join("\n");

/** A frame's file: screens/<id>.html, a state variant <id>.<state>.html, an overlay overlay-<id>.html. */
function fileOf(node: PageNode): string {
  const slug = (value: unknown) => String(value ?? "untitled").replace(/[^\w.-]+/g, "-");
  if (node.name === "Overlay") return `screens/overlay-${slug(literalOf(node, "id"))}.html`;
  const state = literalOf(node, "state");
  return `screens/${slug(literalOf(node, "id"))}${typeof state === "string" ? `.${slug(state)}` : ""}.html`;
}

const BREAKPOINT: Record<PageDevice, "mobile" | "tablet" | "desktop"> = { phone: "mobile", tablet: "tablet", desktop: "desktop" };

/** The page `text` (id `id`, titled `title`) as static HTML files and the assets they use. */
export async function exportHtml({ id, title, text }: { id: string; title: string; text: string }): Promise<HtmlExport | { error: string }> {
  const engine = await loadEngine();
  const tree = engine.parsePage(text, { components: new Set(zenComponents) }) as unknown as PageTree;
  if (tree.errors.length || !tree.board) return { error: tree.errors[0] ? `line ${tree.errors[0].line}: ${tree.errors[0].message}` : "The page has no board" };
  const nodes = tree.board.children.filter((child): child is PageNode => child.kind === "element" && (child.name === "Screen" || child.name === "Overlay"));
  if (!nodes.length) return { error: "The page has no Screen" };
  const frames = nodes.map((node) => ({ node, frame: frameOf(node), file: fileOf(node) }));
  const host = document.createElement("div");
  // Off screen and out of the way (as a template renders for Start from): never focused, hit or read while it renders.
  host.style.cssText = "position:fixed;top:0;left:-20000px;pointer-events:none;";
  host.inert = true;
  document.body.append(host);
  const root = createRoot(host);
  // Its own file name, so the copy's data-zen-src never reads as the page on the canvas.
  const ctx = { file: `export:${id}.zen.tsx`, mock: tree.mock, proto: INERT };
  try {
    root.render(
      <ProtoContext value={INERT}>
        {frames.map(({ node, frame }) => (
          <div key={frame.id} data-export-frame={frame.id} style={{ width: frame.width }}>
            <ZenProvider theme="light" breakpoint={BREAKPOINT[frame.device]} syncDocument={false}>{renderFrame(node, ctx)}</ZenProvider>
          </div>
        ))}
      </ProtoContext>,
    );
    await settle(host);
    const roots = frames.map(({ frame }) => host.querySelector<HTMLElement>(`[data-export-frame="${CSS.escape(frame.id)}"] > .zen-provider`)).filter((element): element is HTMLElement => Boolean(element));
    const assets: Assets = new Map();
    const component = `${componentName(title)}Page`;
    const screens: HtmlScreen[] = frames.map(({ node, frame, file }) => ({ frame: frame.id, title: frame.kind === "overlay" ? `Overlay ${String(literalOf(node, "id"))}` : frame.label, file, kind: frame.kind, device: frame.device, width: frame.width }));
    const files = frames.map(({ frame }, index) => {
      const screen = screens[index];
      const element = roots[index];
      const what = screen.kind === "overlay" ? `overlay "${frame.id.replace(/^overlay:/, "")}" (drawn open)` : `screen "${frame.id.replace(/^screen:/, "")}" (${screen.device}, ${screen.width} px)`;
      const html = [
        "<!doctype html>",
        '<html lang="en">',
        "<head>",
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        `<title>${escapeHtml(`${title} · ${screen.title}`)}</title>`,
        '<link rel="stylesheet" href="../styles.css">',
        `<style>\n${pageCss(screen.width)}\n</style>`,
        "</head>",
        "<body>",
        `<!-- Zen Studio: the ${what} of ${escapeHtml(id)}.zen.tsx. Static markup: what opens, switches or takes input needs the React export (${component}.tsx). -->`,
        element ? frameMarkup(element, assets) : "<!-- This frame did not render. -->",
        "</body>",
        "</html>",
        "",
      ].join("\n");
      return { path: screen.file, text: html };
    });
    const css = libraryCss(roots, title, assets);
    const index = [
      "<!doctype html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      `<title>${escapeHtml(title)}</title>`,
      "<style>body { margin: 40px; font: 16px/1.5 system-ui, sans-serif; } li { margin: 4px 0; }</style>",
      "</head>",
      "<body>",
      `<h1>${escapeHtml(title)}</h1>`,
      `<p>Static HTML of each frame, exported by Zen Studio from ${escapeHtml(id)}.zen.tsx with the Zen styles it uses (styles.css).</p>`,
      "<ul>",
      ...screens.map((screen) => `  <li><a href="${screen.file}">${escapeHtml(screen.title)}</a> · ${screen.kind === "overlay" ? "overlay" : screen.device}</li>`),
      "</ul>",
      "</body>",
      "</html>",
      "",
    ].join("\n");
    return { files: [{ path: "index.html", text: index }, ...files, { path: "styles.css", text: css }], assets: [...assets.values()], screens };
  } finally {
    root.unmount();
    host.remove();
  }
}

/** The export as one zip: the files, then each asset fetched (one that does not load is left out and listed). */
export async function htmlZip(result: HtmlExport): Promise<{ bytes: Uint8Array; missing: string[] }> {
  const missing: string[] = [];
  const assets = await Promise.all(result.assets.map(async (asset): Promise<ZipInput | null> => {
    try {
      const response = await fetch(asset.url);
      if (!response.ok) throw new Error(String(response.status));
      return { path: asset.path, data: new Uint8Array(await response.arrayBuffer()) };
    } catch {
      missing.push(asset.path);
      return null;
    }
  }));
  const files: ZipInput[] = [...result.files.map((file) => ({ path: file.path, data: file.text })), ...assets.filter((asset): asset is ZipInput => asset !== null)];
  return { bytes: zipFiles(files), missing };
}
