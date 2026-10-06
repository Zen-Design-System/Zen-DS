import { useSyncExternalStore } from "react";
import { canvasApi, getViewport, getViewportBox, panBy } from "../canvas/viewport";
import { annotatedAt, childHits, findBySrc, frameOf, panelOf, parentHit, rectOf, type FiberHit } from "../select/picker";
import { multiSelection } from "../select/multiSelection";
import { canStructurallyEdit, structuralBlock } from "../slots/actions";
import { canEdit, studioStore } from "../store";
import { moveLayer, type DropTarget, type NodeSelection } from "./arrange";
import { startMarquee } from "./marquee";
import { textEditSession } from "./textEdit";

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
 */

/** What the overlay draws (client coordinates). */
export type DragView = {
  line: { x: number; y: number; w: number; h: number } | null;
  into: { x: number; y: number; w: number; h: number } | null;
  pointer: { x: number; y: number };
  label: string | null;
  tone: "info" | "negative";
} | null;

let view: DragView = null;
const listeners = new Set<() => void>();
const publish = (next: DragView) => { view = next; listeners.forEach((listener) => listener()); };
/** Draws a drag's overlay (DragLayer): also used by a drag from Assets. */
export const publishDragView = publish;
export const useDragView = () => useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => view, () => null);

/** Components and host tags a layer can be dropped into (they take element children). */
const DROP_COMPONENTS = new Set(["Stack", "Grid", "Box", "Container", "Card", "Form", "FormFieldset", "FormActions"]);
const DROP_TAGS = new Set(["div", "section", "article", "aside", "header", "footer", "main", "nav", "ul", "ol", "li", "form", "fieldset", "figure", "td"]);
const THRESHOLD = 4;
const EDGE = 32;

type Target = DropTarget & { noop: boolean; line: NonNullable<DragView>["line"]; into: NonNullable<DragView>["into"] };

type Session = {
  layer: NodeSelection;
  hit: FiberHit;
  hosts: HTMLElement[];
  frame: Element | null;
  /** The first DOM node of the layer's parent: while the pointer is inside it, the layer stays there (Figma). */
  parentHost: Element | null;
  origin: DOMRect | null;
  start: { x: number; y: number };
  startWorld: { x: number; y: number };
  pointer: { x: number; y: number };
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
export const isDropContainer = (hit: FiberHit) => Boolean(hit.hosts[0]) && (DROP_COMPONENTS.has(nameOfHit(hit)) || DROP_TAGS.has(hit.name));

type Axis = "row" | "column" | "grid";
function axisOf(hit: FiberHit): Axis {
  const host = hit.hosts[0];
  if (!(host instanceof HTMLElement)) return "column";
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
export type DropContext = { hosts: Element[]; frame: Element | null | undefined; parentHost: Element | null; origin: DOMRect | null; layerSrc: string | null; copy: boolean };

/** The container's child layers in order; consecutive renders of one JSX element (a .map) form one unit. */
function unitsOf(container: FiberHit, ctx: DropContext): Unit[] {
  const units: Unit[] = [];
  for (const kid of childHits(container)) {
    const dragged = Boolean(ctx.layerSrc && kid.src === ctx.layerSrc && kid.hosts[0] === ctx.hosts[0]);
    const rect = dragged ? ctx.origin : rectOf(kid.hosts);
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
  const own = units.findIndex((unit) => unit.dragged);
  const noop = own >= 0 && (index === own || index === own + 1) && !ctx.copy;
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
  if (current.frame !== undefined && frame !== current.frame) return { target: null, reason: "Layers move within their own example" };
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
    return { target: insertion(candidate, x, y, ctx), reason: null };
  }
  return { target: null, reason: null };
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
  const world = toWorld(current.pointer);
  const dx = world.x - current.startWorld.x;
  const dy = world.y - current.startWorld.y;
  if (!current.refusal) for (const host of current.hosts) host.style.setProperty("translate", `${dx}px ${dy}px`);
  const context: DropContext = { hosts: current.hosts, frame: current.frame, parentHost: current.parentHost, origin: current.origin, layerSrc: current.layer.src, copy: current.copy };
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

/** Pans the canvas while the pointer stays near its edges. */
function edgePan(current: Session) {
  cancelAnimationFrame(current.pan);
  const tick = () => {
    if (session !== current || !current.dragging) return;
    const box = getViewportBox();
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
  const target = current.target;
  if (commit && target && !target.noop && !current.refusal) void moveLayer(current.layer, target, current.copy);
}

function onMove(event: PointerEvent) {
  const current = session;
  if (!current) return;
  current.pointer = { x: event.clientX, y: event.clientY };
  if (!current.dragging) {
    if (Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y) < THRESHOLD) return;
    current.dragging = true;
    const check = canStructurallyEdit(current.layer);
    current.refusal = check.ok ? null : check.reason;
    if (!current.refusal) {
      lift(current);
      // What the source says about its place (a .map row, a condition, a function's root) puts it back with the reason.
      void structuralBlock(current.layer, "move").then((block) => {
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
  if (current?.kind === "node" && !current.part && current.src !== picked.src && !multiSelection.get().length) {
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
  const hosts = hit.hosts.filter((host): host is HTMLElement => host instanceof HTMLElement && host.isConnected);
  if (!hosts.length) return true;
  const frame = hosts[0].closest("[data-studio-frame]");
  const start = { x: event.clientX, y: event.clientY };
  session = {
    layer: moving,
    hit,
    hosts,
    frame,
    parentHost: parentHit(hit, frame)?.hosts[0] ?? null,
    origin: rectOf(hosts),
    start,
    startWorld: toWorld(start),
    pointer: start,
    dragging: false,
    copy: false,
    refusal: null,
    target: null,
    deferred,
    saved: [],
    pan: 0,
  };
  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onCancel, true);
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("keyup", onKey, true);
  window.addEventListener("blur", onCancel);
  return true;
}

/** True while a layer drag is under way (the overlay and the selection keep out of its way). */
export const isDraggingLayer = () => Boolean(session?.dragging);
