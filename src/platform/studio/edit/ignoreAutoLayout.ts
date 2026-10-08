import { applyEdit, parseSrc, studioApi } from "../api";
import { inspectorStatus } from "../inspector/status";
import { valueOf, type PropValue } from "../inspector/propSchema";
import { isFloatWrapper, unwrapFloat } from "../position/float";
import { ladderOf, readGeometry } from "../position/PositionSection";
import { floatingComponents, floatOps, floatPlan, floatSummary, positionProps, unfloatOps } from "../position/positionModel";
import { selectedLayers, type ExtraLayer } from "../select/multiSelection";
import { wrapInBox } from "../select/wrapSelection";
import type { EditOp, EditValue, SourceElement, StudioNodeRef } from "../types";
import { setOwnPropsOnLayers } from "./multi";

/*
 * Ignore auto layout from Quick actions (⌘/) and the canvas menu, on one layer or several (the Design tab's Position
 * toggle does it for one, position/PositionSection.tsx; the same plans, position/positionModel.ts). On: a Stack / Grid /
 * Box floats at its offsets snapped to the ladder; any other layer floats in a Box around it. Off: the position props
 * go, or the floating Box is taken away. Several layers toggle together the way the primary goes (on when it is in the
 * flow), each at its own offsets, in one edit (op many setProps opsByLoc); there every layer must float by its own
 * props (a Box around each of several layers is one request per layer: float those one by one).
 */

type NodeSelection = { kind: "node" } & StudioNodeRef;
const short = (name: string) => name.slice(name.lastIndexOf(".") + 1);
const literal = (value: PropValue) => (value.state === "literal" ? value.value : value.state === "spread" && typeof value.live === "string" ? value.live : undefined);

type Read = { layer: NodeSelection; element: SourceElement; own: boolean; floating: boolean; values: Record<string, PropValue>; sizes: Record<string, PropValue> };

async function readLayer(layer: ExtraLayer): Promise<Read | string> {
  const at = parseSrc(layer.src);
  const element = at ? await studioApi.element(at.file, at.loc).catch(() => null) : null;
  if (!element) return `${layer.name} is no longer there — select it again`;
  const own = floatingComponents.has(short(element.name));
  const values = Object.fromEntries(positionProps.map((name) => [name, valueOf(element.attributes, name)]));
  const sizes = Object.fromEntries(["width", "height", "alignSelf"].map((name) => [name, valueOf(element.attributes, name)]));
  if ([values.position].some((value) => value.state === "bound" || value.state === "spread")) return `${element.name}'s position is set in the code — change it there`;
  return { layer: { kind: "node", ...layer }, element, own, floating: own && literal(values.position) === "absolute", values, sizes };
}

/** Whether the layer floats now (its own position, or a floating Box that holds only it), from the canvas and the source. */
function floatsNow(read: Read) {
  return read.floating || Boolean(!read.own && readGeometry(read.layer).floatBox) || isFloatWrapper(read.element);
}

/** One layer: the Position toggle's gesture. True when the file changed. */
async function toggleOne(read: Read): Promise<boolean> {
  const { layer, element, own, values, sizes } = read;
  const name = element.name;
  const geometry = readGeometry(layer);
  if (geometry.parent === "none") { inspectorStatus.set("neutral", `${name} is not inside a layout`); return false; }
  const ref = { frameId: layer.frameId, panelId: layer.panelId, instance: layer.instance };
  if (floatsNow(read)) {
    if (!own && geometry.floatBox) return unwrapFloat(geometry.floatBox, ref);
    if (isFloatWrapper(element)) return unwrapFloat(layer.src, ref);
    const ops = unfloatOps(values);
    if (!ops.length) return false;
    const ok = await write(layer, element, ops, `${name} back in auto layout`);
    if (ok) inspectorStatus.set("positive", `${name} is back in auto layout`);
    return ok;
  }
  if (!geometry.measured) { inspectorStatus.set("neutral", `${name} is not on the canvas right now`); return false; }
  const plan = floatPlan(geometry.measured, ladderOf(layer), own ? sizes : {});
  const summary = floatSummary(name, plan.snaps, plan.pins);
  if (own) {
    const ok = await write(layer, element, floatOps(plan), `${name} ignores auto layout`);
    if (ok) inspectorStatus.set("positive", summary);
    return ok;
  }
  const props: Record<string, EditValue> = Object.fromEntries(Object.entries(plan.props).map(([prop, value]) => [prop, { kind: "string", value }]));
  return wrapInBox({ src: layer.src, name, frameId: layer.frameId, panelId: layer.panelId, instance: layer.instance }, props, `${name} ignores auto layout`, `${summary} · in a Box around it`);
}

async function write(layer: NodeSelection, element: SourceElement, ops: EditOp[], label: string) {
  const at = parseSrc(layer.src)!;
  const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops, hash: element.hash }, label);
  return response.ok && response.before !== response.after;
}

/** ⌘/ › Ignore auto layout on the selection (one layer or several). True when the file changed. */
export async function toggleIgnoreAutoLayout(layers: ExtraLayer[] = selectedLayers()): Promise<boolean> {
  if (!layers.length) { inspectorStatus.set("neutral", "Select a layer first"); return false; }
  const reads: Read[] = [];
  for (const layer of layers) {
    const read = await readLayer(layer);
    if (typeof read === "string") { inspectorStatus.set("negative", read); return false; }
    reads.push(read);
  }
  if (reads.length === 1) return toggleOne(reads[0]);
  const on = !floatsNow(reads[0]);
  const boxed = reads.find((read) => !read.own);
  if (boxed) { inspectorStatus.set("neutral", `${boxed.element.name} floats in a Box around it: toggle it on its own (several layers float by their own props: Stack, Grid, Box)`); return false; }
  const opsByLoc: Record<string, EditOp[]> = {};
  const snaps: string[] = [];
  for (const read of reads) {
    const loc = parseSrc(read.layer.src)!.loc;
    if (on === read.floating) continue;
    if (!on) { opsByLoc[loc] = unfloatOps(read.values); continue; }
    const geometry = readGeometry(read.layer);
    if (geometry.parent === "none" || !geometry.measured) { inspectorStatus.set("neutral", `${read.element.name} is not inside a layout on the canvas`); return false; }
    const plan = floatPlan(geometry.measured, ladderOf(read.layer), read.sizes);
    opsByLoc[loc] = floatOps(plan);
    if (plan.snaps.some((entry) => entry.snap.clamped)) snaps.push(read.element.name);
  }
  const changing = reads.filter((read) => opsByLoc[parseSrc(read.layer.src)!.loc]?.length);
  if (!changing.length) return false;
  const ok = await setOwnPropsOnLayers(changing.map((read) => read.layer), Object.fromEntries(Object.entries(opsByLoc).filter(([, ops]) => ops.length)), `${changing.length} layers ${on ? "ignore auto layout" : "back in auto layout"}`);
  if (ok) inspectorStatus.set("positive", `${changing.length} layers ${on ? "ignore auto layout" : "are back in auto layout"}${snaps.length ? ` · offsets stop at 4xl (${snaps.join(", ")})` : ""}`);
  return ok;
}
