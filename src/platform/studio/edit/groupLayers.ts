import { applyEdit, parseSrc, squashEdits, studioApi } from "../api";
import { canvasApi, getViewport } from "../canvas/viewport";
import { inspectorStatus } from "../inspector/status";
import { multiSelection, selectedLayers, selectLayers, sourceOrder, type ExtraLayer } from "../select/multiSelection";
import { childHits, findBySrc, rectOf } from "../select/picker";
import { canStructurallyEdit } from "../slots/actions";
import { srcAttr } from "../select/srcIds";
import { expectRender, mapSrc, renderedNow } from "../select/remap";
import { flushStudioStore, studioStore } from "../store";
import type { EditOp, EditResponse, EditValue, StudioSelection, StudioWrite } from "../types";
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

/** A layer as a group or frame takes it: the element written, its offset in its frame's px and its size. */
export type Part = { target: ExtraLayer; offset: { left: number; top: number }; box: { width: number; height: number } };

/** What op group wrote: the answer, the new Box as a selection, the layers in code order and the Box's corner. */
export type Grouped = { response: Extract<EditResponse, { ok: true }>; box: NodeSelection; ordered: Part[]; origin: { left: number; top: number } };

/**
 * Writes op group for `items` (one edit, `label` its undo step): one Box with `props` at the box around them (`flow`:
 * in the flow, where the first of them was), each layer at its offset inside. Nothing is selected; null when nothing
 * was written (the status line says why).
 */
export async function groupParts(items: Part[], props: Record<string, EditValue>, label: string, component?: { id: string; name: string }, flow = false, tag: "Box" | "Shape" = "Box"): Promise<Grouped | null> {
  const ordered = [...items].sort((a, b) => sourceOrder(a.target, b.target));
  const left = Math.min(...ordered.map((item) => item.offset.left));
  const top = Math.min(...ordered.map((item) => item.offset.top));
  const right = Math.max(...ordered.map((item) => item.offset.left + item.box.width));
  const bottom = Math.max(...ordered.map((item) => item.offset.top + item.box.height));
  const [first, ...others] = ordered;
  const at = parseSrc(first.target.src);
  if (!at) return null;
  const element = await studioApi.element(at.file, at.loc).catch(() => null);
  if (!element) { inspectorStatus.set("negative", `${first.target.name} is no longer there — select it again`); return null; }
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
    ...(component ? { component } : {}),
    ...(flow ? { flow: true } : {}),
    ...(tag !== "Box" ? { tag } : {}),
  } as unknown as EditOp;
  const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [op], hash: element.hash }, label);
  if (!response.ok || !response.inserted) return null;
  const box: NodeSelection = { kind: "node", src: `${response.file}:${response.inserted.loc}`, name: tag, frameId: first.target.frameId, panelId: first.target.panelId, instance: 0 };
  return { response, box, ordered, origin: { left, top } };
}

/**
 * Puts floating `items` in one floating Box with `props` (one edit) and selects it; `label` names the undo step.
 * `component`: the Box is a new main component's layer (Create component on several layers, a page you made).
 */
export async function boxFloating(items: Part[], props: Record<string, EditValue>, label: string, done: string, component?: { id: string; name: string }, flow = false, tag: "Box" | "Shape" = "Box"): Promise<boolean> {
  const before = renderedNow(canvasApi.getWorldElement());
  const grouped = await groupParts(items, props, label, component, flow, tag);
  if (!grouped) return false;
  multiSelection.clear();
  expectRender(grouped.box, before, () => undefined, 1500);
  studioStore.setState({ selection: grouped.box });
  flushStudioStore();
  inspectorStatus.set("positive", done);
  return true;
}

/**
 * Several selected layers that sit in one frame, some placed freely (X / Y) and some by the frame's flow: the sentence
 * that says so (a wrap or a group takes one kind at a time), else null.
 */
export function mixedPlacement(layers: ExtraLayer[]): string | null {
  if (layers.length < 2) return null;
  const free = layers.map((layer) => typeof floatingItems([layer]) !== "string");
  return free.some(Boolean) && !free.every(Boolean) ? "Some of these layers are placed freely (X / Y) and some by auto layout: select only one kind" : null;
}

/** The canvas names a `Layout.Box` layer "Box". */
const baseName = (name: string) => name.slice(name.lastIndexOf(".") + 1);

/** A group or a frame ⇧⌘G takes away: a Box, Stack or Grid. */
export const isUngroupable = (layer: { name: string }) => /^(Box|Stack|Grid)$/.test(baseName(layer.name));

type Ungrouped = { response: Extract<EditResponse, { ok: true }>; layers: ExtraLayer[]; rendered: WeakSet<Element>; host: HTMLElement };

/**
 * ⇧⌘G (Figma's Ungroup, Remove frame) on a Box, Stack or Grid: its layers take its place in its parent and are selected.
 * A frame floating in a frame without auto layout hands each layer the place it shows at (px in that frame); one in
 * auto layout hands them to the flow.
 */
