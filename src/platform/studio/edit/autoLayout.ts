import { announceEditStatus, applyEdit, parseSrc, studioApi } from "../api";
import { loadEngine } from "../builder/engine";
import { canvasApi, getViewport } from "../canvas/viewport";
import { inspectorStatus } from "../inspector/status";
import { isFloatWrapper } from "../position/float";
import { multiSelection } from "../select/multiSelection";
import { findBySrc } from "../select/picker";
import { expectRender, renderedNow } from "../select/remap";
import { familyKeyForPx, tokenPx } from "../select/spacing";
import { canStructurallyEdit } from "../slots/actions";
import { wrapSelection } from "../select/wrapSelection";
import { addPlan, PAINTS, removePlan } from "./autoLayoutPlan";
import { flushStudioStore, studioStore } from "../store";
import type { SourceElement, StudioSelection } from "../types";

/*
 * Figma's Add auto layout (⇧A) on a frame and Remove auto layout (⌥⇧A), each one code change and one ⌘Z (research
 * docs/research/studio-figma-native-parity-2026-10-17.md P2; the code: tools/studio/relayout.mjs).
 * - ⇧A on a Box (Figma's frame without auto layout): the frame itself takes auto layout, read from where its layers
 *   sit: side by side → horizontal, else vertical; the layers in that order; gap, padding and alignment snapped to the
 *   Spacing tokens (Zen's ladder: the nearest step). The layers leave their X / Y (a float wrapper gives its layer back)
 *   and the frame hugs them, as Figma's does. A Box with a fill, border, radius or effect keeps them and gets the
 *   auto layout as a Stack inside (Zen's frame with a fill: Box > Stack).
 * - ⌥⇧A on a Stack: a Box of the size it has now, each layer at the X / Y it shows (px; a layer that cannot float
 *   itself in a Box around it), nothing moves on the screen.
 */

const nearestKeyOf = (host: Element) => (scale: "gap" | "padding", px: number) => nearestKey(host, scale, px, scale === "gap" ? GAP_KEYS : PADDING_KEYS);
const fail = (message: string) => { announceEditStatus({ kind: "error", message, at: Date.now() }); return false; };
const say = (message: string) => inspectorStatus.set("positive", message);

type Layer = { element: SourceElement; host: HTMLElement; box: { x: number; y: number; w: number; h: number } };

/** The frame's element, its rendered node and its layers measured in its own px (from its padding box). */
async function readFrame(selection: Extract<StudioSelection, { kind: "node" }>) {
  const at = parseSrc(selection.src);
  const world = canvasApi.getWorldElement();
  if (!at || !world) return null;
  const element = await studioApi.element(at.file, at.loc);
  const hits = findBySrc(world, selection.src);
  const host = (hits[selection.instance] ?? hits[0])?.hosts.find((node): node is HTMLElement => node instanceof HTMLElement);
  if (!element || !host || !element.range) return null;
  const { zoom } = getViewport();
  const origin = host.getBoundingClientRect();
  const layers: Layer[] = [];
  for (const child of element.children) {
    if (child.kind === "text" && !child.value.trim()) continue;
    if (child.kind !== "element") return { at, element, host, layers: null };
    const childElement = await studioApi.element(at.file, child.loc);
    const childHost = findBySrc(world, `${at.file}:${child.loc}`).map((hit) => hit.hosts.find((node): node is HTMLElement => node instanceof HTMLElement)).find((node) => node && host.contains(node));
    if (!childElement || !childHost) return { at, element, host, layers: null };
    const rect = childHost.getBoundingClientRect();
    layers.push({ element: childElement, host: childHost, box: { x: (rect.left - origin.left) / zoom - host.clientLeft, y: (rect.top - origin.top) / zoom - host.clientTop, w: rect.width / zoom, h: rect.height / zoom } });
  }
  return { at, element, host, layers };
}

const written = (element: SourceElement, prop: string) => element.attributes.some((attr) => attr.kind !== "spread" && attr.name === prop);
const nearestKey = (host: Element, scale: "gap" | "padding", px: number, keys: string[]) => {
  if (px < 0.5) return "none";
  return familyKeyForPx(host, scale, px) ?? keys.map((key) => ({ key, px: tokenPx(host, scale, key) })).filter((option): option is { key: string; px: number } => option.px !== null).sort((a, b) => Math.abs(a.px - px) - Math.abs(b.px - px))[0]?.key ?? "none";
};
const GAP_KEYS = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "giant", "xgiant", "2xgiant"];
const PADDING_KEYS = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];

