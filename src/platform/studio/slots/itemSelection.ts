import { useSyncExternalStore } from "react";
import { studioStore } from "../store";
import type { StudioSelection } from "../types";

/*
 * Several items of one data slot selected at once (Figma's Shift/⌘+click on the instances in a slot; user, 2026-10-10:
 * "Chưa chọn được nhiều item add stack được"). The primary item stays the selected part (`studioStore.selection`); the
 * others are their places among the slot's items here, for the same element (src, frame, instance) and slot. Any other
 * change of the selection clears them, so a plain click starts over.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;
export type ItemSet = { src: string; frameId: string | null; instance: number; prop: string; indices: number[] };

let extra: ItemSet | null = null;
const listeners = new Set<() => void>();
let primary = studioStore.getState().selection;
/** Set while a toggle changes the primary itself (the extras go with it). */
let keeping = false;

const emit = () => listeners.forEach((listener) => listener());
const sameOwner = (selection: StudioSelection | null, set: ItemSet | null) => Boolean(set && selection?.kind === "node" && selection.src === set.src
  && selection.frameId === set.frameId && selection.instance === set.instance);

studioStore.subscribe(() => {
  const selection = studioStore.getState().selection;
  if (selection === primary) return;
  const before = primary;
  primary = selection;
  if (keeping) return;
  // A write remaps the element's line (the same part of the same frame and instance): the items stay; anything else (a
  // plain click on another item included) starts over.
  const moved = extra && before?.kind === "node" && selection?.kind === "node" && before.part && selection.part && before.part.name === selection.part.name
    && before.part.path.join(".") === selection.part.path.join(".") && selection.frameId === extra.frameId && selection.instance === extra.instance;
  if (moved && extra) {
    extra = { ...extra, src: selection.src };
    return;
  }
  if (extra) { extra = null; emit(); }
});

export const itemSelection = {
  get: (): ItemSet | null => extra,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  clear() {
    if (!extra) return;
    extra = null;
    emit();
  },
  /**
   * Adds the item at `index` to the selection or takes it out (⌘ / Ctrl+click), or (`range` from the primary's place: a
   * Shift+click) selects every item between. `selection` is the primary item's part selection; `primaryIndex` its place.
   */
  toggle(selection: NodeSelection, prop: string, primaryIndex: number, index: number, range = false) {
    const current = sameOwner(selection, extra) && extra?.prop === prop ? extra.indices : [];
    let next: number[];
    if (range) {
      const low = Math.min(primaryIndex, index);
      const high = Math.max(primaryIndex, index);
      next = Array.from({ length: high - low + 1 }, (_, k) => low + k).filter((place) => place !== primaryIndex);
    } else next = index === primaryIndex ? current : current.includes(index) ? current.filter((place) => place !== index) : [...current, index].sort((a, b) => a - b);
    extra = next.length ? { src: selection.src, frameId: selection.frameId, instance: selection.instance, prop, indices: next } : null;
    emit();
  },
  /** Runs `change` (a selection the toggle makes itself) without clearing the extras. */
  keep(change: () => void) {
    keeping = true;
    try { change(); } finally { keeping = false; }
  },
};

/** Every selected place of the slot's items: the primary's and the extras, in order (one: the primary alone). */
export const selectedPlaces = (primaryIndex: number, set: ItemSet | null, prop: string): number[] => (
  set && set.prop === prop ? [...new Set([primaryIndex, ...set.indices])].sort((a, b) => a - b) : [primaryIndex]
);

export function useItemSelection(): ItemSet | null {
  return useSyncExternalStore(itemSelection.subscribe, itemSelection.get, itemSelection.get);
}
