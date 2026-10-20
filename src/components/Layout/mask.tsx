import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { useIsomorphicLayoutEffect } from "../_shared/use-isomorphic-layout-effect";

/*
 * Figma's mask (a layer with isMask, Zen Studio ⌃⌘M "Use as mask") for Box `mask`: the box's first layer is the mask and
 * the layers after it show only where it is. Figma's mask layer draws nothing of its own (its fill only shapes the mask),
 * so it is hidden (layout.css) and its outline becomes a clipPath on the box:
 * - a Shape: the path its drawing already computed (ellipse, polygon, star, vector, boolean), or a rectangle's corners;
 * - any other layer: its box with its corners.
 * The outline is read from the drawn layer (its layout box, corners, turn and flip), so every Shape type, token corner and
 * Studio edit is followed without a second geometry. An outline mask (Figma's default); alpha masks are not drawn.
 */

type MaskOutline = { d: string; rule: "nonzero" | "evenodd"; transform: string };

const round = (value: number) => Math.round(value * 100) / 100;

/** A rectangle with its four corners (px, clamped as CSS clamps them), as one path from 0, 0. */
function roundedRect(w: number, h: number, [tl, tr, br, bl]: number[]): string {
  const fit = (r: number) => Math.max(0, Math.min(r, w / 2, h / 2));
  const [a, b, c, d] = [tl, tr, br, bl].map(fit);
  return [
    `M ${round(a)} 0 L ${round(w - b)} 0`, b ? `A ${round(b)} ${round(b)} 0 0 1 ${round(w)} ${round(b)}` : "",
    `L ${round(w)} ${round(h - c)}`, c ? `A ${round(c)} ${round(c)} 0 0 1 ${round(w - c)} ${round(h)}` : "",
    `L ${round(d)} ${round(h)}`, d ? `A ${round(d)} ${round(d)} 0 0 1 0 ${round(h - d)}` : "",
    `L 0 ${round(a)}`, a ? `A ${round(a)} ${round(a)} 0 0 1 ${round(a)} 0` : "", "Z",
  ].filter(Boolean).join(" ");
}

/**
 * The mask layer's outline in the box's own px: its path, placed at its X / Y, turned and flipped about its centre.
 * The box is the layer's offsetParent (layout.css makes a mask box relative); the clip starts at the box's border edge,
 * its offsets inside the border, so the border's width is added.
 */
export function maskOutlineOf(layer: HTMLElement, box: HTMLElement): MaskOutline | null {
  const w = layer.offsetWidth;
  const h = layer.offsetHeight;
  if (!w && !h) return null;
  const style = getComputedStyle(layer);
  // A Shape's drawing (not a line: it has no area) holds its outline at 1:1 in its own box.
  const drawn = layer.matches(".zen-shape") ? layer.querySelector<SVGPathElement>(":scope > svg.zen-shape__drawing:not([data-line]) path") : null;
  const d = drawn?.getAttribute("d") || roundedRect(w, h, [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].map((value) => parseFloat(value) || 0));
  const rule = drawn?.getAttribute("fill-rule") === "evenodd" || drawn?.getAttribute("clip-rule") === "evenodd" ? "evenodd" : "nonzero";
  // CSS's individual transforms (rotate, then scale) about the layer's centre, as Box and Shape apply them.
  const turn = style.rotate && style.rotate !== "none" ? parseFloat(style.rotate) || 0 : 0;
  const [sx = 1, sy = sx] = style.scale && style.scale !== "none" ? style.scale.split(/\s+/).map(Number) : [];
  const cx = round(w / 2);
  const cy = round(h / 2);
  const steps = [`translate(${round(layer.offsetLeft + box.clientLeft)} ${round(layer.offsetTop + box.clientTop)})`];
  if (turn || sx !== 1 || sy !== 1) steps.push(`translate(${cx} ${cy})`, turn ? `rotate(${turn})` : "", sx !== 1 || sy !== 1 ? `scale(${sx} ${sy})` : "", `translate(${-cx} ${-cy})`);
  return { d, rule, transform: steps.filter(Boolean).join(" ") };
}

/**
 * Box `mask`: a ref for the box, the clip-path variable and the `<svg>` that holds the clipPath (rendered after the
 * layers, so the mask stays the first). Re-measured after every render and when the mask layer resizes.
 */
export function useBoxMask(enabled: boolean): { ref: (node: HTMLElement | null) => void; vars: Record<`--${string}`, string | undefined>; defs: ReactNode } {
  const id = `zen-mask-${useId().replace(/[^\w-]/g, "")}`;
  const box = useRef<HTMLElement | null>(null);
  // The layer the ResizeObserver watches: the first one, which a reorder (Bring to front, Send to back) can change.
  const watched = useRef<{ layer: Element; observer: ResizeObserver } | null>(null);
  const [outline, setOutline] = useState<MaskOutline | null>(null);
  const measure = useCallback(() => {
    const layer = box.current?.firstElementChild;
    const next = enabled && box.current && layer instanceof HTMLElement ? maskOutlineOf(layer, box.current) : null;
    setOutline((current) => (current?.d === next?.d && current?.transform === next?.transform && current?.rule === next?.rule ? current : next));
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
