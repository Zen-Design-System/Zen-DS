import { applyEdit } from "../api";
import { selectFrameWhenShown } from "../board/frames";
import { canvasApi } from "../canvas/viewport";
import { annotatedAt, childHits, findBySrc, frameOf, selectHit, type FiberHit } from "../select/picker";
import { studioStore } from "../store";
import type { EditOp, PageVarStarts } from "../types";
import { loadEngine, zenComponents } from "./engine";
import { joinPin, pinRow } from "./frameEdit";
import type { FramePlace } from "./render/framePlace";
import { isLayerFrameId } from "./render/frames";
import type { PageNode, PageTree } from "./render/renderPage";
import { getPage, pageFile } from "./store/pageStore";

/*
 * Figma's layers on the canvas, outside any frame (user 2026-11-20: "Các component vẫn chỉ tạo và đặt trong frame. Không
 * đặt ở ngoài frame được"): a `<Layer id x y>` on the Board holds one layer at its place (dialect.mjs). The board draws it
 * without a frame of its own (BuilderBoard.tsx LayerFrame); what the person sees, selects, names and moves is its layer.
 * Assets' drop and ⌘V / Paste here on the empty canvas make one (boardPaste.ts); a drag on its layer moves the Layer
 * (frameMove.ts, as a frame moves); deleting its layer deletes the Layer.
 */

/** The `layer:<id>` frame `hit` stands alone in: its Layer's one layer (not a layer inside it), else null. */
export function looseFrameOf(hit: FiberHit | null | undefined): string | null {
  const host = hit?.hosts[0];
  const frameId = frameOf(host);
  if (!host || !isLayerFrameId(frameId)) return null;
  // The Layer draws nothing itself: its layer's first DOM node is the frame's own child.
  return host.parentElement?.getAttribute("data-studio-frame") === frameId ? frameId : null;
}

/** The `layer:<id>` frame a selected layer stands alone in (its Layer's one layer), else null. */
export function looseFrameOfSelection(selection: { src: string; instance: number; frameId: string | null }): string | null {
  const world = canvasApi.getWorldElement();
  if (!world || !isLayerFrameId(selection.frameId)) return null;
  const hits = findBySrc(world, selection.src);
  return looseFrameOf(hits[selection.instance] ?? hits[0]);
}

/** The one layer of the loose Layer `frameId` on the canvas, or null before it renders. */
export function looseLayerHit(frameId: string): FiberHit | null {
  const frame = document.querySelector(`[data-studio-frame="${CSS.escape(frameId)}"]`);
  const host = frame?.firstElementChild;
  if (!host || host.matches(".studio-frame__portal")) return null;
  const hit = annotatedAt(host);
  if (!hit) return null;
  return hit.name === "Layer" ? childHits(hit)[0] ?? null : hit;
}

/** Selects the one layer of the loose Layer `frameId` once the board shows it (a Layer just added or copied). */
export function selectLooseLayerWhenShown(frameId: string) {
  selectFrameWhenShown(frameId, (shown) => {
    const pick = (tries: number) => {
      const hit = looseLayerHit(shown);
      if (hit) selectHit(hit, canvasApi.getWorldElement());
      else if (tries > 0) requestAnimationFrame(() => pick(tries - 1));
      else studioStore.setState({ selection: null });
    };
    pick(30);
  });
}

const literal = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };

/**
 * New loose Layers on the board, each at its `place` (board frame px, its top-left corner) holding its `content` (one
 * layer's code, in the flow: not floated), last on the Board so they draw above the frames; the first one's layer is
 * selected. One edit and one undo step (frames still in the row are pinned first, as a placed frame does). Resolves to
 * their frame ids (`layer:<id>`), or null.
 */
export async function addLooseLayers(localPage: string, items: ReadonlyArray<{ place: FramePlace; content: string }>, label: string, vars?: PageVarStarts): Promise<string[] | null> {
  const read = async () => {
    const [engine, page] = await Promise.all([loadEngine(), getPage(localPage)]);
    if (!page) return null;
    const tree = engine.parsePage(page.text, { components: new Set(zenComponents) }) as unknown as PageTree;
    return tree.board ? { engine, tree: tree as PageTree & { board: PageNode }, nodes: tree.board.children.filter((child): child is PageNode => child.kind === "element"), text: page.text } : null;
  };
  let board = await read();
  if (!board || !items.length) return null;
  const pinned = board.nodes.some((node) => node.name !== "Section" && node.name !== "Slice" && literal(node, "x") === undefined) ? { text: board.text, hash: board.engine.sha1(board.text) } : null;
  if (pinned) {
    if (!(await pinRow(localPage))) return null;
    board = await read();
    if (!board) return null;
  }
  const { engine, tree, nodes } = board;
  const taken = nodes.filter((node) => node.name === "Layer").map((node) => String(literal(node, "id") ?? ""));
  const ids = items.map(() => { const id = engine.freeFrameId("layer", taken); taken.push(id); return id; });
  const code = items.map((item, index) => engine.layerCode({ id: ids[index], x: Math.round(item.place.x), y: Math.round(item.place.y), content: item.content })).join("\n");
  const response = await applyEdit({ file: pageFile(localPage), loc: tree.board.loc, name: "Board", ops: [{ op: "insertChild", code, ...(items.length > 1 ? { paste: true } : {}), ...(vars ? { vars: { ...vars } } : {}) } as EditOp] }, label);
  joinPin(pinned, response, label);
  if (!response.ok) return null;
  const frameIds = ids.map((id) => `layer:${id}`);
  selectLooseLayerWhenShown(frameIds[0]);
  return frameIds;
}

/** Whether the one layer of the loose Layer `frame` widens with it (it fills its container: a Top Navigation, an Input),
 *  not its own width (a Button). */
export function fillsLooseLayer(frame: HTMLElement): boolean {
  const kid = frame.firstElementChild;
  if (!(kid instanceof HTMLElement) || kid.matches(".studio-frame__portal")) return false;
  const width = kid.offsetWidth;
  const own = frame.style.width;
  frame.style.width = `${frame.offsetWidth + 40}px`;
  const wider = kid.offsetWidth > width;
  frame.style.width = own;
  return wider;
}
