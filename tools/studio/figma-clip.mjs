// A Studio frame on the clipboard for Figma (docs/research/studio-copy-to-figma-2026-10-16.md, P2). ⌘C on a frame of a
// page you made writes its code (text/plain: ⌘V in the Studio pastes the frame) and its Figma export (text/html), which
// the Zen plugin places when ⌘V lands in its window. The export rides base64 in one attribute of an empty span: HTML
// would mangle JSON, and an app that takes the HTML shows nothing of it. Isomorphic (the Studio, selftests); the plugin
// reads it with its own copy of packageFromClip (src/ui/main.js studioPackageFromClip).
//
//   figmaClipHtml(pkg) → the text/html the clipboard carries
//   packageFromClip({ html, text }) → the export, or null (also a .figma.json's text pasted as is)
//   onlyFrame(doc, frameId) → the page document with that one frame on its board, or null

/** The attribute that carries the export. */
export const FIGMA_CLIP_ATTRIBUTE = "data-zen-studio-figma";

const base64Of = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let at = 0; at < bytes.length; at += 0x8000) binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
  return btoa(binary);
};
const textOf = (base64) => new TextDecoder().decode(Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)));

/** The clipboard's text/html for an export. */
export function figmaClipHtml(pkg) {
  return `<meta charset="utf-8"><span ${FIGMA_CLIP_ATTRIBUTE}="${base64Of(JSON.stringify(pkg))}"></span>`;
}

const isExport = (value) => Boolean(value) && typeof value === "object" && (value.format === "zen-studio-figma" || value.format === "zen-studio-rebind");

/** The export a paste carries: in its HTML (a Studio ⌘C), else its text when that is an export's JSON (a file's text). */
export function packageFromClip({ html, text } = {}) {
  const match = typeof html === "string" ? new RegExp(`${FIGMA_CLIP_ATTRIBUTE}="([A-Za-z0-9+/=]+)"`).exec(html) : null;
  if (match) {
    try {
      const pkg = JSON.parse(textOf(match[1]));
      if (isExport(pkg)) return pkg;
    } catch {
      return null;
    }
  }
  if (typeof text === "string" && text.trim().startsWith("{")) {
    try {
      const pkg = JSON.parse(text);
      if (isExport(pkg)) return pkg;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * The page document with only the frame `frameId` on its board: a Screen or Overlay by its id, as the canvas names a
 * frame ("screen:<id>[:<state>]", "overlay:<id>", builder/render/frames.ts) or bare.
 */
export function onlyFrame(doc, frameId) {
  const named = /^(screen|overlay):([^:]+)(?::(.+))?$/.exec(String(frameId));
  const id = named ? named[2] : String(frameId);
  const kind = named ? (named[1] === "overlay" ? "Overlay" : "Screen") : null;
  // A Screen in a state of its own (a copy of a screen showing its loading state) shares the id: the state tells it apart.
  const state = named?.[3] ?? null;
  const literal = (child, name) => (child.props?.[name]?.kind === "literal" ? child.props[name].value : undefined);
  const board = doc?.board;
  const frame = board?.children?.find((child) => child?.kind === "element" && (!kind || child.name === kind) && literal(child, "id") === id && (!named || (literal(child, "state") ?? null) === state));
  return frame ? { ...doc, board: { ...board, children: [frame] } } : null;
}
