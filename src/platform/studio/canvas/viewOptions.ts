import { useSyncExternalStore } from "react";

/*
 * Figma's View options on the canvas (Studio parity F10): Pixel grid (⌘', from 400%), Outlines (⌘Y: every layer as a
 * thin outline), Rulers (⇧R, with guides) and Layout guides (⌃G: the frames' columns). They are this browser's view of
 * the canvas, as in Figma (not part of the page): kept in localStorage, the same on every page.
 */

export type ViewOptions = { pixelGrid: boolean; outlines: boolean; rulers: boolean; layoutGuides: boolean };
export type ViewOption = keyof ViewOptions;

const KEY = "zen-studio:view-options";
/** Figma's defaults: the pixel grid and layout guides show, outlines and rulers do not. */
const DEFAULTS: ViewOptions = { pixelGrid: true, outlines: false, rulers: false, layoutGuides: true };
/** Each option's name in Figma's View menu (status line, Actions). */
export const VIEW_OPTION_NAMES: Readonly<Record<ViewOption, string>> = { pixelGrid: "Pixel grid", outlines: "Outlines", rulers: "Rulers", layoutGuides: "Layout guides" };

function read(): ViewOptions {
  try {
    const stored = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Partial<ViewOptions>;
    return { ...DEFAULTS, ...Object.fromEntries(Object.entries(stored).filter(([name, value]) => name in DEFAULTS && typeof value === "boolean")) };
  } catch {
    return { ...DEFAULTS };
  }
}

let options: ViewOptions = typeof window === "undefined" ? { ...DEFAULTS } : read();
const listeners = new Set<() => void>();

export const viewOptions = {
  get: (): ViewOptions => options,
  set(patch: Partial<ViewOptions>) {
    options = { ...options, ...patch };
    try { window.localStorage.setItem(KEY, JSON.stringify(options)); } catch { /* private window: this session only */ }
    listeners.forEach((listener) => listener());
  },
  /** Turns `name` on or off; returns its new state. */
  toggle(name: ViewOption): boolean {
    viewOptions.set({ [name]: !options[name] });
    return options[name];
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

export const useViewOptions = () => useSyncExternalStore(viewOptions.subscribe, viewOptions.get, () => DEFAULTS);
