import { useSyncExternalStore } from "react";
import { plural } from "../../../components/Text";
import { applyEdit, parseSrc, studioApi, subscribeStudioWrites, undoEdit } from "../api";
import { canvasApi } from "../canvas/viewport";
import { inspectorStatus, saveShortcut, undoShortcut } from "../inspector/status";
import { canStructurallyEdit } from "../slots/actions";
import { selectedHit } from "../slots/dom";
import { flushStudioStore, studioStore } from "../store";
import type { EditOp, EditValue, StudioSelection } from "../types";
import { selectedLayers, selectLayers, sourceOrder, type ExtraLayer } from "./multiSelection";
import { parentHit, rectOf, type FiberHit } from "./picker";
import { expectRender, mapSrc, renderedNow, sameSelectedElement } from "./remap";
import { familyKeyForPx, tokenPx } from "./spacing";

/*
 * Wrap the selection in a new container (Figma: Add auto layout ⇧A, Frame selection ⌥⌘G), one layer or several of one
 * parent: one POST /edit op "wrap" with `with` (tools/studio/jsx-source.mjs applyWrapMany), one undo step, one draft
 * change. "stack" wraps them in a Stack laid out as they render now (direction, gap snapped to a Spacing/Gap token,
 * align), so the page looks the same; "box" in a plain Box (a <div>: its children flow as blocks). Like the other
 * structural edits, only example and template content changes (canStructurallyEdit). After the write the new
 * container is selected (awaited on the canvas); undo selects the layers again, redo the container.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;
type WrapOp = Extract<EditOp, { op: "wrap" }>;
export type WrapKind = "stack" | "box";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
/** Figma's Add auto layout. */
export const autoLayoutShortcut = isMac ? "⇧A" : "Shift+A";
export const autoLayoutKeys = "Shift+A";
/** Figma's Frame selection. */
export const frameSelectionShortcut = isMac ? "⌥⌘G" : "Ctrl+Alt+G";
export const frameSelectionKeys = isMac ? "Alt+Meta+G" : "Control+Alt+G";

const tagOf = (kind: WrapKind) => (kind === "stack" ? "Stack" : "Box");

/* ───────────── Running state (one wrap at a time) ───────────── */

let running = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
/** True while a wrap is being checked or written. */
export const useWrapRunning = () => useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => running, () => false);

/* ───────────── What can be wrapped ───────────── */

export type WrapCheck = { ok: true; layers: ExtraLayer[] } | { ok: false; reason: string; hidden?: boolean };

/**
 * Whether the selected layers can go into a new container, told before the write (the server has the final say): each
 * one editable here (example or template content, not a part, Admin with the dev server), one file, rendered on the
 * canvas, not two rows of one list, and the same parent. `hidden`: the role, the server or the scope rules it out
 * (the controls hide, as for the slot actions).
 */
export function wrapCheck(layers: ExtraLayer[] = selectedLayers()): WrapCheck {
  if (!layers.length) return { ok: false, reason: "Select a layer first", hidden: true };
  for (const layer of layers) {
    const check = canStructurallyEdit({ kind: "node", ...layer });
    if (!check.ok) return { ok: false, reason: check.reason, hidden: check.kind !== "part" };
  }
  const files = new Set(layers.map((layer) => parseSrc(layer.src)?.file));
  if (files.size > 1) return { ok: false, reason: "The layers come from different files: select layers of one example" };
  if (new Set(layers.map((layer) => layer.src)).size < layers.length) return { ok: false, reason: `Two rows of one list are selected: their code is one element — select one row, or the element around the list` };
  const world = canvasApi.getWorldElement();
  const hits = layers.map((layer) => selectedHit({ kind: "node", ...layer }, world));
  const missing = hits.findIndex((hit) => !hit || !hit.hosts.length);
  if (missing >= 0) return { ok: false, reason: `${layers[missing].name} is not on the canvas right now` };
  if (layers.length > 1) {
    const parents = hits.map((hit) => (hit ? parentHit(hit) : null));
    const first = parents[0]?.hosts[0] ?? null;
    if (parents.some((parent) => (parent?.hosts[0] ?? null) !== first)) return { ok: false, reason: "Select layers that share one parent" };
  }
  return { ok: true, layers };
}

