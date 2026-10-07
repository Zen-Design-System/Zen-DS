import { useSyncExternalStore } from "react";

/* The inspector footer line: the last save, undo or error ("Saved · button.tsx:84 · ⌘Z to undo"). No toasts. */

export type InspectorStatus = { tone: "neutral" | "positive" | "negative"; text: string; at: number } | null;

let status: InspectorStatus = null;
const listeners = new Set<() => void>();

export const inspectorStatus = {
  get: () => status,
  set(tone: "neutral" | "positive" | "negative", text: string) {
    status = { tone, text, at: Date.now() };
    listeners.forEach((listener) => listener());
  },
  clear() {
    if (!status) return;
    status = null;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

export function useInspectorStatus() {
  return useSyncExternalStore(inspectorStatus.subscribe, inspectorStatus.get, () => null);
}

/** "⌘Z" on Apple platforms, "Ctrl+Z" elsewhere. */
export const undoShortcut = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘Z" : "Ctrl+Z";

/** "⌘S" on Apple platforms, "Ctrl+S" elsewhere (saves the admin drafts). */
export const saveShortcut = undoShortcut.replace(/Z$/, "S");

/** "src/platform/examples/pages/button.tsx" → "button.tsx". */
export const fileName = (file: string) => file.split("/").pop() ?? file;
