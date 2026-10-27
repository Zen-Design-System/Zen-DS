import { applyEdit } from "../../api";
import { studioStore } from "../../store";
import type { EditOp } from "../../types";
import { loadEngine, zenComponents } from "../engine";
import { joinPin, pinRow } from "../frameEdit";
import type { FramePlace } from "../render/framePlace";
import type { PageNode, PageTree } from "../render/renderPage";
import { getPage, pageFile } from "../store/pageStore";
import { boardBoxes, boxAround, isSectionId, sectionContents } from "../../board/sections";
import { selectFrameWhenShown } from "../../board/frames";

/*
 * A new Screen or Overlay at the end of a builder page's Board (one edit, one undo step): the Prototype panel's
 * "Add screen" / "Add overlay" (holding a Dialog, Bottom Sheet, Side Panel or Card) and the toolbar's Frame tool. A Screen takes the device of the page's first Screen, so a
 * phone flow stays on phones. The Frame tool gives it a place on the board and a size (a click: 100 × 100; a drag: the
 * drawn size, its device read from the width; a preset of the right panel: the preset's size and device), always empty;
 * the new frame is then selected.
 */

const literal = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };

/** `holds`: what a new Overlay holds (dialect OVERLAY_HOLDS: dialog, sheet, panel, card). `name`: the frame's name before
 *  its number (the device picked, "iPhone 2"; else "Screen"); `empty`: no app frame (default: a drawn or sized Screen).
 *  `content`: layers an empty Screen holds (Paste here on the empty canvas, builder/boardPaste.ts), in the same edit;
 *  `label`: the edit's name in History. */
type Placement = { place?: FramePlace; width?: number; height?: number; device?: string; layout?: "mobile" | "desktop"; name?: string; empty?: boolean; holds?: "dialog" | "sheet" | "panel" | "card"; content?: string; label?: string };

async function readBoard(localPage: string) {
  const [engine, page] = await Promise.all([loadEngine(), getPage(localPage)]);
  if (!page) return null;
  const tree = engine.parsePage(page.text, { components: new Set(zenComponents) }) as unknown as PageTree;
  return tree.board ? { engine, tree: tree as PageTree & { board: PageNode }, frames: tree.board.children.filter((child): child is PageNode => child.kind === "element"), text: page.text } : null;
}

const TAGS: Record<string, string> = { screen: "Screen", overlay: "Overlay", section: "Section", slice: "Slice" };

/** A Board child by its frame id (`screen:<id>[:<state>]`, `overlay:<id>`, `section:<id>`). */
function boardNode(frames: readonly PageNode[], frameId: string) {
  const [kind, id, state] = frameId.split(":");
  return frames.find((node) => node.name === TAGS[kind] && literal(node, "id") === id && (kind !== "screen" || (literal(node, "state") ?? undefined) === (state || undefined)));
}

/** Removes a Screen, Overlay or Section (`screen:<id>`, `overlay:<id>`, `section:<id>`) from a builder page's Board, one
 *  edit and one undo step, as Figma's Delete on a selected frame (the user 2026-10-16: "Chưa bấm delete frame màn hình");
 *  the selection clears. */
export const removeFrame = (localPage: string, frameId: string, options: { keepContents?: boolean } = {}) => removeFrames(localPage, [frameId], options);

/**
 * Figma's Delete on selected frames and Sections, one edit: a Section takes the frames and Sections inside it with it
 * (board/sections.ts); `keepContents` (Figma's ⌘⌫ on a Section) removes the Sections only. The selection clears.
 */