/* ───────────── Auto layout from the rendered layout ───────────── */

/** CSS px per rendered px of the canvas (its zoom), read from a host's own size. */
function scaleOf(hits: FiberHit[]): number {
  for (const hit of hits) {
    for (const host of hit.hosts) {
      if (host instanceof HTMLElement && host.offsetWidth > 0) {
        const width = host.getBoundingClientRect().width;
        if (width > 0) return width / host.offsetWidth;
      }
    }
  }
  return 1;
}

const ALIGN: Record<string, string> = { "flex-start": "start", start: "start", center: "center", "flex-end": "end", end: "end", baseline: "baseline" };

/**
 * The Stack props that keep `hits` (in source order) where they render: `direction` row when they sit side by side,
 * `gap` the Spacing/Gap token their spacing measures (the nearest one; none when they touch), `align` the parent's when
 * it lays them out the same way, else the edge they share. `wrap` when a row parent wraps.
 */
export function inferStack(hits: FiberHit[]): Record<string, EditValue> {
  const rects = hits.map((hit) => rectOf(hit.hosts)).filter((rect): rect is DOMRect => Boolean(rect));
  const props: Record<string, EditValue> = {};
  if (rects.length < 2) return props;
  const scale = scaleOf(hits);
  let rows = 0;
  const spaces: number[] = [];
  for (let index = 1; index < rects.length; index++) {
    const a = rects[index - 1];
    const b = rects[index];
    const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    const sideBySide = overlapY > Math.min(a.height, b.height) / 2 && b.left >= a.right - 1;
    if (sideBySide) {
      rows += 1;
      spaces.push((b.left - a.right) / scale);
    } else spaces.push((b.top - a.bottom) / scale);
  }
  const row = rows * 2 > rects.length - 1;
  if (row) props.direction = { kind: "string", value: "row" };
  // The spaces along the chosen axis only (a wrapped row's line breaks measure the other one).
  const along = spaces.filter((_, index) => {
    const a = rects[index];
    const b = rects[index + 1];
    return row ? b.left >= a.right - 1 : b.top >= a.bottom - 1;
  });
  const space = along.length ? along.reduce((sum, value) => sum + value, 0) / along.length : 0;
  const host = hits[0].hosts[0];
  if (space < 0.5) props.gap = { kind: "string", value: "none" };
  else {
    const exact = familyKeyForPx(host, "gap", space);
    const keys = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "giant", "xgiant", "2xgiant"];
    const nearest = exact ?? keys.map((key) => ({ key, px: tokenPx(host, "gap", key) })).filter((option): option is { key: string; px: number } => option.px !== null)
      .sort((a, b) => Math.abs(a.px - space) - Math.abs(b.px - space))[0]?.key;
    if (nearest) props.gap = { kind: "string", value: nearest };
  }
  // Align: the parent's, when it is a flex box laid out the same way; else the edge the layers share.
  const parent = host.parentElement;
  const style = parent ? getComputedStyle(parent) : null;
  const flex = Boolean(style && /flex/.test(style.display) && style.flexDirection.startsWith("row") === row);
  const align = flex ? ALIGN[style?.alignItems ?? ""] : undefined;
  if (align) props.align = { kind: "string", value: align };
  else if (!flex) {
    const near = (values: number[]) => values.every((value) => Math.abs(value - values[0]) < 1);
    const start = row ? rects.map((rect) => rect.top) : rects.map((rect) => rect.left);
    const center = row ? rects.map((rect) => rect.top + rect.height / 2) : rects.map((rect) => rect.left + rect.width / 2);
    const end = row ? rects.map((rect) => rect.bottom) : rects.map((rect) => rect.right);
    const shared = near(start) && near(end) ? null : near(start) ? "start" : near(center) ? "center" : near(end) ? "end" : null;
    if (shared) props.align = { kind: "string", value: shared };
  }
  if (row && flex && style?.flexWrap === "wrap") props.wrap = { kind: "boolean", value: true };
  return props;
}

/* ───────────── Undo / redo keep the selection on the layers or their container ───────────── */