async function replaceWith(selection: Extract<StudioSelection, { kind: "node" }>, at: { file: string; loc: string }, element: SourceElement, code: string, label: string, name: string) {
  const before = renderedNow(canvasApi.getWorldElement());
  const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [{ op: "replaceElement", code }], hash: element.hash }, label);
  if (!response.ok) return false;
  const loc = response.inserted?.loc ?? at.loc;
  const next: StudioSelection = { ...selection, src: `${response.file}:${loc}`, name };
  multiSelection.clear();
  expectRender(next, before, () => undefined, 1500);
  studioStore.setState({ selection: next });
  flushStudioStore();
  return true;
}

/** ⇧A on a frame without auto layout (a Box): auto layout from where its layers sit. True when it took the key. */
export async function addAutoLayout(selection: Extract<StudioSelection, { kind: "node" }>): Promise<boolean> {
  const check = canStructurallyEdit(selection);
  if (!check.ok) return fail(check.reason);
  const frame = await readFrame(selection);
  if (!frame) return fail("The frame is not on the canvas right now");
  const { at, element, host, layers } = frame;
  if (!layers) return fail("The frame holds a list or code: lay it out in the code");
  const engine = await loadEngine();
  const source = await studioApi.source(at.file);
  const painted = PAINTS.some((prop) => written(element, prop));
  const { row, gap: stackGap, padding, plan } = addPlan(layers.map((layer) => ({ box: layer.box, name: layer.element.name, floatWrapper: isFloatWrapper(layer.element) })), nearestKeyOf(host), painted);
  const pads = Object.values(padding).filter(Boolean);
  let code: string;
  try {
    code = engine.relayoutCode(source.content, element.range!, plan);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
  const done = await replaceWith(selection, at, element, code, "Add auto layout", painted ? "Box" : "Stack");
  if (done) say(`Auto layout: ${row ? "horizontal" : "vertical"}, gap ${stackGap}${pads.length ? `, padding ${pads.join(" × ")}` : ""}`);
  return done;
}

/** ⌥⇧A on an auto layout frame (a Stack): a Box of its size, each layer where it shows, at X / Y in px. */
export async function removeAutoLayout(selection: Extract<StudioSelection, { kind: "node" }>): Promise<boolean> {
  const check = canStructurallyEdit(selection);
  if (!check.ok) return fail(check.reason);
  const frame = await readFrame(selection);
  if (!frame) return fail("The frame is not on the canvas right now");
  const { at, element, host, layers } = frame;
  if (!layers) return fail("The frame holds a list or code: lay it out in the code");
  const engine = await loadEngine();
  const source = await studioApi.source(at.file);
  const filled = (layer: Layer, axis: "width" | "height") => layer.element.attributes.some((attr) => attr.kind === "string" && attr.name === axis && attr.value === "fill");
  const plan = removePlan(layers.map((layer) => ({ box: layer.box, name: layer.element.name, floatWrapper: false, fill: { width: filled(layer, "width"), height: filled(layer, "height") } })), { width: host.offsetWidth, height: host.offsetHeight });
  let code: string;
  try {
    code = engine.relayoutCode(source.content, element.range!, plan);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
  const done = await replaceWith(selection, at, element, code, "Remove auto layout", "Box");
  if (done) say("Auto layout removed: each layer keeps its place (X / Y)");
  return done;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
/** "⌥⇧A" on Apple platforms, "Alt+Shift+A" elsewhere (Figma's Remove auto layout). */
export const removeAutoLayoutShortcut = isMac ? "⌥⇧A" : "Alt+Shift+A";

/** One frame without auto layout (a Box) on a page you made: Add auto layout turns it into auto layout itself. */
export const isFrameWithoutAutoLayout = (selection: StudioSelection | null): selection is Extract<StudioSelection, { kind: "node" }> =>
  selection?.kind === "node" && !selection.part && selection.name === "Box" && !multiSelection.get().length && Boolean(studioStore.getState().localPage);

/** One auto layout frame (a Stack) on a page you made: Remove auto layout applies. */
export const isAutoLayoutFrame = (selection: StudioSelection | null): selection is Extract<StudioSelection, { kind: "node" }> =>
  selection?.kind === "node" && !selection.part && selection.name === "Stack" && !multiSelection.get().length && Boolean(studioStore.getState().localPage);

/**
 * Figma's Add auto layout (⇧A, the canvas menu, the Inspector's Auto layout +): a frame without auto layout takes it
 * itself; any other layer, or several, go into a new auto layout frame laid out as they render.
 */
export function addAutoLayoutToSelection(): Promise<unknown> {
  const selection = studioStore.getState().selection;
  return isFrameWithoutAutoLayout(selection) ? addAutoLayout(selection) : wrapSelection("stack");
}

/** Figma's Remove auto layout (⌥⇧A, the canvas menu, the Inspector's Auto layout −) on the selected auto layout frame. */
export function removeAutoLayoutFromSelection(): Promise<unknown> {
  const selection = studioStore.getState().selection;
  return isAutoLayoutFrame(selection) ? removeAutoLayout(selection) : Promise.resolve(false);
}

