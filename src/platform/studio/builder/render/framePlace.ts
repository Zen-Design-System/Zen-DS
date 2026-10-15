/*
 * Free frames on a builder page's board (user, 2026-10-15: "canvas tự do hơn, giống Figma"). A frame with `x` / `y` in
 * the page sits there (world px from the board's frame origin); the others keep the old row, 96 apart, to the right of
 * the placed ones, so a page written before free frames opens as it did. Moving a frame writes the place of every frame
 * still in the row too (pinned where it shows), so nothing else moves. No imports: `node framePlace.selftest.mjs` runs
 * it as is.
 */

/** Room between frames in the row (their labels show between them when zoomed out). */
export const FRAME_GAP = 96;
/** Screen px within which a moved or drawn edge snaps to another frame's edge or centre (Figma's). */
export const SNAP_PX = 6;

export type FramePlace = { x: number; y: number };
export type FrameBox = { x: number; y: number; width: number; height: number };
/** A snap guide in world px: a vertical line at `at` from `from` to `to` (axis "x"), or a horizontal one (axis "y"). */
export type SnapGuide = { axis: "x" | "y"; at: number; from: number; to: number };

/** Where each frame shows: its own place, or the next spot in the row of unplaced frames. */
export function placeFrames(frames: ReadonlyArray<{ width: number; place: FramePlace | null }>, gap = FRAME_GAP): FramePlace[] {
  const placed = frames.filter((frame) => frame.place);
  let x = placed.length ? Math.max(...placed.map((frame) => frame.place!.x + frame.width)) + gap : 0;
  const y = placed.length ? Math.min(...placed.map((frame) => frame.place!.y)) : 0;
  return frames.map((frame) => {
    if (frame.place) return { x: frame.place.x, y: frame.place.y };
    const at = { x, y };
    x += frame.width + gap;
    return at;
  });
}

const lines = (start: number, size: number) => [start, start + size / 2, start + size];

/**
 * A moved box snapped to the other frames (Figma's smart guides, edges and centres): the nearest line within
 * `threshold` world px on each axis, and the guides to draw. `edges` limits which of the box's lines may snap per axis
 * (a drawn box snaps only the edges under the pointer).
 */
export function snapBox(box: FrameBox, others: readonly FrameBox[], threshold: number, edges: { x: readonly number[]; y: readonly number[] } = { x: [0, 1, 2], y: [0, 1, 2] }): { dx: number; dy: number; guides: SnapGuide[] } {
  const axis = (key: "x" | "y") => {
    const size = key === "x" ? "width" : "height";
    const own = lines(box[key], box[size]).filter((_, index) => edges[key].includes(index));
    let best: { delta: number; at: number } | null = null;
    for (const other of others) {
      for (const target of lines(other[key], other[size])) {
        for (const line of own) {
          const delta = target - line;
          if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, at: target };
        }
      }
    }
    return best;
  };
  const snapX = axis("x");
  const snapY = axis("y");
  const moved = { ...box, x: box.x + (snapX?.delta ?? 0), y: box.y + (snapY?.delta ?? 0) };
  const guides: SnapGuide[] = [];
  // A guide runs from the moved box to every frame that has a line on it.
  const guide = (key: "x" | "y", at: number) => {
    const cross = key === "x" ? "y" : "x";
    const size = key === "x" ? "width" : "height";
    const crossSize = key === "x" ? "height" : "width";
    const touching = [moved, ...others.filter((other) => lines(other[key], other[size]).some((line) => Math.abs(line - at) < 0.5))];
    guides.push({ axis: key, at, from: Math.min(...touching.map((item) => item[cross])), to: Math.max(...touching.map((item) => item[cross] + item[crossSize])) });
  };
  if (snapX) guide("x", snapX.at);
  if (snapY) guide("y", snapY.at);
  return { dx: snapX?.delta ?? 0, dy: snapY?.delta ?? 0, guides };
}
