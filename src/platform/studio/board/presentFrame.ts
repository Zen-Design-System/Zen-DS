import { canvasApi } from "../canvas/viewport";
import { studioStore } from "../store";
import { findFrame, getStudioFrames } from "./frames";

/*
 * Present and zoom-to-frame, the actions the toolbar, the frame chrome, the inspector and Quick actions run. Kept out of
 * Present.tsx so that module exports components only and a hot update of it stays a Fast Refresh.
 */

/** Where focus goes back to when Present ends (the Present button, or whatever had focus on F). */
let returnFocus: HTMLElement | null = null;

/** The element Present gives the focus back to, once (the Present layer takes it when it closes). */
export function takeReturnFocus() {
  const target = returnFocus;
  returnFocus = null;
  return target;
}

/** Which of Present's ‹ › buttons takes the focus in the frame stepped to (the button that stepped, for keyboard use).
 *  Read, never consumed, so a remount (Strict Mode's second effect run) finds it too; a new Present or step replaces it. */
let stepFocus: { frameId: string; button: "prev" | "next" } | null = null;

export function stepFocusFor(frameId: string) {
  return stepFocus?.frameId === frameId ? stepFocus.button : null;
}

/**
 * Present the example frame `delta` steps away in board order (Present's ‹ › buttons and ← / →), like Figma's presentation
 * arrows; it stays put at either end. `focus` names the button that stepped, so it keeps the focus in the next frame.
 */
export function stepPresent(delta: -1 | 1, focus: "prev" | "next" | null = null) {
  const examples = getStudioFrames().filter((frame) => frame.kind === "example" && frame.example);
  const index = examples.findIndex((frame) => frame.id === studioStore.getState().presenting);
  const next = index < 0 ? undefined : examples[index + delta];
  if (!next) return;
  stepFocus = focus ? { frameId: next.id, button: focus } : null;
  studioStore.setState({ presenting: next.id, selection: { kind: "frame", frameId: next.id } });
}

/**
 * Present a frame (spec §4): an example re-renders full screen at 100% outside the canvas; the playground, docs and
 * document frames are page-sized, so Present zooms the canvas to fit them instead.
 */
export function presentFrame(frameId: string) {
  const frame = findFrame(frameId);
  if (!frame) return;
  if (frame.kind === "example" && frame.example) {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    stepFocus = null;
    studioStore.setState({ presenting: frameId, selection: { kind: "frame", frameId } });
  } else {
    zoomToFrame(frame.element, 24);
  }
}

/**
 * Zoom the canvas to a frame: the whole frame when it fits at a readable zoom. The reading frames (Docs, a Document page)
 * and any frame much taller than the canvas fit their width instead, top-aligned, so they open readable at their top.
 */
export function zoomToFrame(element: HTMLElement, padding = 48) {
  const rect = element.getBoundingClientRect();
  const viewport = canvasApi.getViewportElement();
  if (!viewport || !rect.width || !rect.height) return;
  const reading = ["docs", "document"].includes(element.dataset.studioFrame ?? "");
  const byHeight = (viewport.clientHeight - padding * 2) / rect.height;
  const byWidth = (viewport.clientWidth - padding * 2) / rect.width;
  if (reading || byHeight < byWidth * 0.75) canvasApi.zoomToWidth(rect, { margin: padding, maxZoom: 1 });
  else canvasApi.zoomToRect(rect, { padding, maxZoom: 1 });
}
