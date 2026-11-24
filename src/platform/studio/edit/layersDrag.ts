import { typographyStyles } from "../../../tokens/typography.generated";
import { canvasApi } from "../canvas/viewport";
import { annotatedAt, findBySrc, frameOf, panelOf, parentHit, rectOf, selectHit, type FiberHit } from "../select/picker";
import { parseSrc } from "../api";
import { boardPlaceAt } from "../builder/frameMove";
import { frameNodeOf } from "../builder/frameEdit";
import { looseFrameOf } from "../builder/looseLayer";
import { freeDropAt, moveManyToCanvas, moveToCanvas } from "./reparent";
import { isLayerSelected, layerOfHit, multiSelection, selectedLayers, type ExtraLayer } from "../select/multiSelection";
import { canStructurallyEdit, isFloatWrapper, structuralBlock } from "../slots/actions";
import { canEdit, studioStore } from "../store";
import { moveLayer, type DropTarget, type NodeSelection } from "./arrange";
import { isDropContainer, sameDropScope } from "./drag";
import { moveLayersTo } from "./multi";

/*
 * Drag and drop in the Layers panel, Figma-like (docs/research/studio-figma-editing-plan-2026-10-03.md, Phase 5): drag a
 * layer row; a line between rows shows where it lands (before / after the row under the pointer, at that row's depth),
 * the middle of a layout row (Stack, Grid, Box, Card, Form parts…) puts it inside, last. Drop writes op moveTo (one
 * undo step), ⌥ drops a copy, Esc cancels, the list scrolls near its edges. Same rules as dragging on the canvas:
 * within the layer's example, names checked where it lands. A row of a multi-selection drags every selected layer
 * (op many moveTo, edit/multi.ts moveLayersTo), as the canvas does.
 * On a page you made (loose layers PR4, user 2026-11-22): a row dropped above or below a frame's row, or beside a layer
 * on the canvas, leaves its frame for the canvas (Figma's top level), a layer on the canvas where it shows; a layer on
 * the canvas dropped into a frame without auto layout keeps where it shows there.
 */

type Resolve = (row: Element) => FiberHit | null;
/** `board`: onto the canvas beside the frame or layer on the canvas `frameId`, `side` of its element in the code. */
type Place = { target: DropTarget; row: Element; mode: "before" | "after" | "into"; board?: { frameId: string; side: "before" | "after" } };

