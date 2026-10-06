import { useSyncExternalStore } from "react";

/*
 * The one Wrap preference of every Studio code view (the Snippet and the Source alike), per viewer in localStorage.
 * Turning Wrap on or off in one view turns it on or off in all of them, in every tab. On by default: the inspector is
 * narrow.
 */

const KEY = "zen-studio:code-wrap";
/** Until 2026-10-02 only the Source view remembered its toggle, under this key. */
const OLD_KEY = "zen-studio:source-wrap";

function readWrap() {
  try {
    return (window.localStorage.getItem(KEY) ?? window.localStorage.getItem(OLD_KEY)) !== "off";
  } catch {
    return true;
  }
}

let wrap = typeof window === "undefined" ? true : readWrap();
const listeners = new Set<() => void>();
const beforeListeners = new Set<() => void>();

function notify(next: boolean) {
  if (next === wrap) return;
  // Each view notes its first visible line while the old layout is still on screen.
  beforeListeners.forEach((listener) => listener());
  wrap = next;
  listeners.forEach((listener) => listener());
}

/** Another tab changed the preference. */
function onStorage(event: StorageEvent) {
  if (event.key === KEY && event.newValue) notify(event.newValue !== "off");
}

function subscribe(listener: () => void) {
  if (!listeners.size) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", onStorage);
  };
}

export function setCodeWrap(next: boolean) {
  notify(next);
  try {
    window.localStorage.setItem(KEY, next ? "on" : "off");
  } catch {
    // Storage blocked: the preference still holds for this page.
  }
}

/** Whether code views wrap long lines. */
export function useCodeWrap(): boolean {
  return useSyncExternalStore(subscribe, () => wrap, () => true);
}

/** Runs just before the preference changes, while the views still show the old layout. */
export function onBeforeCodeWrapChange(listener: () => void): () => void {
  beforeListeners.add(listener);
  return () => { beforeListeners.delete(listener); };
}
