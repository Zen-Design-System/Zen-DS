import { useSyncExternalStore } from "react";
import { canvasApi, getSafeBox, getViewport, getViewportBox, panBy } from "../canvas/viewport";
import { annotatedAt, childHits, findBySrc, frameOf, panelOf, parentHit, rectOf, type FiberHit } from "../select/picker";
import { multiSelection, selectedLayers, type ExtraLayer } from "../select/multiSelection";
import { canStructurallyEdit, structuralBlock } from "../slots/actions";
import { canEdit, studioStore } from "../store";
import { moveLayer, type DropTarget, type NodeSelection } from "./arrange";
import { startMarquee } from "./marquee";
import { moveLayersTo } from "./multi";
import { floatingItems, writeMoves, type FloatingItem } from "./alignLayers";
import { equalSpacing, type SpacingMark } from "./spacingModel";
import { announceEditStatus, applyEdit, parseSrc, studioApi } from "../api";
import { ladderOf } from "../position/PositionSection";
import { ladderName, pinOfConstraint, snap, snapText, type Ladder, type Pin, type Snap } from "../position/positionModel";
import type { EditOp } from "../types";
import { textEditSession } from "./textEdit";
import { srcAttr } from "../select/srcIds";
import { snapBox, SNAP_PX, type FrameBox, type SnapGuide } from "../builder/render/framePlace";

/*
 * Drag a layer in auto layout, Figma-like (docs/research/studio-figma-editing-plan-2026-10-03.md, Phase 2).
 *
 * - A press on a layer arms a drag; moving 4 px starts it. A press inside the selected layer drags that layer (a click
 *   without moving still selects what is under the pointer, as Figma does); elsewhere the press selects first.
 * - The layer itself follows the pointer (its own render, scaled with the canvas); a 2 px insertion line shows where it
 *   lands among the siblings of the container under the pointer, and that container is outlined. Near a sibling's
 *   edges (along the container's direction) it goes before / after that sibling; in the middle of a sibling that is a
 *   container, it goes into it.
 * - Drop writes op moveTo (one undo step); ⌥ held at drop leaves the original (a copy); Esc cancels. Layers move within
 *   their example (frame); the server refuses names that would not exist where it lands.
 * - Near the canvas edges the canvas pans.
 * - Several selected layers drag together (a press inside any of them): all follow the pointer and land together at
 *   the drop place, in source order (op many moveTo, edit/multi.ts). A layer a .map renders moves every row's render,
 *   so every instance of it in the frame follows the pointer.
 */

/** What the overlay draws (client coordinates). */
export type DragView = {
  line: { x: number; y: number; w: number; h: number } | null;
  into: { x: number; y: number; w: number; h: number } | null;
  pointer: { x: number; y: number };
  label: string | null;
  tone: "info" | "negative";
  /** Red smart guides of a free move (client px). */
  guides?: Array<{ x: number; y: number; w: number; h: number }>;
  /** Pink equal-spacing marks of a free move, with their px (client px; edit/spacingModel.ts). */
  spacing?: Array<{ x: number; y: number; w: number; h: number; axis: "x" | "y"; label: string }>;
} | null;

let view: DragView = null;
const listeners = new Set<() => void>();
const publish = (next: DragView) => { view = next; listeners.forEach((listener) => listener()); };
/** Draws a drag's overlay (DragLayer): also used by a drag from Assets. */
export const publishDragView = publish;
export const useDragView = () => useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => view, () => null);

/**
 * Components and host tags a layer can be dropped into (they take element children). A builder page's Screen is a frame
 * (Figma: anything drops into a frame, user 2026-10-17 "kéo component vào mà không có box(frame) hoặc stack"), and an
 * AppShell takes the page content of a desktop Screen.
 */
const DROP_COMPONENTS = new Set(["Stack", "Grid", "Box", "Container", "Card", "Form", "FormFieldset", "FormActions", "Screen", "AppShell"]);
const DROP_TAGS = new Set(["div", "section", "article", "aside", "header", "footer", "main", "nav", "ul", "ol", "li", "form", "fieldset", "figure", "td"]);
const THRESHOLD = 4;
const EDGE = 32;

type Target = DropTarget & { noop: boolean; line: NonNullable<DragView>["line"]; into: NonNullable<DragView>["into"] };

type Session = {
  layer: NodeSelection;
  /** Several selected layers dragged together (the primary first), else null. */
  layers: ExtraLayer[] | null;
  /** A floating layer: the drag moves its insets instead of reordering it (followFloat). */
  float: FloatMove | null;
  /** Several floating layers: they move together by the px, each its own offsets (followGroup, F2). */
  group?: GroupMove | null;
  hit: FiberHit;
  /** Every DOM node that follows the pointer (the layer's, its other .map renders', the other selected layers'). */
  hosts: HTMLElement[];
  /** Each lifted node's rect before the drag (its place among its siblings while it is lifted). */
  origins: Map<Element, DOMRect>;
  frame: Element | null;
  /** The first DOM node of the layer's parent: while the pointer is inside it, the layer stays there (Figma). */
  parentHost: Element | null;
  origin: DOMRect | null;
  start: { x: number; y: number };
  startWorld: { x: number; y: number };
  pointer: { x: number; y: number };
  /** ⇧ (one axis) and ⌘ / Ctrl (no snapping) as last seen: a free move reads them. */
  keys: { shift: boolean; mod: boolean };
  dragging: boolean;
  copy: boolean;
  refusal: string | null;
  target: Target | null;
  deferred: (() => void) | null;
  saved: Array<{ host: HTMLElement; name: string; value: string; priority: string }>;
  pan: number;
};

let session: Session | null = null;

const toBox = (rect: DOMRect) => ({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });

function toWorld(point: { x: number; y: number }) {
  const box = getViewportBox();
  const { x, y, zoom } = getViewport();
  return { x: (point.x - box.left - x) / zoom, y: (point.y - box.top - y) / zoom };
}

