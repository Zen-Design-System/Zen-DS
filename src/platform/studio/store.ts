import { useSyncExternalStore } from "react";
import type { PlatformPage } from "../PlatformExamples";
import { HISTORY_LIMIT } from "./history";
import type { StudioFrameOverride, StudioState, StudioViewport } from "./types";

/*
 * Zen Studio state: one small external store (no library). UI state that should survive the full reloads HMR does
 * after a source edit lives in sessionStorage; personal preferences (role, chrome theme, preview modes) in localStorage.
 */

const SESSION_KEY = "zen-studio:session";
const PREFS_KEY = "zen-studio:prefs";

const defaults: StudioState = {
  page: "overviews",
  localPage: null,
  collection: null,
  tool: "select",
  role: "admin",
  chromeTheme: "light",
  preview: { theme: "light", density: "compact", componentTheme: "neutral-s1", typography: "dashboard", radius: "rounded", emphasis: "medium", contrast: "standard" },
  viewports: {},
  selection: null,
  leftTab: "pages",
  inspectorTab: "design",
  presenting: null,
  frameOverrides: {},
  undo: [],
  redo: [],
  drawer: null,
  panels: { left: 272, right: 320, ui: true },
};

type SessionPart = Pick<StudioState, "page" | "localPage" | "collection" | "tool" | "viewports" | "selection" | "leftTab" | "inspectorTab" | "frameOverrides" | "undo" | "redo">;
type PrefsPart = Pick<StudioState, "role" | "chromeTheme" | "preview" | "panels">;

function read<T>(storage: () => Storage, key: string): Partial<T> {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as Partial<T>) : {};
  } catch {
    return {};
  }
}

function write(storage: () => Storage, key: string, value: unknown) {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full quota: the Studio still works, it only forgets its view on reload.
  }
}

function initialState(): StudioState {
  const session = read<SessionPart>(() => window.sessionStorage, SESSION_KEY);
  const prefs = read<PrefsPart>(() => window.localStorage, PREFS_KEY);
  return {
    ...defaults,
    ...session,
    ...prefs,
    // One light/dark for the chrome and the canvas (shell/modes.ts setStudioTheme): older prefs could hold two.
    preview: { ...defaults.preview, ...prefs.preview, theme: prefs.chromeTheme ?? prefs.preview?.theme ?? defaults.preview.theme },
    panels: { ...defaults.panels, ...prefs.panels },
    // Undo history (context hunks, see history.ts) keeps at most HISTORY_LIMIT edits each way.
    undo: (session.undo ?? []).slice(-HISTORY_LIMIT),
    redo: (session.redo ?? []).slice(-HISTORY_LIMIT),
    presenting: null,
    drawer: null,
  };
}

let state: StudioState = typeof window === "undefined" ? defaults : initialState();
const listeners = new Set<() => void>();
let persistTimer: number | undefined;

/** Write the persisted parts now. */
export function flushStudioStore() {
  window.clearTimeout(persistTimer);
  const { page, localPage, collection, tool, viewports, selection, leftTab, inspectorTab, frameOverrides, undo, redo, role, chromeTheme, preview, panels } = state;
  write(() => window.sessionStorage, SESSION_KEY, { page, localPage, collection, tool, viewports, selection, leftTab, inspectorTab, frameOverrides, undo, redo } satisfies SessionPart);
  write(() => window.localStorage, PREFS_KEY, { role, chromeTheme, preview, panels } satisfies PrefsPart);
}

function persist() {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(flushStudioStore, 150);
}

// A source edit can make Vite reload the page before the debounce fires: keep the view, selection and history.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushStudioStore);
  import.meta.hot?.on("vite:beforeFullReload", flushStudioStore);
}

export const studioStore = {
  getState: () => state,
  setState(update: Partial<StudioState> | ((current: StudioState) => Partial<StudioState>)) {
    const patch = typeof update === "function" ? update(state) : update;
    let changed = false;
    for (const key of Object.keys(patch) as Array<keyof StudioState>) if (patch[key] !== state[key]) { changed = true; break; }
    if (!changed) return;
    state = { ...state, ...patch };
    persist();
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

/** Subscribe to a slice. The selector must return a primitive or a reference that already lives in the state. */
export function useStudio<T>(selector: (state: StudioState) => T): T {
  return useSyncExternalStore(studioStore.subscribe, () => selector(state), () => selector(defaults));
}

/** The key viewports and frame overrides are stored under: the page, or the token collection inside Design Tokens. */
/** The key of what the canvas shows (viewports, frame overrides): a builder page's "local:<id>", else the docs page's. */
export function pageKey(page: PlatformPage, collection: string | null, localPage?: string | null) {
  if (localPage) return `local:${localPage}`;
  return page === "design-tokens" && collection ? `design-tokens/${collection}` : page;
}

export function setViewport(key: string, viewport: StudioViewport) {
  studioStore.setState((current) => ({ viewports: { ...current.viewports, [key]: viewport } }));
}

export function setFrameOverride(key: string, frameId: string, override: StudioFrameOverride) {
  studioStore.setState((current) => {
    const page = current.frameOverrides[key] ?? {};
    return { frameOverrides: { ...current.frameOverrides, [key]: { ...page, [frameId]: { ...page[frameId], ...override } } } };
  });
}

/** The current user may change source code (admin, and a dev server that accepts writes). */
/** Admin, and a dev server to write the source, or a builder page (kept in this browser, any build). */
export function canEdit(current: StudioState = state) {
  return current.role === "admin" && (import.meta.env.DEV || Boolean(current.localPage));
}
