import { useSyncExternalStore } from "react";
import type { StudioViewport } from "../types";

/*
 * The canvas viewport (spec §3): one module-level controller that the mounted StudioCanvas attaches its viewport and
 * world elements to. World → screen: screenX = worldX * zoom + x (x/y in viewport-local pixels). Pan and zoom write the
 * world's transform directly (no React render per frame) and notify `onChange` listeners (selection outlines, frame
 * labels, the zoom percentage).
 */

export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 4;
/** Zoom in / out walk this ladder (Figma-like steps). */
export const zoomSteps = [0.02, 0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4] as const;
/**
 * The first visit of a page fits its first frame's width in the visible canvas, down to this zoom (below it text is too
 * small to read; a wider frame then runs off to the right, one pan away). At 1280 and 1024 the Playground fits at ~62%
 * (docs/research/studio-ux-audit-2026-10-04.md §03: at the old 75% floor its right edge sat under the Inspector).
 */
export const FIRST_VISIT_MIN_ZOOM = 0.5;
/** Dot grid spacing at 100% (world px); it doubles while it would be denser than MIN_GRID screen px. */
const GRID = 24;
const MIN_GRID = 12;
/** Below this zoom the dot grid is hidden (too dense to mean anything). */
const GRID_HIDDEN_BELOW = 0.25;

export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

type Listener = () => void;
type Rect = { x: number; y: number; width: number; height: number };

const listeners = new Set<Listener>();
let viewportEl: HTMLElement | null = null;
let worldEl: HTMLElement | null = null;
let gridEl: HTMLElement | null = null;
let current: StudioViewport = { x: 48, y: 48, zoom: 1 };
let animation = 0;
/** Where the running animation ends. */
let target: StudioViewport | null = null;
let persist: ((viewport: StudioViewport) => void) | null = null;
let fitBounds: (() => Rect | null) | null = null;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** --studio-zoom (in-world hairlines: 1px on screen at any zoom) moves in 1/8-octave steps: every write restyles the
 * whole world, so a pinch writes it a few dozen times instead of on every wheel event (a hairline is off by ≤ 5%). */
const quantizeZoom = (zoom: number) => String(Math.round(Math.pow(2, Math.round(Math.log2(zoom) * 8) / 8) * 1e4) / 1e4);
/** Below this zoom the viewport carries data-zoom-band="low" (CSS hides world-scaled text that would collide with labels). */
const LOW_ZOOM = 0.2;

function paint() {
  const { x, y, zoom } = current;
  if (worldEl) {
    worldEl.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
    const zoomText = quantizeZoom(zoom);
    if (worldEl.style.getPropertyValue("--studio-zoom") !== zoomText) worldEl.style.setProperty("--studio-zoom", zoomText);
  }
  if (viewportEl) {
    const band = zoom < LOW_ZOOM ? "low" : "normal";
    if (viewportEl.dataset.zoomBand !== band) viewportEl.dataset.zoomBand = band;
  }
  if (gridEl) {
    let size = GRID * zoom;
    while (size < MIN_GRID) size *= 2;
    const offset = (value: number) => ((value % size) + size) % size;
    gridEl.style.backgroundSize = `${size}px ${size}px`;
    gridEl.style.backgroundPosition = `${offset(x)}px ${offset(y)}px`;
    const hidden = zoom < GRID_HIDDEN_BELOW ? "true" : "false";
    if (gridEl.dataset.hidden !== hidden) gridEl.dataset.hidden = hidden;
  }
}

function commit(next: StudioViewport) {
  current = { x: next.x, y: next.y, zoom: clampZoom(next.zoom) };
  paint();
  persist?.(current);
  listeners.forEach((listener) => listener());
}

function stopAnimation() {
  if (animation) cancelAnimationFrame(animation);
  animation = 0;
  target = null;
}

/** Moves to `to`, eased over ~220ms (instant with reduced motion or when `animate` is false). */
export function setViewportNow(to: StudioViewport, options: { animate?: boolean } = {}) {
  stopAnimation();
  const next = { ...to, zoom: clampZoom(to.zoom) };
  if (!options.animate || reducedMotion()) { commit(next); return; }
  target = next;
  const from = current;
  const start = performance.now();
  const duration = 220;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const ease = 1 - Math.pow(1 - t, 3);
    // Zoom moves geometrically so 10% → 100% feels as even as 100% → 1000%.
    const zoom = from.zoom * Math.pow(next.zoom / from.zoom, ease);
    commit({ x: from.x + (next.x - from.x) * ease, y: from.y + (next.y - from.y) * ease, zoom });
    animation = t < 1 ? requestAnimationFrame(step) : 0;
    if (!animation) target = null;
  };
  animation = requestAnimationFrame(step);
}

export const getViewport = () => current;

type Box = { left: number; top: number; width: number; height: number };
/** The viewport's client box, measured once per resize (notifyCanvas), never per wheel event (no forced layout). */
let boxCache: Box | null = null;

