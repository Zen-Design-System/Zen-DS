import type { EditOp } from "../types";
import type { Literal, PropValue } from "../inspector/propSchema";

/*
 * Zen Studio Position section, the model (Figma "Ignore auto layout" + constraints; spec
 * docs/research/studio-position-effects-radius-spec-2026-10-03.md §4.1). Pure functions from what the canvas measures
 * and the source writes to the EditOp[] of one gesture, so `positionModel.selftest.mjs` runs them in Node (type-only
 * imports here). Offsets are Spacing/Padding tokens only (src/components/Layout/position.ts): a distance snaps to the
 * nearest step, and one past the ladder's top step clamps to it (the caller says so).
 */

export type PositionAxis = "x" | "y";
export type ConstraintX = "left" | "right" | "left-right" | "center";
export type ConstraintY = "top" | "bottom" | "top-bottom" | "center";
export type Constraint = ConstraintX | ConstraintY;
/** Where on an axis: the start edge (left / top), both, the centre or the end edge (right / bottom). */
export type Pin = "start" | "end" | "stretch" | "center";

/** The props the Position section owns (DesignPanel leaves them out of Layout and Properties). */
export const positionProps = ["position", "constraintX", "constraintY", "insetTop", "insetRight", "insetBottom", "insetLeft"] as const;
/** Components whose own props float them (src/components/Layout/position.ts); any other layer floats in a Box. */
export const floatingComponents: ReadonlySet<string> = new Set(["Stack", "Grid", "Box"]);

export const constraintProp = { x: "constraintX", y: "constraintY" } as const;
const insetProp = { x: { start: "insetLeft", end: "insetRight" }, y: { start: "insetTop", end: "insetBottom" } } as const;
const pinValue = { x: { start: "left", end: "right", stretch: "left-right", center: "center" }, y: { start: "top", end: "bottom", stretch: "top-bottom", center: "center" } } as const;
const defaultConstraint = { x: "left", y: "top" } as const;

export const constraintOptions = { x: ["left", "right", "left-right", "center"], y: ["top", "bottom", "top-bottom", "center"] } as const;
export const constraintLabels: Record<string, string> = { left: "Left", right: "Right", "left-right": "Left and right", center: "Center", top: "Top", bottom: "Bottom", "top-bottom": "Top and bottom" };
export const edgeLabels: Record<string, string> = { insetLeft: "Left", insetRight: "Right", insetTop: "Top", insetBottom: "Bottom" };

/** Spacing/Padding keys in ladder order, with none first. */
export const paddingLadderKeys = ["none", "3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"] as const;
/** The ladder as it measures on the canvas (density and mode applied), in CSS px. */
export type Ladder = { key: string; px: number }[];

/**
 * One axis of the layer, in CSS px, from the edges of its containing block's padding box (where absolute offsets start):
 * `start` / `end` = the distance from the left (top) and right (bottom) edge; `padStart` / `padEnd` = that block's
 * padding (the layer spans its content box when the distances equal them).
 */
export type AxisMeasure = {
  start: number;
  end: number;
  padStart: number;
  padEnd: number;
  /**
   * Another layer of the parent spans this axis too, so the parent keeps its size here once this one floats (false: it
   * is what sizes the parent, e.g. the tallest item of a row, which would shrink with the parent if it stretched).
   */
  shared?: boolean;
};
export type Measured = { x: AxisMeasure; y: AxisMeasure };

export type Snap = { key: string; px: number; clamped: boolean; from: number };

/** The nearest step of the ladder (a tie takes the smaller one); past the top step: the top step, clamped. */
export function snap(px: number, ladder: Ladder): Snap {
  const from = Math.max(0, Math.round(px));
  const steps = ladder.length ? ladder : [{ key: "none", px: 0 }];
  const top = steps.reduce((best, step) => (step.px > best.px ? step : best), steps[0]);
  if (from > top.px + 0.5) return { key: top.key, px: top.px, clamped: true, from };
  let best = steps[0];
  for (const step of steps) {
    const gap = Math.abs(step.px - from);
    const bestGap = Math.abs(best.px - from);
    if (gap < bestGap - 0.01 || (Math.abs(gap - bestGap) <= 0.01 && step.px < best.px)) best = step;
  }
  return { key: best.key, px: best.px, clamped: false, from };
}

