import type { EditOp } from "../types";
import type { Literal, PropValue } from "./propSchema";

/*
 * The Size group's view model (SizingSection.tsx): what W / H, min / max, Align in parent and Children show for the
 * selected element, and the EditOp[] each intent writes as ONE request (one draft change, one undo step). Spec:
 * docs/research/studio-inspector-redesign-2026-10-03.md, "SIZE" and the width / height, min / max, alignSelf and
 * fillChildren control specs. Library API: src/components/Layout/sizing.ts.
 *
 * Pure: no DOM, no React, type-only imports and erasable TypeScript, so `node sizingModel.selftest.mjs` imports it.
 */

export type SizingAxis = "width" | "height";
export type SizingMode = "hug" | "fill" | "fixed" | "auto";
export type LimitProp = "minWidth" | "maxWidth" | "minHeight" | "maxHeight";
export type AlignSelfValue = "start" | "center" | "end" | "stretch";

/** The parent the element renders in, read off the DOM: a Stack row / column, a Grid, or anything else. */
export type ParentLayout = { kind: "row" | "column" | "grid" | "other"; fillChildren: boolean };

/** What the rendered element says about one axis (data-w / data-h and --zen-layout-width / -height). */
export type LiveSizing = { mode: "hug" | "fill" | "fixed" | null; px: number | null };

/** One axis as the field shows it. */
export type AxisView = {
  axis: SizingAxis;
  /** What renders: the written mode, the live one (bound / spread), Fill from a fillChildren parent, or auto. */
  mode: SizingMode;
  /** Fixed px (written or live). */
  px: number | null;
  /** The source writes a literal the field can edit. */
  written: boolean;
  /** Literal or unset: the field edits it. Bound and spread values are read-only. */
  editable: boolean;
  source: "unset" | "literal" | "bound" | "spread";
  /** Bound: the expression; spread: the spread ("{...rest}"). */
  via?: string;
  /** Unset, but the parent Stack's fillChildren makes it Fill along the stack's direction. */
  fromParent: boolean;
  /** A literal the API does not take (width="312", a string): shown as written, never rewritten unless edited. */
  unknown?: string;
  /** The field's value: "Hug" | "Fill" | "312" | "Auto". */
  text: string;
};

/** The props the Size group shows and writes: leave them out of a generic Properties list. (Container's maxWidth is a
 * token enum, not one of these: hasSizing() is false for Container.) */
export const sizingPropNames: ReadonlySet<string> = new Set(["width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight", "alignSelf", "fillChildren"]);

export const axisLetter: Record<SizingAxis, string> = { width: "W", height: "H" };
export const axisName: Record<SizingAxis, string> = { width: "Width", height: "Height" };
export const limitsOf: Record<SizingAxis, readonly [LimitProp, LimitProp]> = { width: ["minWidth", "maxWidth"], height: ["minHeight", "maxHeight"] };
export const limitProps: readonly LimitProp[] = ["minWidth", "maxWidth", "minHeight", "maxHeight"];
/** Leading text, accessible name and the "Min and max size" menu label of each limit. */
export const limitText: Record<LimitProp, { short: string; name: string; add: string }> = {
  minWidth: { short: "Min W", name: "Minimum width", add: "Add min width" },
  maxWidth: { short: "Max W", name: "Maximum width", add: "Add max width" },
  minHeight: { short: "Min H", name: "Minimum height", add: "Add min height" },
  maxHeight: { short: "Max H", name: "Maximum height", add: "Add max height" },
};

