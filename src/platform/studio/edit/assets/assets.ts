import { announceEditStatus, applyEdit, parseSrc, studioApi } from "../../api";
import { canvasApi, getViewport, getViewportBox } from "../../canvas/viewport";
import { multiSelection } from "../../select/multiSelection";
import { expectRender, renderedNow } from "../../select/remap";
import { canStructurallyEdit, pasteWarningIn, swapSelection } from "../../slots/actions";
import { altOf, ASSET_PREFIX, type Upload } from "../../builder/assets/uploads";
import { MEDIA_PREFIX, photoCode, type LibraryPhoto } from "../../builder/library/media";
import { insertTarget } from "../../builder/library/target";
import { builderCode, type PaletteContext, type PaletteItem } from "../../slots/palette";
import type { ContentSlot } from "../../slots/registry";
import { canEdit, flushStudioStore, studioStore } from "../../store";
import type { EditOp, StateDecl, StudioSelection } from "../../types";
import { placeOf, type DropTarget, type NodeSelection } from "../arrange";
import { insertCode, notRecommended } from "../clipboard";
import { dropTargetAt, kidsOf, publishDragView, type DropContext } from "../drag";
import { floatingCode } from "../autoLayoutPlan";
import { snapBox, SNAP_PX, type FrameBox } from "../../builder/render/framePlace";
import { annotatedAt, findBySrc, fiberOf, frameOf, hitOf, instanceOf, nameOf, panelOf, rectOf as rectOfHosts, selectHit, srcOf, type FiberHit } from "../../select/picker";
import { partHit, selectPart, selectedPartStore, withoutPart, type PartHit } from "../../select/parts";
import { itemPictureOf, nestedPicture, PICTURED, writePicture } from "./picture";

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
  const slot = { component: "Stack", prop: "children", name: "Layers", kind: "layout" } as unknown as ContentSlot;
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
  /** A photo's source on a builder page: with an Image or Avatar of a page selected, the click swaps its picture instead. */
  photo?: string;
  /** Why it cannot go inside the layer at `src` (another page's component inside its own main), or null. */
  refuseIn?: (src: string) => string | null;
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

/**
 * The selected Image, Avatar, Thumbnail or account (a photo click swaps its picture, in any file: picture.ts), or null.
 * A part of one selected (the account's own img, Figma's deepest layer under ⌘-click) counts as the layer that holds the picture.
 */
export function selectedImage(): NodeSelection | null {
  const selection = studioStore.getState().selection;
  if (selection?.kind !== "node") return null;
  // A picture the selected layer draws as a nested instance (an AvatarStack's Avatar) on a page you made: that one.
  if (nestedPicture(selection)) return selection;
  // A face drawn from an item of the selected layer's list prop (an AvatarStack's items[2], a reader in seenBy): its item.
  const part = selection.part ? selectedPartStore.get() : null;
  if (part && part.name === selection.part?.name && itemPictureOf(part)) return selection;
  if (!PICTURED.has(selection.name)) return null;
  return selection.part ? (withoutPart(selection) as NodeSelection) : selection;
}

/** Gives the selected Image, Avatar or account another picture (one undo step; a row's picture changes that row only). */
const swapPhoto = (selection: NodeSelection, src: string, label: string) => writePicture(selection, src, label);

/**
 * The Image, Avatar or account under the pointer (an Avatar drawn as a part of an account counts as the account), as a
 * selection a dropped photo goes on, with its box; null over anything else.
 */
