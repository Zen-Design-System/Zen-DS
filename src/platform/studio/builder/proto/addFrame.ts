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
 * "Add screen" / "Add overlay" and the toolbar's Frame tool. A Screen takes the device of the page's first Screen, so a
 * phone flow stays on phones. The Frame tool gives it a place on the board (a click) and a drawn size (a drag: an empty
 * Screen of that size, its device read from the width); the new frame is then selected.
 */

const literal = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };

type Placement = { place?: FramePlace; width?: number; height?: number; device?: string };

async function readBoard(localPage: string) {
  const [engine, page] = await Promise.all([loadEngine(), getPage(localPage)]);
  if (!page) return null;
  const tree = engine.parsePage(page.text, { components: new Set(zenComponents) }) as unknown as PageTree;
  return tree.board ? { engine, tree: tree as PageTree & { board: PageNode }, frames: tree.board.children.filter((child): child is PageNode => child.kind === "element") } : null;
}

export async function addFrame(localPage: string, kind: "screen" | "overlay", { place, width, height, device: drawn }: Placement = {}): Promise<boolean> {
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
  const title = kind === "screen" ? `Screen ${id.split("-").at(-1)}` : "Are you sure?";
  // A drawn Screen is empty, as Figma's drawn frame (no app frame); a placed or added one comes with it.
  const code = engine.frameCode({ kind, id, title, device, chrome: width === undefined, ...(place ? { x: place.x, y: place.y } : {}), ...(width !== undefined ? { width, height } : {}) });
  const response = await applyEdit({ file: pageFile(localPage), loc: tree.board.loc, name: "Board", ops: [{ op: "insertChild", code } as EditOp] }, kind === "screen" ? (width !== undefined ? "Draw frame" : "Add screen") : "Add overlay");
  if (response.ok && place) studioStore.setState({ selection: { kind: "frame", frameId: `${kind}:${id}` } });
  return Boolean(response.ok);
}
