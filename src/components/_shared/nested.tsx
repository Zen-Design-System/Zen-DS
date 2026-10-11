import { cloneElement, createContext, isValidElement, useContext, useMemo, type Key, type ReactElement, type ReactNode } from "react";

/*
 * Figma's instance overrides in code (docs/research/studio-doc-engine-plan-2026-10-10.md §4.3 and §9). A component that
 * draws other Zen components inside itself names each one by its Figma layer: Card's "Sub-Action", a Button's
 * "Leading-Icon", a Table cell's "Row[alex]/status/Badge". `overrides` on the outermost written instance replaces the
 * props of any of them, at any depth, as Figma's instance overrides do; the outermost instance wins over the ones
 * inside it. Slot content (children and the elements a page passes in) belongs to the page and starts a fresh scope.
 *
 * No DOM changes: the scope travels in a context, and Zen Studio reads each nested layer's path from the provider that
 * wraps it.
 */

/** Layer path → the props that replace what the component passes there: `{ "Sub-Action": { level: "primary" } }`. */
export type NestedOverrides = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

type OverrideTable = { base: string; table: NestedOverrides };
/** `layer`: the scope wraps a nested layer itself (nest), not a component's own internals (nest.scope). */
export type NestedScope = { path: string; tables: readonly OverrideTable[]; layer?: boolean };

const EMPTY: NestedScope = { path: "", tables: [] };

/** The scope a nested layer is drawn in. Exported for Zen Studio (it reads layer paths from it); not public API. */
export const NestedContext = createContext<NestedScope>(EMPTY);

export interface Nest {
  /** `element` drawn as the nested layer `name`; `key` tells repeated layers apart (`Row[alex]`, `Badge[2]`). */
  (name: string, element: ReactNode, key?: Key): ReactNode;
  /** Slot content: the page's own elements, outside every nested scope. */
  slot(content: ReactNode): ReactNode;
  /**
   * The component's own scope for internal components it draws without naming them as layers (a Sidebar's panel and
   * rows): their own useNested() continues from it. Slots inside still go through `slot`.
   */
  scope(content: ReactNode): ReactNode;
  /** The helper one level down, for layers drawn inside a part that is not a Zen component (a Table row, a cell). */
  at(name: string, key?: Key): Nest;
}

/** A path segment: the layer name, with the key of a repeated layer. */
export const nestedSegment = (name: string, key?: Key) => (key === undefined || key === null ? name : `${name}[${String(key)}]`);

/** The props written for `path`: the innermost table first, the outermost written instance last (it wins). */
export function overridesAt(tables: readonly OverrideTable[], path: string): Record<string, unknown> | null {
  let out: Record<string, unknown> | null = null;
  for (let index = tables.length - 1; index >= 0; index--) {
    const { base, table } = tables[index];
    const relative = !base ? path : path.startsWith(`${base}/`) ? path.slice(base.length + 1) : null;
    const props = relative === null ? undefined : table[relative];
    if (props && typeof props === "object") out = Object.assign(out ?? {}, props);
  }
  return out;
}

/** The helper for `scope` (see useNested). */
function nestIn(scope: NestedScope): Nest {
  const pathOf = (name: string, key?: Key) => (scope.path ? `${scope.path}/${nestedSegment(name, key)}` : nestedSegment(name, key));
  const nest = ((name: string, element: ReactNode, key?: Key) => {
    if (element === null || element === undefined || typeof element === "boolean") return element;
    const path = pathOf(name, key);
    let content = element;
    if (isValidElement(element) && typeof element.type !== "string") {
      const props = overridesAt(scope.tables, path);
      if (props) content = cloneElement(element as ReactElement<Record<string, unknown>>, props);
    }
    const elementKey = isValidElement(element) ? element.key : null;
    return <NestedContext key={elementKey ?? (key === undefined ? undefined : String(key))} value={{ path, tables: scope.tables, layer: true }}>{content}</NestedContext>;
  }) as Nest;
  // Nothing to draw stays nothing (`slot(undefined) ?? fallback` still falls back).
  const empty = (content: ReactNode) => content === null || content === undefined || typeof content === "boolean" || !(scope.path || scope.tables.length);
  nest.slot = (content: ReactNode) => (empty(content) ? content : <NestedContext value={EMPTY}>{content}</NestedContext>);
  nest.scope = (content: ReactNode) => (empty(content) ? content : <NestedContext value={{ path: scope.path, tables: scope.tables }}>{content}</NestedContext>);
  nest.at = (name: string, key?: Key) => nestIn({ path: pathOf(name, key), tables: scope.tables });
  return nest;
}

/**
 * The nesting helper of a component that draws Zen components inside itself. Call it once, unconditionally, with the
 * component's `overrides` prop; wrap each drawn Zen component in `nest("<Figma layer>", <Component … />)`, each slot in
 * `nest.slot(children)`, and the layers of a repeated part in `nest.at("Row", id)("Badge", <Badge … />)`.
 */
export function useNested(overrides?: NestedOverrides | null): Nest {
  const parent = useContext(NestedContext);
  return useMemo(() => nestIn(overrides && Object.keys(overrides).length
    ? { path: parent.path, tables: [...parent.tables, { base: parent.path, table: overrides }] }
    : parent), [parent, overrides]);
}
