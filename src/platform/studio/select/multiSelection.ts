import { useSyncExternalStore } from "react";
import { parseSrc, subscribeStudioWrites } from "../api";
import { studioStore } from "../store";
import type { StudioNodeRef, StudioSelection } from "../types";
import { frameOf, instanceOf, panelOf, type FiberHit } from "./picker";
import { expectRender, mapSrc, sameSelectedElement } from "./remap";

/*
 * Multi-selection (Figma's Shift+click). The primary layer stays `studioStore.selection`: the inspector, the resize
 * handles and every single-layer action read it. The other selected layers live here: Shift+click on the canvas, or
 * Shift/⌘+click in Layers, adds or removes one. Any other change of the primary (a plain click, Escape, an edit that
 * selects a new element) clears them. A write that only moves the primary (remap) keeps them, and each extra layer
 * moves the same way. They are kept in sessionStorage, like the selection, through the reload a write may cause.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;
export type ExtraLayer = StudioNodeRef;

const KEY = "zen-studio:extra-selection";
const listeners = new Set<() => void>();

const isLayer = (value: unknown): value is ExtraLayer => {
  const layer = value as Partial<ExtraLayer> | null;
  return Boolean(layer && typeof layer.src === "string" && typeof layer.name === "string" && typeof layer.instance === "number");
};

function readSession(): ExtraLayer[] {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter(isLayer) : [];
  } catch {
    return [];
  }
}

let extras: ExtraLayer[] = typeof window === "undefined" ? [] : readSession();
/* Only a node selection without a part takes extra layers. */
if (studioStore.getState().selection?.kind !== "node" || (studioStore.getState().selection as NodeSelection).part) extras = [];
let primary = studioStore.getState().selection;
/* Set while selectLayers changes the primary itself (the extras are set with it). */
let keeping = false;

function set(next: ExtraLayer[]) {
  if (next === extras || (next.length === 0 && extras.length === 0)) return;
  extras = next;
  try {
    if (next.length) window.sessionStorage.setItem(KEY, JSON.stringify(next));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // Private mode or a full quota: the multi-selection only forgets itself on reload.
  }
  listeners.forEach((listener) => listener());
}

const offStore = studioStore.subscribe(() => {
  const selection = studioStore.getState().selection;
  if (selection === primary) return;
  const before = primary;
  primary = selection;
  if (keeping || !extras.length) return;
  if (selection?.kind === "node" && !selection.part && sameSelectedElement(before, selection)) return;
  set([]);
});

// A write moves the extra layers like the remap moves the primary; one whose line changed for another reason is dropped.
const offWrites = subscribeStudioWrites((write) => {
  if (!extras.length || write.before === write.after) return;
  const next = extras.flatMap((layer) => {
    const src = mapSrc(layer.src, write);
    return src ? [src === layer.src ? layer : { ...layer, src }] : [];
  });
  if (next.length !== extras.length || next.some((layer, index) => layer !== extras[index])) set(next);
});
import.meta.hot?.dispose(() => { offStore(); offWrites(); });

/** The same layer: one JSX element's same render. */
export const sameLayer = (a: Pick<ExtraLayer, "src" | "instance">, b: Pick<ExtraLayer, "src" | "instance">) => a.src === b.src && a.instance === b.instance;

/** The layer a canvas hit names (as selectHit stores it). */
export function layerOfHit(hit: FiberHit, world: Element | null): ExtraLayer {
  const host = hit.hosts[0];
  return { src: hit.src, name: hit.name, frameId: frameOf(host), panelId: panelOf(host), instance: world ? instanceOf(world, hit) : 0 };
}

const asLayer = (selection: NodeSelection): ExtraLayer => ({ src: selection.src, name: selection.name, frameId: selection.frameId, panelId: selection.panelId, instance: selection.instance });

export const multiSelection = {
  get: () => extras,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  clear: () => set([]),
};

/** The other selected layers (empty while one layer, a part, a frame or nothing is selected). */
export const useExtraSelection = () => useSyncExternalStore(multiSelection.subscribe, multiSelection.get, () => extras);

/** Every selected layer, the primary first; empty unless a layer (not a part) is selected. */
export function selectedLayers(): ExtraLayer[] {
  const selection = studioStore.getState().selection;
  if (selection?.kind !== "node" || selection.part) return [];
  return [asLayer(selection), ...extras];
}

/**
 * Selects `first` (the primary) and `others` together. `awaiting`: what the canvas rendered before a write that makes
 * `first` a new element (an undo that unwraps it): the canvas waits for it instead of dropping it (remap expectRender).
 */
export function selectLayers(first: ExtraLayer, others: ExtraLayer[], awaiting?: WeakSet<Element>) {
  const selection: NodeSelection = { kind: "node", ...first };
  if (awaiting) expectRender(selection, awaiting, () => undefined);
  keeping = true;
  try {
    studioStore.setState({ selection });
  } finally {
    keeping = false;
  }
  set(others.filter((layer) => !sameLayer(layer, first)));
}

/**
 * Shift+click (canvas) or Shift/⌘+click (Layers) on `layer`: added to the selection, or removed when it is selected.
 * The primary removed hands its place to the next layer (a lone layer stays selected, as in Figma's canvas). Without a
 * layer selected (a frame, a part, nothing), `layer` becomes the selection.
 */
export function toggleLayer(layer: ExtraLayer) {
  const selection = studioStore.getState().selection;
  if (selection?.kind !== "node" || selection.part) {
    selectLayers(layer, []);
    return;
  }
  if (sameLayer(selection, layer)) {
    const [next, ...rest] = extras;
    if (next) selectLayers(next, rest);
    return;
  }
  set(extras.some((other) => sameLayer(other, layer)) ? extras.filter((other) => !sameLayer(other, layer)) : [...extras, layer]);
}

/** Whether a layer is selected (the primary or an extra one). */
export function isLayerSelected(layer: Pick<ExtraLayer, "src" | "instance">): boolean {
  const selection = studioStore.getState().selection;
  return (selection?.kind === "node" && !selection.part && sameLayer(selection, layer)) || extras.some((other) => sameLayer(other, layer));
}

/** "file:line:col" → its position, to sort layers in source order (other files last). */
export function sourceOrder(a: ExtraLayer, b: ExtraLayer): number {
  const pa = parseSrc(a.src);
  const pb = parseSrc(b.src);
  if (!pa || !pb) return 0;
  if (pa.file !== pb.file) return pa.file < pb.file ? -1 : 1;
  return pa.line - pb.line || pa.column - pb.column || a.instance - b.instance;
}
