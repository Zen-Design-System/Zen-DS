import { useCallback, useEffect, useRef } from "react";
import { useStableCallback } from "./use-stable-callback";

/**
 * Open dismissable layers (Popover, Menu, Select list, DatePicker, Chip and Chat popups, the Sidebar flyout). A layer that
 * opens while another is open is nested in it (Radix DismissableLayer, Base UI FloatingTree): its surface is usually
 * portalled, so it is not inside the parent's DOM, but a press inside it is not "outside" the parent. Unrelated popovers
 * do not stay open together (useExclusivePopover), so every later layer is a descendant.
 */
type LayerEntry = { order: number; nodes: () => Array<Element | null | undefined> };
const layers = new Set<LayerEntry>();
let opened = 0;

/**
 * Registers a layer while `open` and returns `isOutside(target)`: true when the target is neither in this layer's own
 * nodes (its surface and trigger) nor in a layer opened after it. Use it in the light-dismiss pointer handler.
 */
export function useDismissableLayer(open: boolean, nodes: () => Array<Element | null | undefined>): (target: Node | null) => boolean {
  const getNodes = useStableCallback(nodes);
  const entry = useRef<LayerEntry | null>(null);
  // The order is taken while rendering, where a parent renders before its children even when both open in one commit
  // (effects run the other way round). Set once per opening: the lazy-initialisation form React allows for refs.
  if (open && entry.current === null) entry.current = { order: ++opened, nodes: () => getNodes() ?? [] };
  useEffect(() => {
    // Closed: the next opening takes a new order.
    if (!open) { entry.current = null; return undefined; }
    // The entry made while rendering keeps its order through StrictMode's cleanup-and-replay, so a parent stays below
    // the child that opened with it.
    const current = entry.current ?? (entry.current = { order: ++opened, nodes: () => getNodes() ?? [] });
    layers.add(current);
    return () => {
      layers.delete(current);
    };
  }, [open, getNodes]);
  return useCallback((target: Node | null) => {
    const self = entry.current;
    if (!target || !self) return false;
    for (const layer of [self, ...layers]) {
      if (layer.order >= self.order && layer.nodes().some((node) => node?.contains(target))) return false;
    }
    return true;
  }, []);
}
