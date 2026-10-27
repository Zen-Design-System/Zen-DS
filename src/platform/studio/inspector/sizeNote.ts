import { useSyncExternalStore } from "react";

/*
 * Why the selected layer's size cannot change on an axis (a Tooltip's anchor keeps the child's size, a px-capped Chip,
 * a wrap the dev server refuses): the canvas (select/ResizeLayer.tsx) knows it and publishes it here; the Inspector
 * shows it under Resizing (DesignPanel, `useSizeNote`). Until 2026-10-27 the size pill on the canvas carried these notes
 * beside "W × H" (UX review §2.7, N3: the badge's rule notes into the Inspector); the pill says the size only now.
 */

export type SizeNote = {
  /** The layer's data-zen-src. */
  src: string;
  text: string;
};

let current: SizeNote | null = null;
const listeners = new Set<() => void>();

export const sizeNote = {
  get: (): SizeNote | null => current,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  /** The same note again keeps the snapshot (no re-render); null clears it (the layer deselected, or nothing to say). */
  publish(next: SizeNote | null) {
    if (current === next || (current && next && current.src === next.src && current.text === next.text)) return;
    current = next;
    for (const listener of listeners) listener();
  },
};

/** The size note of `src` while the canvas publishes one, else null. */
export function useSizeNote(src: string | null): string | null {
  const note = useSyncExternalStore(sizeNote.subscribe, sizeNote.get, sizeNote.get);
  return note && src && note.src === src ? note.text : null;
}
