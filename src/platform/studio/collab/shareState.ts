/*
 * Whether the Share dialog is open, on which project of the Studio (its local id; null: a page in Drafts). No imports, so
 * the top bar and the projects home open it without importing the dialog (ShareDialog.tsx).
 */

let state: { project: string | null } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** Opens the Share dialog on a project (null: the open page is in Drafts). */
export const openShare = (project: string | null) => { state = { project }; emit(); };
export const closeShare = () => { if (state) { state = null; emit(); } };
/** What the dialog shows, or null while it is closed. */
export const shareTarget = () => state;
export const subscribeShare = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
