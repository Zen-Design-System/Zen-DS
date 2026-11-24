import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { useIsomorphicLayoutEffect } from "../_shared/use-isomorphic-layout-effect";
import { boxMaskOutline, maskClipId, sameMaskOutline, type MaskOutline } from "./mask-outline";

/*
 * Figma's mask (a layer with isMask, Zen Studio ⌃⌘M "Use as mask") for Box `mask`: the box's first layer is the mask and
 * the layers after it show only where it is. Figma's mask layer draws nothing of its own (its fill only shapes the mask),
 * so it is hidden (layout.css) and its outline becomes a clipPath on the box:
 * - a Shape: the path its drawing already computed (ellipse, polygon, star, vector, boolean), or a rectangle's corners;
 * - any other layer: its box with its corners.
 * The outline is read from the drawn layer (its layout box, corners, turn and flip; mask-outline.ts), so every Shape type,
 * token corner and Studio edit is followed without a second geometry. An outline mask (Figma's default); alpha masks are
 * not drawn.
 */

/**
 * Box `mask`: a ref for the box, the clip-path variable and the `<svg>` that holds the clipPath (rendered after the
 * layers, so the mask stays the first). Re-measured after every render and when the mask layer resizes.
 */
export function useBoxMask(enabled: boolean): { ref: (node: HTMLElement | null) => void; vars: Record<`--${string}`, string | undefined>; defs: ReactNode } {
  const id = maskClipId(useId());
  const box = useRef<HTMLElement | null>(null);
  // The layer the ResizeObserver watches: the first one, which a reorder (Bring to front, Send to back) can change.
  const watched = useRef<{ layer: Element; observer: ResizeObserver } | null>(null);
  const [outline, setOutline] = useState<MaskOutline | null>(null);
  const measure = useCallback(() => {
    const next = boxMaskOutline(box.current, enabled);
    setOutline((current) => (sameMaskOutline(current, next) ? current : next));
  }, [enabled]);
  useIsomorphicLayoutEffect(() => {
    measure();
    const layer = enabled ? box.current?.firstElementChild ?? null : null;
    if (watched.current?.layer === layer) return;
    watched.current?.observer.disconnect();
    watched.current = null;
    if (layer instanceof HTMLElement && typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(layer);
      watched.current = { layer, observer };
    }
  });
  useIsomorphicLayoutEffect(() => () => { watched.current?.observer.disconnect(); watched.current = null; }, []);
  const ref = useCallback((node: HTMLElement | null) => { box.current = node; }, []);
  if (!enabled) return { ref, vars: {}, defs: null };
  return {
    ref,
    vars: { "--zen-box-mask": outline ? `url(#${id})` : undefined },
    defs: outline ? (
      <svg className="zen-box__mask" width="0" height="0" aria-hidden="true" focusable="false">
        <clipPath id={id} clipPathUnits="userSpaceOnUse">
          <path d={outline.d} clipRule={outline.rule} transform={outline.transform} />
        </clipPath>
      </svg>
    ) : null,
  };
}
