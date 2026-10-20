/*
 * Figma's smart guides while resizing a layer (plan docs/research/studio-figma-design-parity-2026-10-18.md F2): in a free
 * frame the edges a resize moves snap to the frame's and its other layers' edges and centres, and red guides show where
 * they meet. ⌥ (from the centre) moves both edges of an axis, so either may snap and the other mirrors it; ⇧ on a corner
 * keeps the ratio, so the edge that snaps closest drives both axes. Pure (no DOM): resizeSnap.selftest.mjs imports it;
 * select/ResizeLayer.tsx measures the boxes (the frame's unscaled px) and draws the guides (edit/DragLayer).
 */
import type { FrameBox, SnapGuide } from "../builder/render/framePlace";

/** One axis of a resize. */
export type ResizeSnapAxis = {
  /** The dragged edge: -1 its start (left / top), 1 its end (right / bottom), 0 the drag does not move this axis. */
  side: -1 | 0 | 1;
  /** Both edges move, the far one by the opposite px (⌥ from the centre, or a centred constraint). */
  centred: boolean;
  /** The least size on this axis: a snap that would go below it is not taken. */
  min: number;
};

export type ResizeSnapInput = {
  /** The layer at the press, in the frame's px. */
  box: FrameBox;
  axes: { x: ResizeSnapAxis; y: ResizeSnapAxis };
  /** How far the dragged edges travel now (frame px; ⇧'s ratio already applied). */
  delta: { x: number; y: number };
  /** The frame itself and its other layers (frame px). */
  others: readonly FrameBox[];
  /** Frame px within which an edge snaps (Figma's 6 screen px at the zoom). */
  threshold: number;
  /** ⇧ on a corner: the two deltas keep the box's ratio, so a snap on one axis moves the other with it. */
  ratio?: boolean;
};

export type ResizeSnap = { delta: { x: number; y: number }; box: FrameBox; guides: SnapGuide[] };

type Axis = "x" | "y";
const SIZE = { x: "width", y: "height" } as const;
const CROSS = { x: "y", y: "x" } as const;
const lines = (box: FrameBox, axis: Axis) => [box[axis], box[axis] + box[SIZE[axis]] / 2, box[axis] + box[SIZE[axis]]];

/** The edges a drag of `delta` moves on one axis: where each lands, and which way it goes as the delta grows (±1). */
function movingEdges(box: FrameBox, axis: Axis, rule: ResizeSnapAxis, delta: number): Array<{ at: number; sign: 1 | -1 }> {
  const start = box[axis];
  const end = start + box[SIZE[axis]];
  if (rule.side < 0) return rule.centred ? [{ at: start + delta, sign: 1 }, { at: end - delta, sign: -1 }] : [{ at: start + delta, sign: 1 }];
  if (rule.side > 0) return rule.centred ? [{ at: end + delta, sign: 1 }, { at: start - delta, sign: -1 }] : [{ at: end + delta, sign: 1 }];
  return [];
}

/** The size on one axis after a drag of `delta`. */
const sizeAt = (box: FrameBox, axis: Axis, rule: ResizeSnapAxis, delta: number) => box[SIZE[axis]] + rule.side * delta * (rule.centred ? 2 : 1);

/** The box after a drag of `delta` on both axes. */
function boxAt(box: FrameBox, axes: ResizeSnapInput["axes"], delta: { x: number; y: number }): FrameBox {
  const next = { ...box };
  for (const axis of ["x", "y"] as const) {
    const rule = axes[axis];
    if (!rule.side) continue;
    const size = sizeAt(box, axis, rule, delta[axis]);
    const start = rule.centred ? box[axis] + (box[SIZE[axis]] - size) / 2 : rule.side < 0 ? box[axis] + box[SIZE[axis]] - size : box[axis];
    next[axis] = start;
    next[SIZE[axis]] = size;
  }
  return next;
}

