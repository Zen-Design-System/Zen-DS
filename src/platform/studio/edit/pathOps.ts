import { shapeFills, type ShapeFill } from "../../../components/Shape/paint";
import { applyEdit, parseSrc, studioApi } from "../api";
import { loadEngine } from "../builder/engine";
import { canvasApi } from "../canvas/viewport";
import { loadPathKit } from "../draw/pathKit";
import { inspectorStatus } from "../inspector/status";
import { multiSelection, selectedLayers, sourceOrder, type ExtraLayer } from "../select/multiSelection";
import { findBySrc } from "../select/picker";
import { expectRender, renderedNow } from "../select/remap";
import { canEdit, flushStudioStore, studioStore } from "../store";
import type { EditOp, EditValue, StudioSelection } from "../types";
import { boxFloating, floatingGroup } from "./groupLayers";

/*
 * Figma's path operations on shapes (plan docs/research/studio-f9-vectors-spec-2026-10-19.md F9b), on a page you made:
 * Union / Subtract / Intersect / Exclude selection (⌥⇧U ⌥⇧S ⌥⇧I ⌥⇧E: a live boolean group, `Shape type="boolean"`
 * holding the shapes where they are; its result follows every edit, builder/localApi.ts withBooleans), Flatten (⌘E:
 * the shapes as one vector) and Outline stroke (⌥⌘O: a stroke as a filled vector). Skia's PathOps compute the paths
 * (tools/studio/path-ops.mjs, pathkit-wasm loaded on first use). One edit, one ⌘Z each.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;
export type BooleanOperation = "union" | "subtract" | "intersect" | "exclude";

const WORDS: Readonly<Record<BooleanOperation, string>> = { union: "Union", subtract: "Subtract", intersect: "Intersect", exclude: "Exclude" };
const say = (message: string) => { inspectorStatus.set("neutral", message); return false; };
const baseName = (name: string) => name.slice(name.lastIndexOf(".") + 1);
const string = (value: string): EditValue => ({ kind: "string", value });

/** A layer's props as drawn now (its literal values: insets, size, type…), from the canvas. */
function propsOf(layer: ExtraLayer): Record<string, unknown> | null {
  const world = canvasApi.getWorldElement();
  const hit = world ? findBySrc(world, layer.src)[layer.instance] : undefined;
  return hit ? { ...hit.props } : null;
}

/** The selected shapes, in their order in the code, or why they cannot take a path operation. */
function shapesSelected(what: string): ExtraLayer[] | string {
  if (!canEdit()) return "View only";
  if (!studioStore.getState().localPage) return `${what} works on a page you made`;
  const layers = [...selectedLayers()].sort(sourceOrder);
  if (!layers.length) return "Select shapes first";
  const other = layers.find((layer) => baseName(layer.name) !== "Shape");
  return other ? `${what} works on shapes: ${other.name} is not one` : layers;
}

/** Figma's Union / Subtract / Intersect / Exclude selection: a boolean group of the selected shapes, where they are. */
export async function booleanSelection(operation: BooleanOperation): Promise<boolean> {
  const label = `${WORDS[operation]} selection`;
  const layers = shapesSelected(label);
  if (typeof layers === "string") return say(layers);
  if (layers.length < 2) return say(`${label} needs two shapes or more`);
  const items = floatingGroup(layers);
  if (!items) return say(`${label} combines shapes placed at X / Y in one frame`);
  // The group paints as the bottom shape did (Figma takes the first layer's fill and stroke).
  const first = propsOf(layers[0]) ?? {};
  const props: Record<string, EditValue> = { type: string("boolean"), operation: string(operation) };
  for (const name of ["fill", "stroke"]) if (typeof first[name] === "string") props[name] = string(first[name] as string);
  if (typeof first.strokeWeight === "number") props.strokeWeight = { kind: "number", value: first.strokeWeight };
  await loadPathKit();
  return boxFloating(items, props, label, `${WORDS[operation]}: the shapes stay editable inside it`, undefined, false, "Shape");
}

