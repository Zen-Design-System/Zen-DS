import { BREAKPOINT_LABELS, breakpointDevice, screenBreakpoint, viewDevice, type ScreenDevice, type ScreenView, type ZenBreakpointKey } from "../../../../tools/studio/screen-devices.mjs";
import { pageKey, setFrameOverride, studioStore, useStudio } from "../store";
import type { PageDevice } from "./proto/runtime";

/*
 * A Screen's breakpoints on the canvas (docs/research/studio-responsive-breakpoints-2026-10-26.md §3): the view switch on
 * its label shows it on another breakpoint's device, as Present's simulator does, without changing the page. The view is
 * a frame override of this tab (`view`, kept in sessionStorage with the others): never in the page, the handoff, the Code
 * panel or a push, and no undo step. The saved Screen is the primary; "Make a separate Screen" (§5) draws a version of it
 * for a breakpoint (`versionOf`), which Play, Present and Open on phone show in its place at that breakpoint.
 */

export type { ScreenView };

/** A builder Screen's frame id ("screen:<id>[:<state>]"). */
export const isScreenFrame = (frameId: string | null | undefined): frameId is string => typeof frameId === "string" && frameId.startsWith("screen:");

/** The view of a Screen frame, if one is on. */
export function screenViewOf(frameId: string, state = studioStore.getState()): ScreenView | undefined {
  if (!isScreenFrame(frameId)) return undefined;
  return state.frameOverrides[pageKey(state.page, state.collection, state.localPage)]?.[frameId]?.view;
}

export function useScreenView(frameId: string): ScreenView | undefined {
  return useStudio((state) => screenViewOf(frameId, state));
}

/** Shows a Screen on `view` (null: as saved, the view ends). */
export function setScreenView(frameId: string, view: ScreenView | null) {
  const state = studioStore.getState();
  setFrameOverride(pageKey(state.page, state.collection, state.localPage), frameId, { view: view ?? undefined });
}

/** What a Screen frame is drawn as: its saved device type, width and height. */
export type ScreenShape = { device: PageDevice; width: number; height?: number };

/** The breakpoint a Screen frame shows: its view's device, else its own (screen-devices.mjs screenBreakpoint). */
export function shownBreakpoint(shape: ScreenShape, view: ScreenView | undefined): ZenBreakpointKey {
  const device = viewDevice(view, shape.height);
  return device ? screenBreakpoint(device.device, device.width) : screenBreakpoint(shape.device, shape.width);
}

/** The view a breakpoint's button puts on (null: the Screen's own breakpoint, the view ends). */
export function viewForBreakpoint(shape: ScreenShape, breakpoint: ZenBreakpointKey, os: "ios" | "android"): ScreenView | null {
  if (screenBreakpoint(shape.device, shape.width) === breakpoint) return null;
  const device = breakpointDevice(breakpoint, os);
  return device ? { device: device.id, width: device.width } : null;
}

/** The view's device and its words: "Viewing Mobile · 390". */
export function viewLabel(view: ScreenView, height?: number): { device: ScreenDevice | undefined; breakpoint: ZenBreakpointKey; text: string } {
  const device = viewDevice(view, height);
  const breakpoint = device ? screenBreakpoint(device.device, device.width) : "desktop";
  return { device, breakpoint, text: `Viewing ${BREAKPOINT_LABELS[breakpoint]} · ${view.width}` };
}

/**
 * "Make a separate Screen" (§5): the Screen copied as a new Screen drawn for the viewed device (its size; the copy of
 * `home` viewed on Mobile is `home-mobile`, "Home · Mobile"), in the free space right of the original, as the version of
 * the primary (`versionOf`). The copy's content is its own from then on (shared parts stay shared as components, ⌥⌘K);
 * the original goes back to its own breakpoint. One edit, one undo step; the copy is selected.
 */
export async function makeSeparateScreen(frameId: string, view: ScreenView, shape: ScreenShape & { id: string; title: string; versionOf?: string }): Promise<string | null> {
  const localPage = studioStore.getState().localPage;
  const device = viewDevice(view, shape.height);
  if (!localPage || !device) return null;
  const breakpoint = screenBreakpoint(device.device, device.width);
  const name = BREAKPOINT_LABELS[breakpoint];
  const primary = shape.versionOf ?? shape.id;
  const props: Record<string, string | number> = { device: device.device, width: device.width, height: device.height, title: `${shape.title} · ${name}`, versionOf: primary };
  if (device.device === "tablet" && device.layout === "desktop") props.layout = "desktop";
  setScreenView(frameId, null);
  const { copyFrame } = await import("./frameEdit");
  return copyFrame(localPage, frameId, null, { label: `Make a separate ${name} Screen`, as: { id: `${primary}-${breakpoint}`, props, drop: props.layout ? [] : ["layout"] } });
}

