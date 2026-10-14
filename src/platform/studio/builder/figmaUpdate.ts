import type { PageDoc } from "../../../../tools/studio/browser-engine.mjs";
import type { FigmaChange, FigmaSource } from "../../../../tools/studio/figma-diff.mjs";
import { applyEdit } from "../api";
import { loadEngine, zenComponents } from "./engine";
import { ensurePageDoc } from "./localApi";
import { findPulledPage, getPage, importPage, pageFile, setFigmaBase } from "./store/pageStore";

/*
 * Pages pulled from Figma (core rebuild M6; tools/studio/figma-pull.mjs makes them, figma-diff.mjs compares two pulls).
 * Import pages… with a pulled page: a new page keeps its layers' ids in its document and remembers the pull as its base;
 * a page of a frame already here opens Update from Figma instead (UpdateFromFigmaDialog), which applies the changes the
 * person ticks as one edit — the Board replaced by the merged one, ids kept (doc.mjs editDoc), so one ⌘Z undoes it.
 */

/** figma-diff.mjs, a small chunk of its own: loaded when a pulled page is imported. */
const diff = () => import("../../../../tools/studio/figma-diff.mjs");

export type PulledPage = { source: FigmaSource; doc: PageDoc; text: string };

/** A pulled page's text read for import: its frame, its document (its Figma ids) and its text without them; null otherwise. */
export async function readPulled(text: string): Promise<PulledPage | null> {
  if (!text.includes("\"figma\"")) return null;
  const engine = await loadEngine();
  const { figmaSource } = await diff();
  const { doc, errors } = engine.docFromText(text, { components: new Set(zenComponents) });
  if (!doc || errors.length) return null;
  const source = figmaSource(doc.header);
  return source ? { source, doc, text: engine.printPage(doc) } : null;
}

/** The page already pulled from this frame, or null. */
export const pulledPageOf = (pulled: PulledPage) => findPulledPage(pulled.source);

/** A new page from a pull: its text without ids, its document with them, the pull kept as the next one's base. */
export const importPulled = (pulled: PulledPage, wantedId: string | null) => importPage(pulled.text, wantedId, { doc: pulled.doc, figma: { base: pulled.doc } });

/** What the pull changes on the page, three ways when this browser kept the last pull: { changes, threeWay }. */
export async function pulledChanges(pageId: string, incoming: PageDoc): Promise<{ changes: FigmaChange[]; threeWay: boolean }> {
  await ensurePageDoc(pageId);
  const record = await getPage(pageId);
  if (!record?.doc) throw new Error("The page cannot be read as a document (fix its dialect errors first)");
  const { figmaChanges } = await diff();
  return figmaChanges({ base: record.figma?.base ?? null, current: record.doc, incoming });
}

/**
 * Applies the chosen changes as one edit ("Update from Figma"), then keeps the pull as the next base. Returns the keys of
 * the changes that could not land (their layer is gone from the page).
 */
export async function applyPulled(pageId: string, incoming: PageDoc, chosen: FigmaChange[]): Promise<string[]> {
  const engine = await loadEngine();
  const { mergeFigma } = await diff();
  await ensurePageDoc(pageId);
  const record = await getPage(pageId);
  if (!record?.doc) throw new Error("The page cannot be read as a document (fix its dialect errors first)");
  const { doc, skipped } = mergeFigma(record.doc, incoming, chosen);
  if (chosen.length > skipped.length) {
    const board = record.doc.board as { id: string };
    const loc = engine.locsOf(record.doc, record.text, { components: new Set(zenComponents) }).locOf.get(board.id);
    if (!loc) throw new Error("The page's Board was not found");
    const code = engine.elementText(doc.board, { ids: true });
    const response = await applyEdit({ file: pageFile(pageId), loc, name: "Board", ops: [{ op: "replaceElement", code }], hash: engine.sha1(record.text) }, "Update from Figma");
    if (!response.ok) throw new Error(response.error);
  }
  await setFigmaBase(pageId, incoming);
  return skipped;
}
