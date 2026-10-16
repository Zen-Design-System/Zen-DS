import type { MenuItemData } from "../../../components/Menu";
import { screenLayout } from "../../../../tools/studio/screen-chrome.mjs";
import { HIDDEN_PROP, HIDDEN_SLOTS_PROP, hiddenOn, hiddenSlotsOf, hiddenValueOf, type HiddenValue } from "../../../../tools/studio/visibility.mjs";
import { applyEdit, parseSrc } from "../api";
import type { PageChild, PageNode } from "../builder/render/renderPage";
import { modKey } from "../shell/modKey";
import { canEdit } from "../store";
import type { EditOp, StudioSelection } from "../types";

/*
 * Hide and show layers on a page made in the Studio (user, 2026-10-16: "Không tắt ẩn các element như trong Figma được";
 * the model is tools/studio/visibility.mjs). A hidden layer stays in the page: the canvas does not draw it, Layers lists
 * it dimmed (from the page's tree, since nothing is drawn: hiddenLayersOf), ⇧⌘H or the eye shows it again. A layer can
 * also be hidden on one layout only (Hide on mobile / desktop), which the phone or desktop Screen then leaves out.
 */

export const hideShortcut = `⇧${modKey}H`;

/** A layer with a `hidden` prop: where it sits, so Layers can list it where it would be drawn. */
export type HiddenLayer = {
  /** "file:line:col" */
  src: string;
  name: string;
  value: HiddenValue;
  /** The frame it is in ("screen:home", "overlay:sheet"), as data-studio-frame says. */
  frameId: string;
  /** Not drawn in its frame (hidden there); a layer hidden on the other layout is drawn and only marked. */
  drawn: boolean;
  /** Its element ancestors, nearest first ("file:line:col"): Layers puts it under the first one it lists. */
  ancestors: string[];
  /** The slot prop it is in (`headerActions`), when it sits in a prop. */
  prop?: string;
  /** The element drawn before it in the same parent (and prop), if any. */
  after: string | null;
};

const LOCAL_PAGE = /^local:/;
const hiddenByFile = new Map<string, HiddenLayer[]>();
const listeners = new Set<() => void>();

/** The hidden layers of a page's tree (BuilderBoard, in the render that shows that text). */
export function setHiddenLayers(file: string, tree: { board: PageNode | null } | null) {
  const list: HiddenLayer[] = [];
  const frames = tree?.board?.children.filter((child): child is PageNode => child.kind === "element") ?? [];
  for (const frame of frames) {
    const literal = (name: string) => { const value = frame.props[name]; return value?.kind === "literal" ? value.value : undefined; };
    const id = String(literal("id") ?? "untitled");
    const state = literal("state");
    const frameId = frame.name === "Overlay" ? `overlay:${id}` : `screen:${id}${typeof state === "string" ? `:${state}` : ""}`;
    const layout = frame.name === "Screen" ? screenLayout(String(literal("device") ?? "desktop"), literal("layout") as string | undefined) as "mobile" | "desktop" : undefined;
    const src = (node: PageNode) => `${file}:${node.loc}`;
    const visitChildren = (children: PageChild[], ancestors: string[], prop?: string) => {
      let after: string | null = null;
      for (const child of children) {
        const node = child.kind === "element" ? child : child.kind === "map" ? child.node : null;
        if (!node) continue;
        visit(node, ancestors, prop, after);
        after = src(node);
      }
    };
    const visit = (node: PageNode, ancestors: string[], prop: string | undefined, after: string | null) => {
      const value = hiddenValueOf(node.props[HIDDEN_PROP]);
      if (value !== null) list.push({ src: src(node), name: node.name, value, frameId, drawn: !hiddenOn(value, layout), ancestors, prop, after });
      const inner = [src(node), ...ancestors];
      for (const [name, entry] of Object.entries(node.props)) {
        if (entry.kind === "element") visit(entry.node, inner, name, null);
        else if (entry.kind === "fragment") visitChildren(entry.children, inner, name);
      }
      visitChildren(node.children, inner);
    };
    visitChildren(frame.children, [src(frame)]);
    for (const [name, entry] of Object.entries(frame.props)) if (entry.kind === "element") visit(entry.node, [src(frame)], name, null);
  }
  const before = JSON.stringify(hiddenByFile.get(file) ?? []);
  hiddenByFile.set(file, list);
  // Called while BuilderBoard renders: listeners hear it after that render.
  if (before !== JSON.stringify(list)) queueMicrotask(() => listeners.forEach((listener) => listener()));
}

export function hiddenLayersOf(file: string): readonly HiddenLayer[] {
  return hiddenByFile.get(file) ?? [];
}

/** Every hidden layer (all pages), for Layers, which lists the open page's. */
export function allHiddenLayers(): HiddenLayer[] {
  return [...hiddenByFile.values()].flat();
}

