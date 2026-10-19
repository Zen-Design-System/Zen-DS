/*
 * Figma's image fill (Studio parity F8): a picture painted in a layer, as Fill (covers it, the overflow cropped), Fit
 * (the whole picture), Crop (a part of the picture stretched to the layer) or Tile (repeated at a scale of its own
 * size). Shape and the frames (Box, Stack, Grid) take the same props. This file turns them into a data attribute and
 * custom properties their CSS reads; an SVG shape (ellipse, polygon, star) paints the picture as a pattern
 * (`imagePattern`). Pure apart from the hook that reads a tiled picture's own size.
 */
import { useEffect, useState } from "react";

/** Figma's image scale modes. */
export const imageFillModes = ["fill", "fit", "crop", "tile"] as const;
export type ImageFillMode = (typeof imageFillModes)[number];
/** The part of a picture a Crop shows, in percent of the picture: from its left and top, and how much of its width and height. */
export type ImageCrop = { x: number; y: number; width: number; height: number };
export type PictureSize = { width: number; height: number };

export interface ImageFillProps {
  /**
   * An image fill (Figma's Image paint): the picture's URL, painted over the layer's fill and under its stroke. A picture
   * that means something needs an accessible name on its layer; without one it is decoration. A picture in the content
   * (an article photo, a product shot) is an Image (alt, ratio, caption), not a fill.
   */
  image?: string;
  /**
   * How the picture fills the layer (Figma's image scale mode): `fill` (default) covers it and crops what overflows,
   * `fit` shows the whole picture, `crop` the part `imageCrop` names, stretched to the layer, `tile` repeats it at
   * `imageScale`.
   */
  imageFit?: ImageFillMode;
  /** With `imageFit="crop"`: the part of the picture shown, in percent of it, e.g. { x: 10, y: 0, width: 80, height: 100 }. Unset: as `fill`. */
  imageCrop?: ImageCrop;
  /** With `imageFit="tile"`: each tile's size in percent of the picture's own size (Figma's tile scale). Default 100. */
  imageScale?: number;
}

/** The image fill's prop names (the Studio's Fill section owns them). */
export const imageFillPropNames: ReadonlySet<string> = new Set(["image", "imageFit", "imageCrop", "imageScale"]);

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 1000) / 1000;

/** The fill mode written, or `fill` for none or an unknown one. */
export const imageFillMode = (fit: unknown): ImageFillMode => ((imageFillModes as readonly unknown[]).includes(fit) ? (fit as ImageFillMode) : "fill");

/** A crop with every side inside the picture and some of it shown, or null when it is not one. */
export function cropOf(crop: unknown): ImageCrop | null {
  if (!crop || typeof crop !== "object") return null;
  const { x, y, width, height } = crop as Partial<ImageCrop>;
  if (![x, y, width, height].every(finite)) return null;
  const left = clamp(x as number, 0, 99.9);
  const top = clamp(y as number, 0, 99.9);
  return { x: left, y: top, width: clamp(width as number, 0.1, 100 - left), height: clamp(height as number, 0.1, 100 - top) };
}

/** What a Fill shows of a picture in a layer of `box` size, as a crop (switching Fill → Crop keeps the picture in place). */
export function coverCrop(picture: PictureSize, box: PictureSize): ImageCrop {
  if (!(picture.width > 0 && picture.height > 0 && box.width > 0 && box.height > 0)) return { x: 0, y: 0, width: 100, height: 100 };
  const scale = Math.max(box.width / picture.width, box.height / picture.height);
  const width = Math.min(100, (box.width / scale / picture.width) * 100);
  const height = Math.min(100, (box.height / scale / picture.height) * 100);
  return { x: round((100 - width) / 2), y: round((100 - height) / 2), width: round(width), height: round(height) };
}

/** A URL as a CSS url() (quoted, its quotes and backslashes escaped). */
export const cssUrl = (src: string) => `url("${src.replace(/["\\]/g, "\\$&").replace(/\n/g, "\\a ").replace(/\r/g, "\\d ")}")`;

type Attributes = Record<`data-${string}`, string | undefined>;
type Vars = Record<`--${string}`, string | undefined>;

