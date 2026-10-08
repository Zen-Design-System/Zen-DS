import { announceEditStatus, applyEdit, parseSrc, studioApi } from "../api";
import { canvasApi } from "../canvas/viewport";
import { multiSelection, selectedLayers, selectLayers, sourceOrder, type ExtraLayer } from "../select/multiSelection";
import { expectRender, renderedNow } from "../select/remap";
import { canStructurallyEdit, insideWrap, structuralBlock, studioWrapOf } from "../slots/actions";
import { flushStudioStore, studioStore } from "../store";
import type { EditOp, EditResponse, StateDecl, StudioSelection } from "../types";
import type { DropTarget } from "./arrange";

/*
 * Several selected layers at once, Figma-like (docs/research/studio-figma-editing-plan-2026-10-03.md, Phase 8): Delete,
 * ⌘D, the arrow keys, a drag and a property for all of them are one edit (op many: tools/studio/arrange.mjs) and one
 * undo step. Layers of one file only (one example, or one template); ⌘C copies from several files.
 * A component in its Studio wrap Stack (select/resize.ts studioWrapper) is removed, copied, moved and dragged with that
 * Stack, as one layer is (GĐ4 M4); its property edits stay on the component.
 */

type ManyAction = Extract<EditOp, { op: "many" }>["action"];
type ManyExtra = Omit<Extract<EditOp, { op: "many" }>, "op" | "action" | "locs">;
/** A layer with what the write acts on: itself, or its Studio wrap Stack. */
type Moving = { layer: ExtraLayer; moving: ExtraLayer; wrapped: boolean };

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

/** Each layer with the element a structural write moves: its Studio wrap Stack when it has one (read from the source). */
async function withWraps(layers: ExtraLayer[]): Promise<Moving[]> {
  return Promise.all(layers.map(async (layer) => {
    const wrap = await studioWrapOf({ kind: "node", ...layer });
    return wrap ? { layer, moving: { ...layer, src: wrap.src, name: wrap.name }, wrapped: true } : { layer, moving: layer, wrapped: false };
  }));
}

let running = false;

type Sent = { response: Extract<EditResponse, { ok: true }>; before: WeakSet<Element>; first: ExtraLayer };

async function send(layers: ExtraLayer[], action: ManyAction, label: string, extra: ManyExtra = {}): Promise<Sent | null> {
  if (running) return null;
  const verbs: Record<ManyAction, string> = { remove: "Remove", duplicate: "Duplicate", setProps: "Editing", move: "Moving", moveTo: "Moving" };
  const target = plan(layers, verbs[action], action !== "setProps");
  if (typeof target === "string") { fail(target); return null; }
  running = true;
  try {
    const at = parseSrc(target.first.src)!;
    const element = await studioApi.element(at.file, at.loc);
    if (!element) { fail("The layers changed — select them again"); return null; }
    const op: EditOp = { op: "many", action, locs: target.locs, ...extra };
    const before = renderedNow(canvasApi.getWorldElement());
    const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [op], hash: element.hash }, label);
    return response.ok ? { response, before, first: target.first } : null;
  } finally {
    running = false;
  }
}

