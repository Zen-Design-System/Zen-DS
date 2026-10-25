import { BREAKPOINTS, type ZenBreakpointKey } from "../../../../tools/studio/screen-devices.mjs";
import { RESPONSIVE_DEFAULTS, RESPONSIVE_PROPS } from "../../../../tools/studio/responsive-props.mjs";
import type { EditOp, EditValue, SourceAttr } from "../types";

/*
 * Per-breakpoint layout props in the Inspector and on the canvas (P2 of docs/research/studio-responsive-breakpoints-
 * 2026-10-26.md §4 "Studio"): Stack, Grid and Box props that take `{ desktop?, tablet?, mobile? }` (the library's
 * resolveAt: a breakpoint's own key, then the wider ones, a narrower one only when no wider is set). The controls show
 * the value at the **editing breakpoint** (the one the Screen shows, or the one picked in the section) and write that
 * breakpoint's key: a plain value stays plain until a narrower breakpoint differs, and an object collapses back to plain
 * when every breakpoint shows the same. Pure: responsiveModel.selftest.mjs runs it in Node.
 */

export type Breakpoint = ZenBreakpointKey;
export type RLiteral = string | number | boolean;
/** What a responsive prop holds as written: nothing, a literal, one literal per breakpoint, or code it cannot read. */
export type ResponsiveRead =
  | { kind: "unset" }
  | { kind: "value"; value: RLiteral }
  | { kind: "responsive"; values: Partial<Record<Breakpoint, RLiteral>> }
  | { kind: "code" };

/** The props of `component` that take one value per breakpoint (Grid `columns` has its own field, ColumnsField). */
export const responsivePropsOf = (component: string): readonly string[] => ((RESPONSIVE_PROPS as Record<string, string[]>)[component] ?? []).filter((name) => name !== "columns");

/** A responsive prop's own default (Layout.tsx), else undefined (its unset value follows another prop). */
export const responsiveDefault = (component: string, name: string): RLiteral | undefined => (RESPONSIVE_DEFAULTS as Record<string, Record<string, RLiteral>>)[component]?.[name];