export async function removeFrames(localPage: string, frameIds: readonly string[], { keepContents = false }: { keepContents?: boolean } = {}): Promise<boolean> {
  const [board, page] = await Promise.all([readBoard(localPage), getPage(localPage)]);
  if (!board || !page) return false;
  const boxes = boardBoxes();
  const ids = new Set(frameIds);
  if (!keepContents) for (const id of frameIds) if (isSectionId(id)) sectionContents(id, boxes).forEach((member) => ids.add(member));
  const nodes = [...ids].map((id) => boardNode(board.frames, id)).filter((node): node is PageNode => Boolean(node));
  if (!nodes.length) return false;
  const titleOf = (node: PageNode) => String(literal(node, "title") ?? literal(node, "id") ?? node.name);
  const label = nodes.length === 1 ? `Delete ${titleOf(nodes[0])}` : `Delete ${nodes.length} frames`;
  // A removal names the text it was read from (the server refuses it without the file's hash).
  const hash = board.engine.sha1(page.text);
  const response = nodes.length === 1
    ? await applyEdit({ file: pageFile(localPage), loc: nodes[0].loc, name: nodes[0].name, ops: [{ op: "removeElement" } as EditOp], hash }, label)
    : await applyEdit({ file: pageFile(localPage), loc: nodes[0].loc, name: nodes[0].name, ops: [{ op: "many", action: "remove", locs: nodes.map((node) => node.loc) } as EditOp], hash }, label);
  if (response.ok) studioStore.setState({ selection: null });
  return Boolean(response.ok);
}

/** Room Figma leaves between a Section made around frames and the frames. */
export const SECTION_PADDING = 80;

/**
 * A new Section on a builder page (Figma's Section tool ⇧S, Wrap in new section): at `box` (board frame px), named
 * "Section N", first on the Board so it draws behind the frames; selected. One edit and one undo step (frames still in
 * the row are pinned first, as a placed frame does).
 */
export async function addSection(localPage: string, box: { x: number; y: number; width: number; height: number }, label = "Add section"): Promise<string | null> {
  let board = await readBoard(localPage);
  if (!board) return null;
  // Frames still in the row are pinned first, in the same undo step (frameEdit.ts joinPin).
  const pinned = board.frames.some((frame) => frame.name !== "Section" && frame.name !== "Slice" && literal(frame, "x") === undefined) ? { text: board.text, hash: board.engine.sha1(board.text) } : null;
  if (pinned) {
    if (!(await pinRow(localPage))) return null;
    board = await readBoard(localPage);
    if (!board) return null;
  }
  const { engine, tree, frames } = board;
  const id = engine.freeFrameId("section", frames.filter((frame) => frame.name === "Section").map((frame) => String(literal(frame, "id") ?? "")));
  const code = engine.sectionCode({ id, title: `Section ${id.split("-").at(-1)}`, x: box.x, y: box.y, width: Math.max(100, box.width), height: Math.max(100, box.height) });
  const response = await applyEdit({ file: pageFile(localPage), loc: tree.board.loc, name: "Board", ops: [{ op: "insertChild", code, index: 0 } as EditOp] }, label);
  joinPin(pinned, response, label);
  if (!response.ok) return null;
  const frameId = `section:${id}`;
  selectFrameWhenShown(frameId, (shown) => studioStore.setState({ selection: { kind: "frame", frameId: shown } }));
  return frameId;
}

/**
 * A new Slice on a builder page (Figma's Slice tool S): at `box` (board frame px), named "Slice N", last on the Board so
 * its outline draws above the frames; selected. One edit and one undo step (frames still in the row are pinned first).
 */
