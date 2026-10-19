import { parseSrc, studioApi } from "../api";
import { canvasApi } from "../canvas/viewport";
import { inspectorStatus } from "../inspector/status";
import { pinOfConstraint, type Pin } from "../position/positionModel";
import { isLockedSrc } from "../select/layerMeta";
import { selectedLayers, type ExtraLayer } from "../select/multiSelection";
import { findBySrc } from "../select/picker";
import { srcAttr } from "../select/srcIds";
import { canEdit } from "../store";
import type { EditOp } from "../types";
import { alignMoves, distributeMoves, tidyMoves, type AlignEdge, type Box, type Move } from "./arrangeModel";
import { setOwnPropsOnLayers } from "./multi";

/*
 * Several layers placed together, as Figma does (plan docs/research/studio-figma-design-parity-2026-10-18.md F2): align
 * (⌥A ⌥D ⌥W ⌥S ⌥H ⌥V, the multi-selection panel), distribute (⌃⌥H ⌃⌥V), tidy up (⌃⌥T), the arrows' nudge and a drag
 * of several floating layers. Each layer must float in its frame (a Stack / Grid / Box / Shape with position="absolute",
 * or the floating Box around any other layer): in auto layout the frame places its layers. Every change is one edit,
 * one ⌘Z (op many setProps, edit/multi.ts); the geometry is ./arrangeModel.ts.
 */

/** A selected layer that floats: the element that carries its position, its DOM node, its box and offsets in canvas px. */
export type FloatingItem = {
  /** The element written (the layer itself, or the floating Box around it). */
  target: ExtraLayer;
  host: HTMLElement;
  /** Its box in the canvas's unscaled px (one space for every frame). */
  box: Box;
  /** Its offsets inside its containing block (unscaled px), and that block's inner size. */
  offset: { left: number; top: number };
  inner: { width: number; height: number };
  pins: { x: Pin; y: Pin };
  /** Its containing block (layers of one free frame snap to it and to each other). */
  block: HTMLElement;
};

const FLOATING = ".zen-stack, .zen-grid, .zen-box, .zen-shape";

/** The floating DOM node of a layer and the element that carries its position, or null when it does not float. */
function floatingOf(layer: ExtraLayer, host: Element | undefined): { host: HTMLElement; target: ExtraLayer } | null {
  if (!(host instanceof HTMLElement)) return null;
  if (host.dataset.position === "absolute" && host.matches(FLOATING)) return { host, target: layer };
  const box = host.parentElement;
  if (box?.matches('.zen-box[data-position="absolute"]') && box.children.length === 1) {
    const src = srcAttr(box);
    if (src) return { host: box, target: { ...layer, src, name: "Box", instance: 0 } };
  }
  return null;
}

/**
 * The selected layers as floating items, in selection order; a sentence when one of them cannot move by its offsets
 * (in auto layout, locked, not drawn).
 */
export function floatingItems(layers: ExtraLayer[] = selectedLayers()): FloatingItem[] | string {
  const world = canvasApi.getWorldElement();
  if (!world) return "The canvas is not ready";
  const worldRect = world.getBoundingClientRect();
  const items: FloatingItem[] = [];
  for (const layer of layers) {
    if (isLockedSrc(layer.src)) return `${layer.name} is locked`;
    const hit = findBySrc(world, layer.src)[layer.instance];
    const floating = floatingOf(layer, hit?.hosts[0]);
    if (!floating) return "Align, distribute and tidy up move layers in a frame without auto layout; auto layout places its own";
    const block = floating.host.offsetParent;
    if (!(block instanceof HTMLElement)) return `${layer.name} is not on the canvas`;
    const outer = block.getBoundingClientRect();
    const rect = floating.host.getBoundingClientRect();
    const scale = block.offsetWidth ? outer.width / block.offsetWidth || 1 : 1;
    items.push({
      target: floating.target, host: floating.host, block,
      box: { x: (rect.left - worldRect.left) / scale, y: (rect.top - worldRect.top) / scale, width: rect.width / scale, height: rect.height / scale },
      offset: { left: (rect.left - outer.left) / scale - block.clientLeft, top: (rect.top - outer.top) / scale - block.clientTop },
      inner: { width: block.clientWidth, height: block.clientHeight },
      pins: { x: pinOfConstraint("x", floating.host.dataset.constraintX), y: pinOfConstraint("y", floating.host.dataset.constraintY) },
    });
  }
  return items;
}

export type Attributes = Array<{ kind: string; name: string; value?: string }>;

/** The px an inset is written as (`insetLeft={40}`), or null (a token step, a binding, or none). */
function writtenPx(attributes: Attributes, prop: string): number | null {
  const attr = attributes.find((candidate) => candidate.kind === "expression" && candidate.name === prop);
  const value = attr?.value !== undefined ? Number(attr.value) : NaN;
  return Number.isFinite(value) ? value : null;
}

