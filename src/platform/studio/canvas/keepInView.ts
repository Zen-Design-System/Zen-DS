import { useEffect } from "react";
import { getStudioFrames, subscribeStudioFrames } from "../board/frames";
import { selectedPartStore } from "../select/parts";
import { findBySrc, rectOf } from "../select/picker";
import { studioStore } from "../store";
import type { StudioSelection } from "../types";
import { canvasApi, getViewport, getViewportBox, setViewportNow, toWorldRect } from "./viewport";

/*
 * The selection stays in view when the board lays itself out again (spec §3): a frame above it in its column changes
 * height, the Playground grows, an edit reflows its frame. Like Figma, nothing pans while the selection still shows on
 * the canvas (VISIBLE_MIN of it, or all of a smaller one); one that showed before the change and does not after is
 * brought back with the smallest pan, eased (only along the axis it left by). Pan, zoom and a new selection only update
 * what "before" means.
 */

type Rect = { x: number; y: number; width: number; height: number };

/** Screen px kept between a selection brought back and the canvas edge (as canvasApi.ensureVisible keeps). */
const MARGIN = 32;
/** A selection shows when this much of it (screen px, or all of it when smaller) is on the canvas along each axis. */
const VISIBLE_MIN = 24;

function keyOf(selection: StudioSelection | null) {
  if (!selection) return "";
  if (selection.kind === "frame") return `frame:${selection.frameId}`;
  return `node:${selection.src}#${selection.instance}${selection.part ? `/${selection.part.path.join(".")}` : ""}`;
}

function frameElement(world: HTMLElement, frameId: string | null) {
  if (!frameId) return null;
  return Array.from(world.querySelectorAll<HTMLElement>("[data-studio-frame]")).find((frame) => frame.dataset.studioFrame === frameId) ?? null;
}

/** The selection on the canvas: its client rect and the frame it sits in (a collapsed node stands for its frame's box). */
function locate(world: HTMLElement, selection: StudioSelection, cache: { key: string; hosts: Element[] }): { rect: DOMRect; frame: HTMLElement } | null {
  const frame = frameElement(world, selection.frameId);
  if (!frame) return null;
  if (selection.kind === "frame") return { rect: frame.getBoundingClientRect(), frame };
  const part = selection.part ? selectedPartStore.get() : null;
  let hosts = part && part.element.isConnected ? part.hosts : null;
  if (!hosts) {
    const key = keyOf(selection);
    if (cache.key !== key || !cache.hosts.length || cache.hosts.some((host) => !host.isConnected)) {
      // The same lookup as the selection layer: the rendered instance of the selected JSX element.
      const found = findBySrc(world, selection.src);
      cache.key = key;
      cache.hosts = (found[selection.instance] ?? found[0])?.hosts ?? [];
    }
    hosts = cache.hosts;
  }
  // Collapsed (a cleared slot, a hidden element): its frame stands for it.
  const rect = rectOf(hosts.filter((host) => frame.contains(host)));
  return { rect: rect && rect.width >= 1 && rect.height >= 1 ? rect : frame.getBoundingClientRect(), frame };
}

/** World rect → its box on the canvas (viewport-local px), from the current pan and zoom (no layout read). */
function onCanvas(rect: Rect) {
  const { x, y, zoom } = getViewport();
  return { left: rect.x * zoom + x, top: rect.y * zoom + y, width: rect.width * zoom, height: rect.height * zoom };
}

/** Does [start, start + size) show on a canvas `view` px long (VISIBLE_MIN of it, or all of a smaller one)? */
const shows = (start: number, size: number, view: number) => Math.min(start + size, view) - Math.max(start, 0) >= Math.max(Math.min(VISIBLE_MIN, size), 0.5);

function visible(rect: Rect) {
  const box = getViewportBox();
  const local = onCanvas(rect);
  return shows(local.left, local.width, box.width) && shows(local.top, local.height, box.height);
}

/** The smallest move along one axis that brings [start, start + size) back on a canvas `view` px long. */
function nudge(start: number, size: number, view: number) {
  if (shows(start, size, view)) return 0;
  if (size <= view - MARGIN * 2) return start < MARGIN ? MARGIN - start : view - MARGIN - (start + size);
  // Larger than the canvas: its near edge comes in to the margin, so as much of it as fits shows.
  return start > MARGIN ? MARGIN - start : view - MARGIN - (start + size);
}

/** Watches the board's size and pans the selection back into view after a relayout (see above). */
export function useKeepSelectionInView(viewport: HTMLElement | null, world: HTMLElement | null) {
  useEffect(() => {
    if (!viewport || !world) return undefined;
    const cache = { key: "", hosts: [] as Element[] };
    // The selection before the next change: which one, in which frame element, where (world), and whether it showed.
    let before: { key: string; frame: HTMLElement; rect: Rect; visible: boolean } | null = null;

    const measure = () => {
      const selection = studioStore.getState().selection;
      const found = selection ? locate(world, selection, cache) : null;
      if (!selection || !found) return null;
      const rect = toWorldRect(found.rect);
      return { key: keyOf(selection), frame: found.frame, rect, visible: visible(rect) };
    };
    const remember = () => { before = measure(); };
    // Pan and zoom move the canvas, not the board: the stored box only gets a new answer to "does it show?".
    const offCanvas = canvasApi.onChange(() => { if (before) before.visible = visible(before.rect); });
    let lastKey = keyOf(studioStore.getState().selection);
    const offStore = studioStore.subscribe(() => {
      const key = keyOf(studioStore.getState().selection);
      if (key === lastKey) return;
      lastKey = key;
      remember();
    });

    let frame = 0;
    const check = () => {
      frame = 0;
      if (studioStore.getState().presenting) { remember(); return; }
      const previous = before;
      const now = measure();
      before = now;
      // Another selection or another frame element (a page change, a remount): nothing to keep.
      if (!previous || !now || previous.key !== now.key || previous.frame !== now.frame || !previous.visible || now.visible) return;
      const box = getViewportBox();
      const local = onCanvas(now.rect);
      const dx = nudge(local.left, local.width, box.width);
      const dy = nudge(local.top, local.height, box.height);
      if (!dx && !dy) return;
      const current = getViewport();
      setViewportNow({ ...current, x: current.x + dx, y: current.y + dy }, { animate: true });
      now.visible = true;
    };
    // After the board has placed its frames (their own ResizeObserver runs in the same pass): the next frame.
    const schedule = () => { if (!frame) frame = requestAnimationFrame(check); };
    const observer = new ResizeObserver(schedule);
    const observed = new Set<Element>();
    const watch = () => {
      const targets = new Set<Element>([world, ...getStudioFrames().map((entry) => entry.element)]);
      for (const element of observed) if (!targets.has(element)) { observer.unobserve(element); observed.delete(element); }
      for (const element of targets) if (!observed.has(element)) { observer.observe(element); observed.add(element); }
    };
    watch();
    const offFrames = subscribeStudioFrames(watch);
    remember();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      offFrames();
      offStore();
      offCanvas();
    };
  }, [viewport, world]);
}
