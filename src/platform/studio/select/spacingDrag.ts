/*
 * Dragging a gap or a padding on the canvas (Figma's auto layout handles; BACKLOG "gap / padding drag handles"). Pure — no
 * DOM — so the node selftest (spacingDrag.selftest.mjs) imports it; SpacingLayer measures the areas, previews the step on
 * the host and writes it once on release.
 * Zen writes variables (plan decision 1): the dragged length snaps to the nearest step of the prop's ladder. Zen's padding
 * is set per axis (paddingX / paddingY), so a side always moves with its opposite, which is what ⌥ does in Figma; ⇧⌥
 * (and ⇧ alone: Figma's big nudge means nothing on a token ladder) sets `padding` on every side.
 */

export type DragKind = "gap" | "padding";
export type DragSide = "top" | "right" | "bottom" | "left" | "row" | "column";
export type DragStep = { key: string; px: number | null };

/** Stack and Grid are the auto layout frames whose areas drag (a Box is a free frame; Card, Form… keep the click). */
export const DRAG_LAYOUTS = new Set(["Stack", "Grid"]);

/** Screen px the pointer moves before a press on an area is a drag (less: a click, which opens the scale). */
export const DRAG_START = 3;

/**
 * The pointer axis an area drags along and the sign that grows it: a padding grows inwards (a left padding rightwards, a
 * bottom one upwards), a gap grows rightwards (between columns) or downwards (between rows), as Figma's handles do.
 */
export function dragAxis(kind: DragKind, side: DragSide): { axis: "x" | "y"; sign: 1 | -1 } {
  if (kind === "gap") return { axis: side === "column" ? "x" : "y", sign: 1 };
  if (side === "left") return { axis: "x", sign: 1 };
  if (side === "right") return { axis: "x", sign: -1 };
  return { axis: "y", sign: side === "bottom" ? -1 : 1 };
}

/** The length a drag reaches: the start length plus the pointer's travel along the axis in CSS px, never below 0. */
export function draggedPx(start: number, travel: number, sign: 1 | -1, scale: number): number {
  return Math.max(0, start + (sign * travel) / (scale || 1));
}

/** Whether a padding drag sets every side (⇧⌥, or ⇧ alone); ⌥ alone is the side's own prop (both opposite sides in Zen). */
export const everySide = (keys: { shift: boolean; alt: boolean }) => keys.shift;

/** The step nearest to `px` (the smaller one on a tie); steps the host does not measure are skipped. */
export function nearestStep(steps: readonly DragStep[], px: number): { key: string; px: number } | null {
  let best: { key: string; px: number } | null = null;
  for (const step of steps) {
    if (step.px === null) continue;
    if (!best || Math.abs(step.px - px) < Math.abs(best.px - px) - 1e-6 || (Math.abs(Math.abs(step.px - px) - Math.abs(best.px - px)) <= 1e-6 && step.px < best.px)) best = { key: step.key, px: step.px };
  }
  return best;
}

/**
 * The CSS properties the preview sets on the host for a prop (inline, above the component's own rule, and never one React
 * writes: Stack and Grid set their spacing through custom properties), so the frame lays out at the step while dragging.
 * Longhands only, so putting back what was there restores each side as it was.
 */
export function previewProperties(prop: string): string[] {
  const inline = ["padding-inline-start", "padding-inline-end"];
  const block = ["padding-block-start", "padding-block-end"];
  switch (prop) {
    case "gap": return ["row-gap", "column-gap"];
    case "rowGap": return ["row-gap"];
    case "columnGap": return ["column-gap"];
    case "paddingX": return inline;
    case "paddingY": return block;
    case "padding": return [...block, ...inline];
    default: return [];
  }
}
