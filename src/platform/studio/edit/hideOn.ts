import type { MenuEntry } from "../../../components/Menu";
import type { IconName } from "../../../icons/generated/names";
import { BREAKPOINT_ICONS, BREAKPOINT_LABELS, BREAKPOINTS, type ZenBreakpointKey } from "../../../../tools/studio/screen-devices.mjs";
import { applyEdit, parseSrc } from "../api";
import { breakpointOf, primaryBreakpointOf } from "../select/gridTracks";
import { canHideSrc } from "./visibility";
import { wrapInBox } from "../select/wrapSelection";
import { selectedHit } from "../slots/dom";
import { canEdit } from "../store";
import type { EditOp, StudioSelection } from "../types";

/*
 * Hide on <breakpoint> (P2 of docs/research/studio-responsive-breakpoints-2026-10-26.md §4): a Stack, Grid or Box takes
 * the library's `hideOn={["mobile"]}` (display: none at those breakpoints, the element kept, so Layers still lists it);
 * any other layer is wrapped in a Box that hides there (the wrap op, one undo step). From the layer menu (canvas and
 * Layers) and the Inspector's Layout section. Not the Studio-only `hidden="mobile"` (a Screen's layout, edit/visibility.ts).
 */

/** The layers that take `hideOn` themselves (Layout.tsx FrameHideOnProps). */
export const HIDE_ON_LAYERS = new Set(["Stack", "Grid", "Box"]);

const isBreakpoint = (value: unknown): value is ZenBreakpointKey => typeof value === "string" && (BREAKPOINTS as readonly string[]).includes(value);

/** A `hideOn` value as a list of breakpoints (anything else: none). */
export const hideOnOf = (value: unknown): ZenBreakpointKey[] => (Array.isArray(value) ? value.filter(isBreakpoint) : []);

/** The op that writes `list` (widest first; empty: the prop goes). */
export function hideOnOp(list: readonly ZenBreakpointKey[]): EditOp {
  const ordered = BREAKPOINTS.filter((key) => list.includes(key));
  return ordered.length ? { op: "setProp", name: "hideOn", value: { kind: "expression", code: JSON.stringify(ordered) } } : { op: "removeProp", name: "hideOn" };
}

/** `current` with `breakpoint` hidden (`hide`) or shown again. */
export const toggledHideOn = (current: readonly ZenBreakpointKey[], breakpoint: ZenBreakpointKey, hide: boolean): ZenBreakpointKey[] => (hide ? [...new Set([...current, breakpoint])] : current.filter((key) => key !== breakpoint));

/** Writes a Stack, Grid or Box's `hideOn`: one edit, one ⌘Z. */
export async function setHideOn(src: string, name: string, list: readonly ZenBreakpointKey[]): Promise<boolean> {
  const parsed = parseSrc(src);
  if (!parsed || !canEdit()) return false;
  const shown = BREAKPOINTS.filter((key) => list.includes(key)).map((key) => BREAKPOINT_LABELS[key]);
  const response = await applyEdit({ file: parsed.file, loc: parsed.loc, name, ops: [hideOnOp(list)] }, shown.length ? `${name} hidden on ${shown.join(", ")}` : `${name} shown on every breakpoint`);
  return Boolean(response.ok);
}

/** The breakpoint the layer menu's item names: the one the layer's frame shows when it is not the Screen's own, else
 *  Mobile for a web page and Desktop for a phone or tablet Screen. */
export function hideTarget(selection: Extract<StudioSelection, { kind: "node" }>): ZenBreakpointKey {
  const host = selectedHit(selection)?.hosts[0] ?? null;
  const shown = host ? breakpointOf(host) : "desktop";
  const primary = primaryBreakpointOf(host);
  return shown !== primary ? shown : primary === "desktop" ? "mobile" : "desktop";
}

/**
 * The layer menu's Breakpoint item, on a page made in the Studio (one item, so the menu stays on screen): a Stack, Grid
 * or Box hides (or shows again) on the breakpoint its frame shows (hideTarget; the Inspector's Hide on row sets the
 * others); another layer is wrapped in a Box hidden there.
 */
export function hideOnMenuItems(selection: StudioSelection | null | undefined): MenuEntry[] {
  if (selection?.kind !== "node" || selection.part || !canHideSrc(selection.src)) return [];
  const off = canEdit() ? undefined : "View only";
  const target = hideTarget(selection);
  if (HIDE_ON_LAYERS.has(selection.name)) {
    const current = hideOnOf(selectedHit(selection)?.props.hideOn);
    const hidden = current.includes(target);
    return [{ type: "group", id: "hide-on", label: "Breakpoint", items: [{
      id: `hide-on-${target}`, label: `${hidden ? "Show" : "Hide"} on ${BREAKPOINT_LABELS[target]}`, icon: BREAKPOINT_ICONS[target] as IconName, disabled: Boolean(off), caption: off,
      onSelect: () => { void setHideOn(selection.src, selection.name, toggledHideOn(current, target, !hidden)); },
    }] }];
  }
  return [{ type: "group", id: "hide-on", label: "Breakpoint", items: [{
    id: "hide-on-wrap", label: `Wrap in Box and hide on ${BREAKPOINT_LABELS[target]}`, icon: BREAKPOINT_ICONS[target] as IconName, disabled: Boolean(off), caption: off,
    onSelect: () => { const { kind: _kind, part: _part, ...layer } = selection; void wrapInBox(layer, { hideOn: { kind: "expression", code: JSON.stringify([target]) } }, `Wrap ${selection.name} in Box hidden on ${BREAKPOINT_LABELS[target]}`, `${selection.name} wrapped in a Box hidden on ${BREAKPOINT_LABELS[target]}`); },
  }] }];
}
