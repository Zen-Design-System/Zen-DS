import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";

export type AnchoredSide = "bottom" | "top";
export type AnchoredAlign = "start" | "end";

export interface AnchoredPositionOptions {
  /** The box to attach to. Defaults to the enclosing Input control (`.zen-input__control`) when the
   * surface lives inside one, otherwise the surface's containing block (offsetParent). */
  anchor?: () => HTMLElement | null | undefined;
  /** Distance between the anchor box and the surface (Spacing/Gap/2XSmall = 4). */
  gap?: number;
  /** Preferred horizontal edge; flips when the surface would overflow the viewport. */
  align?: AnchoredAlign;
}

const VIEWPORT_MARGIN = 8;

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
 * it aligns to the anchor's start edge, or its end edge when the start would overflow the viewport.
 * It re-measures while open on scroll, resize and when the surface changes size. Surfaces that are
 * not `position: absolute` (inline pickers, Bunk-Action bars) are left alone.
 */
export function useAnchoredPosition(surfaceRef: RefObject<HTMLElement | null>, active: boolean, { anchor, gap = 4, align = "start" }: AnchoredPositionOptions = {}) {
  const [placement, setPlacement] = useState<{ side: AnchoredSide; align: AnchoredAlign; style?: CSSProperties }>({ side: "bottom", align });
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;

  useLayoutEffect(() => {
    if (!active) return undefined;
    const surface = surfaceRef.current;
    if (!surface) return undefined;
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
      const side: AnchoredSide = below >= height || below >= above ? "bottom" : "top";
      const fitsStart = box.left + width <= bounds.right - VIEWPORT_MARGIN;
      const fitsEnd = box.right - width >= bounds.left + VIEWPORT_MARGIN;
      const resolvedAlign: AnchoredAlign = align === "end" ? (fitsEnd || !fitsStart ? "end" : "start") : (fitsStart || !fitsEnd ? "start" : "end");
      const style: CSSProperties = {
        top: side === "bottom" ? box.bottom - originTop + gap : "auto",
        bottom: side === "top" ? originBottom - box.top + gap : "auto",
        left: resolvedAlign === "start" ? box.left - originLeft : "auto",
        right: resolvedAlign === "end" ? originRight - box.right : "auto",
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
    const observer = new ResizeObserver(update);
    observer.observe(surface);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, surfaceRef, gap, align]);

  return placement;
}
