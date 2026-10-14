import { variantKey, type VariantSelection } from "./model";

/* The variant or layer under the pointer in the Main component frame (VariantOutline draws it). */
let hovered: VariantSelection | null = null;
const listeners = new Set<() => void>();
/** What the pointer is over in the frame (set by the selection layer's hover). */
export const variantHover = {
  get: () => hovered,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  set(next: VariantSelection | null) {
    if ((next ? variantKey(next) : "") === (hovered ? variantKey(hovered) : "")) return;
    hovered = next;
    for (const listener of listeners) listener();
  },
};