const nameOfHit = (hit: FiberHit) => hit.name.slice(hit.name.lastIndexOf(".") + 1);
/** An Overlay that holds nothing yet (a page made in the Studio) takes the one layer it will show. */
const emptyOverlay = (hit: FiberHit) => nameOfHit(hit) === "Overlay" && !hit.hosts.some((host) => host.querySelector("[data-zen-src]"));
export const isDropContainer = (hit: FiberHit) => Boolean(hit.hosts[0]) && (DROP_COMPONENTS.has(nameOfHit(hit)) || DROP_TAGS.has(hit.name) || emptyOverlay(hit));

type Axis = "row" | "column" | "grid";
function axisOf(hit: FiberHit): Axis {
  const host = hit.hosts[0];
  if (!(host instanceof HTMLElement)) return "column";
  // A Screen's (and an AppShell's) content flows down the page, whatever box its bars make.
  if (nameOfHit(hit) === "Screen" || nameOfHit(hit) === "AppShell") return "column";
  const style = getComputedStyle(host);
  if (style.display.includes("flex")) return style.flexDirection.startsWith("row") ? "row" : "column";
  if (style.display.includes("grid")) return style.gridTemplateColumns.trim().split(/\s+/).length > 1 ? "grid" : "column";
  return "column";
}

/**
 * Within the leading or trailing band of `rect` along `axis` (a quarter, 6–16 px), where a drop goes beside it rather
 * than into it: "start", "end" or null.
 */
function nearSide(rect: DOMRect, x: number, y: number, axis: Axis): "start" | "end" | null {
  const along = axis === "column" ? rect.height : rect.width;
  const band = Math.min(16, Math.max(6, along * 0.25));
  const [from, to, at] = axis === "column" ? [rect.top, rect.bottom, y] : [rect.left, rect.right, x];
  return at - from < band ? "start" : to - at < band ? "end" : null;
}

/** Whether `inner`'s `side` edge sits on `outer`'s (no room to tell "beside it" from "inside it": inside wins). */
function sharedEdge(inner: DOMRect, outer: DOMRect, side: "start" | "end", axis: Axis) {
  const [a, b] = axis === "column" ? (side === "start" ? [inner.top, outer.top] : [inner.bottom, outer.bottom]) : side === "start" ? [inner.left, outer.left] : [inner.right, outer.right];
  return Math.abs(a - b) <= 2;
}

type Unit = { first: string; last: string; rect: DOMRect; dragged: boolean };

/**
 * What a drop is for: the dragged layer (its DOM nodes, its place before the drag, its parent's first node) or, for a
 * new element from Assets, nothing. `frame`: the example it must stay in (undefined: any).
 */
export type DropContext = { hosts: Element[]; frame: Element | null | undefined; parentHost: Element | null; origin: DOMRect | null; layerSrc: string | null; copy: boolean; origins?: Map<Element, DOMRect>; /** How many layers are dragged (several selected: more than 1). */ layers?: number };

/**
 * Whether a layer of frame `from` may land in frame `to`: its own frame, or any Screen or Overlay of a page you made
 * (one file, as Figma's frames are one page: a layer drags from one Screen to another; dnd campaign 2026-10-17). An
 * example's frame is its own code.
 */
export function sameDropScope(from: Element | null, to: Element | null): boolean {
  if (from === to) return true;
  const builder = (frame: Element | null) => /^(screen|overlay):/.test(frame?.getAttribute("data-studio-frame") ?? "");
  return builder(from) && builder(to);
}

/** Where a Screen and an AppShell draw their bars and side parts (props, not children). */
const BAR_PARTS = ".studio-builder-screen__top, .studio-builder-screen__bottom, .studio-builder-screen__side, .studio-builder-screen__header, .zen-app-shell__sidebar, .zen-app-shell__sections, .zen-app-shell__header, .zen-app-shell__top-nav, .zen-app-shell__bottom, .zen-app-shell__banner, .zen-app-shell__aside";
/** A container's child layers: a Screen's and an AppShell's leave out what their bars draw (a Top Navigation, a Sidebar). */
export function kidsOf(container: FiberHit): FiberHit[] {
  const kids = childHits(container);
  const name = nameOfHit(container);
  if (name !== "Screen" && name !== "AppShell") return kids;
  return kids.filter((kid) => !kid.hosts[0]?.closest(BAR_PARTS));
}

/** The container's child layers in order; consecutive renders of one JSX element (a .map) form one unit. */
function unitsOf(container: FiberHit, ctx: DropContext): Unit[] {
  const units: Unit[] = [];
  for (const kid of kidsOf(container)) {
    const dragged = Boolean(ctx.layerSrc && kid.hosts[0] && ctx.hosts.includes(kid.hosts[0]));
    const rect = dragged ? ctx.origins?.get(kid.hosts[0]) ?? ctx.origin : rectOf(kid.hosts);
    if (!rect || (!rect.width && !rect.height)) continue;
    const last = units[units.length - 1];
    if (last && last.first === kid.src && !dragged && !last.dragged) {
      const left = Math.min(last.rect.left, rect.left);
      const top = Math.min(last.rect.top, rect.top);
      last.rect = new DOMRect(left, top, Math.max(last.rect.right, rect.right) - left, Math.max(last.rect.bottom, rect.bottom) - top);
    } else units.push({ first: kid.src, last: kid.src, rect, dragged });
  }
  return units;
}

