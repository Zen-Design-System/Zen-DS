/*
 * Box `mask`'s outline (mask.tsx says how the mask works): read from the drawn mask layer after layout, so it needs the
 * DOM when called but no framework (the web core, src/core). React's hook is mask.tsx.
 */

export type MaskOutline = { d: string; rule: "nonzero" | "evenodd"; transform: string };

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

/** The outline of `box`'s first layer when masking, else null. */
export function boxMaskOutline(box: HTMLElement | null, enabled: boolean): MaskOutline | null {
  const layer = box?.firstElementChild;
  return enabled && box && layer instanceof HTMLElement ? maskOutlineOf(layer, box) : null;
}

/** Whether two outlines draw the same clip (a re-measure that changed nothing keeps the current one). */
export const sameMaskOutline = (a: MaskOutline | null, b: MaskOutline | null) => a?.d === b?.d && a?.transform === b?.transform && a?.rule === b?.rule;

/** The clipPath's id from a framework's generated id (React's useId, Vue's), safe in `url(#…)`. */
export const maskClipId = (generated: string) => `zen-mask-${generated.replace(/[^\w-]/g, "")}`;