const near = (a: number, b: number) => Math.abs(a - b) <= 1;

/**
 * Where a layer sits on an axis now: Fill, or spanning its parent's content box beside another layer that spans it too
 * → stretch; centred → center; else the nearer edge.
 */
export function pinOf(axis: AxisMeasure, fill: boolean): Pin {
  if (fill || (near(axis.start, axis.padStart) && near(axis.end, axis.padEnd) && axis.shared !== false)) return "stretch";
  if (near(axis.start, axis.end) && axis.start > 1) return "center";
  return axis.start <= axis.end ? "start" : "end";
}

/** The pin a written (or default) constraint means. */
export function pinOfConstraint(axis: PositionAxis, value: string | undefined): Pin {
  const values = pinValue[axis] as Record<Pin, string>;
  return (Object.keys(values) as Pin[]).find((pin) => values[pin] === value) ?? "start";
}

/** The inset props a pin reads. */
export function readInsets(axis: PositionAxis, pin: Pin): string[] {
  if (pin === "stretch") return [insetProp[axis].start, insetProp[axis].end];
  if (pin === "center") return [];
  return [insetProp[axis][pin]];
}

const literalOf = (value: PropValue | undefined): Literal | undefined => (value?.state === "literal" ? value.value : undefined);
const set = (name: string, value: string): EditOp => ({ op: "setProp", name, value: { kind: "string", value } });
const remove = (name: string): EditOp => ({ op: "removeProp", name });

/** What the plan of one axis writes: its constraint (unless the default) and the snapped insets it reads (unless none). */
function axisProps(axis: PositionAxis, pin: Pin, measure: AxisMeasure, ladder: Ladder) {
  const props: Record<string, string> = {};
  const snaps: { prop: string; snap: Snap }[] = [];
  const constraint = pinValue[axis][pin];
  if (constraint !== defaultConstraint[axis]) props[constraintProp[axis]] = constraint;
  for (const prop of readInsets(axis, pin)) {
    const distance = prop === insetProp[axis].start ? measure.start : measure.end;
    const snapped = snap(distance, ladder);
    snaps.push({ prop, snap: snapped });
    if (snapped.key !== "none") props[prop] = snapped.key;
  }
  return { props, snaps };
}

export type FloatPlan = {
  /** The props a floating layer is given (Stack/Grid/Box: on itself; any other layer: on the new Box around it). */
  props: Record<string, string>;
  /** Written props that stop working once it floats (Fill on a stretched axis, Align in parent). */
  removes: string[];
  pins: { x: Pin; y: Pin };
  snaps: { prop: string; snap: Snap }[];
};

/**
 * Ignore auto layout on: per axis, a layer that spans its parent's content box (or fills it) stretches between the two
 * snapped offsets, a centred one centres, any other is pinned to the nearer edge at the snapped distance (Figma keeps
 * Left/Top and the exact x/y; Zen's offsets are tokens up to 4xl, so the nearer edge moves it least). `written`: the
 * layer's own props (width, height, alignSelf), for the dead ones to remove; empty for a layer that floats in a Box.
 */
export function floatPlan(measured: Measured, ladder: Ladder, written: Record<string, PropValue> = {}): FloatPlan {
  const fillX = literalOf(written.width) === "fill";
  const fillY = literalOf(written.height) === "fill";
  const pins = { x: pinOf(measured.x, fillX), y: pinOf(measured.y, fillY) };
  const x = axisProps("x", pins.x, measured.x, ladder);
  const y = axisProps("y", pins.y, measured.y, ladder);
  const removes: string[] = [];
  if (fillX) removes.push("width");
  if (fillY) removes.push("height");
  if (written.alignSelf?.state === "literal") removes.push("alignSelf");
  return { props: { position: "absolute", ...x.props, ...y.props }, removes, pins, snaps: [...x.snaps, ...y.snaps] };
}

