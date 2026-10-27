import { useSyncExternalStore } from "react";

/*
 * Why the selected layer's size cannot change on an axis, for the Inspector's Size group (the UX review 2026-10-27 §2.7,
 * N3: the canvas size badge carried rule notes such as "1152 × 452 · Height comes from the Table itself"; the badge shows
 * W × H alone, the note lives here). The canvas (select/ResizeLayer.tsx) publishes it for the selected src; the Inspector
 * reads it with `useSizeNote(src)`.
 */

export type SizeNote = { src: string; text: string } | null;

let note: SizeNote = null;
const listeners = new Set<() => void>();

export const sizeNote = {
  get: () => note,
  publish(next: SizeNote) {
    if (next === note || (next && note && next.src === note.src && next.text === note.text)) return;
    note = next;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

/** The size note of `src` while the canvas publishes one, else null. */
export function useSizeNote(src: string | null): string | null {
  const current = useSyncExternalStore(sizeNote.subscribe, sizeNote.get, sizeNote.get);
  return current && src && current.src === src ? current.text : null;
}
