import { floatingItems, nudgeLayers } from "./alignLayers";
import { inspectorStatus } from "../inspector/status";
import { isLockedSrc } from "../select/layerMeta";
import { lockShortcut } from "./lock";
import { useEffect } from "react";
import { mainOfSelection, type MainRef } from "./localComponents";
import { announceEditStatus, applyEdit, parseSrc, studioApi } from "../api";
import { canvasApi } from "../canvas/viewport";
import { findBySrc, isTypingTarget } from "../select/picker";
import { multiSelection } from "../select/multiSelection";
import { expectRender, renderedNow } from "../select/remap";
import { canStructurallyEdit, constHolderOf, insideWrap, moveMapRow, structuralBlock, studioWrapOf } from "../slots/actions";
import { canEdit, flushStudioStore, studioStore } from "../store";
import type { EditOp, StudioNodeRef } from "../types";
import { stepLayers } from "./multi";
import { textEditSession } from "./textEdit";

/*
 * Reordering in auto layout, Figma-like (docs/research/studio-figma-editing-plan-2026-10-03.md, Phase 2): arrow keys
 * move the selected layer one place earlier or later among its siblings (op moveElement); a drag drops it anywhere in
 * the same file (op moveTo: tools/studio/arrange.mjs). One gesture = one draft edit = one undo step.
 */

export type NodeSelection = { kind: "node" } & StudioNodeRef;

/** Where a drag drops: into the element `parentSrc`, before / after one of its child layers (neither: last). */
export type DropTarget = {
  parentSrc: string;
  parentName: string;
  frameId: string | null;
  panelId: string | null;
  before?: string;
  after?: string;
  /** It lands in another parent (the undo label says where). */
  reparent?: boolean;
  /** `parentSrc` is a page's own instance and the layer goes into its slot of this name (F7c; `parentName` is the slot's
   *  name too): before / after one of the layers the instance puts there, or at `index` among its main's own. */
  slot?: string;
  index?: number;
};

/** Where in its parent an op puts a layer (moveTo, pasteCode): before / after a child, or into a slot of an instance. */
export function placeOf(target: DropTarget): { before?: string; after?: string; slot?: string; index?: number } {
  const place: { before?: string; after?: string; slot?: string; index?: number } = target.slot ? { slot: target.slot } : {};
  if (target.before) place.before = parseSrc(target.before)?.loc;
  else if (target.after) place.after = parseSrc(target.after)?.loc;
  else if (target.slot && target.index !== undefined) place.index = target.index;
  return place;
}

const fail = (message: string) => announceEditStatus({ kind: "error", message, at: Date.now() });

let busy = false;

/**
 * Selects the layer at its new place. The canvas still shows the render before the write, whose element at that
 * location may be another one (a swap): it waits for the re-render (a node that was not on the page before; a reused
 * node is taken after a short wait) instead of dropping the selection.
 */
function follow(next: NodeSelection, before: WeakSet<Element>) {
  multiSelection.clear();
  expectRender(next, before, () => undefined, 1500);
  studioStore.setState({ selection: next });
  flushStudioStore();
}

/** Arrow keys: one place earlier / later among its siblings (op moveElement), the selection following it. */
export async function stepLayer(layer: NodeSelection, to: "prev" | "next"): Promise<boolean> {
  if (busy) return false;
  const check = canStructurallyEdit(layer);
  if (!check.ok) { fail(check.reason); return false; }
  busy = true;
  try {
    // A component in its Studio wrap Stack moves with that Stack (GĐ4 M4).
    const wrap = await studioWrapOf(layer);
    // One row of a `.map`: it swaps with the row before or after it in its data, and stays selected.
    if (!wrap) {
      const moved = await moveMapRow(layer, to);
      if (moved !== null) return Boolean(moved);
    }
    const moving = wrap ?? layer;
    const at = parseSrc(moving.src);
    if (!at) return false;
    const block = await structuralBlock(moving, "move");
    if (block) { fail(block); return false; }
    const element = await studioApi.element(at.file, at.loc);
    if (!element) { fail(`${layer.name} is no longer there — select it again`); return false; }
    const before = renderedNow(canvasApi.getWorldElement());
    const label = `Move ${layer.name} ${to === "prev" ? "up" : "down"}`;
    // A const shown in several places (`{summary}` in both branches): the `{name}` this one is shown by moves.
    const holder = await constHolderOf(moving);
    const op = { op: "moveElement", to, ...(holder ? { parent: holder } : {}) } as EditOp;
    const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [op], hash: element.hash }, label);
    if (!response.ok) return false;
    const loc = response.moved?.loc;
    const current = studioStore.getState().selection;
    if (loc && current?.kind === "node" && current.src === layer.src) follow(wrap ? insideWrap(layer, response.file, response.after, loc) : { ...layer, src: `${response.file}:${loc}` }, before);
    return true;
  } finally {
    busy = false;
  }
}

