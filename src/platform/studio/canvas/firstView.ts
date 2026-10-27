/*
 * The first view of a page you made (docs/research/studio-ux-review-2026-10-27.md §2.3, §7.3): a page opened with no
 * viewport saved for it showed its board's top-left at 100% (or wherever a focus-scroll had panned it), with the Screen
 * off-screen under the Pages panel. Figma opens a fresh file zoomed to fit and a known file at its last viewport. Here:
 * one row of frames fits whole (while that stays readable); otherwise the page's first Screen fills the view. Pure (no
 * DOM, erasable TypeScript), so `node firstView.selftest.mjs` imports it; StudioCanvas measures the frames and applies
 * the viewport.
 */

export type ViewRect = { x: number; y: number; width: number; height: number };
/** A frame on the board: its kind (the frame id's prefix: screen, overlay, section, slice) and its box in world px. */
export type ViewFrame = { kind: string; rect: ViewRect };
export type FirstView = { kind: "fit"; rect: ViewRect } | { kind: "frame"; rect: ViewRect };

/** Frames are one row while their union is no taller than this many times the tallest of them (a Screen and the
 *  overlays beside it, their tops a little apart). */
export const ONE_ROW_RATIO = 1.25;
/** Fitting one row stops being the first view under this zoom (a row of nine frames would open at 9%: thumbnails,
 *  not a page). Then the first Screen fills the view instead, and ⇧1 still fits everything. */
export const FIT_MIN_ZOOM = 0.25;
/** Screen px kept between the first view and the canvas edges (zoom to fit's). */
export const FIRST_VIEW_MARGIN = 48;

/** The box around `rects`, or null for none. */
export function unionOf(rects: readonly ViewRect[]): ViewRect | null {
  if (!rects.length) return null;
  const x = Math.min(...rects.map((rect) => rect.x));
  const y = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x, y, width: right - x, height: bottom - y };
}

export function oneRow(rects: readonly ViewRect[]): boolean {
  const union = unionOf(rects);
  return Boolean(union) && union!.height <= ONE_ROW_RATIO * Math.max(...rects.map((rect) => rect.height));
}

/** The zoom that shows `rect` whole in a canvas `box` with `margin` px kept at the edges, never above `maxZoom`. */
export function fitZoomOf(rect: ViewRect, box: { width: number; height: number }, margin = FIRST_VIEW_MARGIN, maxZoom = 1): number {
  return Math.min(maxZoom, (box.width - margin * 2) / Math.max(rect.width, 1), (box.height - margin * 2) / Math.max(rect.height, 1));
}

/**
 * What the first view shows: every frame (one row, and fitting them keeps at least FIT_MIN_ZOOM in `box`), else the
 * first Screen in board order (a Screen before any Overlay; a page without a Screen: its first frame). Frames not drawn
 * yet (no size) are left out; null while there is none.
 */
export function firstViewOf(frames: readonly ViewFrame[], box: { width: number; height: number }): FirstView | null {
  const drawn = frames.filter((frame) => frame.rect.width > 0 && frame.rect.height > 0);
  if (!drawn.length) return null;
  const rects = drawn.map((frame) => frame.rect);
  const union = unionOf(rects)!;
  if (oneRow(rects) && fitZoomOf(union, box) >= FIT_MIN_ZOOM) return { kind: "fit", rect: union };
  const first = drawn.find((frame) => frame.kind === "screen") ?? drawn[0];
  return { kind: "frame", rect: first.rect };
}

/**
 * A frame much taller than wide for the canvas reads from its top instead of shrinking to fit its height: its width
 * fills the canvas (≤ `maxZoom`) and its top sits at the margin, as a frame's label click shows it (board/presentFrame.ts).
 */
export function readsFromTop(rect: ViewRect, box: { width: number; height: number }, margin = FIRST_VIEW_MARGIN, maxZoom = 1): boolean {
  const byWidth = Math.min(maxZoom, (box.width - margin * 2) / Math.max(rect.width, 1));
  const byHeight = Math.min(maxZoom, (box.height - margin * 2) / Math.max(rect.height, 1));
  return byHeight < byWidth * 0.75;
}