/** Where a drop at (x, y) goes inside `container`. */
function insertion(container: FiberHit, x: number, y: number, ctx: DropContext): Target {
  const axis = axisOf(container);
  const units = unitsOf(container, ctx);
  const box = rectOf(container.hosts) ?? new DOMRect(x, y, 0, 0);
  const base: DropTarget = { parentSrc: container.src, parentName: container.name, frameId: frameOf(container.hosts[0]), panelId: panelOf(container.hosts[0]) };
  if (!units.length) return { ...base, noop: false, into: toBox(box), line: null };
  let index = units.length;
  if (axis === "grid") {
    let best = 0;
    let distance = Infinity;
    units.forEach((unit, k) => {
      const dx = x < unit.rect.left ? unit.rect.left - x : x > unit.rect.right ? x - unit.rect.right : 0;
      const dy = y < unit.rect.top ? unit.rect.top - y : y > unit.rect.bottom ? y - unit.rect.bottom : 0;
      if (dx + dy * 2 < distance) { distance = dx + dy * 2; best = k; }
    });
    index = x < units[best].rect.left + units[best].rect.width / 2 ? best : best + 1;
  } else {
    const found = units.findIndex((unit) => (axis === "row" ? x < unit.rect.left + unit.rect.width / 2 : y < unit.rect.top + unit.rect.height / 2));
    index = found < 0 ? units.length : found;
  }
  const prev = units[index - 1] ?? null;
  const next = units[index] ?? null;
  // A drop right before, inside or right after the dragged run of siblings (one layer, or several side by side) moves nothing.
  const own = units.flatMap((unit, k) => (unit.dragged ? [k] : []));
  const run = own.length > 0 && own.length === (ctx.layers ?? 1) && own[own.length - 1] - own[0] === own.length - 1;
  const noop = run && index >= own[0] && index <= own[own.length - 1] + 1 && !ctx.copy;
  let line: Target["line"];
  const thick = 2;
  if (axis === "column") {
    const left = Math.min(...units.map((unit) => unit.rect.left));
    const right = Math.max(...units.map((unit) => unit.rect.right));
    const at = prev && next ? (prev.rect.bottom + next.rect.top) / 2 : next ? next.rect.top - thick : prev!.rect.bottom + thick;
    line = { x: left, y: at - thick / 2, w: right - left, h: thick };
  } else {
    const anchor = (next ?? prev)!.rect;
    const top = axis === "row" ? Math.min(...units.map((unit) => unit.rect.top)) : anchor.top;
    const bottom = axis === "row" ? Math.max(...units.map((unit) => unit.rect.bottom)) : anchor.bottom;
    const at = axis === "row" && prev && next ? (prev.rect.right + next.rect.left) / 2 : next ? next.rect.left - thick : prev!.rect.right + thick;
    line = { x: at - thick / 2, y: top, w: thick, h: bottom - top };
  }
  const target: Target = { ...base, noop, into: toBox(box), line, reparent: container.hosts[0] !== ctx.parentHost };
  if (next) target.before = next.first;
  else if (prev) target.after = prev.last;
  return target;
}

export type DropAt = { target: Target | null; reason: string | null };

/** The container and place under (x, y) for what is dragged (`ctx`), or a reason it cannot go there. */
export function dropTargetAt(x: number, y: number, ctx: DropContext): DropAt {
  const current = ctx;
  const inside = (element: Element) => current.hosts.some((host) => host === element || host.contains(element));
  let hit: FiberHit | null = null;
  for (const element of document.elementsFromPoint(x, y)) {
    if (!element.closest(".studio-world") || element.matches(".studio-world") || inside(element)) continue;
    hit = annotatedAt(element);
    if (hit) break;
  }
  if (!hit) return { target: null, reason: null };
  const frame = hit.hosts[0]?.closest("[data-studio-frame]") ?? null;
  if (current.frame !== undefined && !sameDropScope(current.frame, frame)) return { target: null, reason: "Layers move within their own example" };
  const chain: FiberHit[] = [];
  for (let step: FiberHit | null = hit; step && chain.length < 40; step = parentHit(step, frame)) chain.push(step);
  for (let k = 0; k < chain.length; k += 1) {
    const candidate = chain[k];
    if (candidate.hosts.some((host) => inside(host))) continue;
    if (!isDropContainer(candidate)) continue;
    const outer = chain.slice(k + 1).find(isDropContainer);
    const rect = rectOf(candidate.hosts);
    // Near a container's edges inside another container: beside it, not into it (its own parent keeps it; an edge it
    // shares with the outer one, e.g. a first child flush with its parent's top, means inside).
    if (outer && rect && chain[k + 1] === outer && candidate.hosts[0] !== current.parentHost) {
      const axis = axisOf(outer);
      const side = nearSide(rect, x, y, axis);
      const outerRect = rectOf(outer.hosts);
      if (side && !(outerRect && sharedEdge(rect, outerRect, side, axis))) continue;
    }
    return { target: insertion(bodyOf(candidate, ctx) ?? candidate, x, y, ctx), reason: null };
  }
  return { target: null, reason: null };
}

/**
 * A Screen whose content is one layout (the body Stack a new page starts with): a drop on the Screen's empty space goes
 * into that body, where the page's padding is, not flush beside it (Figma's frame-in-frame reads the same way to a
 * person: the body is the page). Null for anything else.
 */
function bodyOf(container: FiberHit, ctx: DropContext): FiberHit | null {
  if (nameOfHit(container) !== "Screen") return null;
  const kids = kidsOf(container).filter((kid) => kid.hosts.length);
  const [only] = kids;
  if (kids.length !== 1 || !isDropContainer(only) || only.hosts.some((host) => ctx.hosts.some((lifted) => lifted === host || lifted.contains(host)))) return null;
  return only;
}

/* ── the gesture ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Inline properties the drag sets on the layer's own DOM nodes; each one's earlier value comes back at the end. */
const LIFTED = ["pointer-events", "opacity", "transition", "z-index", "position", "translate"] as const;

