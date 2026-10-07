import { announceEditStatus, applyEdit, parseSrc, studioApi } from "../api";
import { canvasApi } from "../canvas/viewport";
import { multiSelection, selectedLayers, selectLayers, sourceOrder, type ExtraLayer } from "../select/multiSelection";
import { expectRender, renderedNow } from "../select/remap";
import { canStructurallyEdit, structuralBlock, studioWrapOf } from "../slots/actions";
import { flushStudioStore, studioStore } from "../store";
import type { EditOp, StudioSelection } from "../types";

/*
 * Several selected layers at once, Figma-like (docs/research/studio-figma-editing-plan-2026-10-03.md, Phase 8): Delete,
 * ⌘D, the arrow keys and a property for all of them are one edit (op many: tools/studio/arrange.mjs) and one undo step. Layers of one
 * file only (one example, or one template).
 */

const fail = (message: string) => announceEditStatus({ kind: "error", message, at: Date.now() });

/** The layers' file and locations (source order), or why they cannot change together. */
function plan(layers: ExtraLayer[], verb: string, structural = true): { file: string; locs: string[]; first: ExtraLayer } | string {
  if (!layers.length) return "Select layers first";
  const sorted = [...layers].sort(sourceOrder);
  const files = new Set(sorted.map((layer) => parseSrc(layer.src)?.file));
  if (files.size !== 1) return `${verb} works on layers of one example at a time`;
  // A property on several layers is a prop edit (allowed wherever one layer's props are): only Remove / Duplicate need
  // the structural check (E2E I-13).
  if (structural) {
    for (const layer of sorted) {
      const check = canStructurallyEdit({ kind: "node", ...layer });
      if (!check.ok) return `${layer.name}: ${check.reason}`;
    }
  }
  const file = parseSrc(sorted[0].src)!.file;
  return { file, locs: [...new Set(sorted.map((layer) => parseSrc(layer.src)!.loc))], first: sorted[0] };
}

let running = false;

async function send(layers: ExtraLayer[], action: "remove" | "duplicate" | "setProps" | "move", label: string, ops?: EditOp[], to?: "prev" | "next") {
  if (running) return null;
  const target = plan(layers, action === "remove" ? "Remove" : action === "duplicate" ? "Duplicate" : action === "move" ? "Moving" : "Editing", action !== "setProps");
  if (typeof target === "string") { fail(target); return null; }
  running = true;
  try {
    const at = parseSrc(target.first.src)!;
    const element = await studioApi.element(at.file, at.loc);
    if (!element) { fail("The layers changed — select them again"); return null; }
    const op: EditOp = { op: "many", action, locs: target.locs, ...(ops ? { ops } : {}), ...(to ? { to } : {}) };
    const before = renderedNow(canvasApi.getWorldElement());
    const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [op], hash: element.hash }, label);
    return response.ok ? { response, before, first: target.first } : null;
  } finally {
    running = false;
  }
}

/** Delete / Backspace with several layers selected. */
export async function removeLayers(layers: ExtraLayer[] = selectedLayers()) {
  const done = await send(layers, "remove", `Remove ${layers.length} layers`);
  if (!done) return false;
  multiSelection.clear();
  const frameId = layers[0]?.frameId ?? null;
  studioStore.setState({ selection: frameId ? { kind: "frame", frameId } : null });
  return true;
}

/** ⌘D with several layers selected: each one copied right after itself; the first copy gets selected. */
export async function duplicateLayers(layers: ExtraLayer[] = selectedLayers()) {
  const done = await send(layers, "duplicate", `Duplicate ${layers.length} layers`);
  if (!done) return false;
  const loc = done.response.ok ? done.response.inserted?.loc : null;
  if (loc) {
    const next: StudioSelection = { kind: "node", src: `${done.response.ok ? done.response.file : ""}:${loc}`, name: done.first.name, frameId: done.first.frameId, panelId: done.first.panelId, instance: 0 };
    multiSelection.clear();
    expectRender(next, done.before, () => undefined, 1500);
    studioStore.setState({ selection: next });
    flushStudioStore();
  }
  return true;
}

/**
 * The arrow keys with several layers of one parent selected: each takes one place earlier / later among its siblings
 * (op many move), and they stay selected at their new places. A component in its Studio wrap Stack moves alone.
 */
export async function stepLayers(to: "prev" | "next", layers: ExtraLayer[] = selectedLayers()) {
  if (running) return false;
  for (const layer of layers) {
    const node = { kind: "node" as const, ...layer };
    if (await studioWrapOf(node)) { fail(`${layer.name} sits in its Studio wrap Stack: move it on its own`); return false; }
    const block = await structuralBlock(node, "move");
    if (block) { fail(block); return false; }
  }
  const sorted = [...layers].sort(sourceOrder);
  const done = await send(sorted, "move", `Move ${layers.length} layers ${to === "prev" ? "up" : "down"}`, undefined, to);
  if (!done?.response.ok) return false;
  const { file, moved } = done.response;
  // Each moved layer's loc before → after; a layer inside another selected one moved with it and drops out.
  const landed = sorted.flatMap((layer) => {
    const loc = moved?.locs?.[parseSrc(layer.src)!.loc];
    return loc ? [{ ...layer, src: `${file}:${loc}`, instance: 0 }] : [];
  });
  if (!landed.length) { multiSelection.clear(); return true; }
  const primary = moved?.locs?.[parseSrc(layers[0].src)!.loc];
  const first = landed.find((layer) => layer.src === `${file}:${primary}`) ?? landed[0];
  selectLayers(first, landed, done.before);
  flushStudioStore();
  return true;
}

/** One property on every selected layer (the Mixed rows of the multi-selection panel). */
export async function setPropsOnLayers(layers: ExtraLayer[], ops: EditOp[], label: string) {
  return Boolean(await send(layers, "setProps", label, ops));
}

/** The code of several layers, in source order, one after the other (⌘C on a multi-selection). */
export async function codeOfLayers(layers: ExtraLayer[]): Promise<{ file: string; code: string } | string> {
  const target = plan(layers, "Copy");
  if (typeof target === "string") return target;
  const source = await studioApi.source(target.file).catch(() => null);
  if (!source) return "The layers' file could not be read";
  const offset = source.content.charCodeAt(0) === 0xfeff ? 1 : 0;
  const parts: string[] = [];
  for (const loc of target.locs) {
    const element = await studioApi.element(target.file, loc);
    if (!element?.range) return "Restart the dev server to copy layers";
    const start = element.range.start + offset;
    const lineStart = source.content.lastIndexOf("\n", start - 1) + 1;
    const indent = /^[ \t]*/.exec(source.content.slice(lineStart))?.[0] ?? "";
    const code = source.content.slice(start, element.range.end + offset);
    parts.push(indent ? code.split("\n").map((line, i) => (i > 0 && line.startsWith(indent) ? line.slice(indent.length) : line)).join("\n") : code);
  }
  return { file: target.file, code: parts.join("\n") };
}