/** What attribute `name` holds, from the element's attributes as written. */
export function responsiveRead(attributes: readonly SourceAttr[], name: string): ResponsiveRead {
  const attr = attributes.filter((candidate) => candidate.kind !== "spread" && candidate.name === name).at(-1);
  if (!attr) return { kind: "unset" };
  if (attr.kind === "string") return { kind: "value", value: attr.value ?? "" };
  if (attr.kind === "true") return { kind: "value", value: true };
  const raw = (attr.value ?? "").trim();
  if (/^-?\d+(\.\d+)?$/.test(raw)) return { kind: "value", value: Number(raw) };
  if (raw === "true" || raw === "false") return { kind: "value", value: raw === "true" };
  const quoted = /^(["'`])([^"'`$]*)\1$/.exec(raw);
  if (quoted) return { kind: "value", value: quoted[2] };
  if (attr.shape?.type !== "object" || !attr.shape.fields.length) return { kind: "code" };
  const values: Partial<Record<Breakpoint, RLiteral>> = {};
  for (const field of attr.shape.fields) {
    if (!(BREAKPOINTS as readonly string[]).includes(field.key) || field.kind === "expression" || field.kind === "spread") return { kind: "code" };
    values[field.key as Breakpoint] = field.value;
  }
  return { kind: "responsive", values };
}

/** A per-breakpoint value at `breakpoint` (resolveAt's order: own, wider, then narrower). */
export function valueAt(values: Partial<Record<Breakpoint, RLiteral>>, breakpoint: Breakpoint): RLiteral | undefined {
  const order: Breakpoint[] = breakpoint === "mobile" ? ["mobile", "tablet", "desktop"] : breakpoint === "tablet" ? ["tablet", "desktop", "mobile"] : ["desktop", "tablet", "mobile"];
  for (const key of order) if (values[key] !== undefined) return values[key];
  return undefined;
}

/** What a read shows at `breakpoint` (undefined: unset or code). */
export function shownAt(read: ResponsiveRead, breakpoint: Breakpoint): RLiteral | undefined {
  return read.kind === "value" ? read.value : read.kind === "responsive" ? valueAt(read.values, breakpoint) : undefined;
}

/** Whether `breakpoint` writes a value of its own (a key of a per-breakpoint value). */
export const ownAt = (read: ResponsiveRead, breakpoint: Breakpoint): boolean => read.kind === "responsive" && read.values[breakpoint] !== undefined;

const literalCode = (value: RLiteral) => (typeof value === "string" ? JSON.stringify(value) : String(value));
/** `{ desktop: "row", mobile: "column" }`, widest first. */
export const objectCode = (values: Partial<Record<Breakpoint, RLiteral>>) => `{ ${BREAKPOINTS.filter((key) => values[key] !== undefined).map((key) => `${key}: ${literalCode(values[key]!)}`).join(", ")} }`;
const editValue = (value: RLiteral): EditValue => (typeof value === "string" ? { kind: "string", value } : typeof value === "number" ? { kind: "number", value } : { kind: "boolean", value });

/** The op that writes `values` for `name`: plain when every breakpoint shows the same (none: the prop goes). */
function writeValues(name: string, values: Partial<Record<Breakpoint, RLiteral>>): EditOp {
  const shown = BREAKPOINTS.map((key) => valueAt(values, key));
  if (shown[0] === undefined) return { op: "removeProp", name };
  if (shown.every((value) => value === shown[0])) return { op: "setProp", name, value: editValue(shown[0]) };
  return { op: "setProp", name, value: { kind: "expression", code: objectCode(values) } };
}

/** The keys a read writes, a plain value as desktop's (`fallback`: desktop's when nothing is written yet). */
function keysOf(read: ResponsiveRead, fallback: RLiteral | undefined): Partial<Record<Breakpoint, RLiteral>> {
  if (read.kind === "responsive") return { ...read.values };
  if (read.kind === "value") return { desktop: read.value };
  return fallback === undefined ? {} : { desktop: fallback };
}

export type ResponsiveContext = {
  component: string;
  attributes: readonly SourceAttr[];
  breakpoint: Breakpoint;
  /** The prop's default where the Inspector knows one beyond Layout.tsx's (the props docs' default). */
  defaults?: Readonly<Record<string, RLiteral | undefined>>;
};

/**
 * Plain ops (what the controls plan for one value: setProp / removeProp) as the editing breakpoint's: on desktop a plain
 * prop is still written plain (narrower breakpoints follow it); anywhere else, or on a prop already per breakpoint, only
 * that breakpoint's key changes, and a removeProp writes the prop's default there (the control's "unset" look). Ops on
 * other props pass through. One op per prop: the last one wins, as the controls write each prop once.
 */
export function responsiveOps(ops: readonly EditOp[], context: ResponsiveContext): EditOp[] {
  const props = new Set(responsivePropsOf(context.component));
  const fallback = (name: string) => context.defaults?.[name] ?? responsiveDefault(context.component, name);
  return ops.map((op) => {
    if ((op.op !== "setProp" && op.op !== "removeProp") || !props.has(op.name)) return op;
    const read = responsiveRead(context.attributes, op.name);
    if (read.kind === "code") return op;
    if (op.op === "setProp" && !["string", "number", "boolean"].includes(op.value.kind)) return op;
    const next: RLiteral | undefined = op.op === "setProp" ? (op.value as { value: RLiteral }).value : fallback(op.name);
    if (context.breakpoint === "desktop" && read.kind !== "responsive") return op;
    const keys = keysOf(read, fallback(op.name));
    if (next === undefined) delete keys[context.breakpoint];
    else keys[context.breakpoint] = next;
    return writeValues(op.name, keys);
  });
}

/** The responsive props of the element that write a value of their own at `breakpoint`. */
export function ownProps(component: string, attributes: readonly SourceAttr[], breakpoint: Breakpoint): string[] {
  return responsivePropsOf(component).filter((name) => ownAt(responsiveRead(attributes, name), breakpoint));
}

/** Breakpoints where the element writes a value of its own (the switch's dots); desktop counts only when a narrower one differs. */
export function breakpointsWithOwn(component: string, attributes: readonly SourceAttr[]): Breakpoint[] {
  return BREAKPOINTS.filter((key) => ownProps(component, attributes, key).length > 0);
}

/** Reset to the wider breakpoint: `breakpoint`'s own keys go (it shows the next wider one's values again). */
export function resetOps(component: string, attributes: readonly SourceAttr[], breakpoint: Breakpoint): EditOp[] {
  if (breakpoint === "desktop") return [];
  return ownProps(component, attributes, breakpoint).map((name) => {
    const read = responsiveRead(attributes, name) as Extract<ResponsiveRead, { kind: "responsive" }>;
    const keys = { ...read.values };
    delete keys[breakpoint];
    return writeValues(name, keys);
  });
}

/** Same on every breakpoint: each per-breakpoint prop written plain with what `breakpoint` shows. */
export function sameEverywhereOps(component: string, attributes: readonly SourceAttr[], breakpoint: Breakpoint): EditOp[] {
  return responsivePropsOf(component).flatMap((name) => {
    const read = responsiveRead(attributes, name);
    if (read.kind !== "responsive") return [];
    const shown = valueAt(read.values, breakpoint);
    return [shown === undefined ? { op: "removeProp", name } as EditOp : { op: "setProp", name, value: editValue(shown) } as EditOp];
  });
}

/** The breakpoint whose values `breakpoint` shows once its own keys go (what Reset names): the nearest wider one that
 *  writes a key of its own among `props`, else Desktop. */
export function widerOf(breakpoint: Breakpoint, component?: string, attributes?: readonly SourceAttr[]): Breakpoint {
  if (breakpoint !== "mobile") return "desktop";
  const tablet = component && attributes ? ownProps(component, attributes, "tablet").length > 0 : false;
  return tablet ? "tablet" : "desktop";
}