function picturedAt(x: number, y: number): { selection: NodeSelection; box: DOMRect; hit: ReturnType<typeof hitOf>; part?: PartHit } | null {
  const world = canvasApi.getWorldElement();
  // The drag's own overlay sits on top: the first element under the pointer that is on the canvas (as dropTargetAt).
  const under = document.elementsFromPoint(x, y).find((element) => world?.contains(element) && element !== world);
  if (!world || !under) return null;
  let face: ReturnType<typeof fiberOf> = null;
  for (let fiber = fiberOf(under); fiber; fiber = fiber.return) {
    // A face its owner draws from a list prop (an AvatarStack's items[2], a ChatMessage's seenBy): that item's picture,
    // once the owner (the nearest layer of the code) is reached.
    if (face && srcOf(fiber)) {
      const owner = hitOf(fiber);
      const part = owner ? partHit(owner, face) : null;
      face = null;
      const host = owner?.hosts[0];
      const selection = owner && part ? { kind: "node", src: owner.src, name: owner.name, frameId: frameOf(host), panelId: panelOf(host), instance: instanceOf(world, owner), part: { path: part.path, name: part.name } } as NodeSelection : null;
      const box = part ? rectOfHosts(part.hosts) : null;
      // A page you made overrides the nested instance's own picture instead (M8), when the owner names it as a layer.
      if (owner && part && selection && box && (itemPictureOf(part) || nestedPicture(selection, part))) return { hit: owner, part, box, selection };
    }
    if (typeof fiber.type !== "function" || !PICTURED.has(nameOf(fiber))) continue;
    const src = srcOf(fiber);
    if (!src) {
      face ??= fiber;
      continue;
    }
    const hit = hitOf(fiber);
    const box = hit ? rectOfHosts(hit.hosts) : null;
    if (!hit || !box) return null;
    const host = hit.hosts[0];
    return { hit, box, selection: { kind: "node", src, name: nameOf(fiber), frameId: frameOf(host), panelId: panelOf(host), instance: instanceOf(world, hit) } };
  }
  return null;
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
  if (!canEdit()) { fail("View only"); return; }
  const icon = item.icon ? selectedIcon() : null;
  if (icon && item.icon) { void swapIcon(icon, item.icon); return; }
  const image = item.photo ? selectedImage() : null;
  if (image && item.photo) { void swapPhoto(image, item.photo, item.label); return; }
  const target = insertTarget();
  if (typeof target === "string") { fail(target); return; }
  // A Top / Bottom Navigation goes to the bar of the Screen the insert would go to.
  if (BARS[item.root]) {
    const host = findBySrc(canvasApi.getWorldElement() ?? document.body, target.src)[0]?.hosts[0];
    const bar = barOf(host?.closest<HTMLElement>(".studio-builder-screen") ?? null, item.root);
    if (typeof bar === "string") { fail(bar); return; }
    if (bar) { void dropBar(item, bar); return; }
  }
  const file = parseSrc(target.src)?.file;
  const code = item.code(file);
  if (code === null) { fail(item.refusal); return; }
  const inside = item.refuseIn?.(target.src);
  if (inside) { fail(inside); return; }
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
  if (!canEdit()) { fail("View only"); return; }
  const target = swapTarget();
  if (typeof target === "string") { fail(target); return; }
  const file = parseSrc(target.src)?.file;
  const code = item.code(file);
  if (code === null) { fail(item.refusal); return; }
  const inside = item.refuseIn?.(target.src);
  if (inside) { fail(inside); return; }
  void swapSelection(target, code, item.label, stateFor(item, file));
}

/** Why nothing can be dropped into `target` (a playground, docs, the role), or null. */
/** Why the layer at `target` cannot take a new child, or null. */
export function refusalFor(target: DropTarget): string | null {
  const parent: StudioSelection = { kind: "node", src: target.parentSrc, name: target.parentName, frameId: target.frameId, panelId: target.panelId, instance: 0 };
  const check = canStructurallyEdit(parent);
  return check.ok ? null : check.reason;
}

/** Adds `item` where a drag or the toolbar's placement points (one edit; the new layer selected). `free`: the px it goes
 *  to in a Frame without auto layout (placed there, floating), else it joins the layout's flow. */
export async function dropAsset(item: Insertable, target: DropTarget, free?: { x: number; y: number } | null) {
  const at = parseSrc(target.parentSrc);
  if (!at) return;
  const parent = await studioApi.element(at.file, at.loc);
  if (!parent) { fail(`${target.parentName} is no longer there`); return; }
  const written = item.code(at.file);
  if (written === null) { fail(item.refusal); return; }
  const inside = item.refuseIn?.(target.parentSrc);
  if (inside) { fail(inside); return; }
  const code = free ? floatingCode(written, item.root, free.x, free.y) : written;
  const state = stateFor(item, at.file);
  const op: Extract<EditOp, { op: "pasteCode" }> = { op: "pasteCode", code, ...(state?.length ? { state: state.map((entry) => ({ ...entry })) } : {}), ...placeOf(target) };
  const before = renderedNow(canvasApi.getWorldElement());
  // The host's rules judge a drop as they judge a click (a Card in a Card, a control in a clickable card): it still lands.
  const host = findBySrc(canvasApi.getWorldElement() ?? document.body, target.parentSrc)[0];
  const warning = host ? await pasteWarningIn(host, target.frameId, target.panelId, code).catch(() => null) : null;
  const response = await applyEdit({ file: at.file, loc: at.loc, name: parent.name, ops: [op], hash: parent.hash }, `Add ${item.label}`);
  if (!response.ok || !response.inserted) return;
  notRecommended(warning);
  const next: StudioSelection = { kind: "node", src: `${response.file}:${response.inserted.loc}`, name: free && !/^(Stack|Grid|Box|Shape)$/.test(item.root) ? "Box" : item.root, frameId: target.frameId, panelId: target.panelId, instance: 0 };
  multiSelection.clear();
  expectRender(next, before, () => undefined, 1500);
  studioStore.setState({ selection: next });
  flushStudioStore();
}

