import { useEffect, useState } from "react";
import type { MenuEntry, MenuItemData } from "../../../components/Menu";
import { parseSrc, studioApi } from "../api";
import type { SourceElement, StudioSelection } from "../types";
import {
  canStructurallyEdit, clearedText, clearSlot, duplicateSelection, duplicateShortcut, moveAvailability, moveSelection, namedCaption, openSlotPicker, removeSelection,
  removeShortcut, resetCaption, resetSlot, slotActionsOf, structuralBlock, useSlotServer, type StructuralVerb,
} from "./actions";
import { onlyFrame, slotContentOf } from "./content";
import { activeSlotsOf, contentSummaryOf, hostPropsOf, slotsOf } from "./registry";

/*
 * The canvas menu's slot items (spec "Context menu", Figma's layer menu): Add to {Slot}… · Reset slot · Duplicate ⌘D ·
 * Move up · Move down, then (after Detach) a separator, Clear slot contents and Remove ⌫, destructive and last. Reset
 * slot and Clear slot contents (the inspector's "More actions" of a slot) show for a host with exactly one slot, its
 * name in their caption ("Content · back to the saved file"). A refusal is the caption of the first item it disables,
 * never only a tooltip. Since 2026-10-05 (plan WP-B2, "editing is free": rules explain, never hide) every item shows
 * for a Viewer, a read-only Studio, a playground or shared code too, disabled with the reason (the toolbar's Read-only
 * chip explains the read-only cases). What the server would refuse (a `.map` row, what a function returns, a keyed copy)
 * is read when the menu opens and disables the item with the reason.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

export type SlotMenuItems = {
  /** Before Detach: Add to {Slot}…, Reset slot, Duplicate, Move up, Move down. */
  leading: MenuItemData[];
  /** After Detach: a separator, Clear slot contents and Remove (empty when Remove is not offered). */
  trailing: MenuEntry[];
};

const NONE: SlotMenuItems = { leading: [], trailing: [] };

/** `frameLayers`: how many layers the only slot's single layout frame holds (Clear removes them with it), else null. */
type Read = { at: number; element: SourceElement | null; frameLayers: number | null; blocks: Record<StructuralVerb, string | null> };

/** The host, and the layer count of its only slot's single layout frame (read like the inspector's block caption). */
async function readHost(file: string, loc: string): Promise<{ element: SourceElement | null; frameLayers: number | null }> {
  const element = await studioApi.element(file, loc);
  const registered = element ? slotsOf(element.name) : [];
  const frame = element && registered.length === 1 ? onlyFrame(slotContentOf(element, registered[0])) : null;
  const read = frame ? await studioApi.element(file, frame.loc) : null;
  return { element, frameLayers: read && read.name === frame?.name ? contentSummaryOf(read.children).count : null };
}