export function subscribeHiddenLayers(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The `hidden` value a layer has now (null: visible everywhere). */
export function hiddenValueAt(src: string): HiddenValue | null {
  for (const layers of hiddenByFile.values()) {
    const found = layers.find((layer) => layer.src === src);
    if (found) return found.value;
  }
  return null;
}

/** Whether a layer ("file:line:col") is on a page made in the Studio, which takes `hidden` (examples and templates are code). */
export function canHideSrc(src: string): boolean {
  const parsed = parseSrc(src);
  return Boolean(parsed && LOCAL_PAGE.test(parsed.file));
}

/** Whether the selection is one layer of a page made in the Studio. */
export function canHide(selection: StudioSelection | null | undefined): selection is Extract<StudioSelection, { kind: "node" }> {
  return selection?.kind === "node" && !selection.part && canHideSrc(selection.src);
}

const LABEL = { show: "Show layer", hide: "Hide layer", mobile: "Hide on mobile", desktop: "Hide on desktop" } as const;

/** Sets a layer's `hidden` (null shows it on every layout): one edit, one ⌘Z. */
export async function setLayerHidden(src: string, name: string, value: HiddenValue | null) {
  const parsed = parseSrc(src);
  if (!parsed || !LOCAL_PAGE.test(parsed.file) || !canEdit()) return false;
  const op: EditOp = value === null ? { op: "removeProp", name: HIDDEN_PROP } : { op: "setProp", name: HIDDEN_PROP, value: value === true ? { kind: "boolean", value: true } : { kind: "string", value } };
  const label = value === null ? LABEL.show : value === true ? LABEL.hide : LABEL[value];
  const response = await applyEdit({ file: parsed.file, loc: parsed.loc, name, ops: [op] }, `${label} · ${name}`);
  return Boolean(response.ok);
}

/** ⇧⌘H / the eye: hidden → shown on every layout; shown (or hidden on one layout) → hidden. */
export function toggleLayerHidden(src: string, name: string) {
  return setLayerHidden(src, name, hiddenValueAt(src) === true ? null : true);
}

/** The layer menu's visibility items (Figma's Show/Hide, plus one layout only). */
export function visibilityMenuItems(selection: StudioSelection | null | undefined): MenuItemData[] {
  if (!canHide(selection)) return [];
  const current = hiddenValueAt(selection.src);
  const off = canEdit() ? undefined : "View only — switch to Admin to edit";
  const set = (value: HiddenValue | null) => () => { void setLayerHidden(selection.src, selection.name, value); };
  return [
    { id: "visibility-toggle", label: current === true ? LABEL.show : LABEL.hide, icon: current === true ? "icon-eye-line" : "icon-eye-off-line", shortcut: hideShortcut, disabled: Boolean(off), caption: off, onSelect: set(current === true ? null : true) },
    current === "mobile"
      ? { id: "visibility-mobile", label: "Show on mobile", icon: "icon-mobile-line", disabled: Boolean(off), onSelect: set(null) }
      : { id: "visibility-mobile", label: LABEL.mobile, icon: "icon-mobile-line", disabled: Boolean(off), onSelect: set("mobile") },
    current === "desktop"
      ? { id: "visibility-desktop", label: "Show on desktop", icon: "icon-monitor-01-line", disabled: Boolean(off), onSelect: set(null) }
      : { id: "visibility-desktop", label: LABEL.desktop, icon: "icon-monitor-01-line", disabled: Boolean(off), onSelect: set("desktop") },
  ];
}

/* ── slots switched off (Figma's slot boolean) ──────────────────────────────────────────────────────────────────── */

/** The slot props switched off (`hiddenSlots`), from the Inspector's value of that prop (a literal list, or its code). */
export function slotsOffValue(value: { state: string; value?: unknown; raw?: string; expression?: string } | undefined): string[] {
  if (!value || value.state === "unset") return [];
  if (Array.isArray(value.value)) return hiddenSlotsOf(value.value);
  // A list is an expression (`["trend"]`); `raw` may be the whole attribute: the list is from its first [ to its last ].
  for (const code of [value.expression, value.raw]) {
    if (typeof code !== "string") continue;
    const start = code.indexOf("[");
    const end = code.lastIndexOf("]");
    if (start < 0 || end < start) continue;
    try { return hiddenSlotsOf(JSON.parse(code.slice(start, end + 1))); } catch { /* not a plain list */ }
  }
  return [];
}

/**
 * The op that switches a slot off or on, keeping its layers (Figma's boolean on a slot): `hiddenSlots` gains or loses
 * the prop; null when nothing changes. `current`: the props switched off now.
 */
export function slotSwitchOp(current: readonly string[], prop: string, on: boolean): EditOp | null {
  const next = on ? current.filter((name) => name !== prop) : current.includes(prop) ? null : [...current, prop];
  if (!next) return null;
  if (on && next.length === current.length) return null;
  if (!next.length) return { op: "removeProp", name: HIDDEN_SLOTS_PROP };
  return { op: "setProp", name: HIDDEN_SLOTS_PROP, value: { kind: "expression", code: JSON.stringify(next) } };
}
