import type { MenuEntry } from "../../../components/Menu";
import type { IconName } from "../../../icons/generated/names";
import { BREAKPOINT_ICONS, BREAKPOINT_LABELS, BREAKPOINTS, type ZenBreakpointKey } from "../../../../tools/studio/screen-devices.mjs";
import { applyEdit, parseSrc } from "../api";
import { breakpointOf } from "../select/gridTracks";
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

/** The breakpoint a "hide" item names by default: the one the layer's frame shows, else Mobile (a desktop frame). */
export function hideTarget(selection: Extract<StudioSelection, { kind: "node" }>): ZenBreakpointKey {
  const host = selectedHit(selection)?.hosts[0];
  const shown = host ? breakpointOf(host) : "desktop";
  return shown === "desktop" ? "mobile" : shown;
}

/**
 * The layer menu's Breakpoint group: a Stack, Grid or Box hides (or shows again) on each breakpoint; another layer is
 * wrapped in a Box hidden on the breakpoint its frame shows (Mobile on a desktop frame).
 */
export function hideOnMenuItems(selection: StudioSelection | null | undefined): MenuEntry[] {
  if (selection?.kind !== "node" || selection.part) return [];
  const off = canEdit() ? undefined : "View only";
  const hit = selectedHit(selection);
  if (HIDE_ON_LAYERS.has(selection.name)) {
    const current = hideOnOf(hit?.props.hideOn);
    return [{ type: "group", id: "hide-on", label: "Breakpoint", items: BREAKPOINTS.map((key) => {
      const hidden = current.includes(key);
      return { id: `hide-on-${key}`, label: `${hidden ? "Show" : "Hide"} on ${BREAKPOINT_LABELS[key]}`, icon: BREAKPOINT_ICONS[key] as IconName, disabled: Boolean(off), caption: off, onSelect: () => { void setHideOn(selection.src, selection.name, toggledHideOn(current, key, !hidden)); } };
    }) }];
  }
  const target = hideTarget(selection);
  return [{ type: "group", id: "hide-on", label: "Breakpoint", items: [{
    id: "hide-on-wrap", label: `Wrap in Box and hide on ${BREAKPOINT_LABELS[target]}`, icon: BREAKPOINT_ICONS[target] as IconName, disabled: Boolean(off), caption: off,
    onSelect: () => { const { kind: _kind, part: _part, ...layer } = selection; void wrapInBox(layer, { hideOn: { kind: "expression", code: JSON.stringify([target]) } }, `Wrap ${selection.name} in Box hidden on ${BREAKPOINT_LABELS[target]}`, `${selection.name} wrapped in a Box hidden on ${BREAKPOINT_LABELS[target]}`); },
  }] }];
}