function viewportBox(): Box {
  if (boxCache) return boxCache;
  const rect = viewportEl?.getBoundingClientRect();
  if (!rect) return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  boxCache = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  return boxCache;
}

/** The canvas viewport's client box (cached; refreshed when the canvas changes size). */
export const getViewportBox = (): Box => viewportBox();

/** A client rect (as getBoundingClientRect returns it) in world coordinates. */
export function toWorldRect(rect: DOMRect | Rect): Rect {
  const box = viewportBox();
  const left = "left" in rect ? rect.left : rect.x;
  const top = "top" in rect ? rect.top : rect.y;
  return { x: (left - box.left - current.x) / current.zoom, y: (top - box.top - current.y) / current.zoom, width: rect.width / current.zoom, height: rect.height / current.zoom };
}

/** The viewport that shows world rect `rect` whole and centred, `padding` screen px from the edges. */
function viewportFor(rect: Rect, padding: number, maxZoom: number): StudioViewport {
  const box = viewportBox();
  const zoom = clampZoom(Math.min((box.width - padding * 2) / Math.max(rect.width, 1), (box.height - padding * 2) / Math.max(rect.height, 1), maxZoom));
  return { zoom, x: box.width / 2 - (rect.x + rect.width / 2) * zoom, y: box.height / 2 - (rect.y + rect.height / 2) * zoom };
}

/** Zoom around a point given in viewport-local px. */
function zoomAround(zoom: number, localX: number, localY: number, animate = false) {
  const next = clampZoom(zoom);
  // The world point under the anchor, where the view is (or is heading, mid-animation).
  const from = animate && target ? target : current;
  const worldX = (localX - from.x) / from.zoom;
  const worldY = (localY - from.y) / from.zoom;
  setViewportNow({ zoom: next, x: localX - worldX * next, y: localY - worldY * next }, { animate });
}

function centerLocal() {
  const box = viewportBox();
  return { x: box.width / 2, y: box.height / 2 };
}

/** Zoom in / out one ladder step from where the view is heading (a quick double press goes two steps). */
export function zoomIn() {
  const from = target?.zoom ?? current.zoom;
  const next = zoomSteps.find((step) => step > from + 1e-3) ?? MAX_ZOOM;
  const center = centerLocal();
  zoomAround(next, center.x, center.y, true);
}

export function zoomOut() {
  const from = target?.zoom ?? current.zoom;
  const next = [...zoomSteps].reverse().find((step) => step < from - 1e-3) ?? MIN_ZOOM;
  const center = centerLocal();
  zoomAround(next, center.x, center.y, true);
}

/** Wheel / pinch zoom: `factor` around a client point. Pinches arrive as many small steps and apply at once; a mouse
 * wheel notch is a big step, eased so it does not jump. */
export function zoomAtClient(factor: number, clientX: number, clientY: number, animate = false) {
  const box = viewportBox();
  // Chained notches build on the zoom the running animation is heading to, so fast scrolling never loses steps.
  const base = animate && animation && target ? target.zoom : current.zoom;
  if (!animate) stopAnimation();
  zoomAround(base * factor, clientX - box.left, clientY - box.top, animate);
}

export function panBy(dx: number, dy: number) {
  stopAnimation();
  commit({ ...current, x: current.x - dx, y: current.y - dy });
}