async function ungroupOne(selection: NodeSelection): Promise<Ungrouped | null> {
  if (!isUngroupable(selection)) { inspectorStatus.set("neutral", "Ungroup takes a group or a frame: select one"); return null; }
  const check = canStructurallyEdit(selection);
  if (!check.ok) { inspectorStatus.set("neutral", check.reason); return null; }
  const at = parseSrc(selection.src);
  const world = canvasApi.getWorldElement();
  const hit = world ? findBySrc(world, selection.src)[selection.instance] ?? null : null;
  const host = hit?.hosts[0];
  if (!at || !hit || !(host instanceof HTMLElement)) { inspectorStatus.set("neutral", `${selection.name} is not on the canvas right now`); return null; }
  const element = await studioApi.element(at.file, at.loc).catch(() => null);
  if (!element) { inspectorStatus.set("negative", `${selection.name} is no longer there — select it again`); return null; }
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
      if (!loc || !rect) { inspectorStatus.set("neutral", `${child.name} in ${selection.name} is not drawn: ungroup it in the code`); return null; }
      kids[loc] = { x: Math.round((rect.left - outer.left) / scale - block.clientLeft), y: Math.round((rect.top - outer.top) / scale - block.clientTop) };
    }
  }
  const rendered = renderedNow(world);
  const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [{ op: "ungroup", ...(kids ? { kids } : {}) } as unknown as EditOp], hash: element.hash }, `Ungroup ${selection.name}`);
  if (!response.ok || !response.moved) return null;
  const locs = response.moved.locs ?? {};
  const layers: ExtraLayer[] = children.flatMap((child) => {
    const from = parseSrc(child.src)?.loc;
    const loc = from ? locs[from] : undefined;
    return loc ? [{ src: `${response.file}:${loc}`, name: child.name, frameId: selection.frameId, panelId: selection.panelId, instance: 0 }] : [];
  });
  return { response, layers, rendered, host };
}

export async function ungroupSelection(selection: NodeSelection): Promise<boolean> {
  const done = await ungroupOne(selection);
  if (!done) return false;
  multiSelection.clear();
  if (done.layers.length) selectLayers(done.layers[0], done.layers.slice(1), done.rendered);
  else studioStore.setState({ selection: null });
  flushStudioStore();
  inspectorStatus.set("positive", `Ungrouped ${selection.name}: its layers stay where they are`);
  return true;
}

/** Until the canvas drew the write that took `host` away (or `timeout` ms): the next ungroup reads the canvas. */
function shownWithout(host: HTMLElement, timeout = 3000): Promise<void> {
  const start = performance.now();
  return new Promise((resolve) => {
    const tick = () => (!host.isConnected || performance.now() - start > timeout ? resolve() : requestAnimationFrame(tick));
    tick();
  });
}

/**
 * ⇧⌘G on the selection, as Figma's: every selected group or frame is ungrouped (the last in the code first, each once
 * the canvas drew the one before, since each reads its layers' places there), as one undo step. Their layers and the
 * other selected layers stay selected. One layer alone: ungroupSelection.
 */
export async function ungroupLayers(layers: ExtraLayer[] = selectedLayers()): Promise<boolean> {
  const groups = layers.filter(isUngroupable);
  if (!groups.length) { inspectorStatus.set("neutral", "Ungroup takes a group or a frame: select one"); return false; }
  if (layers.length === 1) return ungroupSelection({ kind: "node", ...layers[0] });
  const moved = (list: ExtraLayer[], write: StudioWrite) => list.flatMap((layer) => {
    const src = mapSrc(layer.src, write);
    return src ? [{ ...layer, src }] : [];
  });
  let pending = [...groups].sort(sourceOrder).reverse();
  let kept = layers.filter((layer) => !isUngroupable(layer));
  let freed: ExtraLayer[] = [];
  let last: Ungrouped | null = null;
  const writes: Ungrouped["response"][] = [];
  while (pending.length) {
    const [next, ...rest] = pending;
    const done = await ungroupOne({ kind: "node", ...next });
    if (!done) break;
    const { response } = done;
    const write: StudioWrite = { file: response.file, before: response.before, after: response.after, kind: "edit", ...(response.locs ? { locs: response.locs } : {}) };
    pending = moved(rest, write);
    kept = moved(kept, write);
    freed = [...done.layers, ...moved(freed, write)];
    writes.push(response);
    last = done;
    if (pending.length) await shownWithout(done.host);
  }
  if (!last) return false;
  const count = writes.length;
  const label = `Ungroup ${count} groups`;
  if (count > 1 && writes.every((write) => write.file === writes[0].file)) squashEdits(count, label, writes[0].before, writes[count - 1].after);
  const seen = new Set<string>();
  const [first, ...others] = [...last.layers, ...freed, ...kept].filter((layer) => !seen.has(layer.src) && Boolean(seen.add(layer.src)));
  multiSelection.clear();
  if (first) selectLayers(first, others, last.rendered);
  else studioStore.setState({ selection: null });
  flushStudioStore();
  if (count === groups.length) inspectorStatus.set("positive", `Ungrouped ${count} groups: their layers stay where they are`);
  return true;
}

