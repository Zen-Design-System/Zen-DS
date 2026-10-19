import { subscribeStudioWrites } from "../api";
import { canvasApi } from "../canvas/viewport";
import { findBySrc } from "../select/picker";
import { mapSrc } from "../select/remap";
import type { NodeSelection } from "./arrange";

/*
 * Figma's ⌘D repeats the last offset (plan docs/research/studio-figma-design-parity-2026-10-18.md F3): duplicate a
 * floating layer, move the copy, press ⌘D on it and the next copy lands moved by as much again, and so on. The copy and
 * where its original floated are remembered; ⌘D on that copy sends its move since as duplicateElement's `offset` (one
 * edit, the server shifts the copy's px insets). A layer in auto layout has no offset: its frame places the copy.
 */

type Series = { src: string; instance: number; from: { x: number; y: number } };
let series: Series | null = null;

// The copy's place in the code follows the Studio's own writes (a move of the copy, lines added above it).
if (typeof window !== "undefined") {
  const stop = subscribeStudioWrites((write) => {
    if (!series) return;
    const next = mapSrc(series.src, write);
    series = next ? { ...series, src: next } : null;
  });
  import.meta.hot?.dispose(stop);
}

/** Where the layer floats in its frame (its offsets in unscaled px), or null (in auto layout, or not drawn). */
export function floatingPlace(selection: NodeSelection): { x: number; y: number } | null {
  const world = canvasApi.getWorldElement();
  const host = world ? findBySrc(world, selection.src)[selection.instance]?.hosts[0] : undefined;
  if (!(host instanceof HTMLElement) || host.dataset.position !== "absolute") return null;
  const block = host.offsetParent;
  if (!(block instanceof HTMLElement)) return null;
  const outer = block.getBoundingClientRect();
  const rect = host.getBoundingClientRect();
  const scale = block.offsetWidth ? outer.width / block.offsetWidth || 1 : 1;
  return { x: (rect.left - outer.left) / scale - block.clientLeft, y: (rect.top - outer.top) / scale - block.clientTop };
}

/** The offset ⌘D on `selection` repeats (how far this copy moved from its original), or null. */
export function repeatOffset(selection: NodeSelection, place: { x: number; y: number } | null): { dx: number; dy: number } | null {
  if (!series || !place || series.src !== selection.src || series.instance !== selection.instance) return null;
  const dx = Math.round(place.x - series.from.x);
  const dy = Math.round(place.y - series.from.y);
  return dx || dy ? { dx, dy } : null;
}

/** After ⌘D: `copy` came from a layer floating at `from` (null: in auto layout; the series ends). */
export function rememberDuplicate(copy: NodeSelection, from: { x: number; y: number } | null) {
  series = from ? { src: copy.src, instance: copy.instance, from } : null;
}
