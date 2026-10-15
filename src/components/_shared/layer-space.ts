/**
 * Where a `position: fixed` layer is drawn from. Fixed layers (Tooltip, the Sidebar rail tooltip, the Table editor's error
 * bubble) are placed from viewport coordinates, which is right while the viewport is their containing block. An ancestor
 * with a transform, a filter, layout or paint containment, or a container-query box becomes that block instead: a
 * transform-scaled device preview, the Zen Studio canvas (zoomed), a frame that holds its own overlays. There, offsets are
 * in that block's own CSS px, from its padding box, drawn at its scale.
 *
 * `fixedLayerSpace(parent)` returns that block's viewport origin and scale for a layer rendered inside `parent` (`parent`
 * itself counts); `{ left: 0, top: 0, scale: 1 }` when the viewport is the block, so a page without one is unchanged.
 * Map a viewport point with `(x - space.left) / space.scale`, and a layer's own size to viewport px with `* space.scale`.
 */
export type LayerSpace = { left: number; top: number; scale: number };

const VIEWPORT: LayerSpace = { left: 0, top: 0, scale: 1 };

const makesFixedBlock = (style: CSSStyleDeclaration) =>
  style.transform !== "none"
  || (style.translate !== "" && style.translate !== "none")
  || (style.scale !== "" && style.scale !== "none")
  || (style.rotate !== "" && style.rotate !== "none")
  || style.perspective !== "none"
  || style.filter !== "none"
  || (style.backdropFilter !== undefined && style.backdropFilter !== "" && style.backdropFilter !== "none")
  || /\b(layout|paint|strict|content)\b/.test(style.contain)
  || (style.containerType !== undefined && style.containerType !== "" && style.containerType !== "normal")
  || /\b(transform|perspective|filter)\b/.test(style.willChange);

export function fixedLayerSpace(parent: Element | null | undefined): LayerSpace {
  if (typeof window === "undefined") return VIEWPORT;
  for (let node: Element | null = parent ?? null; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    if (!(node instanceof HTMLElement) || !makesFixedBlock(getComputedStyle(node))) continue;
    const rect = node.getBoundingClientRect();
    const scale = node.offsetWidth > 0 ? rect.width / node.offsetWidth : 1;
    const safe = Number.isFinite(scale) && scale > 0 ? scale : 1;
    return { left: rect.left + node.clientLeft * safe, top: rect.top + node.clientTop * safe, scale: safe };
  }
  return VIEWPORT;
}
