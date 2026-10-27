import type { Fiber, FiberHit } from "./picker";
import { isLayerPart, partChildren, type PartHit } from "./parts";
import { dataItemRootOf } from "../slots/dataItems";

/*
 * Figma's Enter on an instance (Select children): the first layer the instance draws, one level in. Since 2026-10-27
 * (UX review §2.1: Enter ×3 on a MetricCard gave "Card · part", "div · part", "div · part") Enter lands only on what the
 * Layers panel lists as the instance's layers — a data item (a tab, a crumb, a Sidebar row), a nested instance or a text
 * — and steps through the DOM wrappers between them, as the Layers panel's namedParts does.
 */

/** The first layer under `fiber` inside `owner`'s instance, in document order; null when it draws none. */
export function firstLayerPart(owner: FiberHit, fiber: Fiber, depth = 0): PartHit | null {
  for (const part of partChildren(owner, fiber)) {
    // Words for screen readers only draw nothing: no layer (Figma has none).
    if (part.element.closest(".zen-visually-hidden") || part.name === "VisuallyHidden") continue;
    if (dataItemRootOf(part)) return part;
    if (isLayerPart(part)) {
      // A text clipped to a pixel is a screen reader's (a chart's summary line), not a layer on the canvas.
      if (!part.isComponent) {
        const box = part.element.getBoundingClientRect();
        if (box.width <= 1 && box.height <= 1) continue;
      }
      return part;
    }
    if (depth < 24) {
      const inner = firstLayerPart(owner, part.fiber, depth + 1);
      if (inner) return inner;
    }
  }
  return null;
}
