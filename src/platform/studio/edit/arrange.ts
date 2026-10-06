import { useEffect } from "react";
import { announceEditStatus, applyEdit, parseSrc, studioApi } from "../api";
import { canvasApi } from "../canvas/viewport";
import { isTypingTarget } from "../select/picker";
import { multiSelection } from "../select/multiSelection";
import { expectRender, renderedNow } from "../select/remap";
import { canStructurallyEdit, structuralBlock } from "../slots/actions";
import { canEdit, flushStudioStore, studioStore } from "../store";
import type { EditOp, StudioNodeRef } from "../types";
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
};

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
  const at = parseSrc(layer.src);
  if (!at) return false;
  busy = true;
  try {
    const block = await structuralBlock(layer, "move");
    if (block) { fail(block); return false; }
    const element = await studioApi.element(at.file, at.loc);
    if (!element) { fail(`${layer.name} is no longer there — select it again`); return false; }
    const before = renderedNow(canvasApi.getWorldElement());
    const label = `Move ${element.name} ${to === "prev" ? "up" : "down"}`;
    const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [{ op: "moveElement", to }], hash: element.hash }, label);
    if (!response.ok) return false;
    const loc = response.moved?.loc;
    const current = studioStore.getState().selection;
    if (loc && current?.kind === "node" && current.src === layer.src) follow({ ...layer, src: `${response.file}:${loc}` }, before);
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
  busy = true;
  try {
    const element = await studioApi.element(from.file, from.loc);
    if (!element) { fail(`${layer.name} is no longer there — select it again`); return false; }
    const op: Extract<EditOp, { op: "moveTo" }> = { op: "moveTo", parent: to.loc };
    if (target.before) op.before = parseSrc(target.before)?.loc;
    else if (target.after) op.after = parseSrc(target.after)?.loc;
    if (copy) op.copy = true;
    const label = `${copy ? "Copy" : "Move"} ${element.name}${target.reparent || copy ? ` into ${target.parentName}` : ""}`;
    const before = renderedNow(canvasApi.getWorldElement());
    const response = await applyEdit({ file: from.file, loc: from.loc, name: element.name, ops: [op], hash: element.hash }, label);
    if (!response.ok) return false;
    const loc = response.moved?.loc ?? response.inserted?.loc;
    if (loc) follow({ kind: "node", src: `${response.file}:${loc}`, name: layer.name, frameId: target.frameId, panelId: target.panelId, instance: 0 }, before);
    return true;
  } finally {
    busy = false;
  }
}

/**
 * Arrow keys on the canvas (Figma's reorder in auto layout): ← / ↑ one place earlier, → / ↓ one place later. Only while
 * the canvas itself has focus, in the Select tool, with one layer selected (not a part) and no text being edited.
 */
export function useArrangeKeys() {
  useEffect(() => {
    let running = false;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const to = event.key === "ArrowLeft" || event.key === "ArrowUp" ? "prev" : event.key === "ArrowRight" || event.key === "ArrowDown" ? "next" : null;
      if (!to) return;
      const target = event.target instanceof Element ? event.target : null;
      const onCanvas = !target || target === document.body || target.matches(".studio-viewport");
      if (!onCanvas || isTypingTarget(target) || textEditSession.get()) return;
      const state = studioStore.getState();
      const selection = state.selection;
      if (state.tool !== "select" || state.presenting || !canEdit(state) || selection?.kind !== "node" || selection.part || multiSelection.get().length) return;
      event.preventDefault();
      // A held key moves once per answer, never queues a burst.
      if (running) return;
      running = true;
      void stepLayer(selection, to).finally(() => { running = false; });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
