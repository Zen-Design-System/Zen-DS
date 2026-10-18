import { useEffect, useSyncExternalStore } from "react";
import { NAME_PROP, batchNames } from "../../../../tools/studio/layer-meta.mjs";

export { batchNames };
import { applyEdit, parseSrc } from "../api";
import { pageFile } from "../builder/store/pageStore";
import { canvasApi } from "../canvas/viewport";
import { inspectorStatus } from "../inspector/status";
import { autoNameOf, displayName, frameNodeOf } from "../select/layerMeta";
import { selectedLayers, type ExtraLayer } from "../select/multiSelection";
import { findBySrc, isTypingTarget } from "../select/picker";
import { revealLeftPanel } from "../shell/layout";
import { modKey } from "../shell/modKey";
import { canEdit, studioStore } from "../store";
import type { EditOp } from "../types";
import { mainsOf, renameComponent } from "./localComponents";
import { setOwnPropsOnLayers } from "./multi";

/*
 * Figma's rename (plan docs/research/studio-figma-design-parity-2026-10-18.md F1, decision 4): double-click a layer's
 * name in Layers or a frame's name on the canvas, or ⌘R; ⌘R on several layers opens Rename layers (Figma's batch
 * rename: "Rename to" with $& for the current name and $n / $N for numbers, an optional Match). A layer's name is its
 * `data-name` (tools/studio/layer-meta.mjs); a frame's is its Screen's title or its Overlay's data-name; a main
 * component's root renames the component. An empty name, or the layer's automatic one, takes the data-name away.
 */

export const renameShortcut = `${modKey}R`;
export const renameKeys = modKey === "⌘" ? "Meta+R" : "Control+R";

const LOCAL_PAGE = /^local:/;

/* ── requests: Layers opens a row's name field; the batch dialog opens ─────────────────────────────────────────────── */

type Request = { id: string; at: number } | null;
let request: Request = null;
let batchOpen = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** Asks Layers to open the name field of the row `id` ("src#instance", or "frame:<frameId>"). */
export function requestRename(id: string) {
  request = { id, at: Date.now() };
  studioStore.setState({ leftTab: "layers" });
  revealLeftPanel();
  notify();
}
export const useRenameRequest = () => useSyncExternalStore(subscribe, () => request, () => null);
export const doneRenameRequest = () => { if (request) { request = null; notify(); } };

export const useBatchRenameOpen = () => useSyncExternalStore(subscribe, () => batchOpen, () => false);
export const setBatchRenameOpen = (open: boolean) => { batchOpen = open; notify(); };

/* ── writes ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

const nameOp = (src: string, name: string): EditOp | null => {
  const auto = autoNameOf(src);
  if (!name || name === auto) return { op: "removeProp", name: NAME_PROP };
  return { op: "setProp", name: NAME_PROP, value: { kind: "string", value: name } };
};

/** Renames a layer ("file:line:col"; `props`: its canvas props, which say whether it is a main component's root). */
export async function renameLayer(src: string, elementName: string, next: string, props?: Record<string, unknown> | null): Promise<boolean> {
  const parsed = parseSrc(src);
  if (!parsed || !LOCAL_PAGE.test(parsed.file)) { inspectorStatus.set("neutral", "Rename works on a page you made"); return false; }
  if (!canEdit()) { inspectorStatus.set("neutral", "View only"); return false; }
  const name = next.trim();
  const mainId = props?.["data-zen-main"];
  if (typeof mainId === "string") {
    const main = (await mainsOf(parsed.file)).find((entry) => entry.id === mainId);
    return main && name ? renameComponent(main, name) : false;
  }
  const op = nameOp(src, name);
  if (!op || (op.op === "removeProp" && props?.[NAME_PROP] === undefined)) return true;
  const response = await applyEdit({ file: parsed.file, loc: parsed.loc, name: elementName, ops: [op] }, `Rename → ${name || autoNameOf(src) || elementName}`);
  return Boolean(response.ok);
}

/** Renames a frame of the open page: a Screen's title, an Overlay's data-name. */
export async function renameFrame(frameId: string, next: string): Promise<boolean> {
  const local = studioStore.getState().localPage;
  if (!local) return false;
  if (!canEdit()) { inspectorStatus.set("neutral", "View only"); return false; }
  const file = pageFile(local);
  const node = frameNodeOf(file, frameId);
  if (!node) return false;
  const name = next.trim();
  if (node.name === "Screen" && !name) return false;
  const op: EditOp = node.name === "Screen"
    ? { op: "setProp", name: "title", value: { kind: "string", value: name } }
    : name ? { op: "setProp", name: NAME_PROP, value: { kind: "string", value: name } } : { op: "removeProp", name: NAME_PROP };
  const response = await applyEdit({ file, loc: node.loc, name: node.name, ops: [op] }, `Rename → ${name || "Overlay"}`);
  return Boolean(response.ok);
}

/** The layers ⌘R renames, each with the name it shows now (its props for a main component's root). */
export function renamableLayers(layers: ExtraLayer[] = selectedLayers()): Array<ExtraLayer & { current: string }> {
  const world = canvasApi.getWorldElement();
  return layers.filter((layer) => LOCAL_PAGE.test(parseSrc(layer.src)?.file ?? "")).map((layer) => {
    const hit = world ? findBySrc(world, layer.src)[layer.instance] : undefined;
    return { ...layer, current: displayName(layer.name, hit?.props, layer.src) };
  });
}

/** Writes several layers' names in one edit (one ⌘Z). */
export async function renameLayers(layers: ExtraLayer[], names: readonly string[]): Promise<boolean> {
  if (!canEdit()) { inspectorStatus.set("neutral", "View only"); return false; }
  const opsByLoc: Record<string, EditOp[]> = {};
  layers.forEach((layer, index) => {
    const op = nameOp(layer.src, names[index]?.trim() ?? "");
    const loc = parseSrc(layer.src)?.loc;
    if (op && loc) opsByLoc[loc] = [op];
  });
  return setOwnPropsOnLayers(layers, opsByLoc, `Rename ${layers.length} layers`);
}

/** ⌘R: one layer or a frame → its name field in Layers; several layers → Rename layers. */
export function startRename() {
  const state = studioStore.getState();
  const selection = state.selection;
  if (!state.localPage) { inspectorStatus.set("neutral", "Rename works on a page you made"); return; }
  if (selection?.kind === "frame") { requestRename(`frame:${selection.frameId}`); return; }
  if (selection?.kind !== "node" || selection.part) { inspectorStatus.set("neutral", "Select a layer to rename it"); return; }
  if (selectedLayers().length > 1) setBatchRenameOpen(true);
  else requestRename(`${selection.src}#${selection.instance}`);
}

/** ⌘R never reloads the tab; outside a text field and a dialog it renames (Figma's). */
export function useRenameKeys() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = modKey === "⌘" ? event.metaKey : event.ctrlKey;
      if (!mod || event.shiftKey || event.altKey || event.code !== "KeyR" || event.isComposing) return;
      event.preventDefault();
      const target = event.target instanceof Element ? event.target : null;
      if (isTypingTarget(target) || target?.closest("input, textarea, [contenteditable]:not([contenteditable='false']), [role='dialog']")) return;
      if (studioStore.getState().presenting) return;
      event.stopImmediatePropagation();
      if (!event.repeat) startRename();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
