import { useSyncExternalStore, type ReactNode } from "react";
import type { StudioFrameKind } from "../types";

/*
 * The frames (and sections) on the board right now, in board order. StudioFrame registers itself on mount; the frame
 * chrome (labels, toolbars), Present and "zoom to fit" read this list. Other modules can also find frames in the DOM
 * by [data-studio-frame].
 */

export type StudioExample = { title: string; description: string; code: string; wide?: boolean; screen?: boolean; render: () => ReactNode };

export type StudioFrameEntry = {
  id: string;
  kind: StudioFrameKind;
  label: string;
  /** The frame body root (carries data-studio-frame). */
  element: HTMLElement;
  /** The rule width (before a frame override). */
  baseWidth: number;
  example?: StudioExample;
};

/** `count`: the frames it holds, shown on its name tab (Examples); none for a fixed group (Component, Docs). */
export type StudioSectionEntry = { id: string; label: string; count?: number; element: HTMLElement };

let frames: StudioFrameEntry[] = [];
let sections: StudioSectionEntry[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** Board order = document order of the frame elements. */
const byDocumentOrder = (left: { element: HTMLElement }, right: { element: HTMLElement }) =>
  left.element === right.element ? 0 : left.element.compareDocumentPosition(right.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;

export function registerFrame(entry: StudioFrameEntry) {
  frames = [...frames.filter((frame) => frame.id !== entry.id), entry].sort(byDocumentOrder);
  emit();
  return () => {
    // A remount may already have replaced this entry with a new element: only drop our own.
    if (!frames.some((frame) => frame.element === entry.element)) return;
    frames = frames.filter((frame) => frame.element !== entry.element);
    emit();
  };
}

export function registerSection(entry: StudioSectionEntry) {
  sections = [...sections.filter((section) => section.id !== entry.id), entry];
  emit();
  return () => {
    if (!sections.some((section) => section.element === entry.element)) return;
    sections = sections.filter((section) => section.element !== entry.element);
    emit();
  };
}

export const getStudioFrames = () => frames;
/** Called when frames or sections register or leave (the frame drafts follow the board). */
export const subscribeStudioFrames = subscribe;
export const getStudioSections = () => sections;
export const findFrame = (id: string | null | undefined) => (id ? frames.find((frame) => frame.id === id) ?? null : null);

/*
 * Frames that moved without changing size (a builder page's free frames: a drag, a nudge, a place read from the page):
 * whatever caches frame boxes measures again (the frame chrome; the prototype arrows), as a ResizeObserver never fires.
 */
const moveListeners = new Set<() => void>();
export function notifyFramesMoved() {
  moveListeners.forEach((listener) => listener());
}
export function onFramesMoved(listener: () => void) {
  moveListeners.add(listener);
  return () => { moveListeners.delete(listener); };
}

/**
 * Selects the frame `frameId` once the board shows it (a frame just added): selected before, the board's next render of
 * an earlier text (an edit that pinned the row first) would find it missing and clear the selection. It waits for the
 * frame to register (not for animation frames, which a busy or hidden tab slows: E2E B-20 missed a 2 s window in the
 * full run), up to `timeout`.
 */
export function selectFrameWhenShown(frameId: string, select: (frameId: string) => void, timeout = 10_000) {
  arriving.set(frameId, Date.now() + timeout);
  const shown = () => { arriving.set(frameId, Date.now() + ARRIVED_GRACE); select(frameId); };
  if (frames.some((frame) => frame.id === frameId)) { shown(); return; }
  let done = false;
  const stop = () => { done = true; unsubscribe(); window.clearTimeout(timer); };
  const unsubscribe = subscribe(() => {
    if (done || !frames.some((frame) => frame.id === frameId)) return;
    stop();
    shown();
  });
  const timer = window.setTimeout(() => { stop(); arriving.delete(frameId); }, timeout);
}

/*
 * Frames the Studio just added and selects (selectFrameWhenShown), until a short while after they show: the board keeps
 * their selection through a render of an older page text. Under load the text of an earlier edit (the row pinned
 * before a preset frame went in) can land after the new frame's and drop its selection (E2E B-20 in full runs,
 * 2026-10-20).
 */
const ARRIVED_GRACE = 4_000;
const arriving = new Map<string, number>();
/** How long (ms) the board keeps `frameId`'s selection without the page showing it: 0 once it has settled. */
export function arrivingFor(frameId: string): number {
  const until = arriving.get(frameId);
  if (until === undefined) return 0;
  const left = until - Date.now();
  if (left <= 0) { arriving.delete(frameId); return 0; }
  return left;
}

export function useStudioFrames() {
  return useSyncExternalStore(subscribe, getStudioFrames, getStudioFrames);
}

export function useStudioSections() {
  return useSyncExternalStore(subscribe, getStudioSections, getStudioSections);
}