/**
 * ⌘G (Figma's Group selection): the selected layers into a group (Box group, no look of its own). Floating layers group
 * where they are; layers in auto layout become one group in the flow, sized to them, each at its place inside it.
 */
export async function groupSelection(layers: ExtraLayer[] = selectedLayers(), { mask = false }: { mask?: boolean } = {}): Promise<boolean> {
  if (!layers.length) return false;
  for (const layer of layers) {
    const check = canStructurallyEdit({ kind: "node", ...layer });
    if (!check.ok) { inspectorStatus.set("neutral", check.reason); return false; }
  }
  const yes = { kind: "boolean", value: true } as EditValue;
  const props: Record<string, EditValue> = mask ? { group: yes, mask: yes } : { group: yes };
  const count = layers.length === 1 ? layers[0].name : `${layers.length} layers`;
  // A mask group (⌃⌘M): its bottom layer (the first in the code) masks the others, as Figma's.
  const bottom = mask ? [...layers].sort(sourceOrder)[0].name : "";
  const label = mask ? `Use ${bottom} as mask` : `Group ${count}`;
  const done = mask ? `${bottom} masks ${layers.length - 1 === 1 ? "1 layer" : `${layers.length - 1} layers`} · ⌃⌘M again removes the mask` : `Grouped ${count} · ⇧⌘G ungroups`;
  const floating = floatingGroup(layers);
  if (floating) return boxFloating(floating, props, label, done);
  const mixed = mixedPlacement(layers);
  if (mixed) { inspectorStatus.set("neutral", mixed); return false; }
  // In auto layout: their boxes as drawn (unscaled px), one group where the first of them was.
  const world = canvasApi.getWorldElement();
  const zoom = getViewport().zoom || 1;
  const parts: Part[] = [];
  let parent: Element | null | undefined;
  for (const layer of layers) {
    const host = world ? findBySrc(world, layer.src)[layer.instance]?.hosts[0] : undefined;
    const rect = host?.getBoundingClientRect();
    if (!host || !rect) { inspectorStatus.set("neutral", `${layer.name} is not on the canvas right now`); return false; }
    if (parent !== undefined && host.parentElement !== parent) { inspectorStatus.set("neutral", "Select layers that share one parent to group them"); return false; }
    parent = host.parentElement;
    parts.push({ target: layer, offset: { left: rect.left / zoom, top: rect.top / zoom }, box: { width: rect.width / zoom, height: rect.height / zoom } });
  }
  return boxFloating(parts, props, label, done, undefined, true);
}

/** The mask group a layer is in: the Box with `mask` itself, or the one whose mask (first layer) it is. */
function maskGroupHost(layer: ExtraLayer): HTMLElement | null {
  const world = canvasApi.getWorldElement();
  const host = world ? findBySrc(world, layer.src)[layer.instance]?.hosts[0] : undefined;
  if (!(host instanceof HTMLElement)) return null;
  if (host.matches('.zen-box[data-mask="true"]')) return host;
  const parent = host.parentElement;
  return parent?.matches('.zen-box[data-mask="true"]') && parent.firstElementChild === host ? parent : null;
}

/** Whether `layer` is a mask group or its mask (the menus offer Remove mask on it). */
export const inMaskGroup = (layer: ExtraLayer) => Boolean(maskGroupHost(layer));

/**
 * ⌃⌘M (Figma's Use as mask): two or more layers become a mask group (Box group mask) whose bottom layer masks the rest;
 * on a mask group or its mask it toggles off, as in Figma (the group stays a group).
 */
export async function maskSelection(layers: ExtraLayer[] = selectedLayers()): Promise<boolean> {
  if (!layers.length) return false;
  const masked = layers.length === 1 ? maskGroupHost(layers[0]) : null;
  if (masked) {
    const at = parseSrc(srcAttr(masked) ?? "");
    const element = at ? await studioApi.element(at.file, at.loc).catch(() => null) : null;
    if (!at || !element) { inspectorStatus.set("neutral", "The mask group is not in a page you made"); return false; }
    const check = canStructurallyEdit({ kind: "node", src: `${at.file}:${at.loc}`, name: element.name, frameId: layers[0].frameId, panelId: layers[0].panelId, instance: 0 });
    if (!check.ok) { inspectorStatus.set("neutral", check.reason); return false; }
    const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [{ op: "removeProp", name: "mask" }], hash: element.hash }, "Remove mask");
    if (response.ok) inspectorStatus.set("positive", "Removed the mask: its layers stay a group");
    return response.ok;
  }
  if (layers.length < 2) { inspectorStatus.set("neutral", "Select the mask and the layers it masks: the bottom one masks the others"); return false; }
  return groupSelection(layers, { mask: true });
}
