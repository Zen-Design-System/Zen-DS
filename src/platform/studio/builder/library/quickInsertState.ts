/*
 * Whether Quick insert is open, and in which mode (Studio builder GĐ3 M2; GĐ4 M2 adds "swap": Figma's Swap instance,
 * the chosen component replaces the selected layer). No imports, so the canvas menu and the Inspector open it without
 * importing the panel (QuickInsert.tsx).
 */

export type QuickInsertMode = "insert" | "swap";

let state: QuickInsertMode | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** Opens Quick insert (⇧I: insert; Swap instance: swap); open already, it switches to `mode`. */
export const openQuickInsert = (mode: QuickInsertMode = "insert") => { if (state !== mode) { state = mode; emit(); } };
export const closeQuickInsert = () => { if (state !== null) { state = null; emit(); } };
/** The open mode, or null while closed. */
export const quickInsertMode = () => state;
export const subscribeQuickInsert = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
