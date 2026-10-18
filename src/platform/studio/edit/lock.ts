import { useEffect } from "react";
import type { MenuItemData } from "../../../components/Menu";
import { LOCKED_PROP } from "../../../../tools/studio/layer-meta.mjs";
import { applyEdit, parseSrc } from "../api";
import { pageFile } from "../builder/store/pageStore";
import { inspectorStatus } from "../inspector/status";
import { frameNodeOf, isLockedFrame, isLockedSrc, isOwnLock } from "../select/layerMeta";
import { selectedLayers } from "../select/multiSelection";
import { isTypingTarget } from "../select/picker";
import { modKey } from "../shell/modKey";
import { canEdit, studioStore } from "../store";
import type { EditOp, StudioSelection } from "../types";
import { setOwnPropsOnLayers } from "./multi";

/*
 * Figma's Lock (⇧⌘L; plan docs/research/studio-figma-design-parity-2026-10-18.md F1): a locked layer or frame stays on
 * the page and in Layers, which still select it and the Inspector still changes it, but the canvas no longer picks,
 * moves or resizes it — nor anything in it. Written as `data-locked` (tools/studio/layer-meta.mjs), on a page you made.
 */

export const lockShortcut = `⇧${modKey}L`;
export const lockKeys = modKey === "⌘" ? "Meta+Shift+L" : "Control+Shift+L";

const LOCAL_PAGE = /^local:/;
const lockOp = (locked: boolean): EditOp => (locked ? { op: "setProp", name: LOCKED_PROP, value: { kind: "boolean", value: true } } : { op: "removeProp", name: LOCKED_PROP });

/** Whether a layer ("file:line:col") is on a page made in the Studio, which takes a lock. */
export const canLockSrc = (src: string | null | undefined) => Boolean(src && LOCAL_PAGE.test(parseSrc(src)?.file ?? ""));

/** Locks or unlocks one layer: one edit, one ⌘Z. */
export async function setLayerLocked(src: string, name: string, locked: boolean): Promise<boolean> {
  const parsed = parseSrc(src);
  if (!parsed || !LOCAL_PAGE.test(parsed.file) || !canEdit()) return false;
  const response = await applyEdit({ file: parsed.file, loc: parsed.loc, name, ops: [lockOp(locked)] }, `${locked ? "Lock" : "Unlock"} · ${name}`);
  return Boolean(response.ok);
}

/** Locks or unlocks a frame of the open page (its Screen or Overlay). */
export async function setFrameLocked(frameId: string, locked: boolean, label = "frame"): Promise<boolean> {
  const local = studioStore.getState().localPage;
  if (!local || !canEdit()) return false;
  const file = pageFile(local);
  const node = frameNodeOf(file, frameId);
  if (!node) return false;
  const response = await applyEdit({ file, loc: node.loc, name: node.name, ops: [lockOp(locked)] }, `${locked ? "Lock" : "Unlock"} · ${label}`);
  return Boolean(response.ok);
}

/** Whether the selection is locked itself (a frame or the primary layer). */
export function isSelectionLocked(selection: StudioSelection | null | undefined): boolean {
  const local = studioStore.getState().localPage;
  if (selection?.kind === "frame") return Boolean(local && isLockedFrame(pageFile(local), selection.frameId));
  return selection?.kind === "node" && !selection.part && isOwnLock(selection.src);
}

/** ⇧⌘L, Lock / Unlock in the menus: the selected frame, or every selected layer (one edit); any unlocked one locks all. */
export async function toggleLockSelection(): Promise<boolean> {
  const state = studioStore.getState();
  const selection = state.selection;
  if (!state.localPage) { inspectorStatus.set("neutral", "Lock works on a page you made"); return false; }
  if (!canEdit()) { inspectorStatus.set("neutral", "View only"); return false; }
  if (selection?.kind === "frame") return setFrameLocked(selection.frameId, !isSelectionLocked(selection));
  const layers = selectedLayers().filter((layer) => canLockSrc(layer.src));
  if (!layers.length) { inspectorStatus.set("neutral", "Select a layer to lock it"); return false; }
  const lock = layers.some((layer) => !isOwnLock(layer.src));
  if (layers.length === 1) return setLayerLocked(layers[0].src, layers[0].name, lock);
  const opsByLoc = Object.fromEntries(layers.map((layer) => [parseSrc(layer.src)!.loc, [lockOp(lock)]]));
  return setOwnPropsOnLayers(layers, opsByLoc, `${lock ? "Lock" : "Unlock"} ${layers.length} layers`);
}

/** The layer and frame menus' Lock / Unlock (Figma's), on a page you made. */
export function lockMenuItems(selection: StudioSelection | null | undefined): MenuItemData[] {
  const target = selection?.kind === "frame" ? selection.frameId : selection?.kind === "node" && !selection.part ? selection.src : null;
  if (!target || !studioStore.getState().localPage || (selection?.kind === "node" && !canLockSrc(selection.src))) return [];
  const locked = isSelectionLocked(selection);
  const off = canEdit() ? undefined : "View only";
  // A layer in a locked frame or layer is locked by it: Figma unlocks it there first.
  const held = !locked && selection?.kind === "node" && isLockedSrc(selection.src);
  return [{
    id: "lock-toggle",
    label: locked ? "Unlock" : "Lock",
    icon: locked ? "icon-lock-unlocked-01-line" : "icon-lock-01-line",
    shortcut: lockShortcut,
    disabled: Boolean(off) || held,
    caption: off ?? (held ? "Its frame is locked" : undefined),
    onSelect: () => { void toggleLockSelection(); },
  }];
}

/** ⇧⌘L anywhere but in a text field or a dialog (Figma's Lock / Unlock selection). */
export function useLockKeys() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = modKey === "⌘" ? event.metaKey : event.ctrlKey;
      if (!mod || !event.shiftKey || event.altKey || event.code !== "KeyL" || event.isComposing) return;
      const target = event.target instanceof Element ? event.target : null;
      if (isTypingTarget(target) || target?.closest("input, textarea, [contenteditable]:not([contenteditable='false']), [role='dialog']")) return;
      const state = studioStore.getState();
      if (state.presenting) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) void toggleLockSelection();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
