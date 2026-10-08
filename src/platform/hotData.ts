import { useSyncExternalStore } from "react";

/*
 * Dev only: the docs' data exports (an example page's `examples`, an app-layer group's `pages`, `examples`,
 * `templates`) keep their identity across hot updates, their records updated in place. Fast Refresh accepts a module
 * only if its non-component exports are unchanged: a new list sent every edit (a Zen Studio write included) up through
 * the examples registry, which re-ran every example of the page from its first state (a thread opened in a chat
 * example went back to its list, the selected nested element disappeared). Readers that render the records
 * (PlatformShowcases, the Studio board) re-render on useHotDataVersion, so they show the new code and titles.
 */

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** The records a data export holds (page metas, example or template defs) and its shape (keys, list lengths). */
function recordsOf(value: object): { shape: string; records: Record<string, unknown>[] } | null {
  const shape: string[] = [];
  const records: Record<string, unknown>[] = [];
  for (const [key, item] of Object.entries(value)) {
    const list: unknown[] = Array.isArray(item) ? item : [item];
    if (!list.every(isRecord)) return null;
    shape.push(`${key}:${Array.isArray(item) ? list.length : "-"}`);
    records.push(...list);
  }
  return { shape: shape.join(","), records };
}

let version = 0;
const listeners = new Set<() => void>();
let pending = false;
function notify() {
  if (!pending) return;
  pending = false;
  version += 1;
  listeners.forEach((listener) => listener());
}
/*
 * One re-render of the readers once the update has landed, not sooner: React Refresh maps a component's new function to
 * its old one only when it performs the refresh (debounced after the modules ran), so a reader rendering the new
 * `render()` before that meets an unknown component type and remounts the example. @vitejs/plugin-react runs these
 * hooks right before its (synchronous) performReactRefresh; a timer set there fires after it. Without the hook, a
 * delay well past its 16 ms debounce.
 */
const registerBeforeRefresh = typeof window === "undefined" ? undefined : (window as { __registerBeforePerformReactRefresh?: (hook: () => void) => void }).__registerBeforePerformReactRefresh;
registerBeforeRefresh?.(() => { if (pending) setTimeout(notify, 0); });
function bump() {
  if (pending) return;
  pending = true;
  setTimeout(notify, registerBeforeRefresh ? 1000 : 150);
}

/**
 * A data export (`key`) that keeps its identity across hot updates: the previous object comes back with its records
 * updated in place. A new shape (a page or an example added or removed) takes the new object: the module then cannot
 * Fast Refresh and its importers update as before.
 */
export function keepOnHotUpdate<T extends object>(hot: ImportMeta["hot"], key: string, next: T): T {
  if (!hot) return next;
  const previous = hot.data[key] as T | undefined;
  const from = previous && recordsOf(previous);
  const to = recordsOf(next);
  if (!previous || !from || !to || from.shape !== to.shape) {
    hot.data[key] = next;
    return next;
  }
  from.records.forEach((record, index) => {
    for (const field of Object.keys(record)) if (!(field in to.records[index])) delete record[field];
    Object.assign(record, to.records[index]);
  });
  bump();
  return previous;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

/** Changes when a data export was updated in place: a reader of its records renders again. */
export const useHotDataVersion = () => useSyncExternalStore(subscribe, () => version, () => version);
