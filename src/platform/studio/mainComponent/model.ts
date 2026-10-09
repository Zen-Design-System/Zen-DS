import type { StudioSelection, StudioVariantRef } from "../types";

/*
 * The Main component frame's model (spec docs/research/studio-main-component-spec-2026-10-09.md §3.3): a variant cell is
 * keyed by its component, Figma set and code props; a layer inside it by the child-element path from the variant's root.
 * Kept free of React so the selection, Layers and canvas modules can import it without a Fast Refresh cascade.
 */

/** The frame id on every component page. */
export const MAIN_FRAME = "main-component";

export type VariantSelection = Extract<StudioSelection, { kind: "variant" }>;

const variantText = (variant: Readonly<Record<string, string>>) => Object.keys(variant).sort().map((prop) => `${prop}=${variant[prop]}`).join(",");

/** One cell of the grid: what `data-mc-cell` holds. */
export const cellKey = (component: string, set: string, variant: Readonly<Record<string, string>>) => `${component}|${set}|${variantText(variant)}`;

/** A layer in the frame (a cell's root when `path` is empty): stable across re-renders. */
export const variantKey = (ref: StudioVariantRef) => `${cellKey(ref.component, ref.set, ref.variant)}${ref.path.length ? `/${ref.path.join(".")}` : ""}`;

/** The cell element of a variant, inside `root` (the world, or the frame). */
export function cellElement(root: ParentNode, ref: StudioVariantRef): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-mc-cell="${CSS.escape(cellKey(ref.component, ref.set, ref.variant))}"]`);
}

/** The variant's root: the first element the component renders in its cell. */
export const variantRoot = (cell: Element | null) => cell?.querySelector<HTMLElement>(":scope > .studio-mc__stage > *") ?? null;

/** The selected layer's element (the variant's root followed down `path`), or null when the cell is not rendered. */
export function variantElement(root: ParentNode, ref: StudioVariantRef): Element | null {
  let element: Element | null = variantRoot(cellElement(root, ref));
  for (const index of ref.path) element = element?.children[index] ?? null;
  return element;
}

/** The path from a variant's root down to `element` (null when it is not inside that root). */
export function pathTo(rootElement: Element, element: Element): number[] | null {
  const path: number[] = [];
  for (let node: Element | null = element; node && node !== rootElement; node = node.parentElement) {
    const parent: Element | null = node.parentElement;
    if (!parent) return null;
    path.unshift(Array.prototype.indexOf.call(parent.children, node));
  }
  return rootElement.contains(element) ? path : null;
}

/** A layer's name as Figma's Layers show it: a Zen part class (`zen-button__icon` → Icon), else the tag. */
export function layerName(element: Element, component: string): string {
  const classes = Array.from(element.classList);
  const part = classes.map((name) => /^zen-[a-z0-9-]+__([a-z0-9-]+)$/.exec(name)?.[1]).find(Boolean);
  if (part) return part.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
  if (classes.some((name) => /^zen-[a-z0-9-]+$/.test(name))) return component;
  if (element instanceof SVGElement || element.tagName.toLowerCase() === "svg") return "Icon";
  return element.tagName.toLowerCase();
}

/** "Size=XS, Level=Primary": a variant as Figma names it, from the set's axes. */
export function variantLabel(variant: Readonly<Record<string, string>>, axes: ReadonlyArray<{ prop: string; label: string; names: readonly string[]; values: readonly string[] }>): string {
  return axes.map((axis) => {
    const index = axis.values.indexOf(variant[axis.prop]);
    return `${axis.label}=${index >= 0 ? axis.names[index] : variant[axis.prop]}`;
  }).join(", ");
}
