import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { PlatformPage } from "../PlatformExamples";

/*
 * The seam between the docs pages and Zen Studio (the canvas tool). The docs files (PlatformExamples, PlatformCode,
 * PlatformShowcases) import only this module, never the Studio UI, so the import graph stays acyclic and the classic
 * platform renders exactly as before when no StudioBridgeContext is provided (?ui=classic, Playwright, the QA gate).
 * One exception: PlatformCode renders the Studio's code view (code/CodeView, a leaf) in the classic docs too.
 */

/** A component page as ExamplePage hands it to the Studio: the Studio lays it out as canvas frames. */
export type StudioPageParts = {
  page: PlatformPage;
  eyebrow: string;
  title: string;
  description: string;
  /** The playground sections (each ComponentPreview panel inside is one selectable playground). */
  playground: ReactNode;
};

export type StudioBridge = {
  /** Lays out a component page on the canvas (ExamplePage calls it instead of the docs page template). */
  renderComponentPage: (parts: StudioPageParts) => ReactNode;
  /** Renders a code sample in the Studio's code view (PlatformCode delegates to it inside a playground panel). */
  renderCode: (code: string) => ReactNode;
  /** Inspector nodes the active panel portals its controls and code into. */
  controlsSlot: HTMLElement | null;
  codeSlot: HTMLElement | null;
};

export const StudioBridgeContext = createContext<StudioBridge | null>(null);
export const useStudioBridge = () => useContext(StudioBridgeContext);

/*
 * The active playground panel (ComponentPreview id) whose controls and code show in the inspector. A tiny external
 * store instead of a bridge field, so switching panels re-renders only the two panels involved, never the whole board.
 */
let activePanel: string | null = null;
const panelListeners = new Set<() => void>();
const subscribePanel = (listener: () => void) => { panelListeners.add(listener); return () => { panelListeners.delete(listener); }; };

export function setStudioActivePanel(id: string | null) {
  if (id === activePanel) return;
  activePanel = id;
  panelListeners.forEach((listener) => listener());
}

/** Whether the panel `id` is the active one (always false outside the Studio). */
export function useStudioPanelActive(id: string) {
  return useSyncExternalStore(subscribePanel, () => activePanel === id, () => false);
}

/** Provided by ComponentPreview in the Studio: whether this playground panel is the one the inspector shows. */
export type StudioPanel = { id: string; active: boolean; controlsSlot: HTMLElement | null; codeSlot: HTMLElement | null };

export const StudioPanelContext = createContext<StudioPanel | null>(null);
export const useStudioPanel = () => useContext(StudioPanelContext);
