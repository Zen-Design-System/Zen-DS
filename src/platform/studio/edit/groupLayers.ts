import { applyEdit, parseSrc, studioApi } from "../api";
import { canvasApi } from "../canvas/viewport";
import { inspectorStatus } from "../inspector/status";
import { multiSelection, selectLayers, sourceOrder, type ExtraLayer } from "../select/multiSelection";
import { childHits, findBySrc, rectOf } from "../select/picker";
import { canStructurallyEdit } from "../slots/actions";
import { expectRender, renderedNow } from "../select/remap";
import { flushStudioStore, studioStore } from "../store";
import type { EditOp, EditValue, StudioSelection } from "../types";
import { floatingItems, type FloatingItem } from "./alignLayers";

/*
 * Layers floating in a frame without auto layout go into one floating Box that keeps each of them where it is (plan
 * docs/research/studio-figma-design-parity-2026-10-18.md F3): Figma's Frame selection (⌥⌘G) on such layers, and the
 * start of a group (⌘G). The Box sits at the box around them, sized to it; each layer's insets become its offset in the
 * Box. One op "group" (tools/studio/arrange.mjs groupPlan), one undo step; the Box is selected after it. ⇧⌘G takes a
 * group or a frame away the same way (op "ungroup"): its layers take its place and keep theirs.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

/** The selected layers as floating items of one block (every one floats, all in one frame), else null. */
export function floatingGroup(layers: ExtraLayer[]): FloatingItem[] | null {
  if (!layers.length) return null;
  const items = floatingItems(layers);
  if (typeof items === "string" || !items.length) return null;
  return items.every((item) => item.block === items[0].block) ? items : null;
}

/** Puts floating `items` in one floating Box with `props` (one edit) and selects it; `label` names the undo step. */
export async function boxFloating(items: FloatingItem[], props: Record<string, EditValue>, label: string, done: string): Promise<boolean> {
  const ordered = [...items].sort((a, b) => sourceOrder(a.target, b.target));
  const left = Math.min(...ordered.map((item) => item.offset.left));
  const top = Math.min(...ordered.map((item) => item.offset.top));
  const right = Math.max(...ordered.map((item) => item.offset.left + item.box.width));
  const bottom = Math.max(...ordered.map((item) => item.offset.top + item.box.height));
  const [first, ...others] = ordered;
  const at = parseSrc(first.target.src);
  if (!at) return false;
  const element = await studioApi.element(at.file, at.loc).catch(() => null);
  if (!element) { inspectorStatus.set("negative", `${first.target.name} is no longer there — select it again`); return false; }
  const kids: Record<string, { x: number; y: number }> = {};
  for (const item of ordered) {
    const loc = parseSrc(item.target.src)?.loc;
    if (loc) kids[loc] = { x: Math.round(item.offset.left - left), y: Math.round(item.offset.top - top) };
  }
  const op = {
    op: "group",
    with: others.map((item) => parseSrc(item.target.src)?.loc ?? ""),
    props,
    box: { x: Math.round(left), y: Math.round(top), width: Math.round(right - left), height: Math.round(bottom - top) },
    kids,
  } as unknown as EditOp;
  const before = renderedNow(canvasApi.getWorldElement());
  const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [op], hash: element.hash }, label);
  if (!response.ok || !response.inserted) return false;
  const box: NodeSelection = { kind: "node", src: `${response.file}:${response.inserted.loc}`, name: "Box", frameId: first.target.frameId, panelId: first.target.panelId, instance: 0 };
  multiSelection.clear();
  expectRender(box, before, () => undefined, 1500);
  studioStore.setState({ selection: box });
  flushStudioStore();
  inspectorStatus.set("positive", done);
  return true;
}

/** The canvas names a `Layout.Box` layer "Box". */
const baseName = (name: string) => name.slice(name.lastIndexOf(".") + 1);

/**
 * ⇧⌘G (Figma's Ungroup, Remove frame) on a Box, Stack or Grid: its layers take its place in its parent and are selected.
 * A frame floating in a frame without auto layout hands each layer the place it shows at (px in that frame); one in
 * auto layout hands them to the flow.
 */
export async function ungroupSelection(selection: NodeSelection): Promise<boolean> {
  if (!/^(Box|Stack|Grid)$/.test(baseName(selection.name))) { inspectorStatus.set("neutral", "Ungroup takes a group or a frame: select one"); return false; }
  const check = canStructurallyEdit(selection);
  if (!check.ok) { inspectorStatus.set("neutral", check.reason); return false; }
  const at = parseSrc(selection.src);
  const world = canvasApi.getWorldElement();
  const hit = world ? findBySrc(world, selection.src)[selection.instance] ?? null : null;
  const host = hit?.hosts[0];
  if (!at || !hit || !(host instanceof HTMLElement)) { inspectorStatus.set("neutral", `${selection.name} is not on the canvas right now`); return false; }
  const element = await studioApi.element(at.file, at.loc).catch(() => null);
  if (!element) { inspectorStatus.set("negative", `${selection.name} is no longer there — select it again`); return false; }
  const children = childHits(hit).filter((child) => parseSrc(child.src)?.file === at.file);
  let kids: Record<string, { x: number; y: number }> | undefined;
  const block = host.offsetParent;
  if (host.dataset.position === "absolute" && block instanceof HTMLElement) {
    const outer = block.getBoundingClientRect();
    const scale = block.offsetWidth ? outer.width / block.offsetWidth || 1 : 1;
    kids = {};
    for (const child of children) {
      const loc = parseSrc(child.src)?.loc;
      const rect = rectOf(child.hosts);
      if (!loc || !rect) { inspectorStatus.set("neutral", `${child.name} in ${selection.name} is not drawn: ungroup it in the code`); return false; }
      kids[loc] = { x: Math.round((rect.left - outer.left) / scale - block.clientLeft), y: Math.round((rect.top - outer.top) / scale - block.clientTop) };
    }
  }
  const before = renderedNow(world);
  const label = `Ungroup ${selection.name}`;
  const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [{ op: "ungroup", ...(kids ? { kids } : {}) } as unknown as EditOp], hash: element.hash }, label);
  if (!response.ok || !response.moved) return false;
  const locs = response.moved.locs ?? {};
  const layers: ExtraLayer[] = children.flatMap((child) => {
    const from = parseSrc(child.src)?.loc;
    const loc = from ? locs[from] : undefined;
    return loc ? [{ src: `${response.file}:${loc}`, name: child.name, frameId: selection.frameId, panelId: selection.panelId, instance: 0 }] : [];
  });
  multiSelection.clear();
  if (layers.length) selectLayers(layers[0], layers.slice(1), before);
  else studioStore.setState({ selection: null });
  flushStudioStore();
  inspectorStatus.set("positive", `Ungrouped ${selection.name}: its layers stay where they are`);
  return true;
}
