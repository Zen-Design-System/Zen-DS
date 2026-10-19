import { useSyncExternalStore } from "react";
import { studioStore } from "../store";

/*
 * Several frames selected (plan docs/research/studio-figma-design-parity-2026-10-18.md F2; Figma's ⌘A with no layer
 * selected, a marquee on the empty canvas, ⇧-click on frame names): the primary is the store's `{ kind: "frame" }`
 * selection, the others live here — as several layers do in multiSelection. Sections are frames too
 * (`section:<id>`). Any other selection change clears them. Moving several frames is builder/frameMove.ts (Session C),
 * Delete removes them in one edit.
 */

let extras: string[] = [];
let keeping = false;
let primary: string | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

// A selection that is not the primary frame any more drops the others (as Figma: a click elsewhere selects that alone).
studioStore.subscribe(() => {
  if (keeping || !extras.length) return;
  const selection = studioStore.getState().selection;
  if (selection?.kind === "frame" && selection.frameId === primary) return;
  extras = [];
  primary = null;
  notify();
});

export const frameSelection = {
  get: () => extras,
  subscribe,
  clear() { if (extras.length) { extras = []; primary = null; notify(); } },
};

/** The other selected frames (empty unless several frames are). */
export const useFrameSelection = () => useSyncExternalStore(subscribe, () => extras, () => extras);

/** Every selected frame, the primary first; empty unless a frame is selected. */
export function selectedFrames(): string[] {
  const selection = studioStore.getState().selection;
  return selection?.kind === "frame" ? [selection.frameId, ...extras] : [];
}

/** Selects `first` (the primary) and `others` together. */
export function selectFrames(first: string, others: string[]) {
  keeping = true;
  try {
    primary = first;
    studioStore.setState({ selection: { kind: "frame", frameId: first } });
    extras = others.filter((id, index) => id !== first && others.indexOf(id) === index);
  } finally {
    keeping = false;
  }
  notify();
}

/** ⇧-click on a frame: adds it to the frames selected, or takes it out (the primary goes to the next one). */
export function toggleFrame(frameId: string) {
  const all = selectedFrames();
  if (!all.length) { selectFrames(frameId, []); return; }
  if (!all.includes(frameId)) { selectFrames(all[0], [...all.slice(1), frameId]); return; }
  const rest = all.filter((id) => id !== frameId);
  if (!rest.length) return;
  selectFrames(rest[0], rest.slice(1));
}

/** Whether `frameId` is one of the selected frames. */
export const isFrameSelected = (frameId: string) => selectedFrames().includes(frameId);
