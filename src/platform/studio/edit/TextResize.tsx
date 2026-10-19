import { Segmented } from "../../../components/Segmented";
import { applyEdit } from "../api";
import { getViewport } from "../canvas/viewport";
import { findBySrc } from "../select/picker";
import { canEdit, useStudio } from "../store";
import type { EditOp, SourceAttr, SourceElement, StudioSelection } from "../types";

/*
 * Figma's text resizing (Typography › Auto width · Auto height · Fixed size, F6) for a Text or Heading layer, on the
 * props Text already has: Auto width = `wrap={false}` (one line, as wide as its words), Auto height = a width (the
 * text wraps in it; a Fill width stays Fill), Fixed size = a width and a height (the text sits at the top of the box,
 * Typography's vertical alignment moves it). A change writes the rendered size it starts from, one edit. Mounted by the
 * Typography section (inspector/DesignPanel.tsx) beside the text style.
 */

export type TextResizing = "auto-width" | "auto-height" | "fixed";

const attributeOf = (attributes: readonly SourceAttr[], name: string) => attributes.find((attribute) => attribute.name === name);
/** `name={false}`, `name={240}`: the expression a prop is written with. */
const expressionOf = (attributes: readonly SourceAttr[], name: string) => { const attribute = attributeOf(attributes, name); return attribute?.kind === "expression" ? (attribute.value ?? "").trim() : null; };
const isPx = (attributes: readonly SourceAttr[], name: string) => /^\d+(\.\d+)?$/.test(expressionOf(attributes, name) ?? "");

/** What the layer's props say, in Figma's words. */
export function textResizingOf(attributes: readonly SourceAttr[]): TextResizing {
  if (expressionOf(attributes, "wrap") === "false") return "auto-width";
  return isPx(attributes, "width") && isPx(attributes, "height") ? "fixed" : "auto-height";
}

/** The ops that turn the layer to `next`, from its rendered `size` (px). */
export function textResizingOps(attributes: readonly SourceAttr[], next: TextResizing, size: { width: number; height: number }): EditOp[] {
  const remove = (name: string): EditOp[] => (attributeOf(attributes, name) ? [{ op: "removeProp", name }] : []);
  const number = (name: string, value: number): EditOp => ({ op: "setProp", name, value: { kind: "number", value: Math.max(1, Math.round(value)) } });
  const width = attributeOf(attributes, "width");
  const fill = width?.kind === "string" && width.value === "fill";
  if (next === "auto-width") return [{ op: "setProp", name: "wrap", value: { kind: "boolean", value: false } }, ...remove("width"), ...remove("height")];
  if (next === "auto-height") return [...remove("wrap"), ...(fill ? [] : [number("width", size.width)]), ...remove("height")];
  return [...remove("wrap"), ...(fill ? [] : [number("width", size.width)]), number("height", size.height)];
}

const OPTIONS = [
  { id: "auto-width", label: "", leading: "icon-chevron-selector-horizontal-line", "aria-label": "Auto width" },
  { id: "auto-height", label: "", leading: "icon-chevron-selector-vertical-line", "aria-label": "Auto height" },
  { id: "fixed", label: "", leading: "icon-square-line", "aria-label": "Fixed size" },
] as const;

export function TextResize({ selection, element }: { selection: StudioSelection & { kind: "node" }; element: SourceElement }) {
  const editable = useStudio((state) => canEdit(state) && Boolean(state.localPage));
  if (element.name !== "Text" && element.name !== "Heading") return null;
  const current = textResizingOf(element.attributes);
  const onValueChange = (value: string) => {
    if (value === current) return;
    const world = document.querySelector(".studio-world");
    const hits = world ? findBySrc(world, selection.src) : [];
    const host = (hits[selection.instance] ?? hits[0])?.hosts[0];
    const zoom = getViewport().zoom || 1;
    const rect = host?.getBoundingClientRect();
    const size = rect ? { width: rect.width / zoom, height: rect.height / zoom } : { width: 100, height: 20 };
    const label = OPTIONS.find((option) => option.id === value)?.["aria-label"] ?? "Resize text";
    void applyEdit({ file: element.file, loc: element.loc, name: element.name, ops: textResizingOps(element.attributes, value as TextResizing, size), hash: element.hash }, label);
  };
  return (
    <Segmented
      aria-label="Text resizing"
      size="sm"
      disabled={!editable}
      value={current}
      onValueChange={onValueChange}
      options={OPTIONS.map((option) => ({ ...option }))}
    />
  );
}
