/*
 * The name a layer shows on the canvas and in the panels when it differs from its component's: a Shape reads as what
 * Figma's tool drew ("Ellipse", "Line", "Star"), as Figma names RECTANGLE / ELLIPSE / LINE nodes.
 */

const SHAPE_LABELS: Readonly<Record<string, string>> = { rectangle: "Rectangle", ellipse: "Ellipse", line: "Line", arrow: "Arrow", polygon: "Polygon", star: "Star" };

/** `name` as the layer shows it, given its props (a Shape's `type`). */
export function layerName(name: string, props: Record<string, unknown> | null | undefined): string {
  if (name === "Shape") return SHAPE_LABELS[String(props?.type ?? "rectangle")] ?? "Rectangle";
  return name;
}
