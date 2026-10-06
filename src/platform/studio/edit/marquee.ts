import { useSyncExternalStore } from "react";
import { canvasApi } from "../canvas/viewport";
import { childHits, elementFiber, hitOf, rectOf, walkAnnotated, type FiberHit } from "../select/picker";
import { layerOfHit, multiSelection, selectedLayers, selectLayers, type ExtraLayer } from "../select/multiSelection";
import { studioStore } from "../store";

/*
 * Marquee selection, Figma-like (docs/research/studio-figma-editing-plan-2026-10-03.md, Phase 8; user decision 2026-10-03:
 * dragging empty canvas selects, Space / Hand / scroll pan). Drag from empty canvas or a frame's background: the
 * rectangle selects, in the example it covers most, the layers it touches one level inside the deepest layer that holds
 * the whole rectangle (the example's root layers when none does); ⌘/Ctrl held: the deepest layers fully inside it.
 * ⇧ adds to the selection. A click without dragging does what the press did before (select the frame / clear).
 */

type Rect = { x: number; y: number; w: number; h: number };

let rect: Rect | null = null;
const listeners = new Set<() => void>();
const publish = (next: Rect | null) => { rect = next; listeners.forEach((listener) => listener()); };
export const useMarquee = () => useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => rect, () => null);

type Session = { start: { x: number; y: number }; dragging: boolean; additive: boolean; base: ExtraLayer[]; onClick: () => void };
let session: Session | null = null;

const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const holds = (outer: DOMRect, inner: DOMRect) => outer.left <= inner.left && outer.top <= inner.top && outer.right >= inner.right && outer.bottom >= inner.bottom;

/** The example frame the rectangle covers most. */
function frameUnder(box: DOMRect): Element | null {
  let best: Element | null = null;
  let area = 0;
  for (const frame of canvasApi.getWorldElement()?.querySelectorAll("[data-studio-frame]") ?? []) {
    const r = frame.getBoundingClientRect();
    const w = Math.min(r.right, box.right) - Math.max(r.left, box.left);
    const h = Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top);
    if (w > 0 && h > 0 && w * h > area) { area = w * h; best = frame; }
  }
  return best;
}

function rootLayers(frame: Element): FiberHit[] {
  const out: FiberHit[] = [];
  walkAnnotated(elementFiber(frame)?.child ?? null, (fiber) => {
    const hit = hitOf(fiber);
    if (hit?.hosts.length) out.push(hit);
    return false;
  });
  return out;
}

/** The layers the rectangle selects (see the header). */
function layersIn(box: DOMRect, deep: boolean): FiberHit[] {
  const frame = frameUnder(box);
  if (!frame) return [];
  if (deep) {
    const inside: FiberHit[] = [];
    walkAnnotated(elementFiber(frame)?.child ?? null, (fiber) => {
      const hit = hitOf(fiber);
      const r = hit ? rectOf(hit.hosts) : null;
      if (hit && r && r.width && r.height && holds(box, r)) inside.push(hit);
      return inside.length < 300;
    });
    // The deepest: a layer that holds another selected one gives way to it.
    return inside.filter((hit) => !inside.some((other) => other !== hit && hit.hosts.some((host) => other.hosts[0] && host !== other.hosts[0] && host.contains(other.hosts[0])))).slice(0, 100);
  }
  let level = rootLayers(frame);
  for (let guard = 0; guard < 40; guard += 1) {
    const holder = level.filter((hit) => { const r = rectOf(hit.hosts); return r && holds(r, box); });
    if (holder.length !== 1) break;
    const inner = childHits(holder[0]).filter((hit) => hit.hosts.length);
    if (!inner.length) break;
    level = inner;
  }
  return level.filter((hit) => { const r = rectOf(hit.hosts); return Boolean(r && (r.width || r.height) && intersects(box, r)); });
}

function apply(current: Session, box: DOMRect, deep: boolean) {
  const world = canvasApi.getWorldElement();
  const hits = layersIn(box, deep);
  const layers = hits.map((hit) => layerOfHit(hit, world));
  const all = current.additive ? [...current.base, ...layers.filter((layer) => !current.base.some((base) => base.src === layer.src && base.instance === layer.instance))] : layers;
  if (!all.length) {
    multiSelection.clear();
    if (!current.additive) studioStore.setState({ selection: null });
    return;
  }
  const [first, ...rest] = all;
  selectLayers(first, rest);
}

function onMove(event: PointerEvent) {
  const current = session;
  if (!current) return;
  if (!current.dragging) {
    if (Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y) < 4) return;
    current.dragging = true;
  }
  event.preventDefault();
  event.stopPropagation();
  const x = Math.min(current.start.x, event.clientX);
  const y = Math.min(current.start.y, event.clientY);
  const next = { x, y, w: Math.abs(event.clientX - current.start.x), h: Math.abs(event.clientY - current.start.y) };
  publish(next);
  apply(current, new DOMRect(next.x, next.y, next.w, next.h), event.metaKey || event.ctrlKey);
}

function end(commit: boolean) {
  const current = session;
  if (!current) return;
  session = null;
  window.removeEventListener("pointermove", onMove, true);
  window.removeEventListener("pointerup", onUp, true);
  window.removeEventListener("pointercancel", onCancel, true);
  window.removeEventListener("keydown", onKey, true);
  window.removeEventListener("blur", onCancel);
  publish(null);
  if (!current.dragging && commit) current.onClick();
}

function onUp() { end(true); }
function onCancel() { end(false); }
function onKey(event: KeyboardEvent) {
  if (event.key !== "Escape" || !session?.dragging) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const current = session;
  end(false);
  // Esc gives back the selection the drag started from.
  if (current.base.length) selectLayers(current.base[0], current.base.slice(1));
  else { multiSelection.clear(); studioStore.setState({ selection: null }); }
}

/**
 * A press on empty canvas or a frame's background in the Select tool (SelectionLayer). Takes the press: a drag draws
 * the marquee, a click runs `onClick` (what the press did before).
 */
export function startMarquee(event: PointerEvent, onClick: () => void): boolean {
  if (event.button !== 0 || event.detail > 1 || session) return false;
  const state = studioStore.getState();
  if (state.tool !== "select" || state.presenting) return false;
  session = { start: { x: event.clientX, y: event.clientY }, dragging: false, additive: event.shiftKey, base: selectedLayers(), onClick };
  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onCancel, true);
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("blur", onCancel);
  return true;
}
