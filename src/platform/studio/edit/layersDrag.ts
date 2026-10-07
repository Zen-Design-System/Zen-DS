import { typographyStyles } from "../../../tokens/typography.generated";
import { canvasApi } from "../canvas/viewport";
import { frameOf, panelOf, parentHit, selectHit, type FiberHit } from "../select/picker";
import { multiSelection } from "../select/multiSelection";
import { canStructurallyEdit, structuralBlock } from "../slots/actions";
import { canEdit, studioStore } from "../store";
import { moveLayer, type DropTarget, type NodeSelection } from "./arrange";
import { isDropContainer } from "./drag";

/*
 * Drag and drop in the Layers panel, Figma-like (docs/research/studio-figma-editing-plan-2026-10-03.md, Phase 5): drag a
 * layer row; a line between rows shows where it lands (before / after the row under the pointer, at that row's depth),
 * the middle of a layout row (Stack, Grid, Box, Card, Form parts…) puts it inside, last. Drop writes op moveTo (one
 * undo step), ⌥ drops a copy, Esc cancels, the list scrolls near its edges. Same rules as dragging on the canvas:
 * within the layer's example, names checked where it lands.
 */

type Resolve = (row: Element) => FiberHit | null;
type Place = { target: DropTarget; row: Element; mode: "before" | "after" | "into" };

type Session = {
  tree: HTMLElement;
  row: Element;
  hit: FiberHit;
  layer: NodeSelection | null;
  resolve: Resolve;
  start: { x: number; y: number };
  pointer: { x: number; y: number };
  dragging: boolean;
  copy: boolean;
  refusal: string | null;
  place: Place | null;
  marker: HTMLDivElement | null;
  scroll: number;
};

let session: Session | null = null;

const ROW = "[role='treeitem'][data-kind='node']";
const sameHost = (a: FiberHit | null, b: FiberHit | null) => Boolean(a && b && a.hosts[0] && a.hosts[0] === b.hosts[0]);
const inside = (outer: FiberHit, inner: FiberHit) => outer.hosts.some((host) => inner.hosts[0] && (host === inner.hosts[0] || host.contains(inner.hosts[0])));

function targetFor(hit: FiberHit, parent: FiberHit, mode: Place["mode"], current: Session): DropTarget {
  const target: DropTarget = { parentSrc: parent.src, parentName: parent.name, frameId: frameOf(parent.hosts[0]), panelId: panelOf(parent.hosts[0]) };
  if (mode === "before") target.before = hit.src;
  else if (mode === "after") target.after = hit.src;
  target.reparent = !sameHost(parentHit(current.hit, current.hit.hosts[0]?.closest("[data-studio-frame]") ?? null), parent);
  return target;
}

/** The place under the pointer, or a reason; null when nothing is there. */
function placeAt(current: Session): Place | string | null {
  const element = document.elementFromPoint(current.pointer.x, current.pointer.y)?.closest(ROW) ?? null;
  if (!element || !current.tree.contains(element)) return null;
  const hit = current.resolve(element);
  if (!hit || !hit.src) return null;
  const frame = hit.hosts[0]?.closest("[data-studio-frame]") ?? null;
  if (frame !== (current.hit.hosts[0]?.closest("[data-studio-frame]") ?? null)) return "Layers move within their own example";
  if (inside(current.hit, hit)) return sameHost(current.hit, hit) ? null : "A layer cannot go inside itself";
  const rect = element.getBoundingClientRect();
  const offset = (current.pointer.y - rect.top) / Math.max(1, rect.height);
  const container = isDropContainer(hit);
  const mode: Place["mode"] = container && offset > 0.25 && offset < 0.75 ? "into" : offset < 0.5 ? "before" : "after";
  if (mode === "into") return { target: { parentSrc: hit.src, parentName: hit.name, frameId: frameOf(hit.hosts[0]), panelId: panelOf(hit.hosts[0]), reparent: !sameHost(parentHit(current.hit, frame), hit) }, row: element, mode };
  const parent = parentHit(hit, frame);
  if (!parent || !parent.src) return "Drop inside a layer, not beside the example itself";
  return { target: targetFor(hit, parent, mode, current), row: element, mode };
}

function draw(current: Session) {
  const marker = current.marker;
  if (!marker) return;
  const place = current.place;
  if (!place || current.refusal) {
    marker.hidden = !current.refusal;
    if (current.refusal) {
      marker.dataset.mode = "refused";
      marker.textContent = current.refusal;
      marker.style.transform = `translate(${current.pointer.x - current.tree.getBoundingClientRect().left + 12}px, ${current.pointer.y - current.tree.getBoundingClientRect().top + current.tree.scrollTop + 12}px)`;
      marker.style.width = "";
    }
    return;
  }
  const tree = current.tree.getBoundingClientRect();
  const row = place.row.getBoundingClientRect();
  const depth = Number(getComputedStyle(place.row).getPropertyValue("--studio-depth")) || 0;
  const indent = Math.min(row.width - 24, 12 + depth * 12 + (place.mode === "into" ? 12 : 0));
  marker.hidden = false;
  marker.textContent = "";
  marker.dataset.mode = place.mode;
  marker.dataset.copy = current.copy ? "true" : "false";
  const top = place.mode === "into" ? row.top : place.mode === "before" ? row.top - 1 : row.bottom - 1;
  marker.style.transform = `translate(${row.left - tree.left + (place.mode === "into" ? 0 : indent)}px, ${top - tree.top + current.tree.scrollTop}px)`;
  marker.style.width = `${place.mode === "into" ? row.width : row.width - indent}px`;
  marker.style.height = place.mode === "into" ? `${row.height}px` : "";
}