/** The slot items for the menu opened at `point` (client px) on `selection`; `openedAt` changes with each opening. */
export function useSlotMenuItems(selection: NodeSelection | null, point: { x: number; y: number } | null, openedAt: number): SlotMenuItems {
  // Re-render when the dev server's state changes (canStructurallyEdit reads it).
  useSlotServer();
  const [read, setRead] = useState<Read | null>(null);
  const node = selection && !selection.part ? selection : null;
  const host = Boolean(node && slotsOf(node.name).length);
  const writable = Boolean(node && canStructurallyEdit(node).ok);
  useEffect(() => {
    const parsed = node ? parseSrc(node.src) : null;
    if (!node || !parsed || !openedAt) return undefined;
    let alive = true;
    const blockOf = (verb: StructuralVerb) => (writable ? structuralBlock(node, verb) : Promise.resolve(null));
    void Promise.all([
      host ? readHost(parsed.file, parsed.loc) : Promise.resolve({ element: null, frameLayers: null }),
      blockOf("remove"),
      blockOf("duplicate"),
      blockOf("move"),
    ]).then(([{ element, frameLayers }, remove, duplicate, move]) => { if (alive) setRead({ at: openedAt, element, frameLayers, blocks: { remove, duplicate, move } }); });
    return () => { alive = false; };
    // One read per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedAt, host, writable]);
  if (!node) return NONE;
  // Read-only, a part, the playground or shared code: every item still shows, disabled, with the reason as the caption
  // of the first item it disables (Studio editing is free: a rule explains, it never hides the option; plan WP-B2).
  const check = canStructurallyEdit(node);
  const loaded = read && read.at === openedAt ? read : null;
  const slots = loaded?.element ? activeSlotsOf(loaded.element.name, hostPropsOf(loaded.element.attributes)) : [];

  // Each reason is the caption of the first item it disables.
  const explained = new Set<string>();
  const reasonFor = (reason: string | null) => {
    if (!reason || explained.has(reason)) return undefined;
    explained.add(reason);
    return reason;
  };
  const refusal = check.ok ? null : check.reason;
  const add: MenuItemData[] = slots.map((slot) => {
    const block = loaded?.element ? slotContentOf(loaded.element, slot).insertBlock ?? null : null;
    const reason = refusal ?? block;
    return {
      id: `slot-add:${slot.prop}`,
      label: `Add to ${slot.name}…`,
      icon: "icon-plus-line",
      disabled: reason !== null,
      caption: reasonFor(reason),
      // After the menu closed (it gives focus back to its trigger first).
      onSelect: () => { requestAnimationFrame(() => openSlotPicker(node, slot.prop, point ?? undefined)); },
    };
  });
  if (!loaded && host && !add.length) add.push({ id: "slot-add", label: "Add to slot…", icon: "icon-plus-line", disabled: true, caption: reasonFor("Checking…") });

  // Why an item is off: the Studio's refusal, the read still going, or what the server would refuse.
  const offFor = (verb: StructuralVerb) => refusal ?? (loaded ? loaded.blocks[verb] : "Checking…");
  const duplicateOff = offFor("duplicate");
  const removeOff = offFor("remove");
  const moveOff = offFor("move");
  const moves = check.ok ? moveAvailability(node) : { prev: false, next: false };

  // Reset slot / Clear slot contents for a host with exactly one slot (two would need the slot in the label). Before the
  // read they show disabled ("Checking…", said once by the first item it disables).
  const registered = slotsOf(node.name);
  const only = registered.length === 1 ? registered[0] : null;
  const actions = only && loaded?.element ? slotActionsOf(loaded.element, only) : null;
  const slotCaption = (block: string | null | undefined, usual: () => string) => {
    if (refusal) return reasonFor(refusal);
    if (!actions || !only) return reasonFor("Checking…");
    return block ? namedCaption(only.name, block) : usual();
  };
  const reset: MenuItemData[] = only ? [{
    id: "slot-reset",
    label: "Reset slot",
    icon: "icon-reverse-left-line",
    disabled: refusal !== null || !actions || actions.resetBlock !== null,
    caption: slotCaption(actions?.resetBlock, () => namedCaption(only.name, resetCaption)),
    onSelect: () => { void resetSlot(node, only); },
  }] : [];

  const leading: MenuItemData[] = [
    ...add,
    ...reset,
    { id: "slot-duplicate", label: "Duplicate", icon: "icon-duplicate-line", shortcut: duplicateShortcut, disabled: duplicateOff !== null, caption: reasonFor(duplicateOff), onSelect: () => { void duplicateSelection(node); } },
    { id: "slot-move-up", label: "Move up", icon: "icon-arrow-up-line", disabled: moveOff !== null || !moves.prev, caption: moveOff !== null ? reasonFor(moveOff) : !moves.prev ? "Already the first layer" : undefined, onSelect: () => { void moveSelection(node, "prev"); } },
    { id: "slot-move-down", label: "Move down", icon: "icon-arrow-down-line", disabled: moveOff !== null || !moves.next, caption: moveOff !== null ? reasonFor(moveOff) : !moves.next ? "Already the last layer" : undefined, onSelect: () => { void moveSelection(node, "next"); } },
  ];
  // After the items above it: a shared reason goes to the first item it disables.
  const clear: MenuItemData[] = only ? [{
    id: "slot-clear",
    label: "Clear slot contents",
    icon: "icon-trash-line",
    danger: true,
    disabled: refusal !== null || !actions || actions.clearBlock !== null,
    // What goes, counted as the inspector's block caption counts: "Content · Stack with 3 layers", "Content · 2 layers".
    caption: slotCaption(actions?.clearBlock, () => (loaded?.element ? `${only.name} · ${clearedText(slotContentOf(loaded.element, only), loaded.frameLayers)}` : "")),
    onSelect: () => { void clearSlot(node, only); },
  }] : [];
  const trailing: MenuEntry[] = [
    { type: "separator", id: "slot-separator" },
    ...clear,
    { id: "slot-remove", label: "Remove", icon: "icon-trash-line", shortcut: removeShortcut, danger: true, disabled: removeOff !== null, caption: reasonFor(removeOff), onSelect: () => { void removeSelection(node); } },
  ];
  return { leading, trailing };
}