function lift(current: Session) {
  current.saved = current.hosts.flatMap((host) => LIFTED.map((name) => ({ host, name, value: host.style.getPropertyValue(name), priority: host.style.getPropertyPriority(name) })));
  for (const host of current.hosts) {
    const flow = getComputedStyle(host).position === "static";
    host.style.setProperty("pointer-events", "none");
    host.style.setProperty("opacity", "0.85");
    host.style.setProperty("transition", "none");
    host.style.setProperty("z-index", "2147483000");
    if (flow) host.style.setProperty("position", "relative");
  }
  canvasApi.getViewportElement()?.setAttribute("data-studio-dragging", "");
}

function drop(current: Session) {
  for (const { host, name, value, priority } of current.saved) {
    if (value) host.style.setProperty(name, value, priority);
    else host.style.removeProperty(name);
  }
  current.saved = [];
  canvasApi.getViewportElement()?.removeAttribute("data-studio-dragging");
}

function follow(current: Session) {
  if (current.group) { followGroup(current, current.group); return; }
  if (current.float) { followFloat(current, current.float); return; }
  const world = toWorld(current.pointer);
  const dx = world.x - current.startWorld.x;
  const dy = world.y - current.startWorld.y;
  if (!current.refusal) for (const host of current.hosts) host.style.setProperty("translate", `${dx}px ${dy}px`);
  const context: DropContext = { hosts: current.hosts, frame: current.frame, parentHost: current.parentHost, origin: current.origin, layerSrc: current.layer.src, copy: current.copy, origins: current.origins, layers: current.layers?.length ?? 1 };
  const { target, reason } = current.refusal ? { target: null, reason: current.refusal } : dropTargetAt(current.pointer.x, current.pointer.y, context);
  current.target = target;
  const label = reason ?? (current.copy ? "Copy" : null);
  publish({
    line: target && !target.noop ? target.line : null,
    into: target ? target.into : null,
    pointer: current.pointer,
    label,
    tone: reason ? "negative" : "info",
  });
}

/* ── a floating layer moves by its insets ────────────────────────────────────────────────────────────────────────── */

/**
 * A floating layer (Ignore auto layout: a Stack / Grid / Box with position="absolute", or the floating Box around any
 * other layer) is not reordered by a drag: it moves inside its containing block, Figma-like, its pinned edges' insets
 * snapped to the Spacing/Padding ladder (positionModel snap; a centred axis has no offset and stays). `target`: the
 * element that carries the position props; `host`: its DOM node; offsets in CSS px at the press.
 */
type FloatMove = {
  target: NodeSelection; host: HTMLElement; scale: number; pins: { x: Pin; y: Pin }; start: { x: number; y: number }; end: { x: number; y: number }; ladder: Ladder; insets: Array<{ prop: string; snap: Snap; was: Snap }>;
  /**
   * In a free frame (a Screen or a Box without auto layout: Figma's frame whose layers sit at X / Y), the layer moves by
   * the px, snapping to the frame's and its other layers' edges and centres with red guides (⌘ held: no snapping; ⇧ one
   * axis), and writes px offsets. Inside auto layout it keeps the token ladder.
   */
  free: { others: FrameBox[]; size: { width: number; height: number }; guides: SnapGuide[]; spacing?: SpacingMark[] } | null;
};

/** Several floating layers moved together: their items, their shared block (null: in several frames, no snapping). */
type GroupMove = { items: FloatingItem[]; block: HTMLElement | null; scale: number; others: FrameBox[] | null; union: FrameBox; shift: { x: number; y: number }; guides: SnapGuide[]; spacing: SpacingMark[] };

/** A free frame's DOM node: a builder Screen (or its content box) or a Box that is not a layer's float wrapper. */
const FREE_FRAME = ".studio-builder-screen, .studio-builder-screen__content, .zen-box";

/**
 * The frame itself and its other layers, in the px of `block` (the layers' containing block, `scale` screen px each):
 * what layers moved or resized in a free frame snap to (select/ResizeLayer.tsx too).
 */
export function freeFrameBoxes(layers: readonly HTMLElement[], block: HTMLElement, scale: number): FrameBox[] {
  const outer = block.getBoundingClientRect();
  const siblings = Array.from(layers[0]?.parentElement?.children ?? []).filter((child): child is HTMLElement => child instanceof HTMLElement && !layers.includes(child));
  return [
    { x: 0, y: 0, width: block.clientWidth, height: block.clientHeight },
    ...siblings.map((child) => {
      const box = child.getBoundingClientRect();
      return { x: (box.left - outer.left) / scale - block.clientLeft, y: (box.top - outer.top) / scale - block.clientTop, width: box.width / scale, height: box.height / scale };
    }).filter((box) => box.width > 0 || box.height > 0),
  ];
}

/** The floating layer a press on `host` moves (itself, or the floating Box that holds only it), or null. */
function floatOf(host: HTMLElement, layer: NodeSelection): FloatMove | null {
  const own = host.dataset.position === "absolute" && host.matches(".zen-stack, .zen-grid, .zen-box, .zen-shape");
  const box = !own && host.parentElement?.matches('.zen-box[data-position="absolute"]') && host.parentElement.children.length === 1 ? host.parentElement : null;
  const floating = own ? host : box;
  const src = own ? layer.src : srcAttr(box);
  const block = floating?.offsetParent;
  if (!floating || !src || !(block instanceof HTMLElement)) return null;
  const outer = block.getBoundingClientRect();
  const rect = floating.getBoundingClientRect();
  const scale = block.offsetWidth ? outer.width / block.offsetWidth || 1 : 1;
  const left = (rect.left - outer.left) / scale - block.clientLeft;
  const top = (rect.top - outer.top) / scale - block.clientTop;
  const target: NodeSelection = own ? layer : { ...layer, src, name: "Box" };
  const parent = floating.parentElement;
  const freeFrame = parent?.matches(FREE_FRAME) && !(parent.matches('.zen-box[data-position="absolute"]') && parent.children.length === 1);
  const others = freeFrame ? freeFrameBoxes([floating], block, scale) : [];
  return {
    target, host: floating, scale,
    pins: { x: pinOfConstraint("x", floating.dataset.constraintX), y: pinOfConstraint("y", floating.dataset.constraintY) },
    start: { x: left, y: top },
    end: { x: block.clientWidth - left - rect.width / scale, y: block.clientHeight - top - rect.height / scale },
    ladder: ladderOf(target), insets: [],
    free: freeFrame ? { others, size: { width: rect.width / scale, height: rect.height / scale }, guides: [], spacing: [] } : null,
  };
}

