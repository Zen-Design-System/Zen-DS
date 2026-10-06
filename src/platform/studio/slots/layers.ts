import { hitOf, type Fiber } from "../select/picker";
import { containerOf, hostRootOf } from "./dom";
import { activeSlotsOf, isLayoutPrimitive, slotsOf, type HostProps } from "./registry";
import "./slots.css";

/*
 * The Layers panel's slot rows (spec "Layers"): a "slot" row between a slot component and its children ("Content",
 * dashed-frame icon, "Empty" meta), like Figma's slot frame in an instance. Which child layer belongs to which slot is
 * read from the DOM (the child's first node inside the slot's container), so multi-slot components (ModalForm,
 * ListItem) sort their children without source ranges. Layout primitives get none: their children are the slot.
 */

export type LayerSlotGroup = {
  prop: string;
  /** The Figma slot name ("Content", "Main-Contents", "Leading"). */
  name: string;
  /** Indexes into the child layers passed in: the ones this slot holds, in order. */
  members: number[];
  /** The slot's container on the canvas (the row's hover outline), null when it does not render. */
  container: Element | null;
};

/**
 * The active content slots of a component layer and the child layers each holds (`childHosts`: each child layer's first
 * DOM node, in order). Null for an element without content slots, a layout primitive, or one that is not rendered.
 * Children outside every slot (JSX passed in another prop, e.g. a title) stay direct children of the component.
 */
export function layerSlotsOf(name: string, fiber: Fiber | null, childHosts: ReadonlyArray<Element | null | undefined>): LayerSlotGroup[] | null {
  if (!fiber || isLayoutPrimitive(name) || !slotsOf(name).length) return null;
  try {
    const hit = hitOf(fiber);
    if (!hit) return null;
    const slots = activeSlotsOf(hit.name, hit.props as HostProps);
    if (!slots.length) return null;
    const root = hostRootOf(hit);
    const claimed = new Set<number>();
    return slots.map((slot) => {
      const container = containerOf(root, slot);
      const members: number[] = [];
      childHosts.forEach((host, index) => {
        if (!host || !container || claimed.has(index) || !container.contains(host)) return;
        claimed.add(index);
        members.push(index);
      });
      return { prop: slot.prop, name: slot.name, members, container };
    });
  } catch {
    return null;
  }
}
