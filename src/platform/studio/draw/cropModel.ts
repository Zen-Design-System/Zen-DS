import type { ImageCrop } from "../../../components/_shared/image-fill";

/*
 * The crop on the canvas (CropHandles.tsx, Studio parity F8b), pure: moving the picture behind the layer's window and
 * scaling it by a corner, in screen px. Type-only imports: `node cropModel.selftest.mjs` runs it.
 */

export type Corner = "nw" | "ne" | "se" | "sw";

const round = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** A crop inside the picture (as image-fill.ts cropOf): every side in it, some of it shown. */
function inside(crop: ImageCrop): ImageCrop {
  const x = clamp(crop.x, 0, 99.9);
  const y = clamp(crop.y, 0, 99.9);
  return { x: round(x), y: round(y), width: round(clamp(crop.width, 0.1, 100 - x)), height: round(clamp(crop.height, 0.1, 100 - y)) };
}

/** The crop after moving the picture by (dx, dy) screen px, the window `box` fixed. */
export function moved(crop: ImageCrop, dx: number, dy: number, box: { w: number; h: number }): ImageCrop {
  const width = box.w / (crop.width / 100);
  const height = box.h / (crop.height / 100);
  return {
    ...crop,
    x: round(Math.min(100 - crop.width, Math.max(0, crop.x - (dx / width) * 100))),
    y: round(Math.min(100 - crop.height, Math.max(0, crop.y - (dy / height) * 100))),
  };
}

/**
 * The crop after scaling the picture by dragging `corner` by (dx, dy) screen px: the opposite corner stays, the ratio is
 * kept, and the picture still covers the window (a crop never shows past the picture).
 */
export function scaled(crop: ImageCrop, corner: Corner, dx: number, dy: number, box: { left: number; top: number; w: number; h: number }): ImageCrop {
  const width = box.w / (crop.width / 100);
  const height = box.h / (crop.height / 100);
  const left = box.left - (crop.x / 100) * width;
  const top = box.top - (crop.y / 100) * height;
  const east = corner === "ne" || corner === "se";
  const south = corner === "se" || corner === "sw";
  // The new width from the drag along the corner's diagonal (the larger of the two pulls, as Figma's corner scale).
  const grow = Math.max((east ? dx : -dx) / width, (south ? dy : -dy) / height);
  let next = width * (1 + grow);
  // Never smaller than the window: the picture covers it.
  next = Math.max(next, box.w, (box.h * width) / height);
  const nextHeight = (next * height) / width;
  const anchorX = east ? left : left + width;
  const anchorY = south ? top : top + height;
  const nextLeft = east ? anchorX : anchorX - next;
  const nextTop = south ? anchorY : anchorY - nextHeight;
  const crop2 = { x: ((box.left - nextLeft) / next) * 100, y: ((box.top - nextTop) / nextHeight) * 100, width: (box.w / next) * 100, height: (box.h / nextHeight) * 100 };
  // Back inside the picture: a corner pulled past the window moves the picture so it still covers it.
  const width2 = clamp(crop2.width, 0.1, 100);
  const height2 = clamp(crop2.height, 0.1, 100);
  return inside({ x: clamp(crop2.x, 0, 100 - width2), y: clamp(crop2.y, 0, 100 - height2), width: width2, height: height2 });
}