/** A free frame's layer follows the pointer by the px (Figma's move): smart guides, ⇧ one axis, ⌘ no snapping. */
function followFree(current: Session, float: FloatMove, free: NonNullable<FloatMove["free"]>, keys: { shift: boolean; mod: boolean }) {
  let dx = (current.pointer.x - current.start.x) / float.scale;
  let dy = (current.pointer.y - current.start.y) / float.scale;
  if (keys.shift) { if (Math.abs(dx) >= Math.abs(dy)) dy = 0; else dx = 0; }
  const moved = { x: float.start.x + dx, y: float.start.y + dy, width: free.size.width, height: free.size.height };
  free.guides = [];
  free.spacing = [];
  if (!keys.mod) {
    const threshold = SNAP_PX / (getViewport().zoom || 1);
    const snap = snapAndSpace(moved, free.others, threshold);
    moved.x += snap.dx;
    moved.y += snap.dy;
    free.guides = snap.guides;
    free.spacing = snap.spacing;
  }
  const x = Math.round(moved.x);
  const y = Math.round(moved.y);
  const px = (value: number): Snap => ({ key: String(value), px: value, clamped: false, from: value });
  float.insets = [];
  const shift = { x: 0, y: 0 };
  for (const axis of ["x", "y"] as const) {
    const pin = float.pins[axis];
    if (pin === "center") continue;
    const at = axis === "x" ? x : y;
    const size = axis === "x" ? free.size.width : free.size.height;
    const inner = (axis === "x" ? float.start.x + float.end.x : float.start.y + float.end.y) + size;
    const [startProp, endProp] = axis === "x" ? ["insetLeft", "insetRight"] : ["insetTop", "insetBottom"];
    const was = float.start[axis];
    if (pin === "start" || pin === "stretch") float.insets.push({ prop: startProp, snap: px(at), was: px(Math.round(was)) });
    if (pin === "end" || pin === "stretch") float.insets.push({ prop: endProp, snap: px(Math.round(inner - at - size)), was: px(Math.round(float.end[axis])) });
    shift[axis] = at - was;
  }
  if (!current.refusal) float.host.style.setProperty("translate", `${shift.x}px ${shift.y}px`);
  current.target = null;
  const block = float.host.offsetParent;
  publish({ line: null, into: null, pointer: current.pointer, label: current.refusal ?? null, tone: current.refusal ? "negative" : "info", guides: freeGuides(float, free), spacing: block instanceof HTMLElement && free.spacing?.length ? spacingOn(block, float.scale, free.spacing) : undefined });
}

/** The guides of a free move in screen px (the canvas's red smart guides). */
function freeGuides(float: FloatMove, free: NonNullable<FloatMove["free"]>) {
  const block = float.host.offsetParent;
  if (!(block instanceof HTMLElement) || !free.guides.length) return undefined;
  return guidesOn(block, float.scale, free.guides);
}

function followFloat(current: Session, float: FloatMove) {
  if (float.free) { followFree(current, float, float.free, current.keys); return; }
  const dx = (current.pointer.x - current.start.x) / float.scale;
  const dy = (current.pointer.y - current.start.y) / float.scale;
  float.insets = [];
  const shift = { x: 0, y: 0 };
  for (const axis of ["x", "y"] as const) {
    const pin = float.pins[axis];
    if (pin === "center") continue;
    const delta = axis === "x" ? dx : dy;
    const [startProp, endProp] = axis === "x" ? ["insetLeft", "insetRight"] : ["insetTop", "insetBottom"];
    const reads = pin === "stretch" ? ["start", "end"] as const : [pin] as const;
    for (const side of reads) {
      const was = side === "start" ? float.start[axis] : float.end[axis];
      const snapped = snap(side === "start" ? was + delta : was - delta, float.ladder);
      float.insets.push({ prop: side === "start" ? startProp : endProp, snap: snapped, was: snap(was, float.ladder) });
      // The preview sits at the snapped place (the first edge read decides the shift of a stretched axis).
      if (side === reads[0]) shift[axis] = side === "start" ? snapped.px - was : was - snapped.px;
    }
  }
  if (!current.refusal) float.host.style.setProperty("translate", `${shift.x}px ${shift.y}px`);
  current.target = null;
  const changed = float.insets.filter((inset) => inset.snap.key !== inset.was.key);
  const clamped = float.insets.some((inset) => inset.snap.clamped);
  publish({ line: null, into: null, pointer: current.pointer, label: current.refusal ?? (changed.length ? `${changed.map(snapText).join(" · ")}${clamped ? ` · offsets stop at ${ladderName("4xl")}` : ""}` : null), tone: current.refusal ? "negative" : "info" });
}