/** A LayoutSizing value ("hug" | "fill" | a finite number), or null. */
export function sizingValue(value: unknown): "hug" | "fill" | number | null {
  if (value === "hug" || value === "fill") return value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const modeText = (mode: SizingMode, px: number | null) => (mode === "hug" ? "Hug" : mode === "fill" ? "Fill" : mode === "fixed" ? String(px ?? 0) : "Auto");

/** Does a fillChildren parent make this axis Fill (row → width, column → height)? */
export const fillsFromParent = (axis: SizingAxis, parent: ParentLayout) =>
  parent.fillChildren && ((parent.kind === "row" && axis === "width") || (parent.kind === "column" && axis === "height"));

function fromLive(live: LiveSizing): { mode: SizingMode; px: number | null } {
  if (live.mode === "fixed") return { mode: "fixed", px: live.px };
  return { mode: live.mode ?? "auto", px: null };
}

/** The field's view of one axis: the source value first, the rendered element for bound and spread values. */
export function axisView(axis: SizingAxis, value: PropValue, live: LiveSizing, parent: ParentLayout): AxisView {
  const base = { axis, fromParent: false };
  if (value.state === "literal") {
    const sizing = sizingValue(value.value);
    if (sizing === null) return { ...base, mode: "auto", px: null, written: true, editable: true, source: "literal", unknown: String(value.value), text: String(value.value) };
    const mode: SizingMode = typeof sizing === "number" ? "fixed" : sizing;
    const px = typeof sizing === "number" ? Math.round(sizing) : null;
    return { ...base, mode, px, written: true, editable: true, source: "literal", text: modeText(mode, px) };
  }
  if (value.state === "bound" || value.state === "spread") {
    const fed = value.state === "spread" ? sizingValue(value.live) : null;
    const shown = fed !== null ? { mode: (typeof fed === "number" ? "fixed" : fed) as SizingMode, px: typeof fed === "number" ? Math.round(fed) : null } : fromLive(live);
    const fromParent = shown.mode === "auto" && fillsFromParent(axis, parent);
    const mode = fromParent ? "fill" : shown.mode;
    return { ...base, fromParent, mode, px: shown.px, written: false, editable: false, source: value.state, via: value.state === "bound" ? value.expression : value.via, text: modeText(mode, shown.px) };
  }
  const fromParent = fillsFromParent(axis, parent);
  const mode: SizingMode = fromParent ? "fill" : "auto";
  return { ...base, fromParent, mode, px: null, written: false, editable: true, source: "unset", text: modeText(mode, null) };
}

/** What the person typed in a W / H field. */
export type SizingInput =
  | { kind: "hug" }
  | { kind: "fill" }
  | { kind: "fixed"; px: number }
  /** "fix", "fixed": Fixed at the measured size. */
  | { kind: "fixed-current" }
  | { kind: "auto" }
  /** Empty: put the shown value back, write nothing. */
  | { kind: "revert" }
  | { kind: "invalid"; message: string };

const startsWord = (text: string, ...words: string[]) => words.some((word) => word.startsWith(text));

/** Typing: a number = Fixed (px, "px" allowed), h / hug = Hug, f / fill = Fill, fix / fixed = Fixed at the current size, a / auto = reset. */
export function parseSizingInput(text: string, axis: SizingAxis = "width"): SizingInput {
  const value = text.trim().toLowerCase();
  if (!value) return { kind: "revert" };
  const number = /^(\d+(?:[.,]\d+)?)\s*(?:px)?$/.exec(value);
  if (number) {
    const px = Math.round(Number(number[1].replace(",", ".")));
    return px >= 1 ? { kind: "fixed", px } : { kind: "invalid", message: `${axisName[axis]} needs at least 1 px` };
  }
  if (/^fix/.test(value) && startsWord(value, "fixed")) return { kind: "fixed-current" };
  if (startsWord(value, "fill", "fill container")) return { kind: "fill" };
  if (startsWord(value, "hug", "hug contents")) return { kind: "hug" };
  if (startsWord(value, "auto", "reset")) return { kind: "auto" };
  if (/^-?\d/.test(value) && /(%|rem|em|vw|vh|ch)$/.test(value)) return { kind: "invalid", message: "Sizes are px numbers: use Fill for 100%" };
  return { kind: "invalid", message: `${axisName[axis]} takes a number, Hug or Fill` };
}

const set = (name: string, value: Literal): EditOp => ({
  op: "setProp",
  name,
  value: typeof value === "boolean" ? { kind: "boolean", value } : typeof value === "number" ? { kind: "number", value } : { kind: "string", value },
});
const remove = (name: string): EditOp => ({ op: "removeProp", name });

/** The props one intent writes, or null when the source already holds it (nothing to send). `measured` = the rendered px. */
export function sizingOps(view: AxisView, input: SizingInput, measured: number | null): EditOp[] | null {
  if (!view.editable) return null;
  const written = view.written && !view.unknown;
  switch (input.kind) {
    case "hug":
    case "fill":
      return written && view.mode === input.kind ? null : [set(view.axis, input.kind)];
    case "fixed":
      return written && view.mode === "fixed" && view.px === input.px ? null : [set(view.axis, Math.max(1, Math.round(input.px)))];
    case "fixed-current": {
      if (written && view.mode === "fixed") return null;
      return measured === null ? null : [set(view.axis, Math.max(1, Math.round(measured)))];
    }
    case "auto":
      return view.written ? [remove(view.axis)] : null;
    default:
      return null;
  }
}

/** Where ↑ / ↓ and scrubbing start: the Fixed px, else the measured px (Hug / Fill / Auto become Fixed, as in Figma). */
export const stepBase = (view: AxisView, measured: number | null) => (view.mode === "fixed" && view.px !== null ? view.px : Math.round(measured ?? 0));
/** One step from `base` (↑ +1, ↓ −1, Shift ×8), never below 1 px. */
export const stepped = (base: number, delta: number) => Math.max(1, Math.round(base) + delta);
/** Scrubbing: 1 px per 2 px of pointer travel, Shift ×8. */
export const scrubbed = (base: number, travel: number, shift: boolean) => stepped(base, Math.trunc(travel / 2) * (shift ? 8 : 1));

/** The PropValue a write leaves in the source (the field shows it until the source is read again). */
export function optimisticOf(ops: EditOp[]): Record<string, PropValue> {
  const out: Record<string, PropValue> = {};
  for (const op of ops) {
    if (op.op === "removeProp") out[op.name] = { state: "unset" };
    else if (op.op === "setProp" && "value" in op.value) out[op.name] = { state: "literal", value: op.value.value, raw: "" };
  }
  return out;
}

/** "Stack width → Fill", "Stack reset width", "Stack min and max removed": the undo label of a write. */
export function editLabel(component: string, ops: EditOp[]): string {
  if (ops.length > 1 && ops.every((op) => op.op === "removeProp" && (limitProps as readonly string[]).includes(op.name))) return `${component} min and max removed`;
  return `${component} ${ops.map((op) => {
    if (op.op === "removeProp") return `reset ${op.name}`;
    if (op.op !== "setProp") return op.op;
    const value = op.value.kind === "expression" ? op.value.code : op.value.kind === "picture" ? op.value.file : op.value.value;
    return `${op.name} → ${value === "hug" ? "Hug" : value === "fill" ? "Fill" : String(value)}`;
  }).join(", ")}`;
}

/* ── popover copy ─────────────────────────────────────────────────────────────────────────────────────────────── */

export const hugCaption = (axis: SizingAxis) => (axis === "width" ? "As wide as the content" : "As tall as the content");

/** "Fill container"'s caption: what fill does in this parent (Layout's CSS rules, layout.css). */
export function fillCaption(axis: SizingAxis, parent: ParentLayout): string {
  if (parent.kind === "grid") return "Fill the grid cell";
  if (axis === "width") return parent.kind === "row" ? "Equal share of the row" : parent.kind === "column" ? "Stretch across the column" : "Full width";
  return parent.kind === "column" ? "Equal share of the column" : parent.kind === "row" ? "Stretch to the row's height" : "Full height";
}

/** " · min 120 / max 640" for the W / H tooltips while a limit is written. */
export function limitSuffix(min: number | null, max: number | null): string {
  const parts = [min !== null ? `min ${min}` : "", max !== null ? `max ${max}` : ""].filter(Boolean);
  return parts.length ? ` · ${parts.join(" / ")}` : "";
}

/** The field's tooltip: why it shows what it shows. */
export function axisTooltip(view: AxisView, parent: ParentLayout, limits = ""): string {
  if (view.source === "bound") return `Bound to {${view.via}}: change it in the code${limits}`;
  if (view.source === "spread") return `Set by ${view.via}. Read-only here${limits}`;
  if (view.unknown) return `Written as ${view.unknown}: ${axisName[view.axis].toLowerCase()} takes a number, "hug" or "fill"${limits}`;
  if (view.fromParent) return `Fill · from the parent (Children: Fill equally)${limits}`;
  if (view.mode === "auto") return `${view.axis === "width" ? "Not set: follows the parent (rows hug, columns stretch)" : "Not set: as tall as the content (a row may stretch it)"}${limits}`;
  if (view.mode === "fill" && parent.kind === "other") return `Fill = 100% of the container${limits}`;
  if (view.mode === "fill") return `Fill container · ${fillCaption(view.axis, parent).toLowerCase()}${limits}`;
  if (view.mode === "hug") return `Hug contents · ${hugCaption(view.axis).toLowerCase()}${limits}`;
  return `Fixed ${axisName[view.axis].toLowerCase()} · ${view.px} px${limits}`;
}

/* ── min / max ────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A limit's literal px, or null (unset, bound, spread or not a number). */
export const limitValue = (value: PropValue): number | null => (value.state === "literal" && typeof value.value === "number" && Number.isFinite(value.value) ? Math.round(value.value) : null);

/** Typed text of a limit field: a px number (≥ 0), null (empty: remove), or "invalid". */
export function parseLimit(text: string): number | null | "invalid" {
  const value = text.trim().toLowerCase();
  if (!value) return null;
  const number = /^(\d+(?:[.,]\d+)?)\s*(?:px)?$/.exec(value);
  return number ? Math.round(Number(number[1].replace(",", "."))) : "invalid";
}

/** Writing a limit: setProp px, removeProp when cleared; null when the source already holds it. */
export function limitOps(prop: LimitProp, next: number | null, current: PropValue): EditOp[] | null {
  if (current.state === "bound" || current.state === "spread") return null;
  if (next === null) return current.state === "literal" ? [remove(prop)] : null;
  const px = Math.max(0, Math.round(next));
  return current.state === "literal" && current.value === px ? null : [set(prop, px)];
}

/** "Remove min and max": every written limit in one request (null when none is written). */
export function removeLimitsOps(values: Partial<Record<LimitProp, PropValue>>): EditOp[] | null {
  const ops = limitProps.filter((prop) => values[prop]?.state === "literal").map(remove);
  return ops.length ? ops : null;
}

/* ── align in parent / children ───────────────────────────────────────────────────────────────────────────────── */

export const alignSelfValues: readonly AlignSelfValue[] = ["start", "center", "end", "stretch"];

/** The 4 icon-only segments: vertical names and icons in a row Stack or a Grid, horizontal ones in a column Stack. */
export function alignSelfOptions(parent: ParentLayout): Array<{ id: AlignSelfValue; name: string; icon: string }> {
  if (parent.kind === "column") {
    return [
      { id: "start", name: "Left", icon: "icon-flex-align-left-line" },
      { id: "center", name: "Center", icon: "icon-align-horizontal-centre-01-line" },
      { id: "end", name: "Right", icon: "icon-flex-align-right-line" },
      { id: "stretch", name: "Stretch", icon: "icon-chevron-selector-horizontal-line" },
    ];
  }
  return [
    { id: "start", name: "Top", icon: "icon-flex-align-top-line" },
    { id: "center", name: "Middle", icon: "icon-align-vertical-center-01-line" },
    { id: "end", name: "Bottom", icon: "icon-flex-align-bottom-line" },
    { id: "stretch", name: "Stretch", icon: "icon-chevron-selector-vertical-line" },
  ];
}

/** A computed align-self / align-items keyword as one of the four, "baseline", or null (auto: look at the parent). */
export function alignFromCss(value: string | null | undefined): AlignSelfValue | "baseline" | null {
  const keyword = (value ?? "").trim().toLowerCase();
  if (!keyword || keyword === "auto") return null;
  if (keyword.includes("baseline")) return "baseline";
  if (/(^|\s)(flex-start|start|self-start|left)$/.test(keyword)) return "start";
  if (/(^|\s)center$/.test(keyword)) return "center";
  if (/(^|\s)(flex-end|end|self-end|right)$/.test(keyword)) return "end";
  if (keyword === "stretch" || keyword === "normal") return "stretch";
  return null;
}

/** What the element aligns with now: its own computed align-self, else the parent's align-items (normal = stretch). */
export function effectiveAlign(selfCss: string | null | undefined, parentItemsCss: string | null | undefined): { value: AlignSelfValue; baseline: boolean } {
  const resolved = alignFromCss(selfCss) ?? alignFromCss(parentItemsCss) ?? "stretch";
  // Text baseline has no segment: rows line text up near the top, so Top is the closest honest pick.
  return resolved === "baseline" ? { value: "start", baseline: true } : { value: resolved, baseline: false };
}

/** A literal alignSelf the API takes, or null. */
export const alignSelfLiteral = (value: PropValue): AlignSelfValue | null =>
  value.state === "literal" && (alignSelfValues as readonly Literal[]).includes(value.value) ? (value.value as AlignSelfValue) : null;

/** Picking a segment writes it (null when it is already written); the slot reset removes it. */
export function alignSelfOps(next: AlignSelfValue | null, current: PropValue): EditOp[] | null {
  if (current.state === "bound" || current.state === "spread") return null;
  if (next === null) return current.state === "literal" ? [remove("alignSelf")] : null;
  return current.state === "literal" && current.value === next ? null : [set("alignSelf", next)];
}

/** Children: "Own size" removes fillChildren, "Fill equally" writes fillChildren (true). */
export function fillChildrenOps(fill: boolean, current: PropValue): EditOp[] | null {
  if (current.state === "bound" || current.state === "spread") return null;
  if (fill) return current.state === "literal" && current.value === true ? null : [set("fillChildren", true)];
  return current.state === "literal" ? [remove("fillChildren")] : null;
}

/** Whether a written value (by its PropValue) is what `ops` would leave: a stale reply whose edit is already in the file. */
export function holds(ops: EditOp[], valueOf: (name: string) => PropValue): boolean {
  return ops.every((op) => {
    if (op.op === "removeProp") return valueOf(op.name).state === "unset";
    if (op.op !== "setProp" || op.value.kind === "expression") return false;
    const value = valueOf(op.name);
    return value.state === "literal" && "value" in op.value && value.value === op.value.value;
  });
}

/* ── optimistic values ────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * A value the group shows before the panel's read of the source catches up: what it wrote (`value`), the panel's read
 * when the first of these writes left (`base`, a valueKey) and the values it wrote since then and replaced (`sent`).
 */
export type HeldValue = { value: PropValue; base: string; sent: readonly string[] };

/** A PropValue's identity for comparisons: a literal by its value (not its source text), unset, bound, spread. */
export function valueKey(value: PropValue): string {
  if (value.state === "literal") return `literal:${typeof value.value}:${String(value.value)}`;
  if (value.state === "bound") return `bound:${value.expression}`;
  if (value.state === "spread") {
    let live = "?";
    try { live = JSON.stringify(value.live) ?? "undefined"; } catch { /* a value JSON cannot hold: compared as "?" */ }
    return `spread:${value.via}:${live}`;
  }
  return "unset";
}

/** Holds a write's optimistic values. A prop written again keeps its base and remembers the value it replaces. */
export function holdValues(held: Record<string, HeldValue>, optimistic: Record<string, PropValue>, valueOf: (name: string) => PropValue): Record<string, HeldValue> {
  const next = { ...held };
  for (const [name, value] of Object.entries(optimistic)) {
    const current = held[name];
    next[name] = current ? { value, base: current.base, sent: [...current.sent, valueKey(current.value)] } : { value, base: valueKey(valueOf(name)), sent: [] };
  }
  return next;
}

/** A refused write lets go of the values it held, unless a later write has replaced them. `held` itself when unchanged. */
export function releaseValues(held: Record<string, HeldValue>, optimistic: Record<string, PropValue>): Record<string, HeldValue> {
  const gone = Object.keys(optimistic).filter((name) => held[name] && valueKey(held[name].value) === valueKey(optimistic[name]));
  return gone.length ? Object.fromEntries(Object.entries(held).filter(([name]) => !gone.includes(name))) : held;
}

/**
 * The held values still needed once the panel reads `valueOf`. A value is let go when the read shows it (caught up:
 * the source, or the panel's own optimistic value) or shows anything that is neither the base nor one of the group's
 * earlier writes (an undo, an edit made elsewhere); it is kept while the read shows the base or an earlier write
 * (the edit has not landed yet, or an earlier one of a quick series just did). `held` itself when nothing changes.
 */
export function settleValues(held: Record<string, HeldValue>, valueOf: (name: string) => PropValue): Record<string, HeldValue> {
  let changed = false;
  const next: Record<string, HeldValue> = {};
  for (const [name, entry] of Object.entries(held)) {
    const now = valueKey(valueOf(name));
    if (now !== valueKey(entry.value) && (now === entry.base || entry.sent.includes(now))) next[name] = entry;
    else changed = true;
  }
  return changed ? next : held;
}