function follow(current: Session) {
  const place = current.refusal ? null : placeAt(current);
  current.place = place && typeof place !== "string" ? place : null;
  if (typeof place === "string") {
    current.place = null;
    const marker = current.marker;
    if (marker) {
      marker.hidden = false;
      marker.dataset.mode = "refused";
      marker.textContent = place;
      const tree = current.tree.getBoundingClientRect();
      marker.style.transform = `translate(${current.pointer.x - tree.left + 12}px, ${current.pointer.y - tree.top + current.tree.scrollTop + 12}px)`;
      marker.style.width = "";
      marker.style.height = "";
    }
    return;
  }
  draw(current);
}

function autoScroll(current: Session) {
  const tick = () => {
    if (session !== current || !current.dragging) return;
    const box = current.tree.getBoundingClientRect();
    const edge = 24;
    const dy = current.pointer.y < box.top + edge ? -6 : current.pointer.y > box.bottom - edge ? 6 : 0;
    if (dy) { current.tree.scrollTop += dy; follow(current); }
    current.scroll = window.setTimeout(tick, 16);
  };
  current.scroll = window.setTimeout(tick, 16);
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
  window.clearTimeout(current.scroll);
  current.marker?.remove();
  current.tree.removeAttribute("data-dropping");
  if (!current.dragging) return;
  // The click that ends a drag must not also select the row it is released on.
  const swallow = (event: MouseEvent) => { event.stopPropagation(); event.preventDefault(); };
  window.addEventListener("click", swallow, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
  const place = current.place;
  if (commit && place && current.layer && !current.refusal) void moveLayer(current.layer, place.target, current.copy);
}

function onMove(event: PointerEvent) {
  const current = session;
  if (!current) return;
  current.pointer = { x: event.clientX, y: event.clientY };
  if (!current.dragging) {
    if (Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y) < 4) return;
    current.dragging = true;
    // Figma selects the row it drags.
    const world = canvasApi.getWorldElement();
    if (world) { multiSelection.clear(); selectHit(current.hit, world); }
    const selection = studioStore.getState().selection;
    current.layer = selection?.kind === "node" && !selection.part ? selection : null;
    const check = current.layer ? canStructurallyEdit(current.layer) : { ok: false as const, reason: "Select a layer first" };
    current.refusal = check.ok ? null : check.reason;
    if (current.layer && !current.refusal) {
      const layer = current.layer;
      void structuralBlock(layer, "move").then((block) => { if (block && session === current) { current.refusal = block; follow(current); } });
    }
    current.tree.setAttribute("data-dropping", "");
    const marker = document.createElement("div");
    marker.className = `studio-layers-drop ${typographyStyles["Caption/Medium"]}`;
    marker.setAttribute("aria-hidden", "true");
    current.tree.append(marker);
    current.marker = marker;
    autoScroll(current);
  }
  event.preventDefault();
  current.copy = event.altKey;
  follow(current);
}

function onUp(event: PointerEvent) {
  if (!session) return;
  session.copy = event.altKey;
  end(true);
}

function onCancel() { end(false); }

function onKey(event: KeyboardEvent) {
  const current = session;
  if (!current?.dragging) return;
  if (event.key === "Escape" && event.type === "keydown") {
    event.preventDefault();
    event.stopImmediatePropagation();
    end(false);
  } else if (event.key === "Alt") {
    current.copy = event.type === "keydown";
    draw(current);
  }
}

/**
 * A press in the Layers tree (LayersPanel's onPointerDown): arms a drag of the layer row under it. `resolve` gives a
 * row's canvas element (LayersPanel's hitForNode). Never takes the press itself: a click still selects and toggles.
 */
export function pressLayersRow(event: PointerEvent, tree: HTMLElement, resolve: Resolve) {
  if (event.button !== 0 || event.shiftKey || event.metaKey || event.ctrlKey || session) return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target || target.closest(".studio-layers__chevron")) return;
  const row = target.closest(ROW);
  if (!row || !tree.contains(row)) return;
  const state = studioStore.getState();
  if (state.tool !== "select" || state.presenting || !canEdit(state)) return;
  const hit = resolve(row);
  if (!hit?.src || !hit.hosts[0]?.closest(".studio-world")) return;
  session = {
    tree, row, hit, layer: null, resolve,
    start: { x: event.clientX, y: event.clientY },
    pointer: { x: event.clientX, y: event.clientY },
    dragging: false, copy: false, refusal: null, place: null, marker: null, scroll: 0,
  };
  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onCancel, true);
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("keyup", onKey, true);
  window.addEventListener("blur", onCancel);
}