/** Writes the moved insets of a floating layer (one edit; an inset back at `none` is removed). */
async function dropFloat(float: FloatMove) {
  const changed = float.insets.filter((inset) => inset.snap.key !== inset.was.key);
  const at = parseSrc(float.target.src);
  if (!changed.length || !at) return;
  const element = await studioApi.element(at.file, at.loc);
  if (!element) { announceEditStatus({ kind: "error", message: `${float.target.name} is no longer there — select it again`, at: Date.now() }); return; }
  // A free frame's layer writes px (Figma's X / Y); one inside auto layout its token steps.
  const ops: EditOp[] = changed.map((inset) => (float.free
    ? { op: "setProp", name: inset.prop, value: { kind: "number", value: inset.snap.px } }
    : inset.snap.key === "none" ? { op: "removeProp", name: inset.prop } : { op: "setProp", name: inset.prop, value: { kind: "string", value: inset.snap.key } }));
  const label = float.free ? changed.map((inset) => `${inset.prop === "insetLeft" ? "X" : inset.prop === "insetTop" ? "Y" : inset.prop} ${inset.snap.px}`).join(", ") : changed.map(snapText).join(", ");
  await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops, hash: element.hash }, `Move ${float.target.name} · ${label}`);
}

/** Pans the canvas while the pointer stays near its edges. */
function edgePan(current: Session) {
  cancelAnimationFrame(current.pan);
  const tick = () => {
    if (session !== current || !current.dragging) return;
    // Edge pan at the edges of the visible canvas (the floating side panels cover the rest).
    const client = getViewportBox();
    const safe = getSafeBox();
    const box = { left: client.left + safe.x, top: client.top + safe.y, width: safe.width, height: safe.height };
    const { x, y } = current.pointer;
    const speed = (distance: number) => (distance < EDGE ? Math.ceil((EDGE - distance) / 3) : 0);
    const dx = speed(x - box.left) ? -speed(x - box.left) : speed(box.left + box.width - x);
    const dy = speed(y - box.top) ? -speed(y - box.top) : speed(box.top + box.height - y);
    if (dx || dy) {
      panBy(dx, dy);
      follow(current);
    }
    current.pan = requestAnimationFrame(tick);
  };
  current.pan = requestAnimationFrame(tick);
}

function end(commit: boolean) {
  const current = session;
  if (!current) return;
  session = null;
  window.removeEventListener("pointermove", onMove, true);
  window.removeEventListener("pointerup", onUp, true);
  window.removeEventListener("pointercancel", onCancel, true);
  window.removeEventListener("keydown", onKey, true);
  window.removeEventListener("keyup", onKey, true);
  window.removeEventListener("blur", onCancel);
  cancelAnimationFrame(current.pan);
  publish(null);
  if (!current.dragging) {
    if (commit) current.deferred?.();
    return;
  }
  drop(current);
  if (current.group) {
    const { items, shift } = current.group;
    if (commit && !current.refusal && (shift.x || shift.y)) void writeMoves(items, items.map(() => ({ dx: shift.x, dy: shift.y })), `Move ${items.length} layers · X ${shift.x >= 0 ? "+" : ""}${shift.x}, Y ${shift.y >= 0 ? "+" : ""}${shift.y}`, true);
    return;
  }
  if (current.float) {
    if (commit && !current.refusal) void dropFloat(current.float);
    return;
  }
  const target = current.target;
  if (!commit || !target || target.noop || current.refusal) return;
  if (current.layers) void moveLayersTo(target, current.copy, current.layers);
  else void moveLayer(current.layer, target, current.copy);
}

function onMove(event: PointerEvent) {
  const current = session;
  if (!current) return;
  current.pointer = { x: event.clientX, y: event.clientY };
  current.keys = { shift: event.shiftKey, mod: event.metaKey || event.ctrlKey };
  if (!current.dragging) {
    if (Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y) < THRESHOLD) return;
    current.dragging = true;
    // A floating layer (or several) only changes props (its insets): no structural check, no pan (the offsets follow the
    // pointer).
    if (current.float || current.group) {
      lift(current);
      event.stopPropagation();
      event.preventDefault();
      follow(current);
      return;
    }
    const all: NodeSelection[] = current.layers ? current.layers.map((layer) => ({ kind: "node", ...layer })) : [current.layer];
    const check = all.map((layer) => ({ layer, check: canStructurallyEdit(layer) })).find((entry) => !entry.check.ok);
    current.refusal = check && !check.check.ok ? (current.layers ? `${check.layer.name}: ${check.check.reason}` : check.check.reason) : null;
    if (!current.refusal) {
      lift(current);
      // What the source says about its place (a .map row, a condition, a function's root) puts it back with the reason.
      void Promise.all(all.map((layer) => structuralBlock(layer, "move"))).then((blocks) => blocks.find(Boolean) ?? null).then((block) => {
        if (!block || session !== current || !current.dragging) return;
        current.refusal = block;
        drop(current);
        follow(current);
      });
    }
    edgePan(current);
  }
  // The capture layer's hover stays out of the gesture.
  event.stopPropagation();
  event.preventDefault();
  current.copy = event.altKey;
  follow(current);
}

function onUp(event: PointerEvent) {
  if (!session) return;
  if (session.dragging) { event.stopPropagation(); event.preventDefault(); }
  session.copy = event.altKey;
  end(true);
}

function onCancel() { end(false); }

function onKey(event: KeyboardEvent) {
  const current = session;
  if (!current) return;
  if (event.key === "Escape" && event.type === "keydown" && current.dragging) {
    event.preventDefault();
    event.stopImmediatePropagation();
    end(false);
    return;
  }
  if (event.key === "Alt" && current.dragging) {
    current.copy = event.type === "keydown";
    follow(current);
  }
  // ⇧ and ⌘ change a free move mid-drag (one axis, no snapping), as Figma's.
  if (["Shift", "Meta", "Control"].includes(event.key) && current.dragging && (current.float?.free || current.group)) {
    current.keys = { shift: event.shiftKey, mod: event.metaKey || event.ctrlKey };
    follow(current);
  }
}

/**
 * A press on `picked` in the Select tool (SelectionLayer). Returns true when it takes the press: `select` (what the
 * press would do: select `picked`) runs at once, or at release when the press was inside the selected layer and the
 * pointer did not move (that layer is what a drag moves). False: SelectionLayer handles the press itself.
 */
