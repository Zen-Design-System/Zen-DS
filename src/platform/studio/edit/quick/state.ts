/*
 * Whether the Quick actions palette is open. Kept out of QuickActions.tsx so that module exports components only (its
 * hot update stays a Fast Refresh) and any module can open the palette.
 */

let open = false;
const listeners = new Set<() => void>();

export const isQuickActionsOpen = () => open;
export const setQuickActionsOpen = (next: boolean) => { if (next === open) return; open = next; listeners.forEach((listener) => listener()); };
export const openQuickActions = () => setQuickActionsOpen(true);
export const subscribeQuickActions = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
