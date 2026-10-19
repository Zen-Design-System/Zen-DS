import { figmaClipHtml, onlyFrame } from "../../../../../tools/studio/figma-clip.mjs";
import type { PageDoc } from "../../../../../tools/studio/browser-engine.mjs";
import { announceEditStatus } from "../../api";
import { frameClip } from "../frameEdit";
import { getPage } from "../store/pageStore";

/*
 * A frame of a page you made on the system clipboard for Figma (docs/research/studio-copy-to-figma-2026-10-16.md P2):
 * its code (text/plain, the Studio's own frame paste) and its Figma export (text/html, tools/studio/figma-clip.mjs),
 * which the Zen plugin places when ⌘V lands in its window. The same html also carries Figma's own clipboard
 * (tools/studio/figma-native.mjs, docs/research/studio-native-paste-2026-10-17.md): ⌘V on the Zen file's canvas places
 * the layers without the plugin. builder/frameKeys.ts reads it ahead for ⌘C; the frame menu's Copy for Figma writes it
 * at once.
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
    return { html: await withNativePaste(figmaClipHtml(result.pkg), result.pkg, result.notes), notes: result.notes };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
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

/** Figma's own clipboard ahead of the plugin's span; without it (the pack or the writer failed) the plugin paste stands. */
async function withNativePaste(pluginHtml: string, pkg: unknown, notes: string[]): Promise<string> {
  try {
    pack ??= import("../../../../../docs/figma-contracts/native-pack.json").then((module) => module.default);
    const [{ figmaPasteHtml }, definitions] = await Promise.all([import("../../../../../tools/studio/figma-native.mjs"), pack]);
    const native = await figmaPasteHtml(pkg, definitions, { toPng: pictureAsPng });
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

/** The frame menu's Copy for Figma: the frame's code and its Figma export on the clipboard. */
export function copyFrameForFigma(localPage: string, frameId: string): Promise<void> {
  const code = frameClip(localPage, frameId).then((clip) => clip?.code ?? Promise.reject(new Error("That frame is no longer on the page")));
  const html = frameFigmaClip(localPage, frameId).then((next) => ("html" in next ? next.html : Promise.reject(new Error(next.error))));
  announceEditStatus({ kind: "unchanged", message: "Preparing the frame for Figma…", at: Date.now() });
  return writeFrameClip(code, html).then(
    () => announceEditStatus({ kind: "unchanged", message: "Copied for Figma — ⌘V in the Zen plugin places it; ⌘V here pastes the frame", at: Date.now() }),
    (error: unknown) => announceEditStatus({ kind: "error", message: `Not copied for Figma: ${error instanceof Error ? error.message : String(error)}`, at: Date.now() }),
  );
}
