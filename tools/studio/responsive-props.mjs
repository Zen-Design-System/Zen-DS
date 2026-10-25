// Per-breakpoint layout props on a builder page (P2 of docs/research/studio-responsive-breakpoints-2026-10-26.md): Stack,
// Grid and Box take `{ desktop?, tablet?, mobile? }` for the props below (src/components/_shared/responsive.ts, the
// library's resolveAt: a breakpoint without its own value takes the next wider one's) and `hideOn`. Figma has no
// breakpoints, so the push draws a page at its Screen's breakpoint (figma-push.mjs) and Update from Figma writes only
// that breakpoint's key, keeping the others (figma-diff.mjs). Values here are dialect values ({ kind, … }, doc.mjs).
// Isomorphic; the breakpoints and a Screen's breakpoint are screen-devices.mjs's (one rule for the Studio canvas, Play
// and the push).

import { BREAKPOINTS, screenBreakpoint } from "./screen-devices.mjs";

export { BREAKPOINTS, screenBreakpoint };

/** The props that take one value per breakpoint (Layout.tsx). */
export const RESPONSIVE_PROPS = {
  Stack: ["direction", "gap", "align", "justify", "wrap", "padding", "paddingX", "paddingY"],
  Grid: ["columns", "gap", "rowGap", "columnGap", "padding"],
  Box: ["padding", "paddingX", "paddingY"],
};

/** Hides a Stack, Grid or Box at the breakpoints it lists (Layout.tsx `hideOn`). */
export const HIDE_ON_PROP = "hideOn";

/**
 * What an unset prop draws, where that is a value of its own (Layout.tsx defaults): an Update from Figma that resets one
 * writes it as the breakpoint's key. Props whose unset value follows another (align, paddingX, rowGap, columns' auto-fill)
 * lose the key instead, so the breakpoint takes the next wider one's.
 */
export const RESPONSIVE_DEFAULTS = {
  Stack: { direction: "column", gap: "md", wrap: false, padding: "none" },
  Grid: { gap: "md", padding: "none" },
  Box: { padding: "none" },
};

/** Where each breakpoint looks (resolveAt): its own key, then the wider ones; a narrower key only when no wider one is set. */
const LOOKUP = { desktop: ["desktop", "tablet", "mobile"], tablet: ["tablet", "desktop", "mobile"], mobile: ["mobile", "tablet", "desktop"] };

/** Whether `component`'s `prop` takes one value per breakpoint. */
export const isResponsiveProp = (component, prop) => Boolean(RESPONSIVE_PROPS[component]?.includes(prop));

/** A frame's own breakpoint mode (`modes={{ breakpoint }}`), or null. */
export function modesBreakpoint(value) {
  const field = value?.kind === "object" ? value.fields.breakpoint : null;
  return field?.kind === "literal" && BREAKPOINTS.includes(field.value) ? field.value : null;
}

/** Whether a dialect value holds one value per breakpoint (`{ desktop: …, mobile: … }`), not a plain one. */
export function perBreakpoint(value) {
  if (value?.kind !== "object") return false;
  const keys = Object.keys(value.fields);
  return keys.length > 0 && keys.every((key) => BREAKPOINTS.includes(key));
}

/** The dialect value a prop shows at `breakpoint` (a plain value everywhere; undefined when none applies). */
export function valueAt(value, breakpoint) {
  if (!perBreakpoint(value)) return value;
  const key = LOOKUP[breakpoint ?? "desktop"].find((at) => value.fields[at] !== undefined);
  return key ? value.fields[key] : undefined;
}

/** The breakpoints a `hideOn` value lists (an array literal, or a literal holding an array). */
export function hideOnList(value) {
  if (value?.kind === "array") return value.items.filter((item) => item.kind === "literal" && BREAKPOINTS.includes(item.value)).map((item) => item.value);
  if (value?.kind === "literal" && Array.isArray(value.value)) return value.value.filter((item) => BREAKPOINTS.includes(item));
  return [];
}

/** Whether an element is hidden at `breakpoint` by its `hideOn`. */
export const hiddenAt = (element, breakpoint) => (element.name === "Stack" || element.name === "Grid" || element.name === "Box") && hideOnList(element.props[HIDE_ON_PROP]).includes(breakpoint);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * `current` (a per-breakpoint value) with `breakpoint`'s key set to `next` (a dialect value; undefined: the prop's
 * `fallback`, else the key goes), the other keys kept. A value the same on every breakpoint collapses to a plain one; no
 * key left is undefined (the prop goes).
 */
export function withBreakpointValue(current, next, breakpoint, fallback) {
  const fields = perBreakpoint(current) ? { ...current.fields } : current === undefined ? {} : { desktop: current };
  const write = next ?? (fallback === undefined ? undefined : { kind: "literal", value: fallback });
  if (write === undefined) delete fields[breakpoint];
  else fields[breakpoint] = write;
  const ordered = Object.fromEntries(BREAKPOINTS.filter((key) => fields[key] !== undefined).map((key) => [key, fields[key]]));
  if (!Object.keys(ordered).length) return undefined;
  const value = { kind: "object", fields: ordered };
  const shown = BREAKPOINTS.map((at) => valueAt(value, at));
  return shown.every((entry) => same(entry, shown[0])) ? shown[0] : value;
}

/**
 * `node` (a dialect element) as drawn at `breakpoint`: each Stack, Grid and Box with its per-breakpoint props resolved
 * and `hideOn` gone, a layer hidden there left out (null). A frame's own `modes={{ breakpoint }}` sets the breakpoint
 * for itself and its layers. `count` collects what changed: { resolved, hidden }.
 */
export function atBreakpoint(node, breakpoint, count = { resolved: 0, hidden: 0 }) {
  const at = modesBreakpoint(node.props.modes) ?? breakpoint;
  if (hiddenAt(node, at)) {
    count.hidden += 1;
    return null;
  }
  const value = (entry) => {
    if (entry.kind === "element") { const next = atBreakpoint(entry.node, at, count); return next ? { ...entry, node: next } : null; }
    if (entry.kind === "fragment") { const children = entry.children.map(child).filter(Boolean); return children.length ? { ...entry, children } : null; }
    if (entry.kind === "array") return { ...entry, items: entry.items.map(value).filter(Boolean) };
    if (entry.kind === "object") return { ...entry, fields: Object.fromEntries(Object.entries(entry.fields).map(([key, field]) => [key, value(field)]).filter(([, field]) => field)) };
    return entry;
  };
  const child = (entry) => {
    if (entry.kind === "element") return atBreakpoint(entry, at, count);
    if (entry.kind === "map") { const next = atBreakpoint(entry.node, at, count); return next ? { ...entry, node: next } : null; }
    return entry;
  };
  const props = {};
  for (const [name, entry] of Object.entries(node.props)) {
    if (name === HIDE_ON_PROP && (node.name === "Stack" || node.name === "Grid" || node.name === "Box")) continue;
    if (isResponsiveProp(node.name, name) && perBreakpoint(entry)) {
      count.resolved += 1;
      const shown = valueAt(entry, at);
      if (shown !== undefined) props[name] = shown;
      continue;
    }
    const next = value(entry);
    if (next) props[name] = next;
  }
  return { ...node, props, children: node.children.map(child).filter(Boolean) };
}
