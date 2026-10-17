/*
 * Whether the Variables window is open (Figma's Local variables, research docs/research/studio-figma-native-parity-
 * 2026-10-17.md §10). No imports, so the Page panel and Quick actions open it without importing the window.
 */

let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const openVariables = () => { if (!open) { open = true; emit(); } };
export const closeVariables = () => { if (open) { open = false; emit(); } };
export const variablesOpen = () => open;
export const subscribeVariables = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