/**
 * The props that move one item by `move` (px). `keepPins`: the nudge and the drag move each pinned edge's offset (Figma
 * keeps constraints); align / distribute / tidy write X / Y (a layer pinned elsewhere is pinned left / top again, as
 * Figma's align writes X / Y). A centred axis has no offset: it is pinned left / top to move.
 */
export function moveOps(item: FloatingItem, move: Move, attributes: Attributes, keepPins: boolean): EditOp[] {
  const ops: EditOp[] = [];
  const written = new Set(attributes.map((attr) => attr.name));
  const remove = (name: string) => { if (written.has(name)) ops.push({ op: "removeProp", name }); };
  const axis = (delta: number, pin: Pin, start: string, end: string, constraint: string, offset: number, size: number, inner: number) => {
    if (!delta) return;
    const at = Math.round((writtenPx(attributes, start) ?? offset) + delta);
    if (keepPins && pin !== "center") {
      if (pin === "start" || pin === "stretch") ops.push({ op: "setProp", name: start, value: { kind: "number", value: at } } as EditOp);
      if (pin === "end" || pin === "stretch") ops.push({ op: "setProp", name: end, value: { kind: "number", value: Math.round((writtenPx(attributes, end) ?? inner - offset - size) - delta) } } as EditOp);
      return;
    }
    ops.push({ op: "setProp", name: start, value: { kind: "number", value: at } } as EditOp);
    remove(constraint);
    remove(end);
  };
  axis(move.dx, item.pins.x, "insetLeft", "insetRight", "constraintX", item.offset.left, item.box.width, item.inner.width);
  axis(move.dy, item.pins.y, "insetTop", "insetBottom", "constraintY", item.offset.top, item.box.height, item.inner.height);
  return ops;
}

/** Writes each item's move (one edit, one ⌘Z); items that do not move are left out. */
export async function writeMoves(items: FloatingItem[], moves: Move[], label: string, keepPins = false): Promise<boolean> {
  if (!canEdit()) { inspectorStatus.set("neutral", "View only"); return false; }
  const moving = items.map((item, index) => ({ item, move: moves[index] })).filter(({ move }) => move && (move.dx || move.dy));
  if (!moving.length) { inspectorStatus.set("neutral", `${label}: nothing moves`); return true; }
  const opsByLoc: Record<string, EditOp[]> = {};
  const targets: ExtraLayer[] = [];
  for (const { item, move } of moving) {
    const at = parseSrc(item.target.src);
    if (!at) continue;
    const element = await studioApi.element(at.file, at.loc);
    if (!element) { inspectorStatus.set("negative", `${item.target.name} is no longer there — select it again`); return false; }
    const ops = moveOps(item, move, element.attributes as Attributes, keepPins);
    if (!ops.length) continue;
    opsByLoc[at.loc] = ops;
    targets.push(item.target);
  }
  if (!targets.length) return true;
  return setOwnPropsOnLayers(targets, opsByLoc, label);
}

const EDGE_WORDS: Record<AlignEdge, string> = { left: "left", right: "right", top: "top", bottom: "bottom", hcenter: "horizontal centers", vcenter: "vertical centers" };

/** Figma's align for several layers: to the box around them all. */
export async function alignLayers(edge: AlignEdge): Promise<boolean> {
  const items = floatingItems();
  if (typeof items === "string") { inspectorStatus.set("neutral", items); return false; }
  return writeMoves(items, alignMoves(items.map((item) => item.box), edge), `Align ${items.length} layers ${EDGE_WORDS[edge]}`);
}

/** Figma's Distribute horizontal / vertical spacing (three layers or more). */
export async function distributeLayers(axis: "x" | "y"): Promise<boolean> {
  const items = floatingItems();
  if (typeof items === "string") { inspectorStatus.set("neutral", items); return false; }
  if (items.length < 3) { inspectorStatus.set("neutral", "Select 3 layers or more to distribute them"); return false; }
  return writeMoves(items, distributeMoves(items.map((item) => item.box), axis), `Distribute ${axis === "x" ? "horizontal" : "vertical"} spacing`);
}

/** Figma's Tidy up (two layers or more). */
export async function tidyUpLayers(): Promise<boolean> {
  const items = floatingItems();
  if (typeof items === "string") { inspectorStatus.set("neutral", items); return false; }
  if (items.length < 2) { inspectorStatus.set("neutral", "Select 2 layers or more to tidy them up"); return false; }
  return writeMoves(items, tidyMoves(items.map((item) => item.box)), "Tidy up");
}

/** The arrows on several floating layers: each moves by the px, its constraints kept (one edit). */
export async function nudgeLayers(items: FloatingItem[], dx: number, dy: number): Promise<boolean> {
  return writeMoves(items, items.map(() => ({ dx, dy })), `Nudge ${items.length} layers`, true);
}