export function pressLayer(event: PointerEvent, picked: FiberHit, select: () => void): boolean {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.detail > 1 || session) return false;
  const state = studioStore.getState();
  const world = canvasApi.getWorldElement();
  if (!world || state.tool !== "select" || state.presenting || textEditSession.get()) return false;
  if (!picked.hosts[0] || !world.contains(picked.hosts[0])) return false;
  // On the background of a layout that is not selected (no child layer under the pointer): a marquee inside it, as on a
  // Figma frame (⇧ adds to the selection); a click still selects it (⇧: toggles it).
  const selectedNow = state.selection?.kind === "node" && state.selection.src === picked.src;
  if (!selectedNow && isDropContainer(picked) && !childHits(picked).some((kid) => { const r = rectOf(kid.hosts); return Boolean(r && event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom); })) {
    return startMarquee(event, select);
  }
  if (event.shiftKey || !canEdit(state)) return false;
  let hit: FiberHit | null = null;
  let deferred: (() => void) | null = null;
  const current = state.selection;
  // Several layers selected and the press inside one of them: they drag together (a click without moving selects what
  // is under the pointer, as in Figma).
  const extras = multiSelection.get();
  if (extras.length && current?.kind === "node" && !current.part) {
    const layers = selectedLayers();
    const pressed = picked.hosts[0];
    const inside = layers.find((layer) => (findBySrc(world, layer.src)[layer.instance] ?? null)?.hosts.some((host) => host === pressed || host.contains(pressed)));
    if (!inside) return false;
    // Every selected layer floats: they move together by the px (Figma's move of a selection), not reordered.
    const items = floatingItems(layers);
    if (typeof items !== "string" && items.length) return armGroup(event, world, layers, items, select);
    return armMulti(event, world, layers, select);
  }
  if (current?.kind === "node" && !current.part && current.src !== picked.src && !extras.length) {
    const hits = findBySrc(world, current.src);
    const own = hits[current.instance] ?? hits[0];
    const pressed = picked.hosts[0];
    if (own && own.hosts.some((host) => host !== pressed && host.contains(pressed))) {
      hit = own;
      deferred = select;
    }
  }
  if (!hit) {
    select();
    const now = studioStore.getState().selection;
    if (now?.kind !== "node" || now.part || now.src !== picked.src || multiSelection.get().length) return true;
    hit = picked;
  }
  const layer = studioStore.getState().selection;
  const moving: NodeSelection | null = deferred && current?.kind === "node" ? { ...current, kind: "node" } : layer?.kind === "node" ? layer : null;
  if (!moving) return true;
  const own = liftable(hit.hosts);
  if (!own.length) return true;
  const frame = own[0].closest("[data-studio-frame]");
  const float = own.length === 1 ? floatOf(own[0], moving) : null;
  if (float) {
    begin(event, { layer: moving, layers: null, hit, hosts: [float.host], frame, deferred, float });
    return true;
  }
  // The layer's other renders in this frame (.map rows, a helper component used twice) move with its code: they follow too.
  const twins = findBySrc(world, hit.src).filter((other) => other !== hit && other.hosts[0]?.closest("[data-studio-frame]") === frame).flatMap((other) => liftable(other.hosts));
  begin(event, { layer: moving, layers: null, hit, hosts: [...own, ...twins.filter((host) => !own.includes(host))], frame, deferred, float: null });
  return true;
}

const liftable = (hosts: Element[]) => hosts.filter((host): host is HTMLElement => host instanceof HTMLElement && host.isConnected);

/** Arms a drag of every selected layer (the primary is `layers[0]`); a release without moving runs `select`. */
function armMulti(event: PointerEvent, world: Element, layers: ExtraLayer[], select: () => void): boolean {
  const hits = layers.map((layer) => findBySrc(world, layer.src)[layer.instance] ?? null);
  const primary = hits[0];
  if (!primary) return false;
  const frame = primary.hosts[0]?.closest("[data-studio-frame]") ?? null;
  const hosts = [...new Set(hits.flatMap((hit) => (hit ? liftable(hit.hosts) : [])))];
  if (!hosts.length) return false;
  begin(event, { layer: { kind: "node", ...layers[0] }, layers, hit: primary, hosts, frame, deferred: select, float: null });
  return true;
}

/**
 * Arms a move of several floating layers: they follow the pointer by the px, the box around them all snapping to their
 * free frame's edges and centres and its other layers' (when they share one frame; ⌘: no snapping, ⇧: one axis); the
 * drop writes each layer's offsets in one edit (edit/alignLayers.ts).
 */
function armGroup(event: PointerEvent, world: Element, layers: ExtraLayer[], items: FloatingItem[], select: () => void): boolean {
  const primary = findBySrc(world, layers[0].src)[layers[0].instance];
  if (!primary) return false;
  const block = items.every((item) => item.block === items[0].block) ? items[0].block : null;
  const outer = items[0].block.getBoundingClientRect();
  const scale = items[0].block.offsetWidth ? outer.width / items[0].block.offsetWidth || 1 : 1;
  const free = block && items.every((item) => item.host.parentElement?.matches(FREE_FRAME) && !(item.host.parentElement.matches('.zen-box[data-position="absolute"]') && item.host.parentElement.children.length === 1));
  const others = free && block ? freeFrameBoxes(items.map((item) => item.host), block, scale) : null;
  const left = Math.min(...items.map((item) => item.offset.left));
  const top = Math.min(...items.map((item) => item.offset.top));
  const union = { x: left, y: top, width: Math.max(...items.map((item) => item.offset.left + item.box.width)) - left, height: Math.max(...items.map((item) => item.offset.top + item.box.height)) - top };
  const group: GroupMove = { items, block, scale, others, union, shift: { x: 0, y: 0 }, guides: [], spacing: [] };
  begin(event, { layer: { kind: "node", ...layers[0] }, layers, hit: primary, hosts: items.map((item) => item.host), frame: primary.hosts[0]?.closest("[data-studio-frame]") ?? null, deferred: select, float: null, group });
  return true;
}