/** Moves (or with `copy`, copies) `layer` to `target`; selects it at its new place. */
export async function moveLayer(layer: NodeSelection, target: DropTarget, copy: boolean): Promise<boolean> {
  if (busy) return false;
  const check = canStructurallyEdit(layer);
  if (!check.ok) { fail(check.reason); return false; }
  const from = parseSrc(layer.src);
  const to = parseSrc(target.parentSrc);
  if (!from || !to) return false;
  if (from.file !== to.file) {
    fail(`Layers move within their own file: ${from.file.slice(from.file.lastIndexOf("/") + 1)} — copy it in the code to use it elsewhere`);
    return false;
  }
  // ⌥-drag of a main component drops an instance of it there (Figma), not a second main.
  if (copy && /^local:/.test(from.file)) {
    const main = await mainOfSelection(layer);
    if (main) return dropInstance(main, target);
  }
  busy = true;
  try {
    // A component in its Studio wrap Stack moves (or is copied) with that Stack (GĐ4 M4); dropped into that very Stack,
    // nothing moves.
    const wrap = await studioWrapOf(layer);
    if (wrap && (target.parentSrc === wrap.src || target.before === wrap.src || target.after === wrap.src)) return false;
    const at = wrap ? parseSrc(wrap.src) ?? from : from;
    const element = await studioApi.element(at.file, at.loc);
    if (!element) { fail(`${layer.name} is no longer there — select it again`); return false; }
    const op: Extract<EditOp, { op: "moveTo" }> = { op: "moveTo", parent: to.loc, ...placeOf(target) };
    if (copy) op.copy = true;
    const label = `${copy ? "Copy" : "Move"} ${layer.name}${target.reparent || copy ? ` into ${target.parentName}` : ""}`;
    const before = renderedNow(canvasApi.getWorldElement());
    const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [op], hash: element.hash }, label);
    if (!response.ok) return false;
    const loc = response.moved?.loc ?? response.inserted?.loc;
    const landed: NodeSelection = { kind: "node", src: `${response.file}:${loc}`, name: layer.name, frameId: target.frameId, panelId: target.panelId, instance: 0 };
    if (loc) follow(wrap ? insideWrap(landed, response.file, response.after, loc) : landed, before);
    return true;
  } finally {
    busy = false;
  }
}

/** The selected layer's own floating DOM node (Stack, Grid, Box or Shape with position="absolute"), or null. */
function floatingHost(selection: NodeSelection): HTMLElement | null {
  const world = canvasApi.getWorldElement();
  if (!world) return null;
  const hits = findBySrc(world, selection.src);
  const host = (hits[selection.instance] ?? hits[0])?.hosts[0];
  return host instanceof HTMLElement && host.dataset.position === "absolute" && host.matches(".zen-stack, .zen-grid, .zen-box, .zen-shape") ? host : null;
}

/** The px an inset is written as (`insetLeft={40}`), or null (a token step, a binding, or none). */
function writtenPx(element: { attributes: Array<{ kind: string; name: string; value?: string }> }, prop: string): number | null {
  const attr = element.attributes.find((candidate) => candidate.kind === "expression" && candidate.name === prop);
  const value = attr?.value !== undefined ? Number(attr.value) : NaN;
  return Number.isFinite(value) ? value : null;
}

/**
 * Figma's nudge for a floating layer: the arrows move it 1 px (⇧ 10 px) on its left / top offsets, written as px (one
 * edit, one undo step each). A layer pinned to another edge moves on that edge's offset.
 */
