import { announceEditStatus, applyEdit, parseSrc, studioApi } from "../api";
import { frameNodeOf } from "../builder/frameEdit";
import { floatingItems, type FloatingItem } from "../edit/alignLayers";
import { unionOf } from "../edit/arrangeModel";
import { isLockedSrc } from "../select/layerMeta";
import { selectedLayers } from "../select/multiSelection";
import { canEdit, studioStore } from "../store";
import type { EditOp, SourceElement } from "../types";
import { anchoredBox, insetOps, scaleOps, scaleStatus, type ScaleAnchor, type ScaleBox } from "./scaleModel";

/*
 * Figma's Scale tool (K) on a page you made (scaleModel.ts has the numbers): the selected layers, or the selected Screen
 * or Overlay, and everything inside them, by one factor about the anchor, in one edit and one ⌘Z. A floating layer's
 * place follows the anchor (of the box around the layers scaled together); one in auto layout keeps its place in the
 * flow. Locked layers do not scale, nor a Section (its frames sit beside it), as Figma's tool leaves locked layers.
 */

const MAX_LAYERS = 200;
const say = (message: string, kind: "unchanged" | "error" = "unchanged") => announceEditStatus({ kind, message, at: Date.now() });
const baseName = (name: string) => name.slice(name.lastIndexOf(".") + 1);

type Collected = { opsByLoc: Record<string, EditOp[]>; kept: Set<string>; count: number };

/** The elements read for one scale, by loc (a layer and what it holds are read once). */
const cache = new Map<string, Promise<SourceElement | null>>();
const read = (file: string, loc: string) => {
  const key = `${file}:${loc}`;
  if (!cache.has(key)) cache.set(key, studioApi.element(file, loc));
  return cache.get(key)!;
};

/** Every element inside `element` (any depth), by loc. */
async function insideOf(file: string, element: SourceElement, into = new Set<string>()): Promise<Set<string>> {
  for (const child of element.children) {
    if (child.kind !== "element" || into.has(child.loc)) continue;
    into.add(child.loc);
    const inner = await read(file, child.loc);
    if (inner) await insideOf(file, inner, into);
  }
  return into;
}

/** The edits for `element` and everything inside it (its children, any depth; slot props are its component's). */
async function collect(file: string, element: SourceElement, factor: number, into: Collected, rootOps: EditOp[] = [], ownPlace = false): Promise<boolean> {
  const { ops, kept } = scaleOps(baseName(element.name), element.attributes, factor, { ownPlace });
  kept.forEach((step) => into.kept.add(step));
  const all = [...rootOps, ...ops];
  if (all.length) { into.opsByLoc[element.loc] = all; into.count += 1; }
  if (into.count > MAX_LAYERS) return false;
  for (const child of element.children) {
    if (child.kind !== "element") continue;
    const inner = await read(file, child.loc);
    if (inner && !(await collect(file, inner, factor, into))) return false;
  }
  return true;
}

/** Sends the collected edits as one edit (one ⌘Z); the status line says the factor and the Zen steps kept. */
async function send(file: string, first: SourceElement, into: Collected, factor: number): Promise<boolean> {
  const locs = Object.keys(into.opsByLoc);
  if (!locs.length) { say(`Nothing to scale in px: ${scaleStatus(factor, into.kept).replace(/^Scaled \d+%( · )?/, "") || "its sizes come from its content"}`); return false; }
  const response = await applyEdit({ file, loc: first.loc, name: first.name, ops: [{ op: "many", action: "setProps", locs, opsByLoc: into.opsByLoc }], hash: first.hash }, scaleStatus(factor, into.kept));
  return Boolean(response.ok);
}

/** The anchored place of a floating layer, as edits of its insets (and its centring constraint gone). */
function placeOps(item: FloatingItem, factor: number, anchor: ScaleAnchor, around: ScaleBox, attributes: SourceElement["attributes"]): EditOp[] {
  const next = anchoredBox(item.box, factor, anchor, around);
  const inBlock = { x: item.offset.left + next.x - item.box.x, y: item.offset.top + next.y - item.box.y, width: next.width, height: next.height };
  const { ops, dropConstraint } = insetOps(item.pins, item.inner, inBlock);
  const written = new Set(attributes.map((attr) => attr.name));
  const removals: EditOp[] = [];
  if (dropConstraint.x && written.has("constraintX")) removals.push({ op: "removeProp", name: "constraintX" });
  if (dropConstraint.y && written.has("constraintY")) removals.push({ op: "removeProp", name: "constraintY" });
  return [...ops, ...removals];
}

