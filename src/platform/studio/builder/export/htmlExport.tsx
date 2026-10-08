import { createRoot } from "react-dom/client";
import { ZenProvider } from "../../../../components/Provider";
import resetCss from "../../../../styles/reset.css?inline";
import { componentName } from "../../../../../tools/studio/browser-compile.mjs";
import { zipFiles, type ZipInput } from "../../../../../tools/studio/zip.mjs";
import packageJson from "../../../../../package.json";
import { componentSlug } from "../../inspector/propSchema";
import { loadCompile, loadEngine, zenComponents } from "../engine";
import { assetBlob, assetOfUrl, loadUploads } from "../assets/uploads";
import { LIBRARY_PHOTOS } from "../library/media";
import { ProtoContext, type PageDevice, type ProtoActions } from "../proto/runtime";
import { frameOf, literalOf, type PageFrame } from "../render/frames";
import { renderFrame, type PageNode, type PageTree } from "../render/renderPage";
import { pageKey, studioStore } from "../../store";
import { designNames, guidelineNotes, handoffMarkdown, type FocusStop, type GuidelineNotes, type HandoffFrame } from "./handoff";
import { drawPng, undrawable } from "./screenshot";

/*
 * HTML export (Studio builder GĐ5 M2, spec docs/research/studio-builder-handoff-spec-2026-10-07.md §3b'): each Screen and
 * Overlay frame rendered off screen by the canvas's own renderer, its DOM written as `screens/<frame>.html` without the
 * Studio's attributes, and `styles.css`: the library's rules the screens use (read from the CSS this page has loaded:
 * tokens and their modes, `.zen-*` rules, the @font-face and @keyframes they name) after the library's reset. Library
 * photos and the font files go in the zip (`assets/`, `fonts/`). Static markup: what opens, switches or takes input needs
 * the React export. The handoff package (prepareHandoff) adds the React code, the design file, handoff.md and a PNG of each
 * frame from the same render. Loaded with the HTML and Handoff tabs (its own chunk).
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

/**
 * A URL in the markup as the export writes it: a library photo → `../assets/<key>.webp`, an uploaded photo (its object
 * URL) → `../assets/<id>` (both in the zip), any other absolute.
 */