/** Imperative canvas controls for other modules (selection, layers, inspector). Rects are screen (client) rects. */
export const canvasApi = {
  getViewportElement: (): HTMLElement | null => viewportEl,
  getWorldElement: (): HTMLElement | null => worldEl,
  zoomToRect: (rect: DOMRect, options?: { padding?: number; maxZoom?: number }): void => {
    setViewportNow(viewportFor(toWorldRect(rect), options?.padding ?? 48, options?.maxZoom ?? MAX_ZOOM), { animate: true });
  },
  ensureVisible: (rect: DOMRect): void => {
    const box = viewportBox();
    const margin = 32;
    const left = rect.left - box.left;
    const top = rect.top - box.top;
    const inside = left >= margin && top >= margin && left + rect.width <= box.width - margin && top + rect.height <= box.height - margin;
    if (inside) return;
    // Off screen: centre it, or line its top-left up with the margin when it is bigger than the viewport.
    const dx = rect.width > box.width - margin * 2 ? margin - left : box.width / 2 - (left + rect.width / 2);
    const dy = rect.height > box.height - margin * 2 ? margin - top : box.height / 2 - (top + rect.height / 2);
    setViewportNow({ ...current, x: current.x + dx, y: current.y + dy }, { animate: true });
  },
  zoomBy: (factor: number, center?: { x: number; y: number }): void => {
    const box = viewportBox();
    const point = center ? { x: center.x - box.left, y: center.y - box.top } : centerLocal();
    zoomAround(current.zoom * factor, point.x, point.y, true);
  },
  setZoom: (zoom: number): void => {
    const center = centerLocal();
    zoomAround(zoom, center.x, center.y, true);
  },
  /** Fit the rect's width (top-aligned, centred across), never above `maxZoom` (default 1): tall frames (Docs, a
   * Document) open readable at their top instead of shrinking to fit their height. */
  zoomToWidth: (screenRect: DOMRect, options?: { margin?: number; maxZoom?: number }): void => {
    const rect = toWorldRect(screenRect);
    const box = viewportBox();
    const margin = options?.margin ?? 48;
    const zoom = clampZoom(Math.min(options?.maxZoom ?? 1, (box.width - margin * 2) / Math.max(rect.width, 1)));
    setViewportNow({ zoom, x: box.width / 2 - (rect.x + rect.width / 2) * zoom, y: margin - rect.y * zoom }, { animate: true });
  },
  /** Read a frame at an exact zoom (100%): its top under `margin`, centred across when it fits the viewport, else its
   * left edge at `margin` (the rest pans). Unlike zoomToWidth it never shrinks the frame to fit. */
  zoomToRead: (screenRect: DOMRect, options?: { zoom?: number; margin?: number }): void => {
    const rect = toWorldRect(screenRect);
    const box = viewportBox();
    const margin = options?.margin ?? 24;
    const zoom = clampZoom(options?.zoom ?? 1);
    const fits = rect.width * zoom + margin * 2 <= box.width;
    setViewportNow({ zoom, x: fits ? box.width / 2 - (rect.x + rect.width / 2) * zoom : margin - rect.x * zoom, y: margin - rect.y * zoom }, { animate: true });
  },
  /** Zoom to fit (Shift+1, Figma's): every frame on the board, whole and centred, at whatever zoom that takes (never
   * above 100%). Reading starts from a frame instead (⇧2 on it, or its label). */
  fit: (): void => {
    const bounds = fitBounds?.();
    if (bounds) setViewportNow(viewportFor(bounds, 48, 1), { animate: true });
  },
  /** Start a pan drag from a pointerdown (the Select layer calls it on empty canvas; Space/Hand/middle button too). */
  startPan: (event: PointerEvent): void => {
    const viewport = viewportEl;
    if (!viewport) return;
    stopAnimation();
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = current;
    viewport.dataset.panning = "true";
    try { viewport.setPointerCapture(event.pointerId); } catch { /* the pointer may already be gone */ }
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      commit({ ...origin, x: origin.x + moveEvent.clientX - startX, y: origin.y + moveEvent.clientY - startY });
    };
    const end = (endEvent: PointerEvent) => {
      if (endEvent.pointerId !== event.pointerId) return;
      delete viewport.dataset.panning;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  },
  /** Subscribe to viewport changes (pan/zoom); returns unsubscribe. Outlines use it to re-measure. */
  onChange: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

/** Called by StudioCanvas: the elements, where the viewport is saved, and what "zoom to fit" fits. */
export function attachCanvas(elements: { viewport: HTMLElement; world: HTMLElement; grid: HTMLElement | null }, options: { persist: (viewport: StudioViewport) => void; bounds: () => Rect | null }) {
  viewportEl = elements.viewport;
  worldEl = elements.world;
  gridEl = elements.grid;
  persist = options.persist;
  fitBounds = options.bounds;
  boxCache = null;
  paint();
  return () => {
    stopAnimation();
    if (viewportEl === elements.viewport) { viewportEl = null; worldEl = null; gridEl = null; persist = null; fitBounds = null; boxCache = null; }
  };
}

/** Viewport size or layout changed: listeners re-measure. */
export function notifyCanvas() {
  boxCache = null;
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") window.addEventListener("resize", () => { boxCache = null; });

/** The viewport that fits `rect` (world coordinates) to the width, top-left aligned `margin` px in, between `minZoom`
 * and `maxZoom` (a rect wider than the canvas at `minZoom` runs off to the right). */
export function viewportForWidth(rect: Rect, margin = 48, maxZoom = 1, minZoom = MIN_ZOOM): StudioViewport {
  const box = viewportBox();
  const zoom = clampZoom(Math.min(maxZoom, Math.max(minZoom, (box.width - margin * 2) / Math.max(rect.width, 1))));
  return { zoom, x: margin - rect.x * zoom, y: margin - rect.y * zoom };
}

/**
 * The canvas moved on screen by `dx` (a side panel shown, hidden or resized): pan the other way at once, so the world
 * stays where it was on screen (no animation; the change happens in the same frame as the panel's).
 */
export function compensateInset(dx: number) {
  if (!dx) return;
  const base = target ?? current;
  stopAnimation();
  commit({ ...base, x: base.x - dx });
}

/** The current zoom for React (toolbar and pill percentage). */
export function useCanvasZoom() {
  return useSyncExternalStore(canvasApi.onChange, () => current.zoom, () => 1);
}

export const formatZoom = (zoom: number) => `${Math.round(zoom * 100)}%`;