export async function addSlice(localPage: string, box: { x: number; y: number; width: number; height: number }): Promise<string | null> {
  let board = await readBoard(localPage);
  if (!board) return null;
  // Frames still in the row are pinned first, in the same undo step (frameEdit.ts joinPin).
  const pinned = board.frames.some((frame) => frame.name !== "Section" && frame.name !== "Slice" && literal(frame, "x") === undefined) ? { text: board.text, hash: board.engine.sha1(board.text) } : null;
  if (pinned) {
    if (!(await pinRow(localPage))) return null;
    board = await readBoard(localPage);
    if (!board) return null;
  }
  const { engine, tree, frames } = board;
  const id = engine.freeFrameId("slice", frames.filter((frame) => frame.name === "Slice").map((frame) => String(literal(frame, "id") ?? "")));
  const code = engine.sliceCode({ id, title: `Slice ${id.split("-").at(-1)}`, x: box.x, y: box.y, width: Math.max(1, box.width), height: Math.max(1, box.height) });
  const response = await applyEdit({ file: pageFile(localPage), loc: tree.board.loc, name: "Board", ops: [{ op: "insertChild", code } as EditOp] }, "Add slice");
  joinPin(pinned, response, "Add slice");
  if (!response.ok) return null;
  const frameId = `slice:${id}`;
  selectFrameWhenShown(frameId, (shown) => studioStore.setState({ selection: { kind: "frame", frameId: shown } }));
  return frameId;
}

/** Figma's Wrap in new section: a Section around the selected frames (their boxes on the board, padded). */
export async function wrapInSection(localPage: string, frameIds: readonly string[]): Promise<string | null> {
  const boxes = boardBoxes().filter((box) => frameIds.includes(box.id));
  const around = boxAround(boxes, SECTION_PADDING);
  return around ? addSection(localPage, around, "Wrap in new section") : null;
}

export async function addFrame(localPage: string, kind: "screen" | "overlay", { place, width, height, device: drawn, layout, name, empty: bare, holds, content, label }: Placement = {}): Promise<boolean> {
  let board = await readBoard(localPage);
  if (!board) return false;
  // A frame with a place of its own: the frames still in the row are pinned first, so none of them moves (the same undo
  // step: frameEdit.ts joinPin).
  const pinned = place && board.frames.some((frame) => literal(frame, "x") === undefined) ? { text: board.text, hash: board.engine.sha1(board.text) } : null;
  if (pinned) {
    if (!(await pinRow(localPage))) return false;
    board = await readBoard(localPage);
    if (!board) return false;
  }
  const { engine, tree, frames } = board;
  const id = engine.freeFrameId(kind, frames.map((frame) => String(literal(frame, "id") ?? "")));
  const firstScreen = frames.find((frame) => frame.name === "Screen");
  const device = drawn ?? String((firstScreen && literal(firstScreen, "device")) ?? "desktop");
  // A drawn or sized frame is a Frame (Figma's word, decision 5); the Prototype panel's Add screen keeps "Screen".
  const title = kind === "screen" ? `${name ?? (width !== undefined ? "Frame" : "Screen")} ${id.split("-").at(-1)}` : undefined;
  // A drawn or picked Screen is empty, as Figma's frame (no app frame, nothing in it: the AppShell is the person's choice,
  // user 2026-10-18); the Prototype panel's Add screen still comes with the app frame.
  const empty = bare ?? width !== undefined;
  const frame = engine.frameCode({ kind, id, title, device, layout, chrome: !empty, empty, holds, ...(place ? { x: place.x, y: place.y } : {}), ...(width !== undefined ? { width, height } : {}) });
  // An empty Screen is one self-closing tag: the content goes inside it, one level in.
  const code = content && kind === "screen" && empty ? `${frame.replace(/\s*\/>$/, ">")}\n${content.split("\n").map((line) => (line ? `  ${line}` : line)).join("\n")}\n</Screen>` : frame;
  const named = label ?? (kind === "screen" ? (width !== undefined ? (name ? `Add ${name}` : "Draw frame") : "Add Screen") : "Add overlay");
  const response = await applyEdit({ file: pageFile(localPage), loc: tree.board.loc, name: "Board", ops: [{ op: "insertChild", code } as EditOp] }, named);
  joinPin(pinned, response, named);
  if (response.ok && place) selectFrameWhenShown(`${kind}:${id}`, (frameId) => studioStore.setState({ selection: { kind: "frame", frameId } }));
  return Boolean(response.ok);
}
