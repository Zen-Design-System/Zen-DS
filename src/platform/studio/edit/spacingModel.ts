/*
 * Figma's equal spacing while moving (plan docs/research/studio-figma-design-parity-2026-10-18.md F2): a layer dragged in
 * a free frame snaps to the gap its neighbours already have (or to the middle between two neighbours), and the gaps that
 * match show as pink marks with their px. Pure — no DOM — so the node selftest (spacingModel.selftest.mjs) imports it;
 * edit/drag.ts measures the boxes (the frame's unscaled px) and draws the marks (DragLayer).
 */

export type SpacingBox = { x: number; y: number; width: number; height: number };
/** A gap along `axis` from `from` to `to`, drawn across at `at` (the middle of the two boxes it separates). */
export type SpacingMark = { axis: "x" | "y"; from: number; to: number; at: number; gap: number };

type Axis = "x" | "y";
const start = (box: SpacingBox, axis: Axis) => (axis === "x" ? box.x : box.y);
const size = (box: SpacingBox, axis: Axis) => (axis === "x" ? box.width : box.height);
const end = (box: SpacingBox, axis: Axis) => start(box, axis) + size(box, axis);
const cross = (axis: Axis): Axis => (axis === "x" ? "y" : "x");
/** Whether two boxes share some of their extent across `axis` (a row for x, a column for y). */
const inLine = (a: SpacingBox, b: SpacingBox, axis: Axis) => start(a, cross(axis)) < end(b, cross(axis)) && start(b, cross(axis)) < end(a, cross(axis));
/** The middle of the shared extent of two boxes across `axis` (where a mark between them is drawn). */
const middle = (a: SpacingBox, b: SpacingBox, axis: Axis) => (Math.max(start(a, cross(axis)), start(b, cross(axis))) + Math.min(end(a, cross(axis)), end(b, cross(axis)))) / 2;

function onAxis(box: SpacingBox, others: readonly SpacingBox[], axis: Axis, threshold: number): { delta: number; marks: SpacingMark[] } | null {
  // The layers in line with the moved one (a box that holds it, its frame, is no neighbour).
  const line = others.filter((other) => inLine(other, box, axis) && !(start(other, axis) <= start(box, axis) && end(other, axis) >= end(box, axis)));
  const sorted = [...line].sort((a, b) => start(a, axis) - start(b, axis));
  // The gaps the neighbours already have between them (in line with each other, apart along the axis).
  const gaps: Array<{ gap: number; mark: SpacingMark }> = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const [a, b] = [sorted[i], sorted[j]];
      const gap = start(b, axis) - end(a, axis);
      if (gap <= 0 || !inLine(a, b, axis)) continue;
      // Only next neighbours: nothing in line between them.
      if (sorted.some((c, k) => k !== i && k !== j && start(c, axis) >= end(a, axis) && end(c, axis) <= start(b, axis) && inLine(a, c, axis))) continue;
      gaps.push({ gap, mark: { axis, from: end(a, axis), to: start(b, axis), at: middle(a, b, axis), gap } });
    }
  }
  const before = sorted.filter((other) => end(other, axis) <= start(box, axis) + threshold).sort((a, b) => end(b, axis) - end(a, axis))[0];
  const after = sorted.filter((other) => start(other, axis) >= end(box, axis) - threshold).sort((a, b) => start(a, axis) - start(b, axis))[0];
  type Candidate = { delta: number; marks: SpacingMark[] };
  const candidates: Candidate[] = [];
  const own = (from: number, to: number, other: SpacingBox, gap: number): SpacingMark => ({ axis, from, to, at: middle(box, other, axis), gap });
  for (const { gap, mark } of gaps) {
    if (before) {
      const delta = end(before, axis) + gap - start(box, axis);
      candidates.push({ delta, marks: [mark, own(end(before, axis), end(before, axis) + gap, before, gap)] });
    }
    if (after) {
      const delta = start(after, axis) - gap - end(box, axis);
      candidates.push({ delta, marks: [mark, own(start(after, axis) - gap, start(after, axis), after, gap)] });
    }
  }
  // Centred between its two neighbours: the same gap on both sides.
  if (before && after) {
    const gap = (start(after, axis) - end(before, axis) - size(box, axis)) / 2;
    if (gap > 0) {
      const delta = end(before, axis) + gap - start(box, axis);
      candidates.push({ delta, marks: [own(end(before, axis), end(before, axis) + gap, before, gap), own(start(after, axis) - gap, start(after, axis), after, gap)] });
    }
  }
  const best = candidates.filter((candidate) => Math.abs(candidate.delta) <= threshold).sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0];
  if (!best) return null;
  // Every gap equal to the one it snapped to shows (Figma marks them all).
  const gap = best.marks[best.marks.length - 1].gap;
  const more = gaps.filter((entry) => Math.abs(entry.gap - gap) < 0.5 && !best.marks.some((mark) => mark.from === entry.mark.from && mark.to === entry.mark.to)).map((entry) => entry.mark);
  return { delta: best.delta, marks: [...best.marks, ...more].map((mark) => ({ ...mark, gap: Math.round(mark.gap) })) };
}

/**
 * The equal-spacing snap of `box` among `others` (its frame's other layers): per axis the move that gives it a gap its
 * neighbours have (or centres it between two), within `threshold`, and the marks to draw. `skip`: axes already snapped
 * to an edge (their move stays).
 */
export function equalSpacing(box: SpacingBox, others: readonly SpacingBox[], threshold: number, skip: { x?: boolean; y?: boolean } = {}): { dx: number; dy: number; marks: SpacingMark[] } {
  const x = skip.x ? null : onAxis(box, others, "x", threshold);
  const y = skip.y ? null : onAxis(box, others, "y", threshold);
  return { dx: x?.delta ?? 0, dy: y?.delta ?? 0, marks: [...(x?.marks ?? []), ...(y?.marks ?? [])] };
}
