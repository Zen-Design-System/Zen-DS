import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { contentToneGroups, contentToneVar, type ContentTone } from "../../../components/_shared/contentTone";
import { radiusValue, type ZenCornerRadius } from "../../../components/_shared/scale";
import { applyEdit, parseSrc, studioApi, subscribeStudioWrites, type DetachPlanReply, type DetachSlot } from "../api";
import { canvasApi } from "../canvas/viewport";
import { findBySrc, srcOf, type Fiber, type FiberHit } from "../select/picker";
import { expectRender, mapSrc, renderedNow, sameSelectedElement, type RenderWaitEnd } from "../select/remap";
import { tokenPx } from "../select/spacing";
import { canEdit, flushStudioStore, studioStore } from "../store";
import type { DetachPlan, EditResponse, SourceElement, StudioSelection } from "../types";
import { detachableList, isDetachableType } from "../detachable";
import { colorTokensFor, matchingTextStyles, textHost, textStylesOf } from "./partInfo";
import { inspectorStatus, saveShortcut, undoShortcut } from "./status";

/*
 * Detach component (Figma's Detach instance, ⌥⌘B): a presentational Zen component instance becomes Zen primitives
 * (Box/Stack/Text… with token props) in the source, through one POST /edit op "detach" (one undo record). The dev
 * server owns the recipes (tools/studio/detach.mjs) and says what it can detach (GET /detach-plan); the client measures
 * the plan's slots on the rendered instance (token keys, text styles, tones), confirms a row inside a .map, sends the
 * edit and moves the selection to the new root element.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
/** "⌥⌘B" on Apple platforms, "Ctrl+Alt+B" elsewhere. */
export const detachShortcut = isMac ? "⌥⌘B" : "Ctrl+Alt+B";
/** For aria-keyshortcuts. */
export const detachKeys = isMac ? "Alt+Meta+B" : "Control+Alt+B";

/**
 * The detach output and the layout primitives: they are the frames a detach produces, not instances, so the inspector
 * offers no Detach for them (host elements neither).
 */
const primitiveNames = new Set(["Box", "Stack", "Grid", "Text", "Heading", "Container"]);

/** Whether the inspector offers Detach for an element of this name (a Zen component that is not a layout primitive). */
export const offersDetach = (name: string) => /^[A-Z]/.test(name) && !name.includes(".") && !primitiveNames.has(name);

/* ───────────── Measuring the plan's slots on the rendered instance ───────────── */

let probe: HTMLElement | null = null;

