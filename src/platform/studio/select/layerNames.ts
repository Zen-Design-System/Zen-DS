/*
 * The name a layer shows on the canvas and in the panels when it differs from its component's: a Shape reads as what
 * Figma's tool drew ("Ellipse", "Line", "Star"), as Figma names RECTANGLE / ELLIPSE / LINE nodes; a main component and
 * its instances read as the component's name.
 */

const SHAPE_LABELS: Readonly<Record<string, string>> = { rectangle: "Rectangle", ellipse: "Ellipse", line: "Line", arrow: "Arrow", polygon: "Polygon", star: "Star" };

/** `name` as the layer shows it, given its props (a Shape's `type`). */
export function layerName(name: string, props: Record<string, unknown> | null | undefined): string {
  // A page-local component (renderPage marks its main's root and its instances): its name, as Figma lists them.
  if (typeof props?.["data-zen-main-name"] === "string") return props["data-zen-main-name"] as string;
  if (typeof props?.["data-zen-instance-name"] === "string") return props["data-zen-instance-name"] as string;
  if (name === "Shape") return SHAPE_LABELS[String(props?.type ?? "rectangle")] ?? "Rectangle";
  return name;
}