async function nudgeLayer(selection: NodeSelection, host: HTMLElement, dx: number, dy: number) {
  const at = parseSrc(selection.src);
  if (!at) return;
  const element = await studioApi.element(at.file, at.loc);
  if (!element) { fail(`${selection.name} is no longer there — select it again`); return; }
  const constraint = (prop: string, fallback: string) => element.attributes.find((attr) => attr.kind === "string" && attr.name === prop)?.value ?? fallback;
  const block = host.offsetParent instanceof HTMLElement ? host.offsetParent : null;
  const ops: EditOp[] = [];
  const axis = (delta: number, pin: string, start: string, end: string, offset: number, size: number, inner: number) => {
    if (!delta || pin === "center") return;
    if (pin === "left" || pin === "top" || pin === "left-right" || pin === "top-bottom") ops.push({ op: "setProp", name: start, value: { kind: "number", value: (writtenPx(element, start) ?? Math.round(offset)) + delta } } as EditOp);
    if (pin === "right" || pin === "bottom" || pin === "left-right" || pin === "top-bottom") ops.push({ op: "setProp", name: end, value: { kind: "number", value: (writtenPx(element, end) ?? Math.round(inner - offset - size)) - delta } } as EditOp);
  };
  axis(dx, constraint("constraintX", "left"), "insetLeft", "insetRight", host.offsetLeft, host.offsetWidth, block?.clientWidth ?? 0);
  axis(dy, constraint("constraintY", "top"), "insetTop", "insetBottom", host.offsetTop, host.offsetHeight, block?.clientHeight ?? 0);
  if (!ops.length) return;
  await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops, hash: element.hash }, `Nudge ${selection.name}`);
}

/**
 * Arrow keys on the canvas (Figma's reorder in auto layout): ← / ↑ one place earlier, → / ↓ one place later; a floating
 * layer (a frame without auto layout's, or one that ignores auto layout) is nudged instead, 1 px, ⇧ 10 px. Only while
 * the canvas itself has focus, in the Select tool, with a layer selected (not a part; several: all of one parent) and no
 * text being edited.
 */
export function useArrangeKeys() {
  useEffect(() => {
    let running = false;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
      const to = event.key === "ArrowLeft" || event.key === "ArrowUp" ? "prev" : event.key === "ArrowRight" || event.key === "ArrowDown" ? "next" : null;
      if (!to) return;
      const target = event.target instanceof Element ? event.target : null;
      const onCanvas = !target || target === document.body || target.matches(".studio-viewport");
      if (!onCanvas || isTypingTarget(target) || textEditSession.get()) return;
      const state = studioStore.getState();
      const selection = state.selection;
      if (state.tool !== "select" || state.presenting || !canEdit(state) || selection?.kind !== "node" || selection.part) return;
      // Figma's lock: a locked layer (or one in a locked frame) keeps its place.
      if (isLockedSrc(selection.src) || multiSelection.get().some((layer) => isLockedSrc(layer.src))) {
        event.preventDefault();
        if (!event.repeat) inspectorStatus.set("neutral", `Locked: ${lockShortcut} unlocks it`);
        return;
      }
      // Several layers that all float: each moves by the px (Figma's nudge of a selection), one edit.
      const several = multiSelection.get().length ? floatingItems() : null;
      if (several && typeof several !== "string") {
        event.preventDefault();
        if (running) return;
        running = true;
        const step = event.shiftKey ? 10 : 1;
        const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        void nudgeLayers(several, dx, dy).finally(() => { running = false; });
        return;
      }
      const floating = multiSelection.get().length ? null : floatingHost(selection);
      if (floating) {
        event.preventDefault();
        if (running) return;
        running = true;
        const step = event.shiftKey ? 10 : 1;
        const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        void nudgeLayer(selection, floating, dx, dy).finally(() => { running = false; });
        return;
      }
      if (event.shiftKey) return;
      event.preventDefault();
      // A held key moves once per answer, never queues a burst.
      if (running) return;
      running = true;
      // Several layers of one parent step together (op many move, edit/multi.ts).
      const step = multiSelection.get().length ? stepLayers(to) : stepLayer(selection, to);
      void step.finally(() => { running = false; });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

/** An instance of `main` where a drag drops it (one edit; the instance selected). */
async function dropInstance(main: MainRef, target: DropTarget): Promise<boolean> {
  const to = parseSrc(target.parentSrc);
  if (!to) return false;
  const parent = await studioApi.element(to.file, to.loc);
  if (!parent) { fail(`${target.parentName} is no longer there`); return false; }
  const op = { op: "pasteCode", code: `<Use of="${main.id}" />`, ...placeOf(target) } as Extract<EditOp, { op: "pasteCode" }>;
  const before = renderedNow(canvasApi.getWorldElement());
  const response = await applyEdit({ file: to.file, loc: to.loc, name: parent.name, ops: [op], hash: parent.hash }, `Instance of ${main.name}`);
  if (!response.ok || !response.inserted) return false;
  const landed: NodeSelection = { kind: "node", src: `${response.file}:${response.inserted.loc}`, name: "Use", frameId: target.frameId, panelId: target.panelId, instance: 0 };
  follow(landed, before);
  return true;
}
