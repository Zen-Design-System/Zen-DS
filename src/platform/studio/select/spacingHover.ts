import { useSyncExternalStore } from "react";

/*
 * The inspector → canvas hover bus (docs/research/studio-inspector-redesign-2026-10-03.md, Phase 7): a spacing field
 * (ScaleField) that is hovered or focused, or one of its scale rows under the pointer, names the layer, the prop and the
 * step it would set; SpacingLayer emphasises the gap or padding areas that prop sets and labels them with that step
 * ("gap · lg · 24"). Not the persisted studio store: a hover never writes, and nothing survives a reload.
 */

/** `src`: the layer's "file:line:col"; `prop`: the spacing prop (gap, rowGap, padding, paddingX, spacing…); `key`: a step. */
export type SpacingHover = { src: string; prop: string; key?: string | null };

let current: SpacingHover | null = null;
const listeners = new Set<() => void>();

const same = (a: SpacingHover | null, b: SpacingHover | null) => a === b || Boolean(a && b && a.src === b.src && a.prop === b.prop && (a.key ?? null) === (b.key ?? null));

export const spacingHover = {
  get: () => current,
  /** A field or row hovered / focused (`null`: left or blurred). A pointer leave clears only its own hover. */
  set(next: SpacingHover | null) {
    if (same(current, next)) return;
    current = next;
    listeners.forEach((listener) => listener());
  },
  /** Clears the hover only while it is still `mine` (a leave after another field took the hover keeps that one). */
  clear(mine: Pick<SpacingHover, "src" | "prop">) {
    if (current && current.src === mine.src && current.prop === mine.prop) spacingHover.set(null);
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

export const useSpacingHover = () => useSyncExternalStore(spacingHover.subscribe, spacingHover.get, () => null);
