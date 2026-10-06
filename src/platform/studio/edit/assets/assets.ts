import { announceEditStatus, applyEdit, parseSrc, studioApi } from "../../api";
import { canvasApi, getViewportBox } from "../../canvas/viewport";
import { multiSelection } from "../../select/multiSelection";
import { expectRender, renderedNow } from "../../select/remap";
import { canStructurallyEdit } from "../../slots/actions";
import { builderCode, type PaletteContext, type PaletteItem } from "../../slots/palette";
import type { ContentSlot } from "../../slots/registry";
import { canEdit, flushStudioStore, studioStore } from "../../store";
import type { EditOp, StudioSelection } from "../../types";
import type { DropTarget, NodeSelection } from "../arrange";
import { insertCode } from "../clipboard";
import { dropTargetAt, publishDragView, type DropContext } from "../drag";

/*
 * Assets, Figma-like (docs/research/studio-figma-editing-plan-2026-10-03.md, Phase 6): the Zen components of the slot
 * palette (slots/palette.ts), inserted by a click (into the selected layout, else after the selected layer) or dragged
 * onto the canvas, where the insertion line of a layer drag shows where it lands. Op pasteCode: Zen components join
 * the imports, an action's toast gets its useToast(). One undo step; the new layer gets selected.
 */

const fail = (message: string) => announceEditStatus({ kind: "error", message, at: Date.now() });

/**
 * The code of `item` for a new layer (a heading one level under the example's, a fresh uid for radio groups). On a
 * builder page (`file` "local:…", Studio builder GĐ2) its toast actions become proto.toast(…); null when the item keeps
 * state or code a page cannot have.
 */
export function codeOf(item: PaletteItem, file?: string): string | null {
  const slot = { component: "Stack", prop: "children", name: "Children", kind: "layout" } as unknown as ContentSlot;
  const context: PaletteContext = { host: "Stack", slot, headingLevel: 4, mobile: false, uid: Date.now().toString(36) };
  const code = item.build(context);
  if (!file?.startsWith("local:")) return code;
  return item.state?.length ? null : builderCode(code);
}
const builderRefusal = (item: PaletteItem) => `${item.label} keeps state or code, which a builder page has none of yet (it comes with prototypes)`;

/** Click: into the selected layout, else after the selected layer. */
export function insertAsset(item: PaletteItem) {
  const selection = studioStore.getState().selection;
  if (selection?.kind !== "node" || selection.part) {
    fail(`Select a layer in an example first: ${item.label} goes into it (a layout) or right after it`);
    return;
  }
  const code = codeOf(item, parseSrc(selection.src)?.file);
  if (code === null) { fail(builderRefusal(item)); return; }
  void insertCode(selection as NodeSelection, code, item.state);
}

/** Why nothing can be dropped into `target` (a playground, docs, the role), or null. */
function refusalFor(target: DropTarget): string | null {
  const parent: StudioSelection = { kind: "node", src: target.parentSrc, name: target.parentName, frameId: target.frameId, panelId: target.panelId, instance: 0 };
  const check = canStructurallyEdit(parent);
  return check.ok ? null : check.reason;
}

async function dropAsset(item: PaletteItem, target: DropTarget) {
  const at = parseSrc(target.parentSrc);
  if (!at) return;
  const parent = await studioApi.element(at.file, at.loc);
  if (!parent) { fail(`${target.parentName} is no longer there`); return; }
  const code = codeOf(item, at.file);
  if (code === null) { fail(builderRefusal(item)); return; }
  const op: Extract<EditOp, { op: "pasteCode" }> = { op: "pasteCode", code, ...(item.state?.length ? { state: item.state.map((entry) => ({ ...entry })) } : {}) };
  if (target.before) op.before = parseSrc(target.before)?.loc;
  else if (target.after) op.after = parseSrc(target.after)?.loc;
  const before = renderedNow(canvasApi.getWorldElement());
  const response = await applyEdit({ file: at.file, loc: at.loc, name: parent.name, ops: [op], hash: parent.hash }, `Add ${item.label}`);
  if (!response.ok || !response.inserted) return;
  const next: StudioSelection = { kind: "node", src: `${response.file}:${response.inserted.loc}`, name: item.root, frameId: target.frameId, panelId: target.panelId, instance: 0 };
  multiSelection.clear();
  expectRender(next, before, () => undefined, 1500);
  studioStore.setState({ selection: next });
  flushStudioStore();
}

/* ── dragging an asset onto the canvas ───────────────────────────────────────────────────────────────────────────── */

const NOTHING: DropContext = { hosts: [], frame: undefined, parentHost: null, origin: null, layerSrc: null, copy: false };

type Drag = { item: PaletteItem; start: { x: number; y: number }; dragging: boolean; target: DropTarget | null; refusal: string | null };
let drag: Drag | null = null;

const overCanvas = (x: number, y: number) => {
  const box = getViewportBox();
  return x >= box.left && x <= box.left + box.width && y >= box.top && y <= box.top + box.height;
};

function onMove(event: PointerEvent) {
  const current = drag;
  if (!current) return;
  if (!current.dragging) {
    if (Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y) < 4) return;
    current.dragging = true;
    canvasApi.getViewportElement()?.setAttribute("data-studio-dragging", "");
    document.body.setAttribute("data-studio-asset-drag", "");
  }
  event.preventDefault();
  const pointer = { x: event.clientX, y: event.clientY };
  if (!overCanvas(pointer.x, pointer.y)) {
    current.target = null;
    publishDragView(null);
    return;
  }
  const { target, reason } = dropTargetAt(pointer.x, pointer.y, NOTHING);
  current.target = target;
  current.refusal = reason ?? (target ? refusalFor(target) : null);
  publishDragView({
    line: target && !current.refusal ? target.line : null,
    into: target ? target.into : null,
    pointer,
    label: current.refusal ?? current.item.label,
    tone: current.refusal ? "negative" : "info",
  });
}

function stop(commit: boolean) {
  const current = drag;
  if (!current) return;
  drag = null;
  window.removeEventListener("pointermove", onMove, true);
  window.removeEventListener("pointerup", onUp, true);
  window.removeEventListener("pointercancel", onCancel, true);
  window.removeEventListener("keydown", onKey, true);
  window.removeEventListener("blur", onCancel);
  canvasApi.getViewportElement()?.removeAttribute("data-studio-dragging");
  document.body.removeAttribute("data-studio-asset-drag");
  publishDragView(null);
  if (!current.dragging) {
    if (commit) insertAsset(current.item);
    return;
  }
  const swallow = (event: MouseEvent) => { event.stopPropagation(); event.preventDefault(); };
  window.addEventListener("click", swallow, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
  if (commit && current.target && !current.refusal) void dropAsset(current.item, current.target);
}

function onUp() { stop(true); }
function onCancel() { stop(false); }
function onKey(event: KeyboardEvent) {
  if (event.key !== "Escape" || !drag?.dragging) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  stop(false);
}

/** A press on an asset row: a click inserts it at the selection, a drag drops it where the line shows. */
export function pressAsset(event: PointerEvent, item: PaletteItem) {
  if (event.button !== 0 || drag) return;
  if (!canEdit()) { fail("View only — switch to Admin to edit"); return; }
  event.preventDefault();
  drag = { item, start: { x: event.clientX, y: event.clientY }, dragging: false, target: null, refusal: null };
  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onCancel, true);
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("blur", onCancel);
}
