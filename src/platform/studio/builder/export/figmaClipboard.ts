import { figmaClipHtml, onlyFrame } from "../../../../../tools/studio/figma-clip.mjs";
import type { PageDoc } from "../../../../../tools/studio/browser-engine.mjs";
import { announceEditStatus } from "../../api";
import { frameClip } from "../frameEdit";
import { getPage } from "../store/pageStore";

/*
 * A frame of a page you made on the system clipboard for Figma (docs/research/studio-copy-to-figma-2026-10-16.md P2):
 * its code (text/plain, the Studio's own frame paste) and its Figma export (text/html, tools/studio/figma-clip.mjs),
 * which the Zen plugin places when ⌘V lands in its window. builder/frameKeys.ts reads it ahead for ⌘C; the frame menu's
 * Copy for Figma writes it at once.
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
    return "error" in result ? result : { html: figmaClipHtml(result.pkg), notes: result.notes };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Writes a frame's code and its Figma export to the system clipboard in one item. Called in the user's gesture (the copy
 * event, a menu click) with what is still being read as promises: the clipboard waits for them, the gesture does not.
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
