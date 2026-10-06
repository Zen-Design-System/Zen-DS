import { useEffect, useState } from "react";
import { studioStore, useStudio } from "../store";
import type { StudioState } from "../types";

/*
 * Side-panel layout of Zen Studio. ≥ 1280px both panels are docked; 1024–1279px the Pages | Layers panel becomes a drawer
 * while the Inspector stays docked; < 1024px both are drawers. ⌘/Ctrl+\ hides both docked panels (Figma's Show/Hide UI):
 * they stay reachable as drawers from the toolbar. Docked panels are resizable (StudioApp's separators).
 */

export const LEFT_DRAWER_QUERY = "(max-width: 1279.98px)";
export const NARROW_QUERY = "(max-width: 1023.98px)";
/** A phone: the toolbar keeps Panels, the tools, Modes (icon), the drafts and Inspector; the rest moves to the brand menu. */
export const PHONE_QUERY = "(max-width: 599.98px)";

export const PANEL_LIMITS = {
  left: { min: 220, max: 400, initial: 272 },
  right: { min: 280, max: 720, initial: 320 },
} as const;
/** The Inspector's width while the code view is expanded ("zen-studio:expand-code"). */
export const CODE_EXPANDED_WIDTH = 720;
/** Keyboard step of the resize handles. */
export const PANEL_STEP = 16;

export const clampPanel = (side: "left" | "right", width: number) => Math.round(Math.min(PANEL_LIMITS[side].max, Math.max(PANEL_LIMITS[side].min, width)));

const matches = (query: string) => typeof window !== "undefined" && window.matchMedia(query).matches;

function useMedia(query: string) {
  const [value, setValue] = useState(() => matches(query));
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setValue(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return value;
}

export type PanelLayout = { leftDocked: boolean; rightDocked: boolean; narrow: boolean; phone: boolean };

function layoutFor(ui: boolean, leftDrawer: boolean, narrow: boolean, phone: boolean): PanelLayout {
  return { leftDocked: ui && !leftDrawer, rightDocked: ui && !narrow, narrow, phone };
}

/** Which side panels are docked right now (the rest open as drawers). */
export function usePanelLayout(): PanelLayout {
  const ui = useStudio((state) => state.panels.ui);
  return layoutFor(ui, useMedia(LEFT_DRAWER_QUERY), useMedia(NARROW_QUERY), useMedia(PHONE_QUERY));
}

export function panelLayout(state: StudioState = studioStore.getState()): PanelLayout {
  return layoutFor(state.panels.ui, matches(LEFT_DRAWER_QUERY), matches(NARROW_QUERY), matches(PHONE_QUERY));
}

/** ⌘/Ctrl+\: hide or show both side panels. */
export function toggleSidePanels() {
  studioStore.setState((state) => ({ panels: { ...state.panels, ui: !state.panels.ui }, drawer: null }));
}

/** Shows the Pages | Layers panel: docked it is already visible, otherwise it opens as a drawer. */
export function revealLeftPanel() {
  if (!panelLayout().leftDocked) studioStore.setState({ drawer: "left" });
}
