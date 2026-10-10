import type { StudioSelection } from "../types";
import { layerName, MAIN_FRAME, pathTo, variantElement, variantRoot, type VariantSelection } from "./model";

/*
 * Selecting in the Main component frame, as in Figma's component set (spec §2): a click selects the variant under the
 * pointer; a double-click on the selected layer goes one level in, towards the pointer; ⌘ / Ctrl + click selects the
 * deepest layer. The selection layer (select/SelectionLayer.tsx) calls these for points inside the frame.
 */

type Mode = "click" | "deep" | "drill";

/** The variant (or a layer of it) a press at `element` selects; null outside the cells (the frame then). */
export function pickVariant(element: Element, current: StudioSelection | null, mode: Mode): VariantSelection | null {
  const cell = element.closest<HTMLElement>("[data-mc-cell]");
  const root = variantRoot(cell);
  if (!cell || !root) return null;
  const component = cell.dataset.mcComponent ?? "";
  const base = { kind: "variant" as const, frameId: MAIN_FRAME, component, set: cell.dataset.mcSet ?? "", variant: JSON.parse(cell.dataset.mcVariant ?? "{}") as Record<string, string> };
  const variant: VariantSelection = { ...base, path: [], name: cell.dataset.mcName ?? component };
  const target = root.contains(element) ? element : root;
  const at = (node: Element): VariantSelection => ({ ...base, path: pathTo(root, node) ?? [], name: node === root ? variant.name : layerName(node, component) });
  if (mode === "deep") return at(target);
  const selected = current?.kind === "variant" && current.component === base.component && current.set === base.set && sameVariant(current.variant, base.variant) ? current : null;
  const selectedElement = selected ? (selected.path.length ? variantElement(cell.parentElement ?? cell, { ...selected }) : root) : null;
  if (mode === "drill") {
    // One level in from the selected layer, towards the pointer; a click elsewhere in the cell selects the variant.
    if (!selectedElement || !selectedElement.contains(target) || selectedElement === target) return selected ?? variant;
    let child: Element = target;
    while (child.parentElement && child.parentElement !== selectedElement) child = child.parentElement;
    return at(child);
  }
  // A click inside the selected layer keeps it (Figma: the next double-click goes on in).
  if (selectedElement && selectedElement.contains(target)) return selected;
  return variant;
}

const sameVariant = (a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>) => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
};
