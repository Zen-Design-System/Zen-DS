import { announceEditStatus, applyEdit, parseSrc, studioApi } from "../../api";
import { canvasApi, getViewportBox } from "../../canvas/viewport";
import { multiSelection } from "../../select/multiSelection";
import { expectRender, renderedNow } from "../../select/remap";
import { canStructurallyEdit, swapSelection } from "../../slots/actions";
import { altOf, ASSET_PREFIX, type Upload } from "../../builder/assets/uploads";
import { MEDIA_PREFIX, photoCode, type LibraryPhoto } from "../../builder/library/media";
import { insertTarget } from "../../builder/library/target";
import { builderCode, type PaletteContext, type PaletteItem } from "../../slots/palette";
import type { ContentSlot } from "../../slots/registry";
import { canEdit, flushStudioStore, studioStore } from "../../store";
import type { EditOp, StateDecl, StudioSelection } from "../../types";
import type { DropTarget, NodeSelection } from "../arrange";
import { insertCode } from "../clipboard";
import { dropTargetAt, publishDragView, type DropContext } from "../drag";

/*
 * Assets, Figma-like (docs/research/studio-figma-editing-plan-2026-10-03.md, Phase 6): the Zen components of the slot
 * palette (slots/palette.ts), and since GĐ3 M3 icons and photos (Insertable), inserted by a click (into the selected
 * layout, else after the selected layer, else into the frame in view; an icon on a selected Icon swaps its glyph) or
 * dragged onto the canvas, where the insertion line of a layer drag shows where it lands. A photo on a selected Image of a
 * page swaps its picture (GĐ5 M4: an uploaded photo, or the way to replace a missing one). Op pasteCode: Zen components join
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
  // A builder page keeps no state: the item's static version, else its code when it holds no state or logic.
  if (item.builder) return item.builder(context);
  return item.state?.length ? null : builderCode(code);
}

/** The state an insert declares: none on a builder page (its code is the static version, codeOf). */
const stateFor = (item: Insertable, file: string | undefined) => (file?.startsWith("local:") ? undefined : item.state);
const builderRefusal = (item: PaletteItem) => item.group === "Overlays"
  ? `On a builder page ${item.label} opens from an action: add it with Prototype › Add overlay, then point a button at it`
  : `${item.label} keeps state or code, which a builder page has none of (its screens and overlays do that: Prototype tab)`;

/** Anything the library adds (Studio builder GĐ3): a palette item, an icon, a photo. */
export type Insertable = {
  label: string;
  /** The new layer's component (it gets selected after the insert). */
  root: string;
  /** Its code for `file` ("local:…" on a builder page), or null when that file cannot hold it (`refusal` says why). */
  code(file: string | undefined): string | null;
  refusal: string;
  state?: readonly StateDecl[];
  /** An icon's name: with an Icon selected, the click swaps that Icon's glyph instead of adding one. */
  icon?: string;
  /** A photo's source on a builder page: with an Image of a page selected, the click swaps its picture instead. */
  photo?: string;
};

export const paletteInsertable = (item: PaletteItem): Insertable => ({ label: item.label, root: item.root, state: item.state, code: (file) => codeOf(item, file), refusal: builderRefusal(item) });
export const iconInsertable = (name: string, title: string): Insertable => ({ label: title, root: "Icon", icon: name, code: () => `<Icon name="${name}" title=${JSON.stringify(title)} />`, refusal: "" });
export const photoInsertable = (entry: LibraryPhoto): Insertable => ({ label: entry.photo.alt, root: "Image", photo: `${MEDIA_PREFIX}${entry.key}`, code: (file) => photoCode(entry, Boolean(file?.startsWith("local:"))), refusal: "" });
/** An uploaded photo (GĐ5 M4): on pages you made only (example code takes the library's photos). */
export const uploadInsertable = (upload: Upload): Insertable => ({
  label: altOf(upload.name),
  root: "Image",
  photo: `${ASSET_PREFIX}${upload.id}`,
  code: (file) => (file?.startsWith("local:") ? `<Image src="${ASSET_PREFIX}${upload.id}" alt=${JSON.stringify(altOf(upload.name))} ratio="4:3" />` : null),
  refusal: "An uploaded photo goes on a page you made (Pages › New page); example code takes the library's photos",
});

/** The selected Image of a page you made (a photo click swaps its picture), or null. */
export function selectedImage(): NodeSelection | null {
  const selection = studioStore.getState().selection;
  return selection?.kind === "node" && !selection.part && selection.name === "Image" && parseSrc(selection.src)?.file.startsWith("local:") ? selection : null;
}

