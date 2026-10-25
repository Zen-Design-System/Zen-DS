import { figmaClipHtml, onlyFrame } from "../../../../../tools/studio/figma-clip.mjs";
import type { PageDoc } from "../../../../../tools/studio/browser-engine.mjs";
import { announceEditStatus } from "../../api";
import { canvasApi } from "../../canvas/viewport";
import { findBySrc } from "../../select/picker";
import { resolveSrc } from "../../select/srcIds";
import { frameClip } from "../frameEdit";
import { getPage, pageFile } from "../store/pageStore";

/*
 * A frame of a page you made on the system clipboard for Figma (docs/research/studio-copy-to-figma-2026-10-16.md P2):
 * its code (text/plain, the Studio's own frame paste) and its Figma export (text/html, tools/studio/figma-clip.mjs),
 * which the Zen plugin places when ⌘V lands in its window. The same html also carries Figma's own clipboard
 * (tools/studio/figma-native.mjs, docs/research/studio-native-paste-2026-10-17.md): ⌘V on any Figma canvas places the
 * layers as instances of the published Zen library, without the plugin. builder/frameKeys.ts reads it ahead for ⌘C; the frame menu reads it ahead when it
 * opens (readFrameAhead), so its Copy for Figma writes both in a copy event as ⌘C does.
 */

export type FrameFigmaClip = { html: string; notes: string[] } | { error: string };

/** One frame's Figma export as the clipboard's HTML. */
export async function frameFigmaClip(localPage: string, frameId: string): Promise<FrameFigmaClip> {
  const page = await getPage(localPage);
  if (!page) return { error: "The page is not in this browser any more" };
  const doc = (page.doc as PageDoc | undefined) ?? null;
  if (doc && !onlyFrame(doc, frameId)) return { error: "That frame is no longer on the page" };
  try {
    const { exportFigma } = await import("./figmaExport");
    const result = await exportFigma({ id: page.id, title: page.title, text: page.text, doc, frame: frameId });
    if ("error" in result) return result;
    return { html: await withNativePaste(figmaClipHtml(result.pkg), withCanvasHeights(result.pkg, localPage, frameId), result.notes), notes: result.notes };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

type SpecNode = { type?: string; key?: string; fillH?: boolean; minH?: number; layout?: { mode?: string }; children?: SpecNode[] };

/**
 * The export with each card that stretches to its grid row (an instance in a Grid) given the height it has on the
 * canvas as its minimum, for the direct paste. Figma's Hug row gives a stretched card only what its content cannot shrink
 * below: a row of Metric-Cards took its shortest card and squeezed the sparklines (Figma, 2026-10-23: 236 → 208). The
 * Zen plugin measures in Figma (settleGridRows); a paste cannot, so it takes the Studio's heights. A card the canvas does
 * not show once (off the page, drawn by a map) keeps none.
 */
function withCanvasHeights<T extends { frame: unknown }>(pkg: T, localPage: string, frameId: string): T {
  const frame = document.querySelector<HTMLElement>(`[data-studio-frame="${CSS.escape(frameId)}"]`);
  if (!frame?.offsetWidth) return pkg;
  const scale = frame.getBoundingClientRect().width / frame.offsetWidth || 1;
  const file = pageFile(localPage);
  const heightOf = (key: string) => {
    // Found from the canvas's world (as the Inspector finds a selection), kept to this frame's own.
    const hits = findBySrc(canvasApi.getWorldElement() ?? frame, resolveSrc(`${file}:@${key}`)).filter((hit) => hit.hosts.some((host) => frame.contains(host)));
    if (hits.length !== 1 || !hits[0].hosts.length) return null;
    const boxes = hits[0].hosts.map((host) => host.getBoundingClientRect());
    return Math.round((Math.max(...boxes.map((box) => box.bottom)) - Math.min(...boxes.map((box) => box.top))) / scale);
  };
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    const node = Object.fromEntries(Object.entries(value).map(([name, item]) => [name, visit(item)])) as SpecNode;
    if (node.layout?.mode === "GRID" && Array.isArray(node.children)) {
      node.children = node.children.map((cell) => {
        const height = cell.type === "INSTANCE" && cell.fillH && cell.key && /^[\w-]+$/.test(cell.key) ? heightOf(cell.key) : null;
        return height ? { ...cell, minH: Math.max(cell.minH ?? 0, height) } : cell;
      });
    }
    return node;
  };
  try {
    return { ...pkg, frame: visit(pkg.frame) };
  } catch {
    return pkg;
  }
}

/** The definition pack, read once (a large module: only when a frame is first copied for Figma). */
let pack: Promise<unknown> | null = null;

/** A WebP picture as PNG bytes (drawn on a canvas): Figma's direct paste takes PNG, JPEG and GIF pictures, not WebP. */
async function pictureAsPng(bytes: Uint8Array, mime: string): Promise<Uint8Array | null> {
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: mime }));
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
    return new Uint8Array(await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer());
  } finally {
    bitmap.close();
  }
}

/**
 * The library's full definitions (docs/figma-contracts/native-defs.json.gz, read once): with them the direct paste is
 * Figma's library form and lands in any Figma file as instances of the published Zen library; without them (the file
 * did not load) it binds by node id, in the Zen file only. Gzipped JSON, unpacked here unless the server already did.
 */
