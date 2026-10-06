import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { flushSync } from "react-dom";

export type AnchoredSide = "bottom" | "top";
export type AnchoredAlign = "start" | "end";

export interface AnchoredPositionOptions {
  /** The box to attach to. Defaults to the enclosing Input control (`.zen-input__control`) when the
   * surface lives inside one, otherwise the surface's containing block (offsetParent). */
  anchor?: () => HTMLElement | null | undefined;
  /** Distance between the anchor box and the surface (Spacing/Gap/2XSmall = 4). */
  gap?: number;
  /** Preferred horizontal edge; flips when the surface would overflow the viewport. When neither edge fits, the surface is
   * shifted into the visible bounds instead (clampAnchoredLeft) and the returned `align` only records the edge it came from. */
  align?: AnchoredAlign;
}

const VIEWPORT_MARGIN = 8;

/**
 * The side an open surface takes. It keeps the side it is on while it still fits there (or while the other side has no
 * room either), so scrolling never flips it back and forth: it moves only when it would be cut off and the other side has
 * room, as CSS anchor positioning keeps its last successful fallback. Without a previous side: below when it fits or when
 * below has more room, else above.
 */
export function resolveAnchoredSide(previous: AnchoredSide | null, below: number, above: number, height: number): AnchoredSide {
  const fits: Record<AnchoredSide, boolean> = { bottom: below >= height, top: above >= height };
  if (previous && (fits[previous] || !fits[previous === "bottom" ? "top" : "bottom"])) return previous;
  return fits.bottom || below >= above ? "bottom" : "top";
}

/** The horizontal edge, with the same memory as resolveAnchoredSide: the preferred edge on opening, flipping to the other
 * one only when it would overflow and the other one fits. */
export function resolveAnchoredAlign(previous: AnchoredAlign | null, preferred: AnchoredAlign, fitsStart: boolean, fitsEnd: boolean): AnchoredAlign {
  const fits: Record<AnchoredAlign, boolean> = { start: fitsStart, end: fitsEnd };
  if (previous && (fits[previous] || !fits[previous === "start" ? "end" : "start"])) return previous;
  return preferred === "end" ? (fitsEnd || !fitsStart ? "end" : "start") : (fitsStart || !fitsEnd ? "start" : "end");
}

/** The left edge (viewport x) of a surface that fits on neither edge of its anchor: shifted into the visible bounds,
 * VIEWPORT_MARGIN from each side, and pinned to the left margin when it is wider than them. Without it a 310px chat
 * Reaction-Bar opened from x 254 ran off a 390px phone (2026-10-02). */
export function clampAnchoredLeft(left: number, width: number, boundsLeft: number, boundsRight: number): number {
  return Math.max(boundsLeft + VIEWPORT_MARGIN, Math.min(left, boundsRight - VIEWPORT_MARGIN - width));
}

/** The viewport intersected with every ancestor that clips its overflow — the area the surface can
 * actually be seen in. */
function visibleBounds(from: HTMLElement) {
  let top = 0;
  let left = 0;
  let bottom = document.documentElement.clientHeight;
  let right = document.documentElement.clientWidth;
  for (let node: HTMLElement | null = from; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.overflowX === "visible" && style.overflowY === "visible") continue;
    const rect = node.getBoundingClientRect();
    if (style.overflowY !== "visible") { top = Math.max(top, rect.top); bottom = Math.min(bottom, rect.bottom); }
    if (style.overflowX !== "visible") { left = Math.max(left, rect.left); right = Math.min(right, rect.right); }
  }
  return { top, left, bottom, right };
}

/**
 * Places an absolutely positioned surface (Popover, Date Picker) against its anchor box: below it,
 * `gap` px away, or above it when there is not enough room below and more room above. Horizontally
 * it aligns to the anchor's start edge, or its end edge when the start would overflow the viewport, and is shifted into
 * view when it fits on neither edge (clampAnchoredLeft).
 * It re-measures while open on scroll, resize and when the surface changes size, in the same frame (no lag behind an
 * anchor in a scrolling panel), and keeps the side it opened on until that side would cut it off
 * (resolveAnchoredSide). Surfaces that are not `position: absolute` (inline pickers, Bunk-Action bars) are left alone.
 */
