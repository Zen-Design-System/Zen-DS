/*
 * Attributes as React's components spread them. A React component puts the caller's props on its root first and its
 * own after (`{...rest} data-size={…}`), so its own win; Vue's fall-through would let the caller's win. Components
 * therefore take `inheritAttrs: false` and build the root with these helpers.
 */

type Attrs = Record<string, unknown>;

/** The caller's attributes without class and style (the component merges those itself). */
export function restAttrs(attrs: Attrs): Attrs {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
}

/** Only the caller's `data-*` attributes (React: _shared/data-attributes.ts, for components that forward no others). */
export function dataAttrs(attrs: Attrs): Attrs {
  return Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith("data-")));
}

/**
 * A boolean HTML attribute the component reads from its attributes (Button's `disabled`): Vue passes `<Button disabled>`
 * as "", `:disabled="false"` as false.
 */
export const boolAttr = (value: unknown) => value === "" || value === true || value === "true";
