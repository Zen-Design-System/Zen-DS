import { useEffect, useSyncExternalStore } from "react";
import { canvasApi, getViewport } from "../canvas/viewport";
import { annotatedAt, findBySrc, parentHit, rectOf, type FiberHit } from "../select/picker";
import { familyKeyForPx } from "../select/spacing";
import { studioStore } from "../store";
import { isDraggingLayer } from "./drag";
import { textEditSession } from "./textEdit";

/*
 * ⌥ measure, Figma-like (docs/research/studio-figma-editing-plan-2026-10-03.md, Phase 4): with a layer selected, hold
 * ⌥ and point at another layer: red lines give the distances between them (to the inside edges when it holds the
 * selection, else the gaps between their nearest edges), in canvas px and with the Spacing token they match
 * ("16 · md"). Pointing at the selection itself (or nothing) measures to its parent.
 */

type Line = { x: number; y: number; w: number; h: number; label: string };
export type MeasureView = { lines: Line[]; target: { x: number; y: number; w: number; h: number } } | null;

let view: MeasureView = null;
const listeners = new Set<() => void>();
const publish = (next: MeasureView) => { view = next; listeners.forEach((listener) => listener()); };
export const useMeasureView = () => useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => view, () => null);

function selectedHit(): FiberHit | null {
  const selection = studioStore.getState().selection;
  const world = canvasApi.getWorldElement();
  if (selection?.kind !== "node" || !world) return null;
  const hits = findBySrc(world, selection.src);
  return hits[selection.instance] ?? hits[0] ?? null;
}

/**
 * "16 · md": the distance in canvas px, with the Spacing token it is, only when it is that spacing (the holder's
 * padding on that side, or the gap between two siblings), never a sum that happens to match a step.
 */
function label(px: number, zoom: number, host: Element, scale: "gap" | "padding", spacing: number | null) {
  const value = px / zoom;
  const rounded = Math.round(value * 10) / 10;
  const key = spacing !== null && Math.abs(spacing - value) < 0.5 ? familyKeyForPx(host, scale, value) : null;
  return key ? `${rounded} · ${key}` : String(rounded);
}

const px = (value: string) => Number.parseFloat(value) || 0;

function measure(x: number, y: number): MeasureView {
  const hit = selectedHit();
  const selected = hit ? rectOf(hit.hosts) : null;
  if (!hit || !selected) return null;
  const frame = hit.hosts[0]?.closest("[data-studio-frame]") ?? null;
  const inSelection = (element: Element) => hit.hosts.some((host) => host === element || host.contains(element));
  let target: FiberHit | null = null;
  for (const element of document.elementsFromPoint(x, y)) {
    if (!element.closest(".studio-world") || element.matches(".studio-world")) continue;
    if (inSelection(element)) break;
    target = annotatedAt(element);
    if (target) break;
  }
  target ??= parentHit(hit, frame);
  const rect = target ? rectOf(target.hosts) : null;
  if (!target || !rect) return null;
  const zoom = hit.hosts[0]?.closest(".studio-world") ? getViewport().zoom : 1;
  const host = target.hosts[0];
  const s = selected;
  const t = rect;
  const lines: Line[] = [];
  const midY = s.top + s.height / 2;
  const midX = s.left + s.width / 2;
  type Spacing = number | null;
  const horizontal = (from: number, to: number, at: number, scale: "gap" | "padding", spacing: Spacing, on: Element) => { if (to - from >= 0.5) lines.push({ x: from, y: at, w: to - from, h: 1, label: label(to - from, zoom, on, scale, spacing) }); };
  const vertical = (from: number, to: number, at: number, scale: "gap" | "padding", spacing: Spacing, on: Element) => { if (to - from >= 0.5) lines.push({ x: at, y: from, w: 1, h: to - from, label: label(to - from, zoom, on, scale, spacing) }); };
  const holds = t.left <= s.left + 0.5 && t.right >= s.right - 0.5 && t.top <= s.top + 0.5 && t.bottom >= s.bottom - 0.5;
  if (holds) {
    const style = host ? getComputedStyle(host) : null;
    const pad = (side: "Left" | "Right" | "Top" | "Bottom") => (style ? px(style[`padding${side}`]) + px(style[`border${side}Width`]) : null);
    horizontal(t.left, s.left, midY, "padding", pad("Left"), host);
    horizontal(s.right, t.right, midY, "padding", pad("Right"), host);
    vertical(t.top, s.top, midX, "padding", pad("Top"), host);
    vertical(s.bottom, t.bottom, midX, "padding", pad("Bottom"), host);
  } else {
    // Siblings: the gap token shows when the distance is their parent's gap.
    const parent = parentHit(hit, frame);
    const sibling = parent && parentHit(target, frame)?.hosts[0] === parent.hosts[0] ? parent.hosts[0] : null;
    const gaps = sibling ? getComputedStyle(sibling) : null;
    const columnGap = gaps ? px(gaps.columnGap) : null;
    const rowGap = gaps ? px(gaps.rowGap) : null;
    const on = sibling ?? host;
    // The gap along each axis where they do not overlap, drawn where they face each other.
    const rowAt = Math.max(s.top, t.top) < Math.min(s.bottom, t.bottom) ? (Math.max(s.top, t.top) + Math.min(s.bottom, t.bottom)) / 2 : midY;
    const columnAt = Math.max(s.left, t.left) < Math.min(s.right, t.right) ? (Math.max(s.left, t.left) + Math.min(s.right, t.right)) / 2 : midX;
    if (t.left >= s.right) horizontal(s.right, t.left, rowAt, "gap", columnGap, on);
    else if (t.right <= s.left) horizontal(t.right, s.left, rowAt, "gap", columnGap, on);
    if (t.top >= s.bottom) vertical(s.bottom, t.top, columnAt, "gap", rowGap, on);
    else if (t.bottom <= s.top) vertical(t.bottom, s.top, columnAt, "gap", rowGap, on);
  }
  return { lines, target: { x: t.left, y: t.top, w: t.width, h: t.height } };
}

export function useMeasure() {
  useEffect(() => {
    let alt = false;
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const state = studioStore.getState();
        const on = alt && pointer && state.tool === "select" && !state.presenting && state.selection?.kind === "node" && !textEditSession.get() && !isDraggingLayer();
        publish(on && pointer ? measure(pointer.x, pointer.y) : null);
      });
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Alt") return;
      alt = event.type === "keydown";
      update();
    };
    const onMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (alt !== event.altKey) alt = event.altKey;
      if (alt || view) update();
    };
    const off = () => { alt = false; update(); };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    window.addEventListener("pointermove", onMove, { capture: true, passive: true });
    window.addEventListener("blur", off);
    const unsubscribe = studioStore.subscribe(() => { if (view || alt) update(); });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      window.removeEventListener("pointermove", onMove, { capture: true });
      window.removeEventListener("blur", off);
      unsubscribe();
      publish(null);
    };
  }, []);
}
