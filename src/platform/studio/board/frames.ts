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

export type StudioSectionEntry = { id: string; label: string; count: number; element: HTMLElement };

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

export function useStudioFrames() {
  return useSyncExternalStore(subscribe, getStudioFrames, getStudioFrames);
}

export function useStudioSections() {
  return useSyncExternalStore(subscribe, getStudioSections, getStudioSections);
}