/** A resolved length ("16px", "calc(…)") in CSS px. */
function lengthPx(value: string): number | null {
  const text = value.trim();
  const plain = /^(-?\d*\.?\d+)px$/.exec(text);
  if (plain) return Number(plain[1]);
  if (text === "0") return 0;
  if (!text || typeof document === "undefined") return null;
  if (!probe) {
    probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;top:0;left:0;height:0;";
  }
  if (!probe.isConnected) document.body.append(probe);
  probe.style.width = text;
  const width = parseFloat(getComputedStyle(probe).width);
  return Number.isFinite(width) ? width : null;
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.5;

/** The slot's element: the instance root for "", ":scope" or "&", else the first match on or inside a root DOM node. */
function slotElement(hosts: Element[], selector: string): Element | null {
  const wanted = selector.trim();
  for (const host of hosts) {
    if (!wanted || wanted === ":scope" || wanted === "&") return host;
    try {
      if (host.matches(wanted)) return host;
      const found = host.querySelector(wanted);
      if (found) return found;
    } catch {
      return null;
    }
  }
  return null;
}

const gapKeys = ["none", "3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "giant", "xgiant", "2xgiant"];
const paddingKeys = ["none", "3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];
const radiusKeys: ZenCornerRadius[] = ["none", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "full"];

/**
 * The one key whose token measures `px` here ("none" measures 0). Null when no key does, and when several do: a preview
 * mode can give several steps one length (Luxury: every radius 2px), so the length cannot tell which step the instance
 * uses, and the recipe's default (the component's own step) stays.
 */
function onlyKey(keys: readonly string[], px: number, measure: (key: string) => number | null): string | null {
  const matches = keys.filter((key) => {
    const value = key === "none" ? 0 : measure(key);
    return value !== null && near(value, px);
  });
  return matches.length === 1 ? matches[0] : null;
}

/** A Spacing/Gap or Spacing/Padding key for `px` on `element` (see onlyKey). */
const spacingKey = (element: Element, scale: "gap" | "padding", px: number) =>
  onlyKey(scale === "gap" ? gapKeys : paddingKeys, px, (key) => tokenPx(element, scale, key));

/**
 * Rows ruled apart with no gap (DescriptionList divider): each rule has the rows' padding on both sides, which a
 * Stack's gap around a Divider gives back. The padding above the second row's rule, when the first row has the same
 * below it; else null.
 */
function ruledRowPadding(element: Element): number | null {
  const [first, second] = Array.from(element.children);
  if (!first || !second) return null;
  const firstStyle = getComputedStyle(first);
  const secondStyle = getComputedStyle(second);
  const rule = parseFloat(secondStyle.borderTopWidth) || 0;
  const above = parseFloat(secondStyle.paddingTop) || 0;
  const below = parseFloat(firstStyle.paddingBottom) || 0;
  return rule > 0 && above > 0 && near(above, below) ? above : null;
}

/**
 * The gap between the element's items as a Spacing/Gap key ("none" for 0); null when it is not a flex or grid box. A
 * grid's row gap (the Stack it becomes stacks its rows), a flex box's gap along its direction: never the other axis.
 */
function gapKey(element: Element): string | null {
  const style = getComputedStyle(element);
  if (!/flex|grid/.test(style.display)) return null;
  const read = (value: string) => (value === "normal" ? 0 : parseFloat(value) || 0);
  const grid = !style.display.includes("flex");
  const px = grid || style.flexDirection.startsWith("column") ? read(style.rowGap) : read(style.columnGap);
  return spacingKey(element, "gap", px || (ruledRowPadding(element) ?? 0));
}

type Side = "top" | "right" | "bottom" | "left";

/** The padding of `sides` as a Spacing/Padding key when they are equal ("none" for 0), else null. */
function paddingKey(element: Element, sides: Side[]): string | null {
  const style = getComputedStyle(element);
  const values = sides.map((side) => parseFloat(style.getPropertyValue(`padding-${side}`)) || 0);
  if (values.some((value) => !near(value, values[0]))) return null;
  return spacingKey(element, "padding", values[0]);
}

/** The corner radius as a Corner-Radius key (the radius mode it renders in), "none" for 0 (see onlyKey). */
function radiusKey(element: Element): string | null {
  const style = getComputedStyle(element);
  const px = parseFloat(style.borderTopLeftRadius) || 0;
  return onlyKey(radiusKeys, px, (key) => {
    const variable = /var\((--[\w-]+)\)/.exec(radiusValue(key as ZenCornerRadius) ?? "")?.[1];
    return variable ? lengthPx(style.getPropertyValue(variable)) : null;
  });
}

/** The text style the element's text renders with: its text-style class (or an ancestor's inside the instance), else
 * the style whose size, line height and weight match. (Starters read it too: builder/starters/hostLayout.ts.) */
export function textStyleKey(element: Element, root: Element): string | null {
  const holder = textHost(element) ?? element;
  return textStylesOf(holder, root).names[0] ?? matchingTextStyles(holder)[0] ?? null;
}

/** Content tokens → the Text tone that paints with them (_shared/content-tone.css): every resting Color/Content token. */
const toneOrder: string[] = contentToneGroups.flatMap(({ tones }) => tones);
const toneByToken: Record<string, string> = Object.fromEntries(toneOrder.map((tone) => [contentToneVar(tone as ContentTone), tone]).filter(([token]) => token));

/** The Text tone whose colour the element's text renders in, or null. */
export function toneKey(element: Element): string | null {
  const holder = textHost(element) ?? element;
  const tokens = colorTokensFor(holder, getComputedStyle(holder).color, "content");
  // Two tokens can share a colour (a Support step and a status family): the earlier group wins (Neutral first).
  const tones = tokens.map((token) => toneByToken[token]).filter(Boolean);
  return tones.sort((a, b) => toneOrder.indexOf(a) - toneOrder.indexOf(b))[0] ?? null;
}

/** The slot's measured values: `key` → token key. A padding whose sides differ per axis (CSS keyed on a class, e.g.
 * `padding: 4px 0`) gives `<key>X` and `<key>Y` instead of `<key>`. */
function measureSlot(slot: DetachSlot, element: Element, root: Element): Array<[string, string | null]> {
  switch (slot.kind) {
    case "gap": return [[slot.key, gapKey(element)]];
    case "padding": {
      const all = paddingKey(element, ["top", "right", "bottom", "left"]);
      if (all) return [[slot.key, all]];
      return [[`${slot.key}X`, paddingKey(element, ["left", "right"])], [`${slot.key}Y`, paddingKey(element, ["top", "bottom"])]];
    }
    case "paddingX": return [[slot.key, paddingKey(element, ["left", "right"])]];
    case "paddingY": return [[slot.key, paddingKey(element, ["top", "bottom"])]];
    case "radius": return [[slot.key, radiusKey(element)]];
    case "textStyle": return [[slot.key, textStyleKey(element, root)]];
    case "tone": return [[slot.key, toneKey(element)]];
    default: return [];
  }
}

/** Reads the plan's slots on the rendered instance (its root DOM nodes). Slots that are missing or match no single
 * token are left out: the recipe falls back to the component's defaults for them. */
export function measureSlots(slots: DetachSlot[], hosts: Element[]): Record<string, string> {
  const measured: Record<string, string> = {};
  for (const slot of slots) {
    const element = slotElement(hosts, slot.selector);
    if (!element) continue;
    const root = hosts.find((host) => host.contains(element)) ?? element;
    try {
      for (const [key, value] of measureSlot(slot, element, root)) if (value) measured[key] = value;
    } catch {
      // A node the browser cannot measure: the recipe's default.
    }
  }
  return measured;
}

/* ───────────── Rows of a .map ───────────── */

/* React keeps a fiber's key, its index among the children it was reconciled with, and (in development) the component
 * whose render created its element. */
type ListFiber = Fiber & { key?: string | null; index?: number; _debugOwner?: unknown };
const FRAGMENT = 7;
const sameFiber = (a: unknown, b: unknown) => a === b || Boolean(a && b && (a as Fiber).alternate === b);
const frameOfHit = (hit: FiberHit) => hit.hosts[0]?.closest("[data-studio-frame]") ?? null;

/**
 * The element the `.map` callback returned for this instance: the nearest keyed element at or above it that the same
 * render wrote (the same owner component, in this file; or a keyed Fragment), else the instance itself.
 */
function rowRootOf(hit: FiberHit, file: string): ListFiber | null {
  const start = hit.fiber as ListFiber | undefined;
  if (!start) return null;
  const owned = "_debugOwner" in start;
  const frame = frameOfHit(hit);
  for (let current: ListFiber | null = start, guard = 0; current && guard < 4000; current = current.return as ListFiber | null, guard++) {
    // Never above the frame: a key there belongs to the Studio, not to the example's list.
    if (frame && current.stateNode === frame) break;
    if (current.key === null || current.key === undefined) continue;
    const src = srcOf(current);
    if (src ? !src.startsWith(`${file}:`) : current.tag !== FRAGMENT) continue;
    // A Fragment may carry no owner; any other keyed element must come from the same render as the instance.
    if (owned && !sameFiber(current._debugOwner, start._debugOwner) && !(current.tag === FRAGMENT && !current._debugOwner)) continue;
    return current;
  }
  return start;
}

type MapList = { parent: Fiber | null; rows: Array<{ hit: FiberHit; index: number }> };

/** The rendered instances grouped by the `.map` call result they belong to (the children of one fiber), in document order. */
function mapLists(hits: FiberHit[], file: string): MapList[] {
  const lists: MapList[] = [];
  for (const hit of hits) {
    const root = rowRootOf(hit, file);
    const parent = root?.return ?? null;
    const index = typeof root?.index === "number" ? root.index : -1;
    const list = parent ? lists.find((candidate) => sameFiber(candidate.parent, parent)) : undefined;
    if (list) list.rows.push({ hit, index });
    else lists.push({ parent, rows: [{ hit, index }] });
  }
  // React internals without an index: the position in the list.
  for (const list of lists) list.rows.forEach((row, position) => { if (row.index < 0) row.index = position; });
  return lists;
}

export type DetachRow = { row: number; count: number; group: number };

/**
 * Which row of its `.map` list the selected instance is (the `index` the detach compares with), how many rows the list
 * renders, and `group`: how many lists before it (other frames) have that row too, which is the instance its detached
 * root becomes. A reason instead when the list renders in several places in the frame (the map runs inside another
 * map, a render prop or a component rendered twice): the same index would detach a row in each of them.
 */
export function rowOf(selection: NodeSelection): DetachRow | { reason: string } | null {
  const world = canvasApi.getWorldElement();
  const parsed = parseSrc(selection.src);
  if (!world || !parsed) return null;
  const hits = findBySrc(world, selection.src);
  const hit = hits[selection.instance] ?? hits[0];
  if (!hit) return null;
  const lists = mapLists(hits, parsed.file);
  const list = lists.find((candidate) => candidate.rows.some((row) => row.hit === hit));
  if (!list) return null;
  const frame = frameOfHit(hit);
  const places = lists.filter((candidate) => frameOfHit(candidate.rows[0].hit) === frame).length;
  if (places > 1) return { reason: `This list repeats in ${places} places; detaching a row would change each of them` };
  const row = list.rows.find((candidate) => candidate.hit === hit)!.index;
  const before = lists.slice(0, lists.indexOf(list)).filter((candidate) => candidate.rows.some((other) => other.index === row)).length;
  return { row, count: Math.max(list.rows.length, row + 1), group: before };
}

/** How many times the selected JSX element renders in its frame (0 when it is not rendered): the dev server refuses
 * one that renders several times outside a .map callback. */
export function renderCount(selection: NodeSelection): number {
  const world = canvasApi.getWorldElement();
  if (!world) return 0;
  const hits = findBySrc(world, selection.src);
  const selected = hits[selection.instance] ?? hits[0];
  if (!selected) return 0;
  const frame = frameOfHit(selected);
  return hits.filter((hit) => frameOfHit(hit) === frame).length;
}

/** The dev server's plan, refused here when it detaches a `.map` row of a list that renders in several places. */
export function withRowCheck(reply: DetachPlanReply, selection: NodeSelection): DetachPlanReply {
  if (!reply.ok || !reply.repeated) return reply;
  const rows = rowOf(selection);
  return rows && "reason" in rows ? { ok: false, reason: rows.reason } : reply;
}

/* ───────────── Plan per selected element ───────────── */

export type DetachAvailability =
  | { state: "loading" }
  | { state: "ready"; plan: Extract<DetachPlan, { ok: true }> }
  | { state: "refused"; reason: string; unavailable?: boolean };

/** Whether the inspector offers Detach for this selection (a detachable type, not a part, its source readable). Types
 * that can never detach show no Detach at all; ⌥⌘B on them still explains itself in the status line. */
export const detachShown = (element: SourceElement | null | undefined, selection: NodeSelection) =>
  isDetachableType(element?.name ?? selection.name) && !selection.part && element !== null;

/** A refusal cut to its first clause for a caption ("Its layout comes from {layout}; set a fixed…" → "Its layout comes
 * from {layout}"). */
export { shortReason } from "../detachable";

/**
 * The dev server's plan for the element the inspector shows, read again whenever its source is read again. A `.map`
 * row whose list renders in several places in the frame is refused here (see rowOf).
 */
export function useDetachPlan(element: SourceElement | null | undefined, selection: NodeSelection, enabled: boolean): DetachAvailability {
  const [reply, setReply] = useState<{ key: string; value: DetachPlanReply } | null>(null);
  const key = element ? `${element.file}:${element.loc}:${element.name}:${element.hash}` : "";
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  useEffect(() => {
    if (!element || !enabled) return undefined;
    let alive = true;
    const instances = renderCount(selectionRef.current) || undefined;
    void studioApi.detachPlan(element.file, element.loc, element.name, instances).then((value) => { if (alive) setReply({ key, value: withRowCheck(value, selectionRef.current) }); });
    return () => { alive = false; };
    // The key covers the element's location, name and file hash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  if (!element || !reply || reply.key !== key) return { state: "loading" };
  const value = reply.value;
  if (value.ok) return { state: "ready", plan: value };
  return { state: "refused", reason: value.reason, unavailable: "unavailable" in value ? value.unavailable : undefined };
}

/* ───────────── Running state and the row confirmation (DetachDialog) ───────────── */

export type DetachConfirm = { component: string; row: number; count: number };

let running = false;
let confirm: (DetachConfirm & { resolve: (ok: boolean) => void }) | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** True while a detach is being checked, confirmed or written. */
export const useDetachRunning = () => useSyncExternalStore(subscribe, () => running, () => false);

/** The pending "Detach only this row?" question, or null. */
export const useDetachConfirm = () => useSyncExternalStore(subscribe, () => confirm, () => null);

/** Answers the pending row confirmation. */
export function answerDetachConfirm(ok: boolean) {
  const pending = confirm;
  if (!pending) return;
  confirm = null;
  notify();
  pending.resolve(ok);
}

function askRow(question: DetachConfirm): Promise<boolean> {
  confirm?.resolve(false);
  return new Promise((resolve) => {
    confirm = { ...question, resolve };
    notify();
  });
}

/* ───────────── Undo / redo keep the selection on the right element ───────────── */

/*
 * The last detach: a fingerprint of the file text right after it, the selection it replaced and the one it made. Kept in
 * sessionStorage, since a source edit may make Vite reload the page before the person presses ⌘Z.
 */
type LastDetach = { file: string; size: number; hash: string; original: NodeSelection; detached: NodeSelection };
const LAST_KEY = "zen-studio:last-detach";
/** The detach status line, carried over a full reload that follows the write. */
const STATUS_KEY = "zen-studio:detach-status";

/** FNV-1a of a text (a fingerprint, not security). */
function fingerprint(text: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

function readSession<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeSession(key: string, value: unknown) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full quota: undo still restores the source, the selection may not follow.
  }
}

let lastDetach: LastDetach | null = typeof window === "undefined" ? null : readSession<LastDetach>(LAST_KEY);
if (lastDetach && (typeof lastDetach.file !== "string" || lastDetach.original?.kind !== "node" || lastDetach.detached?.kind !== "node")) lastDetach = null;

// The page reloaded right after a detach: show its outcome again.
if (typeof window !== "undefined") {
  const carried = readSession<{ text: string; at: number }>(STATUS_KEY);
  writeSession(STATUS_KEY, null);
  if (carried && typeof carried.text === "string" && Date.now() - carried.at < 10_000) inspectorStatus.set("positive", carried.text);
}

const unsubscribe = subscribeStudioWrites((write) => {
  const last = lastDetach;
  if (!last || write.file !== last.file) return;
  const matches = (text: string) => text.length === last.size && fingerprint(text) === last.hash;
  const undo = write.kind === "undo" && matches(write.before);
  const redo = write.kind === "redo" && matches(write.after);
  if (!undo && !redo) return;
  // What the canvas shows now is the render before this write (read synchronously, before Vite applies it).
  const before = renderedNow(canvasApi.getWorldElement());
  // After every other write listener (the selection remap): undo gives the original component back byte for byte, so
  // it is selected again; redo selects the detached root again.
  queueMicrotask(() => {
    const current = studioStore.getState().selection;
    const from = undo ? last.detached : last.original;
    // The same object (moved by the remap), or the same element read back from the session after a reload.
    const same = sameSelectedElement(from, current) || (current?.kind === "node" && !current.part && current.name === from.name
      && current.instance === from.instance && (current.src === from.src || current.src === mapSrc(from.src, write)));
    if (!same) return;
    const next = undo ? last.original : last.detached;
    // The element it names renders only after Vite applied the write: the canvas waits for it (never drops it).
    expectRender(next, before, () => undefined);
    studioStore.setState({ selection: next });
    flushStudioStore();
  });
});
import.meta.hot?.dispose(unsubscribe);

/* ───────────── The action ───────────── */

/** The tag name of the JSX element whose opening tag starts at `loc` ("line:column", column 0-based) in `text`. */
function tagAt(text: string, loc: string): string | null {
  const [line, column] = loc.split(":").map(Number);
  const source = text.split("\n")[line - 1];
  return source === undefined ? null : /^<([A-Za-z_$][\w$.]*)/.exec(source.slice(column))?.[1] ?? null;
}

const fail = (text: string) => inspectorStatus.set("negative", text);

/** "Detached Card · ⌘Z to undo", then the snippet note and what the primitives only approximate. */
function outcomeOf(component: string, response: Extract<EditResponse, { ok: true }>): string {
  const approximations = response.detached?.approximations ?? [];
  const snippet = response.snippet && !response.snippet.synced ? `Snippet not updated${response.snippet.reason ? `: ${response.snippet.reason}` : ""}` : null;
  return [
    `Detached ${component}`,
    // On a drafts server the detach is a draft until Save.
    response.draft ? `Draft · ${saveShortcut} to save` : `${undoShortcut} to undo`,
    snippet,
    approximations.length ? `Approximated: ${approximations.join("; ")}` : null,
  ].filter(Boolean).join(" · ");
}

/**
 * Detaches the selected component instance: checks it (GET /detach-plan), asks before detaching one row of a `.map`,
 * measures the plan's slots, sends the "detach" edit (one undo record) and selects the new root element once the canvas
 * renders it; the outcome shows then.
 */
export async function detachSelection(selection: NodeSelection): Promise<boolean> {
  if (running) return false;
  const state = studioStore.getState();
  if (!canEdit(state)) {
    fail(state.role === "admin" ? "Detaching needs the Studio dev server" : "View only — switch to Admin to edit");
    return false;
  }
  if (selection.part) {
    fail("Parts are read-only — select the component itself to detach it");
    return false;
  }
  const parsed = parseSrc(selection.src);
  if (!parsed) return false;
  running = true;
  notify();
  try {
    const element = await studioApi.element(parsed.file, parsed.loc);
    if (!element) {
      fail(`${selection.name} is no longer at ${parsed.file.split("/").pop()}:${parsed.line} — select it again`);
      return false;
    }
    if (!/^[A-Z]/.test(element.name) || primitiveNames.has(element.name)) {
      fail(`${element.name} is already plain markup — only Zen components detach.`);
      return false;
    }
    if (!isDetachableType(element.name)) {
      fail(`${element.name} can't be detached. Detach works on ${detachableList()}.`);
      return false;
    }
    const plan = withRowCheck(await studioApi.detachPlan(parsed.file, parsed.loc, element.name, renderCount(selection) || undefined), selection);
    if (!plan.ok) {
      fail(plan.reason);
      return false;
    }
    const world = canvasApi.getWorldElement();
    const hits = world ? findBySrc(world, selection.src) : [];
    const hit = hits[selection.instance] ?? hits[0] ?? null;
    if (!hit) {
      fail(`${plan.component} is not rendered right now — nothing to measure`);
      return false;
    }
    const rows = plan.repeated ? rowOf(selection) : null;
    if (plan.repeated) {
      if (!rows || "reason" in rows) {
        fail(rows ? rows.reason : `${plan.component} is not rendered right now — nothing to measure`);
        return false;
      }
      if (!(await askRow({ component: plan.component, row: rows.row, count: rows.count }))) return false;
    }
    const measured = measureSlots(plan.slots, hit.hosts.filter((host) => host.isConnected));
    // Everything on the canvas before the write: the detached root is a new element, never one of these.
    const before = renderedNow(world);
    const response = await applyEdit(
      { file: parsed.file, loc: parsed.loc, name: element.name, ops: [{ op: "detach", measured, ...(rows && !("reason" in rows) ? { instance: rows.row } : {}) }], hash: element.hash },
      `Detach ${plan.component}`,
    );
    if (!response.ok) {
      // The edit status already shows the server's reason; a server without the op needs a restart.
      if (/Unknown op "detach"/.test(response.error)) fail("Restart the dev server to detach components");
      return false;
    }
    if (response.before === response.after) return false;
    const outcome = outcomeOf(plan.component, response);
    const show = (end: RenderWaitEnd) => {
      writeSession(STATUS_KEY, null);
      // A later write's wait (an undo) replaced this one: its own status stands.
      if (end !== "replaced") inspectorStatus.set("positive", outcome);
    };
    // Shown at once too: the selection may not follow (another pick meanwhile, no detached root reported).
    inspectorStatus.set("positive", outcome);
    // Carried over a full reload that may follow the write.
    writeSession(STATUS_KEY, { text: outcome, at: Date.now() });
    if (response.detached) {
      // Synchronously (no request in between): Vite may reload the page as soon as it sees the write.
      const detached: NodeSelection = {
        kind: "node",
        src: `${response.file}:${response.detached.loc}`,
        name: tagAt(response.after, response.detached.loc) ?? "Stack",
        frameId: selection.frameId,
        panelId: selection.panelId,
        // A detached row renders once per list: its instance is the number of lists before it that have that row.
        instance: rows && !("reason" in rows) ? rows.group : selection.instance,
      };
      lastDetach = { file: response.file, size: response.after.length, hash: fingerprint(response.after), original: selection, detached };
      writeSession(LAST_KEY, lastDetach);
      // Only when the person has not picked something else meanwhile. The canvas keeps the selection until the
      // re-render shows the detached root, then the outcome shows again (after the selection moved).
      if (sameSelectedElement(selection, studioStore.getState().selection)) {
        expectRender(detached, before, show);
        studioStore.setState({ selection: detached });
        flushStudioStore();
      }
    }
    return true;
  } finally {
    running = false;
    notify();
  }
}