/* ── a Screen's bars ──────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * A Top or Bottom Navigation dragged over a phone or tablet Screen goes to its bar (Screen topNavigation /
 * bottomNavigation), never into its content (user, 2026-10-17: "Kéo top navigation vào rồi đặt lên top"); over a Screen
 * that has one, it replaces it. `box`: where the overlay draws (the bar, or a band at the Screen's edge).
 */
type BarTarget = { screen: FiberHit; prop: "topNavigation" | "bottomNavigation"; label: string; replaces: FiberHit | null; box: DOMRect };
const BARS: Readonly<Record<string, { prop: BarTarget["prop"]; part: "top" | "bottom"; label: string; height: number }>> = {
  TopNavigation: { prop: "topNavigation", part: "top", label: "Top navigation", height: 56 },
  BottomNavigation: { prop: "bottomNavigation", part: "bottom", label: "Bottom navigation", height: 64 },
};

/** The bar of the Screen under (x, y) that `root` goes to, why it cannot (a desktop Screen), or null (not a bar item). */
function barAt(x: number, y: number, root: string): BarTarget | string | null {
  const world = canvasApi.getWorldElement();
  if (!BARS[root] || !world) return null;
  const under = document.elementsFromPoint(x, y).find((element) => world.contains(element) && element !== world);
  return barOf(under?.closest<HTMLElement>(".studio-builder-screen") ?? null, root);
}

/** The bar of the Screen drawn by `host` that `root` goes to, why it cannot, or null (no Screen, not a bar item). */
function barOf(host: HTMLElement | null, root: string): BarTarget | string | null {
  const bar = BARS[root];
  if (!bar) return null;
  const screen = host ? annotatedAt(host) : null;
  if (!host || !screen || screen.name !== "Screen") return null;
  if (host.dataset.layout !== "mobile") return `${bar.label} is a phone bar: this Screen has the desktop layout`;
  const holder = host.querySelector(`:scope > .studio-builder-screen__main > .studio-builder-screen__${bar.part}`);
  const replaces = holder?.firstElementChild ? annotatedAt(holder.firstElementChild) : null;
  const edge = host.getBoundingClientRect();
  const scale = host.offsetWidth ? edge.width / host.offsetWidth : 1;
  const band = bar.height * scale;
  const box = holder ? holder.getBoundingClientRect() : new DOMRect(edge.left, bar.part === "top" ? edge.top : edge.bottom - band, edge.width, band);
  return { screen, prop: bar.prop, label: replaces ? `Replace ${bar.label.toLowerCase()}` : bar.label, replaces, box };
}

/** Puts `item` in its Screen's bar, or in place of the bar there (one edit; the new bar selected). */
async function dropBar(item: Insertable, bar: BarTarget) {
  const at = parseSrc(bar.screen.src);
  const world = canvasApi.getWorldElement();
  if (!at || !world) return;
  const code = item.code(at.file);
  if (code === null) { fail(item.refusal); return; }
  const target = bar.replaces ? parseSrc(bar.replaces.src) : at;
  const element = target ? await studioApi.element(target.file, target.loc) : null;
  if (!target || !element) { fail(`${bar.replaces ? bar.replaces.name : "The Screen"} is no longer there`); return; }
  const op = (bar.replaces ? { op: "replaceElement", code } : { op: "insertChild", prop: bar.prop, code }) as EditOp;
  const before = renderedNow(world);
  const response = await applyEdit({ file: target.file, loc: target.loc, name: element.name, ops: [op], hash: element.hash }, `${bar.replaces ? "Replace" : "Add"} ${item.label}`);
  if (!response.ok) return;
  const inserted = response.inserted ?? (bar.replaces ? { loc: target.loc } : null);
  if (!inserted) return;
  const host = bar.screen.hosts[0];
  const next: StudioSelection = { kind: "node", src: `${response.file}:${inserted.loc}`, name: item.root, frameId: frameOf(host), panelId: panelOf(host), instance: 0 };
  multiSelection.clear();
  expectRender(next, before, () => undefined, 1500);
  studioStore.setState({ selection: next });
  flushStudioStore();
}