function exportUrl(url: string, assets: Assets): string {
  if (url.startsWith("blob:")) {
    const upload = assetOfUrl(url);
    if (!upload) return url;
    const path = `assets/${upload.id}`;
    assets.set(path, { path, url });
    return `../${path}`;
  }
  if (/^(data:|#)/.test(url)) return url;
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

/**
 * A copy of the frame's DOM as exported: Studio attributes and anchors out, wrappers renamed, each URL through `mapUrl`
 * (the HTML: a library photo → its file in the zip; a picture: the photo as a data URL).
 */
export function exportCopy(root: HTMLElement, mapUrl: (url: string) => string): HTMLElement {
  const copy = root.cloneNode(true) as HTMLElement;
  syncFields(root, copy);
  for (const anchor of copy.querySelectorAll("template[data-zen-overlay-anchor]")) anchor.remove();
  for (const element of [copy, ...copy.querySelectorAll("*")]) {
    for (const name of element.getAttributeNames()) if (STUDIO_ATTRIBUTE.test(name)) element.removeAttribute(name);
    for (const [from, to] of Object.entries(RENAMED_CLASS)) if (element.classList.contains(from)) element.classList.replace(from, to);
    for (const name of ["src", "poster", "href", "xlink:href"]) {
      const value = element.getAttribute(name);
      if (value && (name !== "href" || element.namespaceURI === "http://www.w3.org/2000/svg") && element.tagName.toLowerCase() !== "use") element.setAttribute(name, mapUrl(value));
    }
    const srcset = element.getAttribute("srcset");
    if (srcset) element.setAttribute("srcset", srcset.split(",").map((part) => { const [url, ...size] = part.trim().split(/\s+/); return [mapUrl(url), ...size].join(" "); }).join(", "));
    const style = element.getAttribute("style");
    if (style && /url\(/.test(style)) element.setAttribute("style", style.replace(/url\((['"]?)([^'")]+)\1\)/g, (_match, quote: string, url: string) => `url(${quote}${mapUrl(url)}${quote})`));
  }
  return copy;
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
    "   library rules its screens use, and the fonts and animations those name. An app imports @zen-ds/react/styles.css",
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

type RenderedFrame = { node: PageNode; frame: PageFrame; file: string; title: string; root: HTMLElement | null };
type Rendered = { tree: PageTree; frames: RenderedFrame[]; dispose: () => void };

/** The ZenProvider props the canvas draws a frame in: the Studio's Modes, a frame's own theme over them (the open page). */
export function canvasModes(id: string, frameId?: string) {
  const state = studioStore.getState();
  const { preview } = state;
  const own = frameId && state.localPage === id ? state.frameOverrides[pageKey(state.page, state.collection, state.localPage)]?.[frameId]?.theme : undefined;
  return { theme: own ?? preview.theme, componentTheme: preview.componentTheme, density: preview.density, typography: preview.typography, radius: preview.radius, emphasis: preview.emphasis, contrast: preview.contrast ?? "standard" };
}

/** Renders the page's frames off screen, as the canvas draws them; `dispose` unmounts them. */
async function renderFrames(id: string, text: string): Promise<Rendered | { error: string }> {
  // Uploaded photos resolve to their object URLs only once loaded.
  await loadUploads();
  const engine = await loadEngine();
  const tree = engine.parsePage(text, { components: new Set(zenComponents) }) as unknown as PageTree;
  if (tree.errors.length || !tree.board) return { error: tree.errors[0] ? `line ${tree.errors[0].line}: ${tree.errors[0].message}` : "The page has no board" };
  const nodes = tree.board.children.filter((child): child is PageNode => child.kind === "element" && (child.name === "Screen" || child.name === "Overlay"));
  if (!nodes.length) return { error: "The page has no Screen" };
  const frames = nodes.map((node) => {
    const frame = frameOf(node);
    return { node, frame, file: fileOf(node), title: frame.kind === "overlay" ? `Overlay ${String(literalOf(node, "id"))}` : frame.label, root: null as HTMLElement | null };
  });
  const host = document.createElement("div");
  // Off screen and out of the way (as a template renders for Start from): never focused, hit or read while it renders.
  host.style.cssText = "position:fixed;top:0;left:-20000px;pointer-events:none;";
  host.inert = true;
  document.body.append(host);
  const root = createRoot(host);
  const dispose = () => { root.unmount(); host.remove(); };
  // Its own file name, so the copy's data-zen-src never reads as the page on the canvas.
  const ctx = { file: `export:${id}.zen.tsx`, mock: tree.mock, proto: INERT };
  try {
    root.render(
      <ProtoContext value={INERT}>
        {frames.map(({ node, frame }) => (
          <div key={frame.id} data-export-frame={frame.id} style={{ width: frame.width }}>
            <ZenProvider {...canvasModes(id, frame.id)} brand="zen" breakpoint={BREAKPOINT[frame.device]} syncDocument={false}>{renderFrame(node, ctx)}</ZenProvider>
          </div>
        ))}
      </ProtoContext>,
    );
    await settle(host);
  } catch (error) {
    dispose();
    throw error;
  }
  for (const entry of frames) entry.root = host.querySelector<HTMLElement>(`[data-export-frame="${CSS.escape(entry.frame.id)}"] > .zen-provider`);
  return { tree, frames, dispose };
}

/** The rendered frames as static HTML files (screens/, index.html, styles.css) and the assets they use. */
function htmlOf(rendered: Rendered, { id, title }: { id: string; title: string }): HtmlExport {
  const roots = rendered.frames.map((entry) => entry.root).filter((element): element is HTMLElement => Boolean(element));
  const assets: Assets = new Map();
  const component = `${componentName(title)}Page`;
  const screens: HtmlScreen[] = rendered.frames.map(({ frame, file, title: name }) => ({ frame: frame.id, title: name, file, kind: frame.kind, device: frame.device, width: frame.width }));
  const files = rendered.frames.map(({ frame, root }, index) => {
    const screen = screens[index];
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
      root ? exportCopy(root, (url) => exportUrl(url, assets)).outerHTML : "<!-- This frame did not render. -->",
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
}

/** The page `text` (id `id`, titled `title`) as static HTML files and the assets they use. */
export async function exportHtml({ id, title, text }: { id: string; title: string; text: string }): Promise<HtmlExport | { error: string }> {
  const rendered = await renderFrames(id, text);
  if ("error" in rendered) return rendered;
  try {
    return htmlOf(rendered, { id, title });
  } finally {
    rendered.dispose();
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

// ── The handoff package (GĐ5 M3) ───────────────────────────────────────────────────────────────────────────────────

const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]';
const ROLE_OF_INPUT: Record<string, string> = { checkbox: "checkbox", radio: "radio", range: "slider", button: "button", submit: "button", reset: "button", search: "searchbox" };

/** An element's role as assistive tech reads it: its `role`, else its tag's. */
function roleOf(element: HTMLElement): string {
  const explicit = element.getAttribute("role");
  if (explicit) return explicit;
  const tag = element.tagName.toLowerCase();
  if (tag === "a") return "link";
  if (tag === "button" || tag === "summary") return "button";
  if (tag === "select") return "combobox";
  if (tag === "input") return ROLE_OF_INPUT[(element as HTMLInputElement).type] ?? "textbox";
  if (tag === "textarea") return "textbox";
  return "focusable";
}

/** An element's accessible name (aria-labelledby, aria-label, its label, its text, title, placeholder), simplified. */
function nameOf(element: HTMLElement): string {
  const clean = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = clean(labelledBy.split(/\s+/).map((id) => element.ownerDocument.getElementById(id)?.textContent ?? "").join(" "));
    if (text) return text;
  }
  const label = clean(element.getAttribute("aria-label"));
  if (label) return label;
  const labels = (element as HTMLInputElement).labels;
  if (labels?.length) { const text = clean([...labels].map((entry) => entry.textContent).join(" ")); if (text) return text; }
  const tag = element.tagName.toLowerCase();
  if (tag !== "input" && tag !== "textarea" && tag !== "select") {
    const text = clean(element.textContent) || clean(element.querySelector("img[alt]")?.getAttribute("alt"));
    if (text) return text;
  }
  return clean(element.getAttribute("title")) || clean(element.getAttribute("placeholder"));
}

/** A frame's Tab stops in order: each focusable element that shows, with its role and name. */
function focusStops(root: HTMLElement): FocusStop[] {
  const stops = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => element.tabIndex >= 0 && !element.hasAttribute("disabled") && !(element instanceof HTMLInputElement && element.type === "hidden") && element.getClientRects().length > 0);
  const ordered = [...stops.filter((element) => element.tabIndex > 0).sort((a, b) => a.tabIndex - b.tabIndex), ...stops.filter((element) => element.tabIndex === 0)];
  return ordered.map((element) => ({ role: roleOf(element), name: nameOf(element) }));
}

const guidelineFiles = import.meta.glob<string>("../../../../../docs/guidelines/*.md", { query: "?raw", import: "default" });

async function guidelineFor(slug: string | null): Promise<GuidelineNotes | null> {
  const load = slug ? guidelineFiles[`../../../../../docs/guidelines/${slug}.md`] : undefined;
  return load ? guidelineNotes(await load()) : null;
}

/** The bytes and the data URL of a file this site serves; null when it does not load. */
async function fetchFile(url: string): Promise<{ bytes: Uint8Array; dataUrl: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
    return { bytes, dataUrl };
  } catch {
    return null;
  }
}

export type HandoffPackage = { markdown: string; files: ZipInput[]; missing: string[]; name: string };

/**
 * The handoff package of the page: its React code, its design file, `handoff.md`, the photos the code imports, a PNG of
 * each frame (screenshot.ts) and the HTML export under `html/`. Everything is read from one off-screen render.
 */
export async function prepareHandoff({ id, title, text }: { id: string; title: string; text: string }): Promise<HandoffPackage | { error: string }> {
  const { compileReact } = await loadCompile();
  const compiled = compileReact(text, { file: `${id}.zen.tsx` });
  if ("error" in compiled) return { error: compiled.error };
  const rendered = await renderFrames(id, text);
  if ("error" in rendered) return rendered;
  try {
    const html = htmlOf(rendered, { id, title });
    const missing: string[] = [];
    const fetched = new Map<string, { bytes: Uint8Array; dataUrl: string }>();
    await Promise.all(html.assets.map(async (asset) => {
      const file = await fetchFile(asset.url);
      if (file) fetched.set(asset.path, file);
      else missing.push(`html/${asset.path}`);
    }));
    // The pictures: the screens' CSS with the fonts inside, each photo as a data URL, at the frame's size on the canvas.
    const styles = html.files.find((file) => file.path === "styles.css")?.text ?? "";
    const pictureCss = styles.replace(/url\((['"]?)(fonts\/[^'")]+)\1\)/g, (match, quote: string, path: string) => { const file = fetched.get(path); return file ? `url(${quote}${file.dataUrl}${quote})` : match; });
    const photos = new Map<string, string>();
    const pictureNotes: string[] = [];
    const frames: HandoffFrame[] = [];
    const pictures: ZipInput[] = [];
    for (const entry of rendered.frames) {
      const png = entry.file.replace(/\.html$/, ".png");
      const handoffFrame: HandoffFrame = { frame: entry.frame.id, title: entry.title, kind: entry.frame.kind, device: entry.frame.device, png: null, html: `html/${entry.file}`, focus: entry.root ? focusStops(entry.root) : [] };
      frames.push(handoffFrame);
      if (!entry.root) { pictureNotes.push(`${entry.title}: the frame did not render`); continue; }
      for (const image of entry.root.querySelectorAll("img")) {
        const url = absolute(image.currentSrc || image.src);
        if (!url || photos.has(url) || url.startsWith("data:")) continue;
        const file = await fetchFile(url);
        if (file) photos.set(url, file.dataUrl);
        else pictureNotes.push(`${entry.title}: a photo did not load (${url})`);
      }
      const copy = exportCopy(entry.root, (url) => photos.get(absolute(url)) ?? absolute(url));
      for (const image of copy.querySelectorAll("img, source")) { image.removeAttribute("srcset"); image.removeAttribute("sizes"); }
      const box = entry.root.getBoundingClientRect();
      const width = entry.frame.width;
      const height = Math.max(1, Math.ceil(box.height));
      // An SVG image is drawn once, at the start of every animation: the picture shows the resting state instead.
      const css = `${pictureCss}\n*, *::before, *::after { animation: none !important; transition: none !important; }\n.zen-provider { min-height: ${height}px; }\n.screen, .overlay { box-sizing: border-box; width: ${width}px; min-height: ${height}px; }\n.screen { display: flow-root; }\n.overlay { position: relative; overflow: hidden; }\n.overlay__portal { position: absolute; inset: 0; overflow: hidden; }`;
      for (const note of undrawable(entry.root)) pictureNotes.push(`${entry.title}: ${note} (not in the picture)`);
      const blob = await drawPng(copy, css, { width, height, scale: 2 });
      if (!blob) { pictureNotes.push(`${entry.title}: the browser could not draw it`); continue; }
      pictures.push({ path: png, data: new Uint8Array(await blob.arrayBuffer()) });
      handoffFrame.png = png;
    }
    // The photos the React code imports (./assets/<file>).
    const reactAssets: ZipInput[] = [];
    for (const media of compiled.media) {
      const photo = media.kind === "media" ? LIBRARY_PHOTOS.find((entry) => entry.key === media.key) : undefined;
      const bytes = photo ? (await fetchFile(absolute(photo.photo.src)))?.bytes : media.kind === "asset" ? await assetBlob(media.key).then((blob) => (blob ? blob.arrayBuffer() : null)).then((buffer) => (buffer ? new Uint8Array(buffer) : null)) : null;
      if (bytes) reactAssets.push({ path: `assets/${media.file}`, data: bytes });
      else missing.push(`assets/${media.file}`);
    }
    const components = await Promise.all(compiled.components.map(async (name) => { const slug = componentSlug(name); return { name, slug, notes: await guidelineFor(slug) }; }));
    const props = [...(/export type \w+PageProps = \{([\s\S]*?)\n\};/.exec(compiled.code)?.[1] ?? "").matchAll(/^\s+(\w+)\?:/gm)].map((match) => match[1]);
    const { theme, componentTheme, density, typography, radius, emphasis, contrast } = canvasModes(id);
    const markdown = handoffMarkdown({
      id,
      title,
      component: compiled.component,
      version: packageJson.version,
      provider: { theme, componentTheme, density, typography, radius, emphasis, ...(contrast !== "standard" ? { contrast } : {}) },
      frames,
      components,
      names: designNames(rendered.tree.board),
      actions: compiled.actions,
      handlers: compiled.handlers,
      dataType: compiled.dataType,
      props,
      media: compiled.media.map((media) => media.file),
      pictureNotes,
      date: new Date().toISOString().slice(0, 10),
    });
    const files: ZipInput[] = [
      { path: `${compiled.component}.tsx`, data: compiled.code },
      { path: `${id}.zen.tsx`, data: text },
      { path: "handoff.md", data: markdown },
      ...reactAssets,
      ...pictures,
      ...html.files.map((file) => ({ path: `html/${file.path}`, data: file.text })),
      ...html.assets.filter((asset) => fetched.has(asset.path)).map((asset) => ({ path: `html/${asset.path}`, data: fetched.get(asset.path)!.bytes })),
    ];
    return { markdown, files, missing, name: `${id}-handoff.zip` };
  } finally {
    rendered.dispose();
  }
}
