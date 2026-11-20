import { announceEditStatus, applyEdit, parseSrc, studioApi } from "../api";
import { loadEngine, zenComponents } from "../builder/engine";
import { boardPlaceAt } from "../builder/frameMove";
import { looseLayerHit, selectLooseLayerWhenShown } from "../builder/looseLayer";
import type { FramePlace } from "../builder/render/framePlace";
import type { PageNode, PageTree } from "../builder/render/renderPage";
import { getPage } from "../builder/store/pageStore";
import { canvasApi } from "../canvas/viewport";
import { findBySrc } from "../select/picker";
import { canStructurallyEdit } from "../slots/actions";
import { canEdit, studioStore } from "../store";
import type { NodeSelection } from "./arrange";
import { dropTargetAt, type DropContext, type Target } from "./drag";
import { freeBlock, localTo } from "./freeBlock";

/*
 * Figma's drag out of a frame and into one (loose layers PR2; user 2026-11-20 "Không đặt ở ngoài frame được", scope
 * "Đủ như Figma"): a layer dragged with the pointer over the empty canvas lands there as a layer on the canvas (a
 * <Layer> of the Board, builder/looseLayer.ts), at the place it shows; a layer on the canvas dragged onto a frame goes
 * into it, at the px it shows in a frame without auto layout. One edit each (engine op moveTo `loose` / `at`), one ⌘Z.
 */

const fail = (message: string) => announceEditStatus({ kind: "error", message, at: Date.now() });

/** A frame of the board (not a Section, the board under the frames). */
const FRAME = "[data-studio-frame]:not([data-kind='section'])";

/**
 * The place on the board of a page you made where something whose corner shows at `corner` (client px) lands when the
 * pointer at `pointer` is over the empty canvas (no frame under it, the dragged nodes `dragged` left out), else null.
 */
export function canvasDropAt(pointer: { x: number; y: number }, corner: { x: number; y: number }, dragged: readonly Element[]): FramePlace | null {
  const state = studioStore.getState();
  if (!state.localPage || !canEdit(state)) return null;
  const world = canvasApi.getWorldElement();
  const viewport = canvasApi.getViewportElement();
  if (!world || !viewport) return null;
  const view = viewport.getBoundingClientRect();
  if (pointer.x < view.left || pointer.x > view.right || pointer.y < view.top || pointer.y > view.bottom) return null;
  const mine = (element: Element) => dragged.some((node) => node === element || node.contains(element));
  // The canvas's own layers over the world (the selection's capture layer, the drag's label) are not what is there.
  for (const element of document.elementsFromPoint(pointer.x, pointer.y)) {
    if (mine(element) || !world.contains(element)) continue;
    if (element.closest(FRAME)) return null;
  }
  return boardPlaceAt(corner);
}

/** The px in the frame without auto layout `host` (a Screen's, a Box's) where a layer whose corner shows at `corner`
 *  floats, or null when `host` lays its layers out (auto layout). */
export function freeDropAt(host: Element | undefined, corner: { x: number; y: number }): { x: number; y: number } | null {
  const block = freeBlock(host);
  if (!block) return null;
  const at = localTo(block, corner.x, corner.y);
  return { x: Math.round(at.x), y: Math.round(at.y) };
}

/** Whether `host` fills its parent's width (a Stack set to Fill, a Top Navigation): it keeps that width on the canvas. */
function fillsParent(host: HTMLElement): boolean {
  const parent = host.parentElement;
  if (!parent) return false;
  const style = getComputedStyle(parent);
  const inner = parent.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
  return host.offsetWidth >= inner - 1 && host.offsetWidth > 0;
}

/**
 * Moves `layer` (the element that carries its place: a layer, or the floating Box that places it) onto the canvas of
 * the page you made at `place` (board frame px, its corner), as a <Layer>; one edit, its layer selected. A layer that
 * filled its container keeps its width there.
 */
export async function moveToCanvas(layer: NodeSelection, place: FramePlace, copy = false): Promise<boolean> {
  const { localPage } = studioStore.getState();
  const check = canStructurallyEdit(layer);
  if (!check.ok) { fail(check.reason); return false; }
  const at = parseSrc(layer.src);
  if (!localPage || !at) return false;
  const [engine, page, element] = await Promise.all([loadEngine(), getPage(localPage), studioApi.element(at.file, at.loc)]);
  if (!page || !element) { fail(`${layer.name} is no longer there — select it again`); return false; }
  const tree = engine.parsePage(page.text, { components: new Set(zenComponents) }) as unknown as PageTree;
  if (!tree.board) return false;
  const taken = tree.board.children.filter((child): child is PageNode => child.kind === "element" && child.name === "Layer").map((node) => String(node.props.id?.kind === "literal" ? node.props.id.value : ""));
  const id = engine.freeFrameId("layer", taken);
  const world = canvasApi.getWorldElement();
  const host = world ? (findBySrc(world, layer.src)[layer.instance] ?? findBySrc(world, layer.src)[0])?.hosts[0] : undefined;
  const scale = host instanceof HTMLElement && host.offsetWidth ? host.getBoundingClientRect().width / host.offsetWidth || 1 : 1;
  const width = host instanceof HTMLElement && fillsParent(host) ? Math.round(host.getBoundingClientRect().width / scale) : undefined;
  const loose = { id, x: Math.round(place.x), y: Math.round(place.y), ...(width ? { width } : {}) };
  const name = layer.name.slice(layer.name.lastIndexOf(".") + 1);
  const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [{ op: "moveTo", parent: tree.board.loc, loose, ...(copy ? { copy: true } : {}) }], hash: element.hash }, `${copy ? "Copy" : "Move"} ${name} to the canvas`);
  if (!response.ok) return false;
  selectLooseLayerWhenShown(`layer:${id}`);
  return true;
}

/**
 * Where the layer on the canvas `frameId` goes when it is let go with the pointer at `pointer`, its corner showing at
 * `corner`: into the frame or container under the pointer (floating at `at` px in one without auto layout), or null
 * (over the empty canvas, or a layer that takes nothing: it stays a layer on the canvas and moves there).
 */
export function looseDropAt(frameId: string, pointer: { x: number; y: number }, corner: { x: number; y: number }): { layer: NodeSelection; target: Target; at: { x: number; y: number } | null } | null {
  const frame = document.querySelector<HTMLElement>(`[data-studio-frame="${CSS.escape(frameId)}"]`);
  const hit = looseLayerHit(frameId);
  if (!frame || !hit) return null;
  const context: DropContext = { hosts: [frame, ...hit.hosts.filter((host): host is HTMLElement => host instanceof HTMLElement)], frame, parentHost: null, origin: null, layerSrc: hit.src, copy: false, layers: 1, slots: true };
  const { target } = dropTargetAt(pointer.x, pointer.y, context);
  if (!target || target.noop) return null;
  const host = findBySrc(canvasApi.getWorldElement() ?? document.body, target.parentSrc)[0]?.hosts[0];
  const layer: NodeSelection = { kind: "node", src: hit.src, name: hit.name, frameId, panelId: null, instance: 0 };
  return { layer, target: { ...target, reparent: true }, at: freeDropAt(host, corner) };
}