/* ── a Frame without auto layout ─────────────────────────────────────────────────────────────────────────────────── */

/**
 * A drop into a Frame without auto layout (a Box whose layers all float, or none: Figma's frame) lands where the pointer
 * is, its corner snapped to the frame's and its layers' edges and centres (Figma's smart guides, red); ⌘ / Ctrl drops
 * without snapping (user, 2026-10-17: "kéo thả có smart guide, để dễ align y như figma"). A Box that lays its layers out
 * in flow keeps the insertion line. Null for any other drop.
 */
type FreeDrop = { x: number; y: number; guides: Array<{ x: number; y: number; w: number; h: number }> };
function freeDropAt(target: DropTarget, pointer: { x: number; y: number }, noSnap: boolean): FreeDrop | null {
  if (target.parentName !== "Box" || target.slot) return null;
  const host = findBySrc(canvasApi.getWorldElement() ?? document.body, target.parentSrc)[0]?.hosts[0];
  if (!(host instanceof HTMLElement) || !host.matches(".zen-box")) return null;
  const kids = Array.from(host.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
  if (!kids.every((child) => child.dataset.position === "absolute")) return null;
  const outer = host.getBoundingClientRect();
  const scale = host.offsetWidth ? outer.width / host.offsetWidth || 1 : 1;
  const local = (x: number, y: number) => ({ x: (x - outer.left) / scale - host.clientLeft, y: (y - outer.top) / scale - host.clientTop });
  const point = local(pointer.x, pointer.y);
  const others: FrameBox[] = [
    { x: 0, y: 0, width: host.clientWidth, height: host.clientHeight },
    ...kids.map((kid) => { const box = kid.getBoundingClientRect(); const at = local(box.left, box.top); return { x: at.x, y: at.y, width: box.width / scale, height: box.height / scale }; }),
  ];
  const snapped = noSnap ? { dx: 0, dy: 0, guides: [] } : snapBox({ x: point.x, y: point.y, width: 0, height: 0 }, others, SNAP_PX / (getViewport().zoom || 1));
  const x = Math.max(0, Math.round(point.x + snapped.dx));
  const y = Math.max(0, Math.round(point.y + snapped.dy));
  const screen = (px: number, py: number) => ({ x: outer.left + (px + host.clientLeft) * scale, y: outer.top + (py + host.clientTop) * scale });
  const guides = snapped.guides.map((guide) => {
    const from = guide.axis === "x" ? screen(guide.at, guide.from) : screen(guide.from, guide.at);
    const length = (guide.to - guide.from) * scale;
    return guide.axis === "x" ? { x: from.x, y: from.y, w: 1, h: length } : { x: from.x, y: from.y, w: length, h: 1 };
  });
  return { x, y, guides };
}

/* ── dragging an asset onto the canvas ───────────────────────────────────────────────────────────────────────────── */

const NOTHING: DropContext = { hosts: [], frame: undefined, parentHost: null, origin: null, layerSrc: null, copy: false, slots: true };

type Drag = { item: Insertable; start: { x: number; y: number }; dragging: boolean; target: DropTarget | null; refusal: string | null; swap: ReturnType<typeof picturedAt>; bar: BarTarget | null; free: FreeDrop | null };
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
  // A photo over an Image, Avatar or account: the drop replaces its picture (Figma drops an image on a layer's fill).
  current.swap = current.item.photo ? picturedAt(pointer.x, pointer.y) : null;
  if (current.swap) {
    current.target = null;
    current.refusal = null;
    const { box, selection } = current.swap;
    publishDragView({ line: null, into: { x: box.x, y: box.y, w: box.width, h: box.height }, pointer, label: `Picture of ${current.swap.part?.name ?? selection.name}`, tone: "info" });
    return;
  }
  // A Top / Bottom Navigation over a phone Screen: its bar.
  const bar = barAt(pointer.x, pointer.y, current.item.root);
  current.bar = bar && typeof bar === "object" ? bar : null;
  if (bar) {
    current.target = null;
    current.refusal = typeof bar === "string" ? bar : refusalFor({ parentSrc: bar.screen.src, parentName: "Screen", frameId: frameOf(bar.screen.hosts[0]), panelId: panelOf(bar.screen.hosts[0]) });
    const box = typeof bar === "string" ? null : bar.box;
    publishDragView({ line: null, into: box ? { x: box.x, y: box.y, w: box.width, h: box.height } : null, pointer, label: current.refusal ?? (bar as BarTarget).label, tone: current.refusal ? "negative" : "info" });
    return;
  }
  // An App shell is a whole page: it goes on an empty Screen, never into a layer (the engine says the same).
  const shell = current.item.root === "AppShell" ? shellAt(pointer.x, pointer.y) : null;
  if (shell) {
    current.target = typeof shell === "string" ? null : shell;
    current.refusal = typeof shell === "string" ? shell : refusalFor(shell);
    current.free = null;
    publishDragView({ line: null, into: typeof shell === "string" ? null : shell.into, pointer, label: current.refusal ?? current.item.label, tone: current.refusal ? "negative" : "info" });
    return;
  }
  const { target, reason } = dropTargetAt(pointer.x, pointer.y, NOTHING);
  current.target = target;
  // Nowhere to land is said, never silent: the board outside a frame takes frames only (Figma would make a loose layer).
  current.refusal = reason ?? (target ? refusalFor(target) : overFrame(pointer.x, pointer.y) ? null : "Drop it into a frame");
  current.free = target && !current.refusal ? freeDropAt(target, pointer, event.metaKey || event.ctrlKey) : null;
  if (current.free && target) {
    publishDragView({ line: null, into: target.into, pointer, label: `${current.item.label} · ${current.free.x}, ${current.free.y}`, tone: "info", guides: current.free.guides });
    return;
  }
  publishDragView({
    line: target && !current.refusal ? target.line : null,
    into: target ? target.into : null,
    pointer,
    label: current.refusal ?? current.item.label,
    tone: current.refusal ? "negative" : "info",
    slot: target?.slot ?? null,
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
  if (commit && current.swap && current.item.photo) {
    const { selection, hit, part } = current.swap;
    if (part) selectPart(part, canvasApi.getWorldElement());
    else if (hit) selectHit(hit, canvasApi.getWorldElement());
    void writePicture(selection, current.item.photo, current.item.label, part);
    return;
  }
  if (commit && current.bar && !current.refusal) { void dropBar(current.item, current.bar); return; }
  if (commit && current.target && !current.refusal) void dropAsset(current.item, current.target, current.free);
}

/** The empty Screen under (x, y) an App shell goes into, why not (a Screen with content), or null (no Screen there). */
function shellAt(x: number, y: number): (DropTarget & { into: { x: number; y: number; w: number; h: number } }) | string | null {
  const world = canvasApi.getWorldElement();
  const under = world ? document.elementsFromPoint(x, y).find((element) => world.contains(element) && element !== world) : null;
  const host = under?.closest<HTMLElement>(".studio-builder-screen");
  const screen = host ? annotatedAt(host) : null;
  if (!host || !screen || screen.name !== "Screen") return null;
  if (kidsOf(screen).length) return "An App shell is a whole page: drop it on an empty Screen";
  const box = host.getBoundingClientRect();
  return { parentSrc: screen.src, parentName: "Screen", frameId: frameOf(host), panelId: panelOf(host), into: { x: box.x, y: box.y, w: box.width, h: box.height } };
}

/** Whether (x, y) is on a frame of the board (a Screen or an Overlay), not the board's empty space. */
function overFrame(x: number, y: number) {
  const world = canvasApi.getWorldElement();
  // A Section (F4) is the board under the frames, not a frame to drop into.
  return document.elementsFromPoint(x, y).some((element) => world?.contains(element) && element !== world && Boolean(element.closest("[data-studio-frame]:not([data-kind='section'])")));
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
  if (!canEdit()) { fail("View only"); return; }
  event.preventDefault();
  drag = { item, start: { x: event.clientX, y: event.clientY }, dragging: false, target: null, refusal: null, swap: null, bar: null, free: null };
  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onCancel, true);
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("blur", onCancel);
}