/** The data attribute and custom properties for an image fill (nothing without a picture). `picture`: its own size, for Tile. */
export function imageFillStyle({ image, imageFit, imageCrop, imageScale }: ImageFillProps, picture: PictureSize | null = null): { attributes: Attributes; vars: Vars } {
  if (typeof image !== "string" || !image.trim()) return { attributes: {}, vars: {} };
  let mode = imageFillMode(imageFit);
  const crop = mode === "crop" ? cropOf(imageCrop) : null;
  if (mode === "crop" && !crop) mode = "fill";
  let size = mode === "fit" ? "contain" : "cover";
  let position = "50% 50%";
  if (crop) {
    size = `${round((100 / crop.width) * 100)}% ${round((100 / crop.height) * 100)}%`;
    const axis = (start: number, part: number) => (part >= 100 ? 0 : round((start / (100 - part)) * 100));
    position = `${axis(crop.x, crop.width)}% ${axis(crop.y, crop.height)}%`;
  }
  if (mode === "tile") {
    const scale = finite(imageScale) && imageScale > 0 ? imageScale / 100 : 1;
    size = picture ? `${round(picture.width * scale)}px ${round(picture.height * scale)}px` : "auto";
    position = "0 0";
  }
  return {
    attributes: { "data-image": mode },
    vars: { "--zen-image-fill": cssUrl(image), "--zen-image-size": size, "--zen-image-position": position, "--zen-image-repeat": mode === "tile" ? "repeat" : "no-repeat" },
  };
}

/** How an SVG shape (`width` × `height` px) paints the picture: its pattern's tile and the picture inside it. */
export function imagePattern({ imageFit, imageCrop, imageScale }: ImageFillProps, width: number, height: number, picture: PictureSize | null = null) {
  let mode = imageFillMode(imageFit);
  const crop = mode === "crop" ? cropOf(imageCrop) : null;
  if (mode === "crop" && !crop) mode = "fill";
  if (mode === "tile" && picture) {
    const scale = finite(imageScale) && imageScale > 0 ? imageScale / 100 : 1;
    const tile = { width: Math.max(1, picture.width * scale), height: Math.max(1, picture.height * scale) };
    return { tile, picture: { x: 0, y: 0, ...tile, preserveAspectRatio: "none" } };
  }
  const tile = { width: Math.max(1, width), height: Math.max(1, height) };
  if (crop) {
    const full = { width: (tile.width * 100) / crop.width, height: (tile.height * 100) / crop.height };
    return { tile, picture: { x: (-crop.x / 100) * full.width, y: (-crop.y / 100) * full.height, ...full, preserveAspectRatio: "none" } };
  }
  return { tile, picture: { x: 0, y: 0, ...tile, preserveAspectRatio: mode === "fit" ? "xMidYMid meet" : "xMidYMid slice" } };
}

const pictureSizes = new Map<string, PictureSize>();

/** A picture's own size once it has loaded (only when `wanted`: Tile needs it), else null. */
export function usePictureSize(src: string | undefined, wanted: boolean): PictureSize | null {
  const [, loaded] = useState(0);
  useEffect(() => {
    if (!src || !wanted || pictureSizes.has(src) || typeof window === "undefined") return undefined;
    let live = true;
    const probe = new window.Image();
    probe.onload = () => {
      if (probe.naturalWidth > 0) pictureSizes.set(src, { width: probe.naturalWidth, height: probe.naturalHeight });
      if (live) loaded((count) => count + 1);
    };
    probe.src = src;
    return () => { live = false; };
  }, [src, wanted]);
  return src && wanted ? pictureSizes.get(src) ?? null : null;
}

/** The image fill of a layer: `imageFillStyle` with the tiled picture's own size read when Tile needs it. */
export function useImageFill(props: ImageFillProps): { attributes: Attributes; vars: Vars; mode: ImageFillMode | null; picture: PictureSize | null } {
  const shown = typeof props.image === "string" && props.image.trim() ? props.image : undefined;
  const picture = usePictureSize(shown, Boolean(shown) && imageFillMode(props.imageFit) === "tile");
  const { attributes, vars } = imageFillStyle(props, picture);
  return { attributes, vars, mode: (attributes["data-image"] as ImageFillMode | undefined) ?? null, picture };
}
