/*
 * Which builder page the Export dialog shows (Studio builder GĐ5), or null while it is closed. No imports, so the page
 * menu and the Inspector open it without importing the dialog (ExportDialog.tsx).
 */

let state: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** Opens the Export dialog on page `id`. */
export const openExport = (id: string) => { if (state !== id) { state = id; emit(); } };
export const closeExport = () => { if (state !== null) { state = null; emit(); } };
/** The page the dialog shows, or null. */
export const exportPageId = () => state;
export const subscribeExport = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