export function useAnchoredPosition(surfaceRef: RefObject<HTMLElement | null>, active: boolean, { anchor, gap = 4, align = "start" }: AnchoredPositionOptions = {}) {
  const [placement, setPlacement] = useState<{ side: AnchoredSide; align: AnchoredAlign; style?: CSSProperties }>({ side: "bottom", align });
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;

  useLayoutEffect(() => {
    if (!active) return undefined;
    const surface = surfaceRef.current;
    if (!surface) return undefined;
    // Each opening decides its side afresh; while open, the side and edge it took are kept (see resolveAnchoredSide).
    let lastSide: AnchoredSide | null = null;
    let lastAlign: AnchoredAlign | null = null;
    const update = () => {
      if (getComputedStyle(surface).position !== "absolute") return;
      const container = surface.offsetParent as HTMLElement | null;
      if (!container) return;
      const target = anchorRef.current?.() ?? surface.parentElement?.closest<HTMLElement>(".zen-input__control") ?? container;
      const box = target.getBoundingClientRect();
      const frame = container.getBoundingClientRect();
      // Absolute offsets are measured from the containing block's padding box. A portalled surface (ZenPortal) often has
      // no positioned ancestor: offsetParent is then a static <body>, but CSS resolves top/bottom against the initial
      // containing block — viewport-sized and pinned to the top of the document — so a flipped (bottom-based) surface
      // measured from the body's full height flew thousands of pixels off screen.
      const icb = (container === document.body || container === document.documentElement) && getComputedStyle(container).position === "static";
      const originTop = icb ? -window.scrollY : frame.top + container.clientTop;
      const originLeft = icb ? -window.scrollX : frame.left + container.clientLeft;
      const originBottom = originTop + (icb ? document.documentElement.clientHeight : container.clientHeight);
      const originRight = originLeft + (icb ? document.documentElement.clientWidth : container.clientWidth);
      const bounds = visibleBounds(container);
      const height = surface.offsetHeight;
      const width = surface.offsetWidth;
      const below = bounds.bottom - box.bottom - gap - VIEWPORT_MARGIN;
      const above = box.top - bounds.top - gap - VIEWPORT_MARGIN;
      const side = resolveAnchoredSide(lastSide, below, above, height);
      const fitsStart = box.left + width <= bounds.right - VIEWPORT_MARGIN;
      const fitsEnd = box.right - width >= bounds.left + VIEWPORT_MARGIN;
      const resolvedAlign = resolveAnchoredAlign(lastAlign, align, fitsStart, fitsEnd);
      lastSide = side;
      lastAlign = resolvedAlign;
      // It fits on neither edge (wider than the room on both sides of its anchor): shift it into view instead. Not inside a
      // transform-scaled frame (a docs phone preview, the Studio canvas): these measures are screen px while the offsets are
      // written in the frame's layout px, so a shift there misplaced surfaces that fit; they keep the placement they had.
      const scaled = container.offsetWidth > 0 && Math.abs(container.getBoundingClientRect().width / container.offsetWidth - 1) > 0.01;
      const shifted = scaled || (resolvedAlign === "start" ? fitsStart : fitsEnd)
        ? null
        : clampAnchoredLeft(resolvedAlign === "start" ? box.left : box.right - width, width, bounds.left, bounds.right);
      const style: CSSProperties = {
        top: side === "bottom" ? box.bottom - originTop + gap : "auto",
        bottom: side === "top" ? originBottom - box.top + gap : "auto",
        left: shifted !== null ? shifted - originLeft : resolvedAlign === "start" ? box.left - originLeft : "auto",
        right: shifted === null && resolvedAlign === "end" ? originRight - box.right : "auto",
      };
      setPlacement((current) => (
        current.side === side && current.align === resolvedAlign
          && current.style?.top === style.top && current.style?.bottom === style.bottom
          && current.style?.left === style.left && current.style?.right === style.right
          ? current
          : { side, align: resolvedAlign, style }
      ));
    };
    update();
    // Scroll and resize events arrive outside React: flush the new placement before the frame paints, or a portalled
    // surface trails its anchor by a frame while a panel scrolls.
    const sync = () => flushSync(update);
    const observer = new ResizeObserver(sync);
    observer.observe(surface);
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, surfaceRef, gap, align]);

  return placement;
}