/** The plan as one write on the layer itself (Stack, Grid, Box). */
export function floatOps(plan: FloatPlan): EditOp[] {
  return [...plan.removes.map(remove), ...Object.entries(plan.props).map(([name, value]) => set(name, value))];
}

/** Ignore auto layout off: every position prop the source writes goes; the layer returns to its place in the flow. */
export function unfloatOps(written: Record<string, PropValue>): EditOp[] {
  return positionProps.filter((name) => written[name] && written[name].state !== "unset" && written[name].state !== "spread").map(remove);
}

/**
 * A constraint change (select, diagram or Align): the constraint (removed when it is the default), every inset the new
 * pin reads set to the snapped distance the layer has now (Align: none, as Figma aligns to the parent's edge), and the
 * insets it no longer reads removed, so the layer keeps its place except for snapping.
 */
export function constraintOps(axis: PositionAxis, pin: Pin, measure: AxisMeasure | null, ladder: Ladder, written: Record<string, PropValue>, { flush = false } = {}): { ops: EditOp[]; snaps: { prop: string; snap: Snap }[] } {
  const ops: EditOp[] = [];
  const snaps: { prop: string; snap: Snap }[] = [];
  const name = constraintProp[axis];
  const value = pinValue[axis][pin];
  if (value === defaultConstraint[axis]) {
    if (written[name]?.state === "literal") ops.push(remove(name));
  } else if (literalOf(written[name]) !== value) ops.push(set(name, value));
  const reads = readInsets(axis, pin);
  for (const prop of [insetProp[axis].start, insetProp[axis].end]) {
    const has = written[prop]?.state === "literal";
    if (!reads.includes(prop)) {
      if (has) ops.push(remove(prop));
      continue;
    }
    if (flush || !measure) {
      if (has) ops.push(remove(prop));
      continue;
    }
    const snapped = snap(prop === insetProp[axis].start ? measure.start : measure.end, ladder);
    snaps.push({ prop, snap: snapped });
    const current = literalOf(written[prop]);
    if (snapped.key === "none") {
      if (has) ops.push(remove(prop));
    } else if (current !== snapped.key) ops.push(set(prop, snapped.key));
  }
  // Left and right ignores the width (position.css): a Fixed or Fill width is dead there.
  if (pin === "stretch") {
    const size = axis === "x" ? "width" : "height";
    if (written[size]?.state === "literal") ops.push(remove(size));
  }
  return { ops, snaps };
}

/** "left sm · 12", "top 4xl · 48 (was 137)". */
export function snapText(entry: { prop: string; snap: Snap }): string {
  const edge = (edgeLabels[entry.prop] ?? entry.prop).toLowerCase();
  const value = entry.snap.key === "none" ? "0" : `${entry.snap.key} · ${Math.round(entry.snap.px)}`;
  return `${edge} ${value}${entry.snap.clamped || Math.abs(entry.snap.px - entry.snap.from) >= 1 ? ` (was ${entry.snap.from})` : ""}`;
}

/** The status line after a float: what it is pinned to, and whether a distance past the ladder was clamped. */
export function floatSummary(name: string, snaps: { prop: string; snap: Snap }[], pins: { x: Pin; y: Pin }): string {
  const centred = (["x", "y"] as const).filter((axis) => pins[axis] === "center").map((axis) => (axis === "x" ? "centred horizontally" : "centred vertically"));
  const parts = [...snaps.map(snapText), ...centred];
  const clamped = snaps.some((entry) => entry.snap.clamped) ? " · offsets stop at 4xl" : "";
  return `${name} ignores auto layout${parts.length ? ` · ${parts.join(", ")}` : ""}${clamped}`;
}