/** Several floating layers following the pointer by the px (Figma's move of a selection). */
function followGroup(current: Session, group: GroupMove) {
  let dx = (current.pointer.x - current.start.x) / group.scale;
  let dy = (current.pointer.y - current.start.y) / group.scale;
  if (current.keys.shift) { if (Math.abs(dx) >= Math.abs(dy)) dy = 0; else dx = 0; }
  group.guides = [];
  group.spacing = [];
  if (group.others && !current.keys.mod) {
    const threshold = SNAP_PX / (getViewport().zoom || 1);
    const snap = snapAndSpace({ ...group.union, x: group.union.x + dx, y: group.union.y + dy }, group.others, threshold);
    dx += snap.dx;
    dy += snap.dy;
    group.guides = snap.guides;
    group.spacing = snap.spacing;
  }
  group.shift = { x: Math.round(dx), y: Math.round(dy) };
  if (!current.refusal) for (const item of group.items) item.host.style.setProperty("translate", `${group.shift.x}px ${group.shift.y}px`);
  current.target = null;
  const guides = group.block && group.guides.length ? guidesOn(group.block, group.scale, group.guides) : undefined;
  const spacing = group.block && group.spacing.length ? spacingOn(group.block, group.scale, group.spacing) : undefined;
  publish({ line: null, into: null, pointer: current.pointer, label: current.refusal ?? `X ${group.shift.x >= 0 ? "+" : ""}${group.shift.x}, Y ${group.shift.y >= 0 ? "+" : ""}${group.shift.y}`, tone: current.refusal ? "negative" : "info", guides, spacing });
}

/** Snap guides measured in a block's unscaled px, as screen px (the canvas's red smart guides; a resize's too). */
export function guidesOn(block: HTMLElement, scale: number, guides: readonly SnapGuide[]) {
  const outer = block.getBoundingClientRect();
  const at = (x: number, y: number) => ({ x: outer.left + (x + block.clientLeft) * scale, y: outer.top + (y + block.clientTop) * scale });
  return guides.map((guide) => {
    const from = guide.axis === "x" ? at(guide.at, guide.from) : at(guide.from, guide.at);
    const length = (guide.to - guide.from) * scale;
    return guide.axis === "x" ? { x: from.x, y: from.y, w: 1, h: length } : { x: from.x, y: from.y, w: length, h: 1 };
  });
}

/**
 * A free move's snap (Figma's): per axis the nearer of an edge / centre snap (red guides) and an equal-spacing snap (pink
 * marks with their px), within `threshold`.
 */
function snapAndSpace(box: FrameBox, others: readonly FrameBox[], threshold: number): { dx: number; dy: number; guides: SnapGuide[]; spacing: SpacingMark[] } {
  const edges = snapBox(box, others, threshold);
  const spacing = equalSpacing(box, others, threshold);
  const take = (axis: "x" | "y") => {
    const edge = edges.guides.some((guide) => guide.axis === axis);
    const space = spacing.marks.some((mark) => mark.axis === axis);
    const edgeDelta = axis === "x" ? edges.dx : edges.dy;
    const spaceDelta = axis === "x" ? spacing.dx : spacing.dy;
    return space && (!edge || Math.abs(spaceDelta) <= Math.abs(edgeDelta)) ? "space" : edge ? "edge" : null;
  };
  const x = take("x");
  const y = take("y");
  return {
    dx: x === "space" ? spacing.dx : x === "edge" ? edges.dx : 0,
    dy: y === "space" ? spacing.dy : y === "edge" ? edges.dy : 0,
    guides: edges.guides.filter((guide) => (guide.axis === "x" ? x : y) === "edge"),
    spacing: spacing.marks.filter((mark) => (mark.axis === "x" ? x : y) === "space"),
  };
}

/** Equal-spacing marks measured in a block's unscaled px, as screen px with their labels (Figma's pink gaps). */
function spacingOn(block: HTMLElement, scale: number, marks: SpacingMark[]) {
  const outer = block.getBoundingClientRect();
  const at = (x: number, y: number) => ({ x: outer.left + (x + block.clientLeft) * scale, y: outer.top + (y + block.clientTop) * scale });
  return marks.map((mark) => {
    const from = mark.axis === "x" ? at(mark.from, mark.at) : at(mark.at, mark.from);
    const length = (mark.to - mark.from) * scale;
    return mark.axis === "x" ? { x: from.x, y: from.y, w: length, h: 1, axis: mark.axis, label: String(mark.gap) } : { x: from.x, y: from.y, w: 1, h: length, axis: mark.axis, label: String(mark.gap) };
  });
}

function begin(event: PointerEvent, from: Pick<Session, "layer" | "layers" | "hit" | "hosts" | "frame" | "deferred" | "float"> & Partial<Pick<Session, "group">>) {
  const start = { x: event.clientX, y: event.clientY };
  session = {
    ...from,
    origins: new Map(from.hosts.map((host) => [host, host.getBoundingClientRect()])),
    parentHost: parentHit(from.hit, from.frame)?.hosts[0] ?? null,
    origin: rectOf(liftable(from.hit.hosts)),
    start,
    startWorld: toWorld(start),
    pointer: start,
    keys: { shift: event.shiftKey, mod: event.metaKey || event.ctrlKey },
    dragging: false,
    copy: false,
    refusal: null,
    target: null,
    saved: [],
    pan: 0,
  };
  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onCancel, true);
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("keyup", onKey, true);
  window.addEventListener("blur", onCancel);
}

/** True while a layer drag is under way (the overlay and the selection keep out of its way). */
export const isDraggingLayer = () => Boolean(session?.dragging);