type Print = { size: number; hash: string };
type WrapRecord = { file: string; before: Print; after: Print; layers: ExtraLayer[]; wrapper: NodeSelection };
const RECORD_KEY = "zen-studio:last-wrap-selection";

/** FNV-1a of the text, with its length (how a wrap's texts are told apart). */
function fingerprint(text: string): Print {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return { size: text.length, hash: (hash >>> 0).toString(16) };
}
const matches = (text: string, known: Print) => text.length === known.size && fingerprint(text).hash === known.hash;

let lastWrap: WrapRecord | null = (() => {
  try {
    const raw = window.sessionStorage.getItem(RECORD_KEY);
    const record = raw ? (JSON.parse(raw) as WrapRecord) : null;
    return record && typeof record.file === "string" && Array.isArray(record.layers) && record.layers.length && record.wrapper?.kind === "node" ? record : null;
  } catch {
    return null;
  }
})();

function remember(record: WrapRecord) {
  lastWrap = record;
  try {
    window.sessionStorage.setItem(RECORD_KEY, JSON.stringify(record));
  } catch {
    // Private mode or a full quota: undo still restores the source; the selection may not follow after a reload.
  }
}

const offWrites = subscribeStudioWrites((write) => {
  const last = lastWrap;
  if (!last || write.file !== last.file || write.kind === "edit") return;
  const undo = write.kind === "undo" && matches(write.before, last.after) && matches(write.after, last.before);
  const redo = write.kind === "redo" && matches(write.before, last.before) && matches(write.after, last.after);
  if (!undo && !redo) return;
  // What the canvas shows now is the render before this write (read synchronously, before Vite applies it).
  const before = renderedNow(canvasApi.getWorldElement());
  // After every other write listener (the selection remap).
  queueMicrotask(() => {
    const current = studioStore.getState().selection;
    const [first, ...others] = last.layers;
    const from: NodeSelection = undo ? last.wrapper : { kind: "node", ...first };
    const moved = current?.kind === "node" && !current.part && current.name === from.name && current.instance === from.instance && (current.src === from.src || current.src === mapSrc(from.src, write));
    if (current && !sameSelectedElement(from, current) && !moved) return;
    if (undo) selectLayers(first, others, before);
    else {
      expectRender(last.wrapper, before, () => undefined);
      studioStore.setState({ selection: last.wrapper });
    }
    flushStudioStore();
  });
});
import.meta.hot?.dispose(offWrites);

/* ───────────── The write ───────────── */

/** Number of layers the container written at `loc` holds (its element and expression children), or null. */
async function heldLayers(file: string, loc: string): Promise<number | null> {
  const element = await studioApi.element(file, loc).catch(() => null);
  return element ? element.children.filter((child) => child.kind !== "text" || child.value.trim()).length : null;
}

/**
 * Wraps the selected layers (`kind`: a Stack laid out as they render, or a plain Box) and selects the new container.
 * Refusals and outcomes go to the inspector's status line. True when the file changed.
 */
export async function wrapSelection(kind: WrapKind): Promise<boolean> {
  if (running) return false;
  const check = wrapCheck();
  if (!check.ok) {
    inspectorStatus.set("neutral", check.reason);
    return false;
  }
  running = true;
  notify();
  try {
    return await write(kind, check.layers);
  } finally {
    running = false;
    notify();
  }
}

/**
 * Wraps one layer in a Box given `props` (the Position section's Ignore auto layout on a layer that has no position
 * props of its own: the Box floats around it) and selects the Box, as a wrap does. `label` names the undo step, `done`
 * the status line. True when the file changed.
 */
export async function wrapInBox(layer: ExtraLayer, props: Record<string, EditValue>, label: string, done: string): Promise<boolean> {
  if (running) return false;
  const check = wrapCheck([layer]);
  if (!check.ok) {
    inspectorStatus.set("neutral", check.reason);
    return false;
  }
  running = true;
  notify();
  try {
    return await write("box", check.layers, { props, label, done });
  } finally {
    running = false;
    notify();
  }
}

