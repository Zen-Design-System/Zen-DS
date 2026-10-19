export { Shape, shapeTypes, shapeStrokeAligns, SHAPE_DEFAULT_SIZE, type ShapeProps, type ShapeType, type ShapeStrokeAlign } from "./Shape";
/** Figma's image fill on a shape or a frame: Fill, Fit, Crop, Tile (the frames take the same props). */
export { imageFillModes, coverCrop, type ImageCrop, type ImageFillMode, type ImageFillProps } from "../_shared/image-fill";
export { shapeFills, shapeStrokes, shapeFillTokens, shapeStrokeTokens, shapeSupportHues, cssVarOf as shapeCssVarOf, DEFAULT_SHAPE_FILL, DEFAULT_LINE_STROKE, type ShapeFill, type ShapeStroke } from "./paint";
export {
  arcData,
  arcFromData,
  ellipseAngle,
  ellipsePath,
  ellipsePoint,
  ellipseScale,
  FULL_ARC,
  isFullArc,
  lineFromEnds,
  normalizeArc,
  polygonPoints,
  starPoints,
  STAR_RATIO,
  type ShapeArc,
} from "./geometry";