/** Gives the selected Image another picture (one undo step): how a page's missing photo is replaced. */
async function swapPhoto(selection: NodeSelection, src: string, label: string) {
  const at = parseSrc(selection.src);
  if (!at) return;
  const element = await studioApi.element(at.file, at.loc);
  if (!element) { fail("The selected Image is no longer there"); return; }
  await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [{ op: "setProp", name: "src", value: { kind: "string", value: src } } as EditOp], hash: element.hash }, `Image → ${label}`);
}

/** The selected Icon layer (an icon from the library swaps its glyph), or null. */
export function selectedIcon(): NodeSelection | null {
  const selection = studioStore.getState().selection;
  return selection?.kind === "node" && !selection.part && selection.name === "Icon" ? selection : null;
}

/** Gives the selected Icon another glyph (one undo step). */
async function swapIcon(selection: NodeSelection, name: string) {
  const at = parseSrc(selection.src);
  if (!at) return;
  const element = await studioApi.element(at.file, at.loc);
  if (!element) { fail("The selected Icon is no longer there"); return; }
  await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [{ op: "setProp", name: "name", value: { kind: "string", value: name } } as EditOp], hash: element.hash }, `Icon → ${name}`);
}

/**
 * Click: an icon swaps the selected Icon's glyph; anything else goes into the selected layout, else after the selected
 * layer; with nothing selected, into the frame most in view (Studio builder GĐ3, builder/library/target.ts).
 */
export function insertItem(item: Insertable) {
  if (!canEdit()) { fail("View only — switch to Admin to edit"); return; }
  const icon = item.icon ? selectedIcon() : null;
  if (icon && item.icon) { void swapIcon(icon, item.icon); return; }
  const image = item.photo ? selectedImage() : null;
  if (image && item.photo) { void swapPhoto(image, item.photo, item.label); return; }
  const target = insertTarget();
  if (typeof target === "string") { fail(target); return; }
  const file = parseSrc(target.src)?.file;
  const code = item.code(file);
  if (code === null) { fail(item.refusal); return; }
  void insertCode(target, code, stateFor(item, file));
}

/** A palette item, as insertItem. */
export const insertAsset = (item: PaletteItem) => insertItem(paletteInsertable(item));

/** What Swap instance would replace: the selected layer, or why there is none to swap (GĐ4 M2). */
export function swapTarget(): NodeSelection | string {
  const selection = studioStore.getState().selection;
  if (selection?.kind !== "node" || selection.part) return "Select a layer to swap";
  const check = canStructurallyEdit(selection);
  return check.ok ? selection : check.reason;
}

/** Swap instance (Figma, GĐ4 M2): the selected layer becomes `item`, in its place, one undo step (Quick insert's Swap mode). */
export function swapItem(item: Insertable) {
  if (!canEdit()) { fail("View only — switch to Admin to edit"); return; }
  const target = swapTarget();
  if (typeof target === "string") { fail(target); return; }
  const file = parseSrc(target.src)?.file;
  const code = item.code(file);
  if (code === null) { fail(item.refusal); return; }
  void swapSelection(target, code, item.label, stateFor(item, file));
}

/** Why nothing can be dropped into `target` (a playground, docs, the role), or null. */
/** Why the layer at `target` cannot take a new child, or null. */
export function refusalFor(target: DropTarget): string | null {
  const parent: StudioSelection = { kind: "node", src: target.parentSrc, name: target.parentName, frameId: target.frameId, panelId: target.panelId, instance: 0 };
  const check = canStructurallyEdit(parent);
  return check.ok ? null : check.reason;
}

/** Adds `item` where a drag or the toolbar's placement points (one edit; the new layer selected). */
export async function dropAsset(item: Insertable, target: DropTarget) {
  const at = parseSrc(target.parentSrc);
  if (!at) return;
  const parent = await studioApi.element(at.file, at.loc);
  if (!parent) { fail(`${target.parentName} is no longer there`); return; }
  const code = item.code(at.file);
  if (code === null) { fail(item.refusal); return; }
  const state = stateFor(item, at.file);
  const op: Extract<EditOp, { op: "pasteCode" }> = { op: "pasteCode", code, ...(state?.length ? { state: state.map((entry) => ({ ...entry })) } : {}) };
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

type Drag = { item: Insertable; start: { x: number; y: number }; dragging: boolean; target: DropTarget | null; refusal: string | null };
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
    if (commit) insertItem(current.item);
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

/** A press on an asset row or tile: a click inserts it at the selection, a drag drops it where the line shows. */
export function pressAsset(event: PointerEvent, item: Insertable) {
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
