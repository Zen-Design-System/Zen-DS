import { textStyleDefinitions } from "../../../tokens/typography.generated";
import { parseSrc } from "../api";
import { boardBoxes, sectionOf } from "../board/sections";
import { canvasApi } from "../canvas/viewport";
import { inspectorStatus } from "../inspector/status";
import { VARIANT_SETS } from "../mainComponent/variantSets.generated";
import { isLockedSrc, pageBoardOf } from "../select/layerMeta";
import { layerOfHit, multiSelection, selectLayers, type ExtraLayer } from "../select/multiSelection";
import { findBySrc } from "../select/picker";
import { studioStore } from "../store";
import { matchingLocs, sameLocs, type MatchContext, type SameKind } from "./matchModel";

/*
 * Figma's Select matching layers (⌥⌘A) and Select all with same › (Properties, Fill, Stroke, Effect, Text properties,
 * Font, Instance) on a page you made: the rules are edit/matchModel.ts's (user, 2026-10-22). The selected layer stays
 * the primary; the others are selected with it, as Figma's multi-edit selection.
 */

const say = (tone: "neutral" | "positive", message: string) => inspectorStatus.set(tone, message);

/** Figma's names for the Select all with same › items. */
export const SAME_LABELS: Readonly<Record<SameKind, string>> = {
  properties: "Properties", fill: "Fill", stroke: "Stroke", effect: "Effect", text: "Text properties", font: "Font", instance: "Instance",
};
/** What a layer with nothing of `kind` lacks, for the status line. */
const NONE: Readonly<Record<SameKind, string>> = {
  properties: "properties", fill: "fill", stroke: "stroke", effect: "effect", text: "text properties: it is not a text", font: "font: it is not a text", instance: "component: it is not an instance",
};

export { selectMatchingShortcut } from "../shell/modKey";

const variantAxes = (component: string) => {
  const seen = new Map<string, string>();
  for (const set of VARIANT_SETS[component] ?? []) for (const axis of set.axes) if (!seen.has(axis.prop)) seen.set(axis.prop, axis.default);
  return [...seen].map(([prop, value]) => ({ prop, default: value }));
};
const fontOf = (textStyle: string) => {
  const style = textStyleDefinitions.find((definition) => definition.name === textStyle);
  return style ? `${style.fontFamily} ${style.fontWeight}` : null;
};

/** The selected layer of a page you made, its page tree and loc; or why the command cannot run. */
function source(what: string) {
  const state = studioStore.getState();
  const selection = state.selection;
  if (!state.localPage) return `${what} works on a page you made`;
  if (selection?.kind !== "node" || selection.part) return "Select a layer first";
  const at = parseSrc(selection.src);
  const board = pageBoardOf(at?.file);
  if (!at || !board) return `${what}: the page is still loading`;
  return { selection, file: at.file, loc: at.loc, board };
}

/** The layers at `locs` as the canvas draws them (each first instance), leaving out locked and unrendered ones. */
function layersAt(file: string, locs: string[]): ExtraLayer[] {
  const world = canvasApi.getWorldElement();
  if (!world) return [];
  const out: ExtraLayer[] = [];
  for (const loc of locs) {
    const src = `${file}:${loc}`;
    if (isLockedSrc(src)) continue;
    const hit = findBySrc(world, src)[0];
    if (hit?.hosts.length) out.push(layerOfHit(hit, world));
  }
  return out;
}

function select(selection: ExtraLayer, others: ExtraLayer[]) {
  multiSelection.clear();
  selectLayers(selection, others);
}

/** Figma's Select matching layers (⌥⌘A): the same layer in the other frames (its Section's only). */
export function selectMatchingLayers(): boolean {
  const from = source("Select matching layers");
  if (typeof from === "string") { say("neutral", from); return false; }
  const boxes = boardBoxes();
  const context: MatchContext = { sectionOf: (frameId) => sectionOf(frameId, boxes), variantAxes, fontOf };
  const others = layersAt(from.file, matchingLocs(from.board, from.loc, context));
  if (!others.length) { say("neutral", "No matching layers in other frames"); return false; }
  select(from.selection, others);
  say("positive", `Selected ${others.length + 1} matching layers`);
  return true;
}

/** Figma's Select all with same ›: every layer of the page with the same `kind` as the selected one. */
export function selectAllWithSame(kind: SameKind): boolean {
  const label = `Select all with same ${SAME_LABELS[kind].toLowerCase()}`;
  const from = source(label);
  if (typeof from === "string") { say("neutral", from); return false; }
  const { value, locs } = sameLocs(from.board, from.loc, kind, { fontOf });
  if (value === null) { say("neutral", `This layer has no ${NONE[kind]}`); return false; }
  const others = layersAt(from.file, locs);
  if (!others.length) { say("neutral", `No other layer has the same ${SAME_LABELS[kind].toLowerCase()}`); return false; }
  select(from.selection, others);
  say("positive", `Selected ${others.length + 1} layers with the same ${SAME_LABELS[kind].toLowerCase()}`);
  return true;
}