/** One vector in the place of `layers` (the first's): Flatten's and Outline stroke's write; the vector is selected. */
async function replaceWithVector(layers: ExtraLayer[], vector: { x: number; y: number; width: number; height: number; d: string }, props: Record<string, EditValue>, label: string): Promise<boolean> {
  const at = parseSrc(layers[0].src);
  const element = at ? await studioApi.element(at.file, at.loc) : null;
  if (!at || !element) return say(`${layers[0].name} is no longer there — select it again`);
  const op = {
    op: "group", tag: "Shape", childless: true,
    with: layers.slice(1).map((layer) => parseSrc(layer.src)?.loc ?? ""),
    box: { x: vector.x, y: vector.y, width: vector.width, height: vector.height },
    props: { type: string("vector"), ...props, d: string(vector.d), viewBox: string(`0 0 ${vector.width} ${vector.height}`) },
  } as unknown as EditOp;
  const before = renderedNow(canvasApi.getWorldElement());
  const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [op], hash: element.hash }, label);
  if (!response.ok || !response.inserted) return false;
  const next: NodeSelection = { kind: "node", src: `${response.file}:${response.inserted.loc}`, name: "Shape", frameId: layers[0].frameId, panelId: layers[0].panelId, instance: 0 };
  multiSelection.clear();
  expectRender(next, before, () => undefined, 1500);
  studioStore.setState({ selection: next });
  flushStudioStore();
  return true;
}

/** Figma's Flatten (⌘E): the selected shapes as one vector (their outlines side by side), with the first one's paint. */
export async function flattenSelection(): Promise<boolean> {
  const layers = shapesSelected("Flatten");
  if (typeof layers === "string") return say(layers);
  if (!floatingGroup(layers)) return say("Flatten works on shapes placed at X / Y in one frame");
  const all = layers.map(propsOf);
  if (all.some((props) => !props)) return say("A shape is not on the canvas right now");
  const [kit, engine] = await Promise.all([loadPathKit(), loadEngine()]);
  const vector = engine.flattenResult(kit, all as Array<Record<string, unknown>>);
  if (!vector) return say("Nothing to flatten: lines and arrows have no outline");
  const first = all[0]!;
  const paint: Record<string, EditValue> = {};
  // A shape's own default fill (Figma's grey) is written: a vector has none of its own.
  paint.fill = string(typeof first.fill === "string" ? first.fill : first.type === "line" || first.type === "arrow" || first.type === "vector" ? "none" : "support-neutral-soft");
  if (typeof first.stroke === "string" && first.stroke !== "none") paint.stroke = string(first.stroke);
  return replaceWithVector(layers, vector, paint, layers.length > 1 ? `Flatten ${layers.length} layers` : `Flatten ${layers[0].name}`);
}

/** Figma's Outline stroke (⌥⌘O): a shape's stroke as a filled vector (its stroke color as the fill), for a stroke without a fill. */
export async function outlineStrokeSelection(): Promise<boolean> {
  const layers = shapesSelected("Outline stroke");
  if (typeof layers === "string") return say(layers);
  if (layers.length !== 1) return say("Outline stroke works on one shape at a time");
  const props = propsOf(layers[0]);
  if (!props) return say("The shape is not on the canvas right now");
  const unfilled = props.type === "line" || props.type === "arrow" || props.type === "vector";
  const stroke = typeof props.stroke === "string" ? props.stroke : unfilled ? "neutral-solid" : "none";
  if (stroke === "none") return say("Outline stroke: this shape has no stroke");
  const fill = typeof props.fill === "string" ? props.fill : unfilled ? "none" : "support-neutral-soft";
  if (fill !== "none") return say("Outline stroke works on a stroke without a fill: set its fill to none first");
  if (!(shapeFills as readonly string[]).includes(stroke)) return say(`Outline stroke: the stroke color ${stroke} has no fill color of the same name`);
  const [kit, engine] = await Promise.all([loadPathKit(), loadEngine()]);
  const vector = engine.outlineStrokeResult(kit, props);
  if (!vector) return say("Outline stroke: nothing to outline");
  return replaceWithVector(layers, vector, { fill: string(stroke as ShapeFill), stroke: string("none") }, `Outline stroke of ${layers[0].name}`);
}
