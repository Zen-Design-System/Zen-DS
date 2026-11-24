import { fixedLayerSpace, visibleBounds } from "../_shared/layer-space";

/*
 * Tooltip's framework-free part (the web core, src/core): the hover delay, the warm window between tooltips and where an
 * icon-only control's tooltip goes. React's useIconTooltip and the Vue port's both draw from it.
 */

/** Zen rule: a tooltip opens after hovering its trigger for 1s; keyboard focus opens it at once; touch never does. */
export const TOOLTIP_HOVER_DELAY = 1000;
/** After a tooltip closes, the next one within this window opens without the delay (moving along a toolbar). */
const TOOLTIP_WARM_MS = 600;
let lastTooltipClosedAt = 0;
/** A tooltip just closed: the next hover within the warm window opens at once. */
export const markTooltipClosed = () => { lastTooltipClosedAt = Date.now(); };
/** How long a hover waits before opening: `delay`, or nothing right after another tooltip closed. */
export const hoverWait = (delay: number) => (Date.now() - lastTooltipClosedAt < TOOLTIP_WARM_MS ? 0 : delay);

export type IconTooltipPosition = { top: number; left: number; side: "top" | "bottom" };

/**
 * Where an icon tooltip's fixed layer goes: centred over (or under) its anchor, 8px away, flipped and moved to stay
 * where it can be seen. Measured in viewport px; written in the layer's own px, which differ inside a scaled frame
 * (layer-space.ts).
 */
export function iconTooltipPosition(anchor: HTMLElement, layer: HTMLElement, placement: "top" | "bottom"): IconTooltipPosition {
  const space = fixedLayerSpace(layer.parentElement);
  const rect = anchor.getBoundingClientRect(), gap = 8 * space.scale, edge = 4;
  const width = layer.offsetWidth * space.scale, height = layer.offsetHeight * space.scale;
  // Where it can be seen: the viewport, or inside a fixed containing block the part of it nothing clips (a Zen Studio
  // frame clips its content: the tip flips and moves to stay inside, 2026-10-15).
  const bounds = space.block ? visibleBounds(space.block) : { top: 0, left: 0, right: document.documentElement.clientWidth, bottom: window.innerHeight };
  let side = placement;
  if (side === "top" && rect.top - height - gap < bounds.top + edge) side = "bottom";
  else if (side === "bottom" && rect.bottom + height + gap > bounds.bottom - edge) side = "top";
  const top = side === "top" ? rect.top - height - gap : rect.bottom + gap;
  const left = Math.min(Math.max(bounds.left + edge, rect.left + rect.width / 2 - width / 2), bounds.right - width - edge);
  return { top: (top - space.top) / space.scale, left: (left - space.left) / space.scale, side };
}