let libraryDefs: Promise<unknown> | null = null;
async function readLibraryDefs(): Promise<unknown> {
  const { default: url } = await import("../../../../../docs/figma-contracts/native-defs.json.gz?url");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`the library definitions did not load (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const gzipped = bytes[0] === 0x1f && bytes[1] === 0x8b;
  const text = gzipped ? await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"))).text() : new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

/** Figma's own clipboard ahead of the plugin's span; without it (the pack or the writer failed) the plugin paste stands. */
async function withNativePaste(pluginHtml: string, pkg: unknown, notes: string[]): Promise<string> {
  try {
    pack ??= import("../../../../../docs/figma-contracts/native-pack.json").then((module) => module.default);
    libraryDefs ??= readLibraryDefs().catch((error) => {
      libraryDefs = null;
      notes.push(`direct paste: Zen file only (${error instanceof Error ? error.message : String(error)})`);
      return null;
    });
    const [{ figmaPasteHtml }, definitions, defs] = await Promise.all([import("../../../../../tools/studio/figma-native.mjs"), pack, libraryDefs]);
    const native = await figmaPasteHtml(pkg, definitions, { toPng: pictureAsPng, defs });
    for (const note of native.notes) notes.push(`direct paste: ${note}`);
    return native.html + pluginHtml.replace(/^<meta charset="utf-8">/, "");
  } catch (error) {
    notes.push(`no direct paste (${error instanceof Error ? error.message : String(error)}): ⌘V in the Zen plugin`);
    return pluginHtml;
  }
}

/**
 * Writes a frame's code and its Figma export to the system clipboard in one item. Called in the user's gesture (the copy
 * event, a menu click) with what is still being read as promises: the clipboard waits for them, the gesture does not.
 * Chromium rewrites html written this way (`<!--` in an attribute becomes `&lt;!--`), which Figma's canvas refuses:
 * only the plugin reads it. ⌘C with the export already read (builder/frameKeys.ts) writes it in the copy event as is.
 */
export async function writeFrameClip(code: string | Promise<string>, html: Promise<string>): Promise<void> {
  const blob = (type: string) => (value: string) => new Blob([value], { type });
  const item = new ClipboardItem({ "text/plain": Promise.resolve(code).then(blob("text/plain")), "text/html": html.then(blob("text/html")) });
  await navigator.clipboard.write([item]);
}

/**
 * Writes a frame's code and Figma export in a copy event (document.execCommand in the user's gesture, a menu click):
 * the html as it is, so Figma's canvas takes it as well as the Zen plugin. False when the browser gave no copy event.
 */
export function copyFrameNow(code: string, html: string): boolean {
  let written = false;
  const onCopy = (event: ClipboardEvent) => {
    if (!event.clipboardData) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    event.clipboardData.setData("text/plain", code);
    event.clipboardData.setData("text/html", html);
    written = true;
  };
  document.addEventListener("copy", onCopy, true);
  try {
    document.execCommand("copy");
  } catch {
    written = false;
  } finally {
    document.removeEventListener("copy", onCopy, true);
  }
  return written;
}

/** A frame's code and Figma export read ahead (the frame menu opening), for its Copy for Figma. */
let ahead: { key: string; read: Promise<{ code: string; html: string } | null> } | null = null;
const aheadKey = (localPage: string, frameId: string) => `${localPage}|${frameId}`;

/** Reads a frame's code and Figma export ahead of a Copy for Figma (each menu opening reads them afresh). */
export function readFrameAhead(localPage: string, frameId: string) {
  const read = Promise.all([frameClip(localPage, frameId), frameFigmaClip(localPage, frameId)])
    .then(([clip, next]) => (clip && "html" in next ? { code: clip.code, html: next.html } : null))
    .catch(() => null);
  ahead = { key: aheadKey(localPage, frameId), read };
}

/** How long a click waits for the read: Chromium keeps the click's copy right for a few seconds. */
const GESTURE_MS = 3000;
const COPIED = "Copied for Figma — ⌘V on a Figma canvas or in the Zen plugin places it; ⌘V here pastes the frame";

/**
 * The frame menu's Copy for Figma: the frame's code and its Figma export on the clipboard. Read ahead (readFrameAhead,
 * waited for a moment), they go in a copy event, which Figma's canvas takes; not ready by then, the clipboard takes
 * them once they are, for the Zen plugin only (writeFrameClip).
 */
export async function copyFrameForFigma(localPage: string, frameId: string): Promise<void> {
  const pending = ahead?.key === aheadKey(localPage, frameId) ? ahead.read : null;
  const ready = pending ? await Promise.race([pending, new Promise<null>((resolve) => window.setTimeout(() => resolve(null), GESTURE_MS))]) : null;
  if (ready && copyFrameNow(ready.code, ready.html)) {
    announceEditStatus({ kind: "unchanged", message: COPIED, at: Date.now() });
    return;
  }
  const code = frameClip(localPage, frameId).then((clip) => clip?.code ?? Promise.reject(new Error("That frame is no longer on the page")));
  const html = frameFigmaClip(localPage, frameId).then((next) => ("html" in next ? next.html : Promise.reject(new Error(next.error))));
  announceEditStatus({ kind: "unchanged", message: "Preparing the frame for Figma…", at: Date.now() });
  return writeFrameClip(code, html).then(
    () => announceEditStatus({ kind: "unchanged", message: "Copied for Figma — ⌘V in the Zen plugin places it; copy again for a Figma canvas", at: Date.now() }),
    (error: unknown) => announceEditStatus({ kind: "error", message: `Not copied for Figma: ${error instanceof Error ? error.message : String(error)}`, at: Date.now() }),
  );
}