async function write(kind: WrapKind, layers: ExtraLayer[], given?: { props: Record<string, EditValue>; label: string; done: string }): Promise<boolean> {
  // Sidebar rows go in a section of their own, as Figma groups Menu-Items under a Section-Title (user, 2026-10-10:
  // "Hành vi này phải làm được ở mọi nơi trong thiết kế"); other layers in a Stack or Box.
  const rows = kind === "stack" && !given && layers.every((layer) => layer.name === "SidebarMenuItem");
  const tag = rows ? "SidebarMenuSection" : tagOf(kind);
  const ordered = [...layers].sort(sourceOrder);
  const [first, ...others] = ordered;
  const at = parseSrc(first.src);
  if (!at) return false;
  const world = canvasApi.getWorldElement();
  const hits = ordered.map((layer) => selectedHit({ kind: "node", ...layer }, world)).filter((hit): hit is FiberHit => Boolean(hit));
  const fresh = await studioApi.element(at.file, at.loc).catch(() => null);
  if (!fresh || fresh.name !== first.name) {
    inspectorStatus.set("negative", `${first.name} moved before the change was saved; nothing was written`);
    return false;
  }
  const withLocs = others.map((layer) => parseSrc(layer.src)?.loc ?? "");
  const op: WrapOp = { op: "wrap", tag, props: given?.props ?? (rows ? { label: { kind: "string", value: "Section" } } : kind === "stack" ? inferStack(hits) : {}), ...(withLocs.length ? { with: withLocs } : {}) };
  const count = ordered.length;
  const what = count > 1 ? plural(count, "layer") : first.name;
  // Everything on the canvas before the write: the new container is a new element, never one of these.
  const before = renderedNow(world);
  // The selection the wrap starts from, read before the write: a builder page re-renders as it writes and drops a
  // selection whose place moved (the wrapped layer), so it is gone by the time the write answers.
  const startedFrom = studioStore.getState().selection;
  const response = await applyEdit({ file: at.file, loc: at.loc, name: fresh.name, ops: [op], hash: fresh.hash }, given?.label ?? `Wrap ${what} in ${tag}`);
  if (!response.ok) {
    inspectorStatus.set("negative", /Unknown op "wrap"/.test(response.error) ? "Restart the dev server to wrap layers" : response.error);
    return false;
  }
  if (response.before === response.after || !response.wrapped) return false;
  // A dev server started before `with` existed wraps the first layer alone: take it back and say so.
  if (count > 1 && (await heldLayers(response.file, response.wrapped.loc)) !== count) {
    await undoEdit();
    inspectorStatus.set("negative", "Restart the dev server: it wrapped one layer only (the change was undone)");
    return false;
  }
  const primary = studioStore.getState().selection;
  const wrapper: NodeSelection = { kind: "node", src: `${response.file}:${response.wrapped.loc}`, name: tag, frameId: first.frameId, panelId: first.panelId, instance: first.instance };
  remember({ file: response.file, before: fingerprint(response.before), after: fingerprint(response.after), layers, wrapper });
  const snippet = response.snippet && !response.snippet.synced ? `Example code not updated${response.snippet.reason ? `: ${response.snippet.reason}` : ""}` : null;
  const text = [given?.done ?? `Wrapped ${what} in a ${tag}`, response.draft ? `Draft · ${saveShortcut} to save` : `${undoShortcut} to undo`, snippet].filter(Boolean).join(" · ");
  inspectorStatus.set("positive", text);
  // Still the selection the wrap started from (it moved with the write, or the write dropped it): select the container,
  // as Figma does; a selection made meanwhile elsewhere stays. Synchronously (no request in between): Vite may reload
  // the page as soon as it sees the write.
  const wrapped = (src: string) => layers.some((layer) => layer.src === src || mapSrc(layer.src, { file: response.file, before: response.before, after: response.after, kind: "edit" }) === src);
  const fromWrapped = startedFrom?.kind === "node" && wrapped(startedFrom.src);
  if ((primary?.kind === "node" && wrapped(primary.src)) || (fromWrapped && (primary === null || primary === startedFrom))) {
    expectRender(wrapper, before, () => undefined);
    studioStore.setState({ selection: wrapper });
    flushStudioStore();
  }
  return true;
}
