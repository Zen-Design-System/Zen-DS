import { useSyncExternalStore } from "react";

/* Open state of the Keyboard shortcuts dialog as a tiny external store: the brand menu, the canvas "?" button and the
   ? key all open the same dialog. Kept out of ShortcutsDialog.tsx so that module exports a component only. */
let shortcutsOpen = false;
const openListeners = new Set<() => void>();
const subscribeOpen = (listener: () => void) => { openListeners.add(listener); return () => { openListeners.delete(listener); }; };

export function setShortcutsOpen(open: boolean) {
  if (open === shortcutsOpen) return;
  shortcutsOpen = open;
  openListeners.forEach((listener) => listener());
}

/** Opens the Keyboard shortcuts dialog. */
export const openShortcuts = () => setShortcutsOpen(true);

export function useShortcutsOpen() {
  return useSyncExternalStore(subscribeOpen, () => shortcutsOpen, () => false);
}
