// Zen Studio ↔ Figma: image fills (Studio parity F8; library src/components/_shared/image-fill.ts).
// The push gives a shape or frame node `imageFill`, the importer (Zen plugin, Session B) an IMAGE paint from it:
//   { src, scaleMode: "FILL" | "FIT" | "CROP" | "TILE", crop?: { x, y, width, height } (fractions 0–1 of the picture),
//     scale?: number (a tile's size, 1 = the picture's own) }
// with the picture's bytes in the package's `images[src]` and `src` kept in the node's shared plugin data ("zenstudio",
// "image"). The pull reads the paint back the same way (`src` from that plugin data: a picture made in Figma has none
// and is named in a note). Pure: `node figma-image.selftest.mjs`.

const MODES = { fill: "FILL", fit: "FIT", crop: "CROP", tile: "TILE" };
const FITS = { FILL: "fill", FIT: "fit", CROP: "crop", TILE: "tile" };

const finite = (value) => typeof value === "number" && Number.isFinite(value);
const round = (value) => Math.round(value * 1000) / 1000;

/** An element's plain value of a prop (a literal, or an object of literals as `imageCrop={{ x: 10, … }}`). */
function plainOf(value) {
  if (!value) return undefined;
  if (value.kind === "literal") return value.value;
  if (value.kind === "object") return Object.fromEntries(Object.entries(value.fields).map(([name, field]) => [name, plainOf(field)]));
  return undefined;
}

/** A crop in percent with every side inside the picture, or null. */
function cropOf(crop) {
  if (!crop || typeof crop !== "object") return null;
  const { x, y, width, height } = crop;
  if (![x, y, width, height].every(finite)) return null;
  const left = Math.min(99.9, Math.max(0, x));
  const top = Math.min(99.9, Math.max(0, y));
  return { x: left, y: top, width: Math.min(100 - left, Math.max(0.1, width)), height: Math.min(100 - top, Math.max(0.1, height)) };
}

/** The `imageFill` of a Shape or frame element's props (`code`: its literal props), or null without a picture. */
export function imageFillOf(code, element) {
  if (typeof code.image !== "string" || !code.image.trim()) return null;
  const fit = MODES[code.imageFit] ? code.imageFit : "fill";
  const crop = fit === "crop" ? cropOf(plainOf(element?.props?.imageCrop)) : null;
  const mode = fit === "crop" && !crop ? "fill" : fit;
  return {
    src: code.image,
    scaleMode: MODES[mode],
    ...(crop ? { crop: { x: round(crop.x / 100), y: round(crop.y / 100), width: round(crop.width / 100), height: round(crop.height / 100) } } : {}),
    ...(mode === "tile" ? { scale: finite(code.imageScale) && code.imageScale > 0 ? round(code.imageScale / 100) : 1 } : {}),
  };
}

/**
 * The props a pulled node's `imageFill` writes (the pull's literal / object values), and a note when the picture
 * cannot come back (made in Figma: no Studio src).
 */
export function imageFillProps(fill, literal) {
  if (!fill || typeof fill !== "object") return { props: {}, note: null };
  if (typeof fill.src !== "string" || !fill.src) return { props: {}, note: "its image fill was made in Figma: place the picture again in the Studio (⇧⌘K)" };
  const props = { image: literal(fill.src) };
  const fit = FITS[fill.scaleMode] ?? "fill";
  if (fit !== "fill") props.imageFit = literal(fit);
  if (fit === "crop" && fill.crop && [fill.crop.x, fill.crop.y, fill.crop.width, fill.crop.height].every(finite)) {
    const percent = (value) => literal(round(value * 100));
    props.imageCrop = { kind: "object", fields: { x: percent(fill.crop.x), y: percent(fill.crop.y), width: percent(fill.crop.width), height: percent(fill.crop.height) } };
  }
  if (fit === "tile" && finite(fill.scale) && fill.scale > 0 && round(fill.scale * 100) !== 100) props.imageScale = literal(round(fill.scale * 100));
  return { props, note: null };
}

/**
 * The reader's lines (figma-pull figmaReadCode, run in Figma): a node's first visible IMAGE paint as `imageFill`, its
 * crop from the paint's imageTransform ([[w, 0, x], [0, h, y]]: the part of the picture the layer shows). Every property
 * is read behind `in` (Figma throws on one a node type lacks).
 */
export const READ_IMAGE_FILL = `
const readImageFill = (node) => {
  // Only a node type that has fills: Figma throws on a property its type lacks (a GROUP's fills).
  const fills = "fills" in node ? node.fills : null;
  const paint = Array.isArray(fills) ? fills.find((fill) => fill.type === "IMAGE" && fill.visible !== false) : null;
  if (!paint) return null;
  let src = null;
  try { src = node.getSharedPluginData("zenstudio", "image") || null; } catch (e) { src = null; }
  const out = { scaleMode: paint.scaleMode || "FILL" };
  if (src) out.src = src;
  const t = paint.imageTransform;
  if (paint.scaleMode === "CROP" && Array.isArray(t)) out.crop = { x: t[0][2], y: t[1][2], width: t[0][0], height: t[1][1] };
  if (paint.scaleMode === "TILE" && typeof paint.scalingFactor === "number") out.scale = paint.scalingFactor;
  return out;
};
`;
