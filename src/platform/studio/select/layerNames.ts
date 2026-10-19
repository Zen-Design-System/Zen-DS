import type { IconName } from "../../../icons/generated/names";

/*
 * The name a layer shows on the canvas and in the panels when it differs from its component's: a Shape reads as what
 * Figma's tool drew ("Ellipse", "Line", "Star"), as Figma names RECTANGLE / ELLIPSE / LINE nodes; a main component and
 * its instances read as the component's name. And the icon it shows there: a drawn object (a shape, a frame, text) is
 * an object, never a component (user, 2026-10-17: "Shape chỉ nên được vẽ ra là 1 object thôi, việc tạo component phải là
 * do người dùng") — only a component the person made (⌥⌘K) or a Zen component instance reads as one.
 */

const SHAPE_LABELS: Readonly<Record<string, string>> = { rectangle: "Rectangle", ellipse: "Ellipse", line: "Line", arrow: "Arrow", polygon: "Polygon", star: "Star" };

/** `name` as the layer shows it, given its props (a Shape's `type`). */
export function layerName(name: string, props: Record<string, unknown> | null | undefined): string {
  // A page-local component (renderPage marks its main's root and its instances): its name, as Figma lists them.
  if (typeof props?.["data-zen-main-name"] === "string") return props["data-zen-main-name"] as string;
  if (typeof props?.["data-zen-instance-name"] === "string") return props["data-zen-instance-name"] as string;
  // A component set (F7: <ComponentSet>, Figma's set of variants): its name.
  if (typeof props?.["data-zen-set-name"] === "string") return props["data-zen-set-name"] as string;
  if (name === "Shape") return SHAPE_LABELS[String(props?.type ?? "rectangle")] ?? "Rectangle";
  return name;
}

const SHAPE_ICONS: Readonly<Record<string, IconName>> = { rectangle: "icon-square-line", ellipse: "icon-circle-line", line: "icon-minus-line", arrow: "icon-arrow-up-right-line", polygon: "icon-triangle-line", star: "icon-star-01-line" };

/**
 * A layer's own icon, as Figma's layers show it: a page-local component's ◇ (its main and its instances), a shape's
 * own (Rectangle, Ellipse…), a frame's # (Box), auto layout by its direction (Stack) or a grid (Grid), text's T, an
 * image. Null for the rest: layerIcon shows its component or code icon.
 */
export function objectIcon(name: string, props: Record<string, unknown> | null | undefined): IconName | null {
  if (props?.["data-zen-main"] || props?.["data-zen-instance"] || props?.["data-zen-set"]) return "icon-diamond-line";
  if (name === "Shape") return SHAPE_ICONS[String(props?.type ?? "rectangle")] ?? "icon-square-line";
  if (name === "Box") return "icon-hash-01-line";
  if (name === "Stack") return props?.direction === "row" ? "icon-columns-01-line" : "icon-rows-01-line";
  if (name === "Grid") return "icon-grid-01-line";
  if (name === "Text" || name === "Heading") return "icon-type-01-line";
  if (name === "Image") return "icon-image-line";
  return null;
}

/**
 * The icon a layer row shows, as Figma's Layers: its own (above), else an instance's ◇ for a component (a Zen component
 * is an instance of the library's), else code (an HTML element in example code).
 */
export function layerIcon(name: string, props: Record<string, unknown> | null | undefined, isComponent: boolean): IconName {
  return objectIcon(name, props) ?? (isComponent ? "icon-diamond-line" : "icon-code-02-line");
}