/** Selects every layer at its new loc (`locs`: loc before → loc after, from the answer); the primary stays primary. */
function selectAt(sent: Sent, items: Moving[], locs: Record<string, string> | undefined, primary: ExtraLayer) {
  const { file, after } = sent.response;
  const landed = items.map(({ layer, moving, wrapped }) => {
    const loc = locs?.[parseSrc(moving.src)!.loc];
    if (!loc) return null;
    const at = { kind: "node" as const, ...layer, src: `${file}:${loc}`, instance: 0 };
    const { src, name } = wrapped ? insideWrap(at, file, after, loc) : at;
    return { layer, next: { src, name, frameId: layer.frameId, panelId: layer.panelId, instance: 0 } satisfies ExtraLayer };
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  if (!landed.length) return false;
  const first = landed.find((entry) => entry.layer.src === primary.src && entry.layer.instance === primary.instance)?.next ?? landed[0].next;
  selectLayers(first, landed.map((entry) => entry.next), sent.before);
  flushStudioStore();
  return true;
}

/** Delete / Backspace with several layers selected (a wrapped component goes with its wrap Stack). */
export async function removeLayers(layers: ExtraLayer[] = selectedLayers()) {
  const items = await withWraps(layers);
  const done = await send(items.map((item) => item.moving), "remove", `Remove ${layers.length} layers`);
  if (!done) return false;
  multiSelection.clear();
  const frameId = layers[0]?.frameId ?? null;
  studioStore.setState({ selection: frameId ? { kind: "frame", frameId } : null });
  return true;
}

/**
 * ⌘D with several layers selected: each one copied right after itself (a wrapped component with its wrap Stack), and
 * every copy selected (the answer's `inserted.locs`, original loc → copy; a server without it answers the first copy).
 */
export async function duplicateLayers(layers: ExtraLayer[] = selectedLayers()) {
  const items = await withWraps(layers);
  const done = await send(items.map((item) => item.moving), "duplicate", `Duplicate ${layers.length} layers`);
  if (!done) return false;
  const inserted = done.response.inserted;
  if (inserted?.locs && selectAt(done, items, inserted.locs, layers[0])) return true;
  if (inserted?.loc) {
    const first = items.find((item) => item.moving.src === done.first.src) ?? items[0];
    const at: Extract<StudioSelection, { kind: "node" }> = { kind: "node", src: `${done.response.file}:${inserted.loc}`, name: first.layer.name, frameId: first.layer.frameId, panelId: first.layer.panelId, instance: 0 };
    const next = first.wrapped ? insideWrap(at, done.response.file, done.response.after, inserted.loc) : at;
    multiSelection.clear();
    expectRender(next, done.before, () => undefined, 1500);
    studioStore.setState({ selection: next });
    flushStudioStore();
  }
  return true;
}

/**
 * The arrow keys with several layers of one parent selected: each takes one place earlier / later among its siblings
 * (op many move), and they stay selected at their new places. A wrapped component steps with its wrap Stack.
 */
export async function stepLayers(to: "prev" | "next", layers: ExtraLayer[] = selectedLayers()) {
  if (running) return false;
  const items = await withWraps(layers);
  for (const { moving } of items) {
    const block = await structuralBlock({ kind: "node", ...moving }, "move");
    if (block) { fail(block); return false; }
  }
  const done = await send(items.map((item) => item.moving).sort(sourceOrder), "move", `Move ${layers.length} layers ${to === "prev" ? "up" : "down"}`, { to });
  if (!done) return false;
  // A layer inside another selected one moved with it and is not in `locs`: it drops out of the selection.
  if (!selectAt(done, items, done.response.moved?.locs, layers[0])) multiSelection.clear();
  return true;
}

/**
 * A drag of several layers (edit/drag.ts): all of them go to `target` (op many moveTo: in source order, together at the
 * drop place; `copy` leaves them where they are, ⌥), and they stay selected there. One edit, one undo step.
 */
export async function moveLayersTo(target: DropTarget, copy: boolean, layers: ExtraLayer[] = selectedLayers()) {
  if (running) return false;
  const parent = parseSrc(target.parentSrc);
  if (!parent) return false;
  const items = await withWraps(layers);
  for (const { layer, moving } of items) {
    if (parseSrc(moving.src)?.file !== parent.file) { fail(`${layer.name}: layers move within their own file — copy them in the code to use them elsewhere`); return false; }
    // Dropped into, before or after one of the dragged layers (or its wrap Stack): nothing to move.
    if ([target.parentSrc, target.before, target.after].includes(moving.src)) return false;
    if (!copy) {
      const block = await structuralBlock({ kind: "node", ...moving }, "move");
      if (block) { fail(block); return false; }
    }
  }
  const extra: ManyExtra = { parent: parent.loc, ...(target.before ? { before: parseSrc(target.before)?.loc } : target.after ? { after: parseSrc(target.after)?.loc } : {}), ...(copy ? { copy: true } : {}) };
  const label = `${copy ? "Copy" : "Move"} ${layers.length} layers${target.reparent || copy ? ` into ${target.parentName}` : ""}`;
  const done = await send(items.map((item) => item.moving), "moveTo", label, extra);
  if (!done) return false;
  const answer = copy ? done.response.inserted : done.response.moved;
  if (!selectAt(done, items.map((item) => ({ ...item, layer: { ...item.layer, frameId: target.frameId, panelId: target.panelId } })), answer?.locs, layers[0])) multiSelection.clear();
  return true;
}

/** One property on every selected layer (the Mixed rows of the multi-selection panel). */
export async function setPropsOnLayers(layers: ExtraLayer[], ops: EditOp[], label: string) {
  return Boolean(await send(layers, "setProps", label, { ops }));
}

/** Each layer its own props (Ignore auto layout on several layers: each floats at its own offsets). One edit. */
export async function setOwnPropsOnLayers(layers: ExtraLayer[], opsByLoc: Record<string, EditOp[]>, label: string) {
  return Boolean(await send(layers, "setProps", label, { opsByLoc }));
}

/* ── ⌘C on several layers ────────────────────────────────────────────────────────────────────────────────────────── */

const BUILT_IN_TYPE = /^(?:\s*(?:string|number|boolean|null|Date|"[^"\n]*"|'[^'\n]*')(?:\[\])?\s*\|?)+$/;

/**
 * The useState values `code` reads that `content` declares with a literal initial (`const [open, setOpen] =
 * useState(false)`): a paste into another file declares them there (op pasteCode `state`), so a copied Dialog keeps its
 * open state instead of being refused. A type the server cannot take (not built-in) is left out; 8 at most.
 */
export function statesRead(code: string, content: string): StateDecl[] {
  const found: StateDecl[] = [];
  const pattern = /const\s*\[\s*([a-z][\w$]*)\s*,\s*(set[A-Z][\w$]*)\s*\]\s*=\s*(?:React\.)?useState(?:<([^>\n]*)>)?\(([^\n]*?)\)\s*;?\s*$/gm;
  const reads = (name: string) => new RegExp(`(^|[^\\w$.])${name.replace(/\$/g, "\\$")}(?![\\w$])`).test(code);
  for (let match = pattern.exec(content); match && found.length < 8; match = pattern.exec(content)) {
    const [, name, setter, type, initial] = match;
    if (setter !== `set${name[0].toUpperCase()}${name.slice(1)}` || !initial.trim() || found.some((entry) => entry.name === name)) continue;
    if (!reads(name) && !reads(setter)) continue;
    found.push({ name, initial: initial.trim(), ...(type && BUILT_IN_TYPE.test(type) ? { type: type.trim() } : {}) });
  }
  return found;
}

/** The code of one layer as it pastes: its continuation lines moved back by its own indentation. */
function dedented(content: string, range: { start: number; end: number }): string {
  const offset = content.charCodeAt(0) === 0xfeff ? 1 : 0;
  const start = range.start + offset;
  const lineStart = content.lastIndexOf("\n", start - 1) + 1;
  const indent = /^[ \t]*/.exec(content.slice(lineStart))?.[0] ?? "";
  const code = content.slice(start, range.end + offset);
  return indent ? code.split("\n").map((line, i) => (i > 0 && line.startsWith(indent) ? line.slice(indent.length) : line)).join("\n") : code;
}

/**
 * The code of several layers, in source order, one after the other (⌘C on a multi-selection), with the state it reads.
 * Layers of several files copy too (file by file, in path order); `file` is then null (it pastes as code everywhere).
 */
export async function codeOfLayers(layers: ExtraLayer[]): Promise<{ file: string | null; code: string; state: StateDecl[] } | string> {
  if (!layers.length) return "Select layers first";
  const items = await withWraps(layers);
  const byFile = new Map<string, string[]>();
  for (const { moving } of [...items].sort((a, b) => sourceOrder(a.moving, b.moving))) {
    const at = parseSrc(moving.src);
    if (!at) return "A layer's place is unknown — select it again";
    const list = byFile.get(at.file) ?? [];
    if (!list.includes(at.loc)) list.push(at.loc);
    byFile.set(at.file, list);
  }
  const parts: string[] = [];
  const state: StateDecl[] = [];
  for (const [file, locs] of byFile) {
    const source = await studioApi.source(file).catch(() => null);
    if (!source) return "The layers' file could not be read";
    const ranges: Array<{ start: number; end: number }> = [];
    for (const loc of locs) {
      const element = await studioApi.element(file, loc);
      if (!element?.range) return "Restart the dev server to copy layers";
      ranges.push(element.range);
    }
    // One layer inside another selected one is copied with it, once.
    const outer = ranges.filter((range) => !ranges.some((other) => other !== range && other.start <= range.start && range.end <= other.end)).map((range) => dedented(source.content, range));
    parts.push(...outer);
    for (const entry of statesRead(outer.join("\n"), source.content)) if (!state.some((known) => known.name === entry.name) && state.length < 8) state.push(entry);
  }
  return { file: byFile.size === 1 ? [...byFile.keys()][0] : null, code: parts.join("\n"), state };
}
