import { useSyncExternalStore } from "react";

/*
 * Where a change to one row of a list goes on a page you made (core rebuild M4, plan criterion 3): "row", that row only,
 * as one instance in Figma (op setRowProp), or "all", every row (the layer itself). The Design panel's "Changes go to"
 * choice sets it; a picture dropped or picked for the layer (edit/assets/picture.ts) reads it too. Back to "row" when
 * another layer is selected (DesignPanel).
 */

export type RowScope = "row" | "all";

let scope: RowScope = "row";
const listeners = new Set<() => void>();

export const rowScope = {
  get: (): RowScope => scope,
  set(next: RowScope) {
    if (next === scope) return;
    scope = next;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

export const useRowScope = (): RowScope => useSyncExternalStore(rowScope.subscribe, rowScope.get, () => "row");
