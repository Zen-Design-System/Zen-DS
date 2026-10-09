import { VARIANT_SETS, type VariantSet, type VariantToggle } from "./variantSets.generated";

/*
 * The Main component frame's data (spec docs/research/studio-main-component-spec-2026-10-09.md §2): a component's Figma
 * sets, and the filters of each set — the values of the variant properties past the grid's two axes (State) and the
 * Figma booleans (Leading-Icon). A filter left unset shows Figma's default.
 */

export const setsOf = (component: string): readonly VariantSet[] => VARIANT_SETS[component] ?? [];

export const findSet = (component: string, set: string): VariantSet | null => setsOf(component).find((item) => item.name === set) ?? null;

/** Whether a Figma boolean is on in a set's filters ("on" / "off"; unset: Figma's default). */
export const toggleOn = (toggle: VariantToggle, filters: Readonly<Record<string, string>>) => (filters[toggle.prop] ?? (toggle.default ? "on" : "off")) === "on";

const EMPTY: Readonly<Record<string, string>> = Object.freeze({});
let filters: Readonly<Record<string, Readonly<Record<string, string>>>> = {};
const listeners = new Set<() => void>();

export const filterStore = {
  /** A set's filters (the same object until they change). */
  get: (set: string): Readonly<Record<string, string>> => filters[set] ?? EMPTY,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

/** Sets one filter of a set: an axis's value, or "on" / "off" for a toggle. */
export function setFilter(set: string, prop: string, value: string) {
  if (filters[set]?.[prop] === value) return;
  filters = { ...filters, [set]: { ...filters[set], [prop]: value } };
  for (const listener of listeners) listener();
}