/** Scales the selected layers (or the selected Screen / Overlay) by `factor` about `anchor`. */
export async function scaleSelection(factor: number, anchor: ScaleAnchor): Promise<boolean> {
  if (!canEdit()) { say("View only"); return false; }
  if (!(factor > 0) || factor === 1) return false;
  const state = studioStore.getState();
  if (state.selection?.kind === "frame") return scaleFrame(state.selection.frameId, factor, anchor);
  if (state.selection?.kind === "node" && state.selection.part) { say("Layers inside an instance don't scale on their own — scale the instance"); return false; }
  const layers = selectedLayers();
  if (!layers.length) { say("Select a layer or a frame to scale"); return false; }
  const locked = layers.find((layer) => isLockedSrc(layer.src));
  if (locked) { say(`${locked.name} is locked`); return false; }
  // Floating layers move about the box around them all; the others keep their place in their auto layout.
  const floating = new Map<string, FloatingItem>();
  for (const layer of layers) {
    const found = floatingItems([layer]);
    if (Array.isArray(found) && found[0]) floating.set(layer.src, found[0]);
  }
  const around = floating.size ? unionOf([...floating.values()].map((item) => item.box)) : null;
  const into: Collected = { opsByLoc: {}, kept: new Set(), count: 0 };
  cache.clear();
  // A layer selected with one it is inside scales once, with that one (Figma's).
  const roots: Array<{ layer: (typeof layers)[number]; at: { file: string; loc: string }; element: SourceElement }> = [];
  for (const layer of layers) {
    const at = parseSrc(layer.src);
    const element = at ? await read(at.file, at.loc) : null;
    if (!at || !element) { say(`${layer.name} is no longer there — select it again`); return false; }
    if (roots.length && at.file !== roots[0].at.file) { say("Scale layers of one page at a time"); return false; }
    roots.push({ layer, at, element });
  }
  const nested = new Set<string>();
  for (const root of roots) await insideOf(root.at.file, root.element, nested);
  let file = "";
  let first: SourceElement | null = null;
  for (const { layer, at, element } of roots) {
    if (nested.has(at.loc)) continue;
    file = at.file;
    first ??= element;
    const item = floating.get(layer.src);
    // A component floating in a Box of its own: the Box moves, the component scales.
    if (item && around && item.target.src !== layer.src) {
      const host = parseSrc(item.target.src);
      const box = host ? await read(host.file, host.loc) : null;
      if (box) { into.opsByLoc[box.loc] = placeOps(item, factor, anchor, around, box.attributes); into.count += 1; }
      if (!(await collect(at.file, element, factor, into))) { say(`Scale up to ${MAX_LAYERS} layers at once`); return false; }
      continue;
    }
    const rootOps = item && around ? placeOps(item, factor, anchor, around, element.attributes) : [];
    if (!(await collect(at.file, element, factor, into, rootOps, Boolean(item)))) { say(`Scale up to ${MAX_LAYERS} layers at once`); return false; }
  }
  return first ? send(file, first, into, factor) : false;
}

/** A Screen or an Overlay: its width (and a written height) times the factor, its place about the anchor, its layers too. */
async function scaleFrame(frameId: string, factor: number, anchor: ScaleAnchor): Promise<boolean> {
  const localPage = studioStore.getState().localPage;
  if (!localPage) return false;
  if (frameId.startsWith("section:")) { say("A Section doesn't scale — select its frames and scale them"); return false; }
  cache.clear();
  const node = await frameNodeOf(localPage, frameId);
  const element = node ? await read(node.file, node.loc) : null;
  if (!node || !element) { say("That frame is no longer on the page"); return false; }
  const shown = document.querySelector<HTMLElement>(`.studio-builder-board__frames > [data-studio-frame="${CSS.escape(frameId)}"]`);
  const box = { x: node.place.x, y: node.place.y, width: shown?.offsetWidth || node.width, height: shown?.offsetHeight || 0 };
  const next = anchoredBox(box, factor, anchor);
  const set = (name: string, value: number): EditOp => ({ op: "setProp", name, value: { kind: "number", value: Math.round(value) } });
  const written = (name: string) => element.attributes.find((attr) => attr.name === name && attr.kind === "expression" && Number.isFinite(Number(attr.value)));
  const rootOps: EditOp[] = [set("x", next.x), set("y", next.y)];
  // An Overlay takes its content's size; a Screen's width is its device's unless written, so it is written now.
  if (!frameId.startsWith("overlay:")) rootOps.push(set("width", Math.max(100, next.width)));
  const height = written("height");
  if (height) rootOps.push(set("height", Math.max(100, Number(height.value) * factor)));
  const into: Collected = { opsByLoc: { [element.loc]: rootOps }, kept: new Set(), count: 1 };
  for (const child of element.children) {
    if (child.kind !== "element") continue;
    const inner = await read(node.file, child.loc);
    if (inner && !(await collect(node.file, inner, factor, into))) { say(`Scale up to ${MAX_LAYERS} layers at once`); return false; }
  }
  return send(node.file, element, into, factor);
}