type Session = {
  tree: HTMLElement;
  row: Element;
  hit: FiberHit;
  layer: NodeSelection | null;
  /** Several selected layers dragged together (the primary first) and their canvas hits, else null. */
  layers: { all: ExtraLayer[]; hits: FiberHit[] } | null;
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

/**
 * The layer as its frame holds it: the Box that floats it in a frame without auto layout (Layers folds that Box into the
 * layer's row), else the layer. A row's place is the place of that Box (walk 2026-10-29 W-17: a drop beside a free
 * field went into the other field's Box, or was refused as "already there").
 */
function outerHit(hit: FiberHit): FiberHit {
  const host = hit.hosts[0];
  const box = host?.parentElement;
  if (host instanceof HTMLElement && host.dataset.position !== "absolute" && isFloatWrapper(box)) {
    const wrap = annotatedAt(box);
    if (wrap?.src && wrap.src !== hit.src) return wrap;
  }
  return hit;
}

function targetFor(hit: FiberHit, parent: FiberHit, mode: Place["mode"], current: Session): DropTarget {
  const target: DropTarget = { parentSrc: parent.src, parentName: parent.name, frameId: frameOf(parent.hosts[0]), panelId: panelOf(parent.hosts[0]) };
  // `mode` is where the marker shows (above / below the row). Layers of a page you made list the front-most layer on top
  // (Figma's order: data-order="front"), so above a row is after it in the code.
  const front = current.tree.getAttribute("data-order") === "front";
  const place = front ? (mode === "before" ? "after" : mode === "after" ? "before" : mode) : mode;
  if (place === "before") target.before = hit.src;
  else if (place === "after") target.after = hit.src;
  target.reparent = !sameHost(parentHit(outerHit(current.hit), current.hit.hosts[0]?.closest("[data-studio-frame]") ?? null), parent);
  return target;
}

/** Whether `target` puts the dragged layer where it already is (right before the layer after it, or after the one before). */
function inPlace(current: Session, target: DropTarget, sibling: FiberHit): boolean {
  if (current.layers) return false;
  const own = outerHit(current.hit).hosts[0];
  const beside = sibling.hosts[0];
  if (!own || !beside) return false;
  return (target.before === sibling.src && beside.previousElementSibling === own) || (target.after === sibling.src && beside.nextElementSibling === own);
}

/** A frame's row in Layers (a Screen, an Overlay of a page you made, an example). */
const FRAME_ROW = "[role='treeitem'][data-kind='frame']";

/**
 * The Screen (or empty Overlay) a page-you-made frame row stands for, as the layer a drop goes into (Figma: a layer
 * dropped on a frame's row in Layers goes into the frame; dnd campaign 2026-10-17). Null for an example's frame.
 */
function frameRowHit(row: Element): FiberHit | null {
  const frameId = row.getAttribute("data-layer-id")?.replace(/^frame:/, "") ?? "";
  if (!/^(screen|overlay):/.test(frameId)) return null;
  const frame = document.querySelector(`[data-studio-frame="${CSS.escape(frameId)}"]`);
  const root = frame?.querySelector(".studio-builder-screen, .studio-builder-overlay") ?? null;
  const hit = root ? annotatedAt(root) : null;
  return hit?.src && isDropContainer(hit) ? hit : null;
}

/** Where on a row the pointer is: 0 at its top, 1 at its bottom. */
const offsetIn = (row: Element, y: number) => { const rect = row.getBoundingClientRect(); return (y - rect.top) / Math.max(1, rect.height); };

/**
 * Onto the canvas beside the frame (or layer on the canvas) `frameId` whose row is `row`, the marker `mode` of it: the
 * Board's order is the code's (Layers of a page you made list the front-most first, so above a row is after it).
 */
function boardPlace(current: Session, row: Element, frameId: string, mode: "before" | "after"): Place | string {
  if (!sameDropScope(current.hit.hosts[0]?.closest("[data-studio-frame]") ?? null, document.querySelector(`[data-studio-frame="${CSS.escape(frameId)}"]`))) return "Layers move within their own example";
  const front = current.tree.getAttribute("data-order") === "front";
  const side = front ? (mode === "before" ? "after" : "before") : mode;
  return { target: { parentSrc: "", parentName: "the canvas", frameId: null, panelId: null, reparent: true }, row, mode, board: { frameId, side } };
}

/** The place under the pointer, or a reason; null when nothing is there. */
function placeAt(current: Session): Place | string | null {
  const under = document.elementFromPoint(current.pointer.x, current.pointer.y);
  const frameRow = under?.closest(FRAME_ROW) ?? null;
  const local = Boolean(studioStore.getState().localPage);
  if (frameRow && current.tree.contains(frameRow)) {
    // Above or below a frame of a page you made: on the canvas beside it (Figma's top level).
    const frameId = frameRow.getAttribute("data-layer-id")?.replace(/^frame:/, "") ?? "";
    const edge = offsetIn(frameRow, current.pointer.y);
    if (local && /^(screen|overlay|section|slice|layer):/.test(frameId) && (edge < 0.25 || edge > 0.75)) return boardPlace(current, frameRow, frameId, edge < 0.5 ? "before" : "after");
    const screen = frameRowHit(frameRow);
    if (!screen) return null;
    const frame = screen.hosts[0]?.closest("[data-studio-frame]") ?? null;
    if (!sameDropScope(current.hit.hosts[0]?.closest("[data-studio-frame]") ?? null, frame)) return "Layers move within their own example";
    return { target: { parentSrc: screen.src, parentName: screen.name, frameId: frameOf(screen.hosts[0]), panelId: panelOf(screen.hosts[0]), reparent: !sameHost(parentHit(current.hit, frame), screen) }, row: frameRow, mode: "into" };
  }
  const element = under?.closest(ROW) ?? null;
  if (!element || !current.tree.contains(element)) return null;
  const hit = current.resolve(element);
  if (!hit || !hit.src) return null;
  const frame = hit.hosts[0]?.closest("[data-studio-frame]") ?? null;
  if (!sameDropScope(current.hit.hosts[0]?.closest("[data-studio-frame]") ?? null, frame)) return "Layers move within their own example";
  if (inside(current.hit, hit)) return sameHost(current.hit, hit) ? null : "A layer cannot go inside itself";
  for (const other of current.layers?.hits ?? []) if (inside(other, hit)) return sameHost(other, hit) ? null : "A layer cannot go inside itself";
  const offset = offsetIn(element, current.pointer.y);
  const container = isDropContainer(hit);
  // A layer on the canvas's row (a top-level row): beside it is the canvas too; into it when it takes layers.
  const loose = local ? looseFrameOf(hit) : null;
  if (loose && !(container && offset > 0.25 && offset < 0.75)) return boardPlace(current, element, loose, offset < 0.5 ? "before" : "after");
  const mode: Place["mode"] = container && offset > 0.25 && offset < 0.75 ? "into" : offset < 0.5 ? "before" : "after";
  if (mode === "into") return { target: { parentSrc: hit.src, parentName: hit.name, frameId: frameOf(hit.hosts[0]), panelId: panelOf(hit.hosts[0]), reparent: !sameHost(parentHit(current.hit, frame), hit) }, row: element, mode };
  const sibling = outerHit(hit);
  const parent = parentHit(sibling, frame);
  if (!parent || !parent.src) return "Drop inside a layer, not beside the example itself";
  const target = targetFor(sibling, parent, mode, current);
  // Figma draws no line where the layer already is, and the drop does nothing.
  if (inPlace(current, target, sibling)) return null;
  return { target, row: element, mode };
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
  if (!commit || !place || !current.layer || current.refusal) return;
  if (place.board) { void rowsToCanvas(current, place.board); return; }
  const free = looseInto(current, place.target);
  if (current.layers) void moveLayersTo(place.target, current.copy, current.layers.all, free ?? {});
  else void moveLayer(current.layer, free?.at ? { ...place.target, at: free.at } : place.target, current.copy);
}

/** Where a layer shows on the board now (board frame px, its corner): its row dropped onto the canvas keeps it there. */
function shownPlace(hit: FiberHit | null | undefined) {
  const rect = hit ? rectOf(hit.hosts) : null;
  return (rect && boardPlaceAt({ x: rect.left, y: rect.top })) || { x: 0, y: 0 };
}

/** The layer as a selection (the element a move writes: the floating Box that places it, else itself). */
const selectionOf = (hit: FiberHit): NodeSelection => ({ kind: "node", src: hit.src, name: hit.name, frameId: frameOf(hit.hosts[0]), panelId: panelOf(hit.hosts[0]), instance: 0 });

/** Rows dropped onto the canvas (Figma's top level): each layer on the canvas where it shows, beside the frame in order. */
async function rowsToCanvas(current: Session, board: NonNullable<Place["board"]>) {
  const { localPage } = studioStore.getState();
  const node = localPage ? await frameNodeOf(localPage, board.frameId) : null;
  if (!node) return;
  const order = board.side === "before" ? { before: node.loc } : { after: node.loc };
  if (current.layers) {
    const outers = current.layers.hits.map(outerHit);
    void moveManyToCanvas(outers.map((hit) => ({ src: hit.src, name: hit.name, frameId: frameOf(hit.hosts[0]), panelId: panelOf(hit.hosts[0]), instance: 0 })), outers.map(shownPlace), current.copy, order);
    return;
  }
  const moving = outerHit(current.hit);
  void moveToCanvas(selectionOf(moving), shownPlace(moving), current.copy, order);
}

/**
 * Layers on the canvas dropped into a frame without auto layout from Layers keep where they show (Figma's): their px
 * there (`at`, or `atByLoc` for several). Null for other layers or a frame with auto layout (they join its flow).
 */
function looseInto(current: Session, target: DropTarget): { at?: { x: number; y: number }; atByLoc?: Record<string, { x: number; y: number }> } | null {
  const hits = current.layers ? current.layers.hits : [current.hit];
  if (!hits.every((hit) => looseFrameOf(hit))) return null;
  const host = findBySrc(canvasApi.getWorldElement() ?? document.body, target.parentSrc)[0]?.hosts[0];
  const corner = (hit: FiberHit) => { const rect = rectOf(hit.hosts); return rect ? { x: rect.left, y: rect.top } : null; };
  const atOf = (hit: FiberHit) => { const at = corner(hit); return at ? freeDropAt(host, at) : null; };
  if (!current.layers) { const at = atOf(current.hit); return at ? { at } : null; }
  const entries = hits.map((hit) => [parseSrc(hit.src)?.loc ?? "", atOf(hit)] as const);
  return entries.every(([, at]) => at) ? { atByLoc: Object.fromEntries(entries) as Record<string, { x: number; y: number }> } : null;
}

function onMove(event: PointerEvent) {
  const current = session;
  if (!current) return;
  current.pointer = { x: event.clientX, y: event.clientY };
  if (!current.dragging) {
    if (Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y) < 4) return;
    current.dragging = true;
    // Figma selects the row it drags; a row of a multi-selection drags every selected layer.
    const world = canvasApi.getWorldElement();
    const several = world && multiSelection.get().length > 0 && isLayerSelected(layerOfHit(current.hit, world)) ? selectedLayers() : null;
    if (several && world) {
      current.layers = { all: several, hits: several.map((layer) => findBySrc(world, layer.src)[layer.instance]).filter((hit): hit is FiberHit => Boolean(hit)) };
    } else if (world) { multiSelection.clear(); selectHit(current.hit, world); }
    const selection = studioStore.getState().selection;
    current.layer = selection?.kind === "node" && !selection.part ? selection : null;
    const all: NodeSelection[] = current.layers ? current.layers.all.map((layer) => ({ kind: "node", ...layer })) : current.layer ? [current.layer] : [];
    const refused = all.map((layer) => ({ layer, check: canStructurallyEdit(layer) })).find((entry) => !entry.check.ok);
    current.refusal = !current.layer ? "Select a layer first" : refused && !refused.check.ok ? (current.layers ? `${refused.layer.name}: ${refused.check.reason}` : refused.check.reason) : null;
    if (current.layer && !current.refusal) {
      void Promise.all(all.map((layer) => structuralBlock(layer, "move"))).then((blocks) => blocks.find(Boolean) ?? null).then((block) => { if (block && session === current) { current.refusal = block; follow(current); } });
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
    tree, row, hit, layer: null, layers: null, resolve,
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
