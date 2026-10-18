import { applyEdit } from "../../api";
import { studioStore } from "../../store";
import type { EditOp } from "../../types";
import { loadEngine, zenComponents } from "../engine";
import { pinRow } from "../frameEdit";
import type { FramePlace } from "../render/framePlace";
import type { PageNode, PageTree } from "../render/renderPage";
import { getPage, pageFile } from "../store/pageStore";

/*
 * A new Screen or Overlay at the end of a builder page's Board (one edit, one undo step): the Prototype panel's
 * "Add screen" / "Add overlay" (holding a Dialog, Bottom Sheet, Side Panel or Card) and the toolbar's Frame tool. A Screen takes the device of the page's first Screen, so a
 * phone flow stays on phones. The Frame tool gives it a place on the board (a click) and a drawn size (a drag: an empty
 * Screen of that size, its device read from the width); the new frame is then selected.
 */

const literal = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };

/** `holds`: what a new Overlay holds (dialect OVERLAY_HOLDS: dialog, sheet, panel, card). `name`: the frame's name before
 *  its number (the device picked, "iPhone 2"; else "Screen"); `empty`: no app frame (default: a drawn or sized Screen). */
type Placement = { place?: FramePlace; width?: number; height?: number; device?: string; layout?: "mobile" | "desktop"; name?: string; empty?: boolean; holds?: "dialog" | "sheet" | "panel" | "card" };

async function readBoard(localPage: string) {
  const [engine, page] = await Promise.all([loadEngine(), getPage(localPage)]);
  if (!page) return null;
  const tree = engine.parsePage(page.text, { components: new Set(zenComponents) }) as unknown as PageTree;
  return tree.board ? { engine, tree: tree as PageTree & { board: PageNode }, frames: tree.board.children.filter((child): child is PageNode => child.kind === "element") } : null;
}

/** Removes a Screen or Overlay (`screen:<id>` / `overlay:<id>`) from a builder page's Board, one edit and one undo step,
 *  as Figma's Delete on a selected frame (the user 2026-10-16: "Chưa bấm delete frame màn hình"); the selection clears. */
export async function removeFrame(localPage: string, frameId: string): Promise<boolean> {
  const [kind, id] = frameId.split(":");
  if ((kind !== "screen" && kind !== "overlay") || !id) return false;
  const [board, page] = await Promise.all([readBoard(localPage), getPage(localPage)]);
  const frame = board?.frames.find((node) => node.name === (kind === "screen" ? "Screen" : "Overlay") && literal(node, "id") === id);
  if (!board || !page || !frame) return false;
  const title = String(literal(frame, "title") ?? id);
  // A removal names the text it was read from (the server refuses it without the file's hash).
  const response = await applyEdit({ file: pageFile(localPage), loc: frame.loc, name: frame.name, ops: [{ op: "removeElement" } as EditOp], hash: board.engine.sha1(page.text) }, `Delete ${title}`);
  if (response.ok) studioStore.setState({ selection: null });
  return Boolean(response.ok);
}

export async function addFrame(localPage: string, kind: "screen" | "overlay", { place, width, height, device: drawn, layout, name, empty: bare, holds }: Placement = {}): Promise<boolean> {
  let board = await readBoard(localPage);
  if (!board) return false;
  // A frame with a place of its own: the frames still in the row are pinned first, so none of them moves.
  if (place && board.frames.some((frame) => literal(frame, "x") === undefined)) {
    if (!(await pinRow(localPage))) return false;
    board = await readBoard(localPage);
    if (!board) return false;
  }
  const { engine, tree, frames } = board;
  const id = engine.freeFrameId(kind, frames.map((frame) => String(literal(frame, "id") ?? "")));
  const firstScreen = frames.find((frame) => frame.name === "Screen");
  const device = drawn ?? String((firstScreen && literal(firstScreen, "device")) ?? "desktop");
  const title = kind === "screen" ? `${name ?? "Screen"} ${id.split("-").at(-1)}` : undefined;
  // A drawn or picked Screen is empty, as Figma's frame (no app frame, nothing in it: the AppShell is the person's choice,
  // user 2026-10-18); the Prototype panel's Add screen still comes with the app frame.
  const empty = bare ?? width !== undefined;
  const code = engine.frameCode({ kind, id, title, device, layout, chrome: !empty, empty, holds, ...(place ? { x: place.x, y: place.y } : {}), ...(width !== undefined ? { width, height } : {}) });
  const response = await applyEdit({ file: pageFile(localPage), loc: tree.board.loc, name: "Board", ops: [{ op: "insertChild", code } as EditOp] }, kind === "screen" ? (width !== undefined ? (name ? `Add ${name}` : "Draw frame") : "Add screen") : "Add overlay");
  if (response.ok && place) studioStore.setState({ selection: { kind: "frame", frameId: `${kind}:${id}` } });
  return Boolean(response.ok);
}