/** Every snap within the threshold on one axis: the delta it gives and how far the edge goes for it. */
function candidates(input: ResizeSnapInput, axis: Axis): Array<{ axis: Axis; delta: number; distance: number }> {
  const rule = input.axes[axis];
  const delta = input.delta[axis];
  const found: Array<{ axis: Axis; delta: number; distance: number }> = [];
  for (const edge of movingEdges(input.box, axis, rule, delta)) {
    for (const other of input.others) {
      for (const line of lines(other, axis)) {
        const distance = Math.abs(line - edge.at);
        if (distance > input.threshold) continue;
        const next = delta + edge.sign * (line - edge.at);
        if (sizeAt(input.box, axis, rule, next) < rule.min) continue;
        found.push({ axis, delta: next, distance });
      }
    }
  }
  return found.sort((a, b) => a.distance - b.distance);
}

/** The edges a resize moves, read on the moved box: the dragged one, or both with ⌥. */
function movedEdges(moved: FrameBox, axis: Axis, rule: ResizeSnapAxis): number[] {
  if (!rule.side) return [];
  const start = moved[axis];
  const end = start + moved[SIZE[axis]];
  return rule.centred ? [start, end] : [rule.side < 0 ? start : end];
}

/** The guides where the moved edges sit on another box's line: from the moved box to every box with that line. */
export function resizeGuides(moved: FrameBox, axes: ResizeSnapInput["axes"], others: readonly FrameBox[]): SnapGuide[] {
  const guides: SnapGuide[] = [];
  for (const axis of ["x", "y"] as const) {
    const cross = CROSS[axis];
    const crossSize = SIZE[cross];
    for (const edge of movedEdges(moved, axis, axes[axis])) {
      const touching = others.filter((other) => lines(other, axis).some((line) => Math.abs(line - edge) < 0.5));
      if (!touching.length) continue;
      const at = lines(touching[0], axis).find((line) => Math.abs(line - edge) < 0.5)!;
      if (guides.some((guide) => guide.axis === axis && Math.abs(guide.at - at) < 0.5)) continue;
      const spans = [moved, ...touching];
      guides.push({ axis, at, from: Math.min(...spans.map((item) => item[cross])), to: Math.max(...spans.map((item) => item[cross] + item[crossSize])) });
    }
  }
  return guides;
}

/**
 * The deltas of a resize snapped to the nearest line of the frame and its other layers, per axis (with `ratio`: the
 * nearest on either axis, the other following), kept at the least size, the box they give and the guides to draw.
 */
export function snapResize(input: ResizeSnapInput): ResizeSnap {
  const delta = { ...input.delta };
  const { box, axes } = input;
  const ratio = input.ratio && axes.x.side !== 0 && axes.y.side !== 0 && box.width > 0 && box.height > 0;
  if (ratio) {
    // The deltas keep side·delta / size equal on both axes (select/ResizeLayer.tsx keepRatio): one snap sets both.
    const best = [...candidates(input, "x"), ...candidates(input, "y")].sort((a, b) => a.distance - b.distance);
    for (const pick of best) {
      const other: Axis = pick.axis === "x" ? "y" : "x";
      const grown = (axes[pick.axis].side * pick.delta) / box[SIZE[pick.axis]];
      const follow = axes[other].side * grown * box[SIZE[other]];
      if (sizeAt(box, other, axes[other], follow) < axes[other].min) continue;
      delta[pick.axis] = pick.delta;
      delta[other] = follow;
      break;
    }
  } else {
    for (const axis of ["x", "y"] as const) {
      const [pick] = axes[axis].side ? candidates(input, axis) : [];
      if (pick) delta[axis] = pick.delta;
    }
  }
  // Never below the least size (the resize stops there, so the guides are read where the edges really are).
  for (const axis of ["x", "y"] as const) {
    const rule = axes[axis];
    if (rule.side && sizeAt(box, axis, rule, delta[axis]) < rule.min) delta[axis] = (rule.min - box[SIZE[axis]]) / (rule.side * (rule.centred ? 2 : 1));
  }
  const moved = boxAt(box, axes, delta);
  return { delta, box: moved, guides: resizeGuides(moved, axes, input.others) };
}
