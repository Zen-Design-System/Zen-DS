import { useEffect, useState, useSyncExternalStore } from "react";
import { plural } from "../../../components/Text";
import { parseSrc, studioApi, subscribeStudioWrites, useStudioServer } from "../api";
import { canvasApi } from "../canvas/viewport";
import { mapLine } from "../code/diff";
import { rowOf } from "../inspector/detach";
import { componentSchema } from "../inspector/propSchema";
import { fileName, inspectorStatus, saveShortcut, undoShortcut } from "../inspector/status";
import { childHits, findBySrc, instanceOf, onSourceUpdate, panelOf, parentHit, rectOf, selectHit, type FiberHit } from "../select/picker";
import { selectPart, withoutPart } from "../select/parts";
import { expectRender, mapSrc, noteEditTarget, remapSelection, renderedNow, sameSelectedElement, type RenderWaitEnd } from "../select/remap";
import { studioDrafts } from "../sourceDrafts";
import { canEdit, flushStudioStore, studioStore } from "../store";
import type { SourceElement, StudioSelection, StudioWrite } from "../types";
import { attributeFormOf, clearCountOf, clearedLayers, formOf, hostLocAfter, lastElementName, locatedElements, onlyFrame, slotContentOf, slotModifiedOf, tagAt, type SlotContent, type SlotLayer, type SlotSourceElement } from "./content";
import { itemParts, renderedSignature, slotGroupsAt, sourceItems, computedCaption } from "./dataItems";
import { itemTitle, type DataSlot } from "./dataSlots";
import { frameElement, hasExtraSelection, hostRootOf, lastHeadingLevel, selectedHit } from "./dom";
import { answeredLoc, isUnknownSlotOp, sendSlotEdit, type InsertChildOp, type ItemEditOp, type SlotEditApplied, type SlotEditOp, type SlotWrap } from "./ops";
import { paletteFor, type PaletteContext, type PaletteHostContext, type PaletteItem } from "./palette";
import { headingLevelFor, hostPropsOf, insertTargetFor, isClickableHost, type ContentSlot, type HostProps } from "./registry";

/*
 * Structural edits of example and template content (spec "Source ops" and "Client"): add a palette item to a content
 * slot, remove, duplicate and move an element, reset a slot to the saved file or clear it (Figma's slot "More actions").
 * Each is one POST /edit op (ops.ts), one undo record, one draft change.
 *
 * Only an example or template instance changes: the main component (src/components/**) is never annotated, and a
 * playground's slots stay empty (the playground shows the main component). Inside a `.map` callback (or a helper
 * rendered several times, in one example or in several) the edit changes every render: SlotConfirm asks first. After the
 * write the selection follows the way Detach and the resize wrap do it: the new element is awaited on the canvas
 * (renderedNow + expectRender), set synchronously and flushed, since Vite may reload the page as soon as it sees the
 * write. Content the canvas cannot find (an overlay's panel renders in a portal) is selected from the source and kept
 * (isOffCanvasSelection). A removal selects the parent read before the write, at its place after it. A move selects the
 * element afresh at its new place. A reset or a clear keeps the host selected, at its new place (its own line and the
 * imports above it change). Undo and redo bring the selection back (a fingerprint of the text after the edit, like
 * Detach).
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;
type Target = { file: string; loc: string; name: string; hash: string };

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
/** "⌘D" on Apple platforms, "Ctrl+D" elsewhere (Figma's Duplicate). */
export const duplicateShortcut = isMac ? "⌘D" : "Ctrl+D";
/** For aria-keyshortcuts. */
export const duplicateKeys = isMac ? "Meta+D" : "Control+D";
/** Delete or Backspace removes the selected layer (Figma). */
export const removeShortcut = isMac ? "⌫" : "Delete";
export const removeKeys = "Delete Backspace";

/* ───────────── Where structural edits are allowed ───────────── */

const EXAMPLE_FILE = /(^|\/)src\/platform\/examples\/pages\/[^/]+\.tsx$/;
const TEMPLATE_FILE = /(^|\/)src\/templates\/.+\.tsx$/;
/** A builder page kept in this browser (Studio builder GĐ2). */
const LOCAL_FILE = /^local:[a-z0-9][a-z0-9-]*\.zen\.tsx$/;

/** An example page or a template: the files whose slot content the Studio adds to, removes and moves. */
export const isSlotFile = (file: string) => EXAMPLE_FILE.test(file) || TEMPLATE_FILE.test(file) || LOCAL_FILE.test(file);
/** Playground files: their branches render the main component, whose slots stay empty (tools/studio/shared-code.mjs). */
const PLAYGROUND_FILE = /(^|\/)src\/platform\/(PlatformExamples|PlatformMobilePlaygrounds)\.tsx$/;
/**
 * Shared demo code (plan WP-B2): another annotated platform file an example renders (PlatformDemoActions.tsx,
 * chatDemo.tsx…). Structural edits there go ahead after "Change shared code?" (the server asks, applyEdit shows it).
 */
export const isSharedFile = (file: string) => /(^|\/)src\/platform\/(?!studio\/).+\.tsx$/.test(file) && !isSlotFile(file) && !PLAYGROUND_FILE.test(file);
export const isTemplateFile = (file: string) => TEMPLATE_FILE.test(file);
/** A playground (its panel, or the playground frame): the main component, whose slots stay empty. */
export const inPlayground = (selection: NodeSelection) => Boolean(selection.panelId) || selection.frameId === "playground";

/**
 * `role`: Viewer; `server`: no dev server, or one still connecting or read-only; `part`: a read-only part; `scope`: not
 * example or template content (a playground, docs, shared code). Role, server and scope refusals hide the controls; the
 * reason shows where asked (the status line for a key).
 */
export type StructuralCheck = { ok: true } | { ok: false; reason: string; kind: "role" | "server" | "part" | "scope" };

/* The dev server as the slot components last rendered it (useSlotServer): the keys run outside React. Null until one
 * renders (then the write itself reports a read-only server). */
let serverNow: { ready: boolean; writable: boolean } | null = null;

/**
 * useStudioServer, also kept for canStructurallyEdit. Kept as it renders (the external store's current snapshot), so a
 * canStructurallyEdit later in the same render already sees it; SlotConfirm, mounted for good, keeps it for the keys.
 */
export function useSlotServer() {
  const server = useStudioServer();
  serverNow = server;
  return server;
}

/** Whether the selection's element can be added to, removed, duplicated or moved from the Studio. */
export function canStructurallyEdit(selection: StudioSelection | null): StructuralCheck {
  if (selection?.kind !== "node") return { ok: false, kind: "scope", reason: "Select a layer first" };
  const state = studioStore.getState();
  if (state.role !== "admin") return { ok: false, kind: "role", reason: "View only — switch to Admin to edit" };
  if (!canEdit(state)) return { ok: false, kind: "server", reason: "Editing needs the Studio dev server" };
  if (serverNow && !serverNow.ready) return { ok: false, kind: "server", reason: "Connecting to the Studio dev server…" };
  if (serverNow && !serverNow.writable) return { ok: false, kind: "server", reason: "Read-only — editing needs the Studio dev server" };
  if (selection.part) return { ok: false, kind: "part", reason: "Parts are read-only — select the component itself" };
  if (inPlayground(selection)) return { ok: false, kind: "scope", reason: "The playground shows the main component, whose slots stay empty — add content in an example" };
  const file = parseSrc(selection.src)?.file ?? "";
  // An example frame, or a Screen / Overlay of a builder page.
  const example = selection.frameId !== null && (/^example:\d+$/.test(selection.frameId) || /^(screen|overlay):/.test(selection.frameId));
  if (!example && !isTemplateFile(file)) return { ok: false, kind: "scope", reason: "Only example and template content changes here" };
  if (!isSlotFile(file) && !isSharedFile(file)) return { ok: false, kind: "scope", reason: `Its code is in ${fileName(file)}, shared beyond this example — change it there` };
  return { ok: true };
}

/* ───────────── Running state and the "all N rows" confirmation (SlotConfirm) ───────────── */

export type SlotConfirmQuestion = {
  verb: "add" | "remove" | "duplicate" | "move" | "clear" | "reset";
  /** What is added ("Button"), the element acted on ("Badge") or the slot reset or cleared ("Content"). */
  name: string;
  count: number;
  /** "rows": a `.map` list; "places": the same JSX rendered several times (a helper used more than once). */
  unit: "rows" | "places";
  /** For an add, a clear or a reset: where ("Card › Content"). */
  where?: string;
};

let running: string | null = null;
let confirm: (SlotConfirmQuestion & { resolve: (ok: boolean) => void }) | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/**
 * "Checking…" while a slot edit is read and confirmed, then "Adding…", "Removing…", "Duplicating…", "Moving…",
 * "Resetting…" or "Clearing…"; else null.
 */
export const useSlotRunning = () => useSyncExternalStore(subscribe, () => running, () => null);
/** The pending "Add to all N rows?" question, or null. */
export const useSlotConfirm = () => useSyncExternalStore(subscribe, () => confirm, () => null);

/** Answers the pending confirmation (SlotConfirm). */
export function answerSlotConfirm(ok: boolean) {
  const pending = confirm;
  if (!pending) return;
  confirm = null;
  notify();
  pending.resolve(ok);
}

function ask(question: SlotConfirmQuestion): Promise<boolean> {
  confirm?.resolve(false);
  return new Promise((resolve) => {
    confirm = { ...question, resolve };
    notify();
  });
}

/** One slot edit at a time: a second press while one runs does nothing. "Checking…" until the write starts. */
async function exclusive(task: () => Promise<boolean>): Promise<boolean> {
  if (running) return false;
  running = "Checking…";
  notify();
  try {
    return await task();
  } finally {
    running = null;
    notify();
  }
}

/** The running state once the write goes out ("Removing…"), after any confirmation. */
function writing(label: string) {
  running = label;
  notify();
}

/**
 * How many times the element renders on the whole canvas (what an edit of its JSX changes: a helper used by several
 * examples changes in each), and whether that is one `.map` list (rows) or several places. Detach counts per frame
 * (detach.ts renderCount); a slot edit never does.
 */
export function repeatsOf(selection: NodeSelection): { count: number; unit: "rows" | "places" } {
  const world = canvasApi.getWorldElement();
  const hits = world ? findBySrc(world, selection.src) : [];
  const count = hits.length;
  if (count <= 1) return { count, unit: "places" };
  const frames = new Set(hits.map((hit) => hit.hosts[0]?.closest("[data-studio-frame]") ?? null));
  if (frames.size > 1) return { count, unit: "places" };
  const row = rowOf(selection);
  return { count, unit: row && !("reason" in row) ? "rows" : "places" };
}

/** Asks first when the edit changes every render of the element; true to go on. */
async function confirmRepeats(selection: NodeSelection, question: Omit<SlotConfirmQuestion, "count" | "unit">) {
  const { count, unit } = repeatsOf(selection);
  return count <= 1 || ask({ ...question, count, unit });
}

/* ───────────── Status line, carried over the full reload a write may cause ───────────── */

const STATUS_KEY = "zen-studio:slots-status";
const LAST_KEY = "zen-studio:last-slot-edit";

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
    // Private mode or a full quota: the status shows until the reload, undo still restores the source.
  }
}

if (typeof window !== "undefined") {
  const carried = readSession<{ text: string; at: number }>(STATUS_KEY);
  writeSession(STATUS_KEY, null);
  if (carried && typeof carried.text === "string" && Date.now() - carried.at < 10_000) inspectorStatus.set("positive", carried.text);
}

const fail = (text: string) => {
  inspectorStatus.set("negative", text);
  return false;
};

/** "Added Button to Card › Content · Draft · ⌘S to save", then a warning and "Example code not updated: …". */
function outcomeOf(text: string, response: SlotEditApplied, warning?: string): string {
  const snippet = response.snippet && !response.snippet.synced ? `Example code not updated${response.snippet.reason ? `: ${response.snippet.reason}` : ""}` : null;
  return [text, response.draft ? `Draft · ${saveShortcut} to save` : `${undoShortcut} to undo`, warning, snippet].filter(Boolean).join(" · ");
}

function announce(text: string) {
  inspectorStatus.set("positive", text);
  writeSession(STATUS_KEY, { text, at: Date.now() });
}

/** Shows the outcome again once the canvas rendered the awaited element (a later write's wait keeps its own status). */
const showWhenRendered = (text: string) => (end: RenderWaitEnd) => {
  writeSession(STATUS_KEY, null);
  if (end !== "replaced") inspectorStatus.set("positive", text);
};

/* ───────────── Undo / redo keep the selection on the right element ───────────── */

/*
 * The last slot edit that moved the selection: a fingerprint of the file text right after it, the selection before and
 * after it, which of the two names an element only the next render shows (an insert's new element on redo, a removed
 * element on undo), and which the canvas cannot find (`away`: an overlay's content, selected from the source). Kept in
 * sessionStorage: a write may reload the page before ⌘Z.
 */
type Sides = { before: boolean; after: boolean };
type LastSlotEdit = { file: string; size: number; hash: string; before: StudioSelection; after: StudioSelection; fresh: Sides; away?: Sides };

/** FNV-1a of a text (a fingerprint, not security). */
function fingerprint(text: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

let lastEdit: LastSlotEdit | null = typeof window === "undefined" ? null : readSession<LastSlotEdit>(LAST_KEY);
if (lastEdit && (typeof lastEdit.file !== "string" || !lastEdit.before?.kind || !lastEdit.after?.kind)) lastEdit = null;

function remember(file: string, after: string, before: StudioSelection, next: StudioSelection, fresh: Sides, away?: Sides) {
  lastEdit = { file, size: after.length, hash: fingerprint(after), before, after: next, fresh, ...(away?.before || away?.after ? { away } : {}) };
  writeSession(LAST_KEY, lastEdit);
}

/** Whether `current` is `from` (moved by writes since, or read back from the session after a reload). */
function stillSelected(from: StudioSelection, current: StudioSelection | null, write: StudioWrite) {
  if (!current) return false;
  if (from.kind === "frame") return current.kind === "frame" && current.frameId === from.frameId;
  return sameSelectedElement(from, current) || (current.kind === "node" && !current.part && current.name === from.name
    && current.instance === from.instance && (current.src === from.src || current.src === mapSrc(from.src, write)));
}

const unsubscribe = subscribeStudioWrites((write) => {
  const last = lastEdit;
  if (!last || write.file !== last.file) return;
  const matches = (text: string) => text.length === last.size && fingerprint(text) === last.hash;
  const undo = write.kind === "undo" && matches(write.before);
  const redo = write.kind === "redo" && matches(write.after);
  if (!undo && !redo) return;
  // What the canvas shows now is the render before this write (read synchronously, before Vite applies it).
  const rendered = renderedNow(canvasApi.getWorldElement());
  // After the other write listeners (the selection remap).
  queueMicrotask(() => {
    if (!stillSelected(undo ? last.after : last.before, studioStore.getState().selection, write)) return;
    const next = undo ? last.before : last.after;
    // Content the canvas cannot find is kept as it is; a new element is awaited (never one of the nodes before).
    if (undo ? last.away?.before : last.away?.after) markOffCanvas(next);
    else if (undo ? last.fresh.before : last.fresh.after) expectRender(next, rendered, () => undefined);
    studioStore.setState({ selection: next });
    flushStudioStore();
  });
});
import.meta.hot?.dispose(unsubscribe);

/* ───────────── Selection helpers ───────────── */

/** The element around the selection on the canvas, read before a write (else its frame, else nothing). */
function parentSelectionOf(selection: NodeSelection): StudioSelection | null {
  const world = canvasApi.getWorldElement();
  const hit = selectedHit(selection, world);
  const frame = frameElement(selection.frameId, world);
  const parent = hit ? parentHit(hit, frame) : null;
  if (parent && parent.hosts.length && (!frame || frame.contains(parent.hosts[0]))) {
    return { kind: "node", src: parent.src, name: parent.name, frameId: selection.frameId, panelId: panelOf(parent.hosts[0]), instance: world ? instanceOf(world, parent) : 0 };
  }
  return selection.frameId ? { kind: "frame", frameId: selection.frameId } : null;
}

/* The last selections made from the source for elements the canvas cannot show (an overlay's content renders in a
 * portal, a closed panel): a row picked in the Slots section, or what an edit there added, duplicated or moved.
 * SelectionLayer keeps them instead of dropping them as lost (integration notes). */
let offCanvas: StudioSelection[] = [];

function markOffCanvas(selection: StudioSelection) {
  offCanvas = [selection, ...offCanvas.filter((other) => other !== selection)].slice(0, 8);
}

/** A selection made from the source for an element that is not on the canvas (or one of those moved by writes since). */
export const isOffCanvasSelection = (selection: StudioSelection | null) => Boolean(selection && offCanvas.some((base) => sameSelectedElement(base, selection)));

/**
 * Whether what goes into the host's slot renders where the canvas finds it. False for an overlay's panel (a portal,
 * which findBySrc never enters), a host that is not rendered (a closed overlay) or one itself inside such content.
 */
function slotOnCanvas(host: NodeSelection, slot: ContentSlot): boolean {
  const hit = selectedHit(host);
  if (!hit || !hit.hosts.length) return false;
  const root = hostRootOf(hit);
  if (!root) return !slot.overlay;
  return hit.hosts.some((node) => node === root || node.contains(root));
}

/** The rendered hit of `src` inside the host instance (a few annotated levels down), else anywhere on the canvas. */
function layerHit(host: NodeSelection, src: string, world: Element): FiberHit | null {
  const start = selectedHit(host, world);
  let level = start ? [start] : [];
  for (let depth = 0; depth < 6 && level.length; depth++) {
    const next = level.flatMap((hit) => childHits(hit));
    const found = next.find((hit) => hit.src === src);
    if (found) return found;
    level = next;
  }
  return findBySrc(world, src)[0] ?? null;
}

/**
 * Selects a layer of a slot by its source location. Not on the canvas (an overlay's content in a portal, a closed
 * panel): it is selected from the source, so the inspector edits it; the canvas outlines it once it renders.
 */
export function selectSlotLayer(host: NodeSelection, src: string, name: string) {
  const world = canvasApi.getWorldElement();
  const hit = world ? layerHit(host, src, world) : null;
  if (hit && hit.hosts.length) {
    selectHit(hit, world);
    const rect = rectOf(hit.hosts);
    if (rect) canvasApi.ensureVisible(rect);
    return;
  }
  const selection: StudioSelection = { kind: "node", src, name, frameId: host.frameId, panelId: host.panelId, instance: 0 };
  markOffCanvas(selection);
  studioStore.setState({ selection });
  inspectorStatus.set("neutral", `${name} is not on the canvas right now; the inspector shows it`);
}

/**
 * The location of a layer known only by name (a prop slot whose elements the server does not list yet): the first
 * element of that name the host renders below the attribute's line, within the host's lines.
 */
export function locateLayer(host: NodeSelection, element: SourceElement, name: string, fromLine: number, skip: ReadonlySet<string> = new Set()): string | null {
  const world = canvasApi.getWorldElement();
  const start = world ? selectedHit(host, world) : null;
  const file = element.file;
  let level = start ? [start] : [];
  for (let depth = 0; depth < 4 && level.length; depth++) {
    const next = level.flatMap((hit) => childHits(hit));
    for (const hit of next) {
      const at = parseSrc(hit.src);
      if (at && at.file === file && hit.name === name && at.line >= fromLine && at.line <= element.endLine && !skip.has(hit.src)) return hit.src;
    }
    level = next;
  }
  return null;
}

/** Previous / next element siblings on the canvas (best effort: the server refuses a move with nothing to pass). */
export function moveAvailability(selection: NodeSelection): { prev: boolean; next: boolean } {
  const world = canvasApi.getWorldElement();
  const hit = selectedHit(selection, world);
  const parent = hit ? parentHit(hit, frameElement(selection.frameId, world)) : null;
  if (!parent) return { prev: true, next: true };
  // One entry per JSX element: the rows of a `.map` share one source location.
  const order = [...new Set(childHits(parent).map((child) => child.src))];
  const index = order.indexOf(selection.src);
  return index < 0 ? { prev: true, next: true } : { prev: index > 0, next: index < order.length - 1 };
}

/* ───────────── What the server refuses to remove, duplicate or move, told before asking ───────────── */

export type StructuralVerb = "remove" | "duplicate" | "move";

/* Answers per selection, until the next write or source update. */
const blocks = new Map<string, Promise<string | null>>();
const forgetBlocks = () => blocks.clear();
const unsubscribeBlocks = subscribeStudioWrites(forgetBlocks);
const offBlockUpdates = onSourceUpdate(forgetBlocks);
import.meta.hot?.dispose(() => { unsubscribeBlocks(); offBlockUpdates(); });

/**
 * Where the JSX of `loc` sits in an element's source: a child (or an element of a prop's fragment: both move among
 * their siblings), a `.map` row, a condition's branch, a prop's value, another expression; "unknown" while the server
 * does not locate expression elements; null when it is not there.
 */
type Place = "child" | "map" | "condition" | "prop" | "other" | "unknown";
function placeIn(element: SourceElement, loc: string): Place | null {
  let unknown = false;
  for (const child of element.children) {
    if (child.kind === "element" && child.loc === loc) return "child";
    if (child.kind !== "expression") continue;
    const located = locatedElements(child);
    if (!located) unknown = true;
    else if (located.some((ref) => ref.loc === loc)) {
      const form = formOf(child);
      return form === "map" ? "map" : form === "and" || form === "ternary" ? "condition" : "other";
    }
  }
  for (const attr of element.attributes) {
    if (attr.kind !== "expression") continue;
    const located = locatedElements(attr);
    if (!located?.some((ref) => ref.loc === loc)) continue;
    const form = attributeFormOf(attr);
    return form === "map" ? "map" : form === "fragment" ? "child" : form === "and" || form === "ternary" ? "condition" : form === "element" ? "prop" : "other";
  }
  return unknown ? "unknown" : null;
}

async function readBlock(selection: NodeSelection, verb: StructuralVerb): Promise<string | null> {
  const world = canvasApi.getWorldElement();
  const parsed = parseSrc(selection.src);
  const hit = parsed && world ? selectedHit(selection, world) : null;
  if (!parsed || !hit) return null;
  const name = selection.name;
  const keyed = (hit.fiber as { key?: unknown } | undefined)?.key != null;
  // The server refuses to copy a keyed element (the copy would repeat the key).
  if (verb === "duplicate" && keyed) return `${name} has a key; a copy would repeat it — edit it in the code`;
  // The nearest annotated elements of the same file around it, read until one lists it (its JSX parent).
  const frame = frameElement(selection.frameId, world);
  let unknown = false;
  let reads = 0;
  for (let current = parentHit(hit, frame), guard = 0; current && guard < 60 && reads < 8; current = parentHit(current, frame), guard++) {
    const at = parseSrc(current.src);
    if (!at || at.file !== parsed.file) continue;
    reads += 1;
    const element = await studioApi.element(at.file, at.loc);
    if (!element) return null;
    const place = placeIn(element, parsed.loc);
    if (place === null) continue;
    if (place === "unknown") { unknown = true; continue; }
    // The element a `.map` callback returns (keyed: a fragment's children are plain children of it).
    if (place === "map") return keyed ? (verb === "remove" ? "One per row: remove the row in its data" : verb === "duplicate" ? "One per row: add the row to its data" : "One per row: reorder the rows in its data") : null;
    // Only an element's children (or a prop fragment's) swap places.
    if (verb === "move" && place === "condition") return `${name} is shown on a condition, not among siblings — it cannot move`;
    if (verb === "move" && place === "prop") return `${name} is a prop's only content — it cannot move`;
    return null;
  }
  // No JSX around it lists it: a function returns it or a variable holds it (an example's root, a helper's result).
  return unknown || reads >= 8 ? null : `${name} is what its code returns or holds, not slot content — edit it in the code`;
}

/**
 * Why the element cannot be removed, duplicated or moved from the Studio, read from the source around it (the server's
 * own refusals): the row a `.map` callback returns, a keyed element's copy, or what a function returns or a variable
 * holds (no JSX around it lists it). Null when it can, or when that cannot be told: the server has the final say.
 */
export function structuralBlock(selection: NodeSelection, verb: StructuralVerb): Promise<string | null> {
  const key = `${verb}|${selection.src}#${selection.instance}`;
  let pending = blocks.get(key);
  // Not on the canvas (yet, or an overlay's content): nothing to tell, and nothing kept.
  if (!pending && !selectedHit(selection)) return Promise.resolve(null);
  if (!pending) {
    pending = readBlock(selection, verb).catch(() => null);
    blocks.set(key, pending);
  }
  return pending;
}

/** structuralBlock for a component: undefined while it is read. */
export function useStructuralBlock(selection: NodeSelection | null, verb: StructuralVerb, version: unknown): string | null | undefined {
  const [read, setRead] = useState<{ key: string; block: string | null } | null>(null);
  const key = selection ? `${verb}|${selection.src}#${selection.instance}|${String(version)}` : "";
  useEffect(() => {
    if (!selection) return undefined;
    let alive = true;
    void structuralBlock(selection, verb).then((block) => { if (alive) setRead({ key, block }); });
    return () => { alive = false; };
    // The key covers the selection, the verb and the source version.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return read && read.key === key ? read.block : undefined;
}

/* ───────────── The palette context of a slot ───────────── */

/**
 * What the palette needs to know about the slot's host (palette.ts PaletteHostContext): its props, the components around
 * it on the canvas (nearest first) and the first click target among them, the heading level an inserted Heading takes,
 * and the layer the item lands after.
 */
export function slotHostContext(selection: NodeSelection, element: SourceElement, slot: ContentSlot): PaletteHostContext {
  const hostProps = hostPropsOf(element.attributes);
  const world = canvasApi.getWorldElement();
  const hit = selectedHit(selection, world);
  const frame = frameElement(selection.frameId, world);
  const chain: Array<{ name: string; props: HostProps }> = [];
  for (let current = hit ? parentHit(hit, frame) : null, guard = 0; current && guard < 60; current = parentHit(current, frame), guard++) {
    // Rendered props: literals and functions (a set onClick counts as set, as a bound value does).
    chain.push({ name: current.name, props: current.props as HostProps });
  }
  const content = slotContentOf(element, slot);
  // What the item lands after: the slot's last layer, or the last child of the slot's only Stack or Grid when the insert
  // goes into that frame (its rendered props tell a column frame from a button row, as runInsert's read does).
  let previousSibling = lastElementName(content);
  const only = onlyFrame(content);
  const frameHit = only && hit && world ? layerHit(selection, `${element.file}:${only.loc}`, world) : null;
  if (only && frameHit && insertTargetFor(slot, { ...content.summary, only: { name: only.name, props: frameHit.props as HostProps } }).mode === "into") {
    const children = childHits(frameHit);
    previousSibling = children.length ? children[children.length - 1].name : undefined;
  }
  return {
    host: element.name,
    slot,
    headingLevel: headingLevelFor(element.name, hostProps, { nearestHeading: lastHeadingLevel(hit, slot), ancestors: chain }),
    mobile: false,
    uid: Date.now().toString(36),
    hostProps,
    ancestors: chain.map((ancestor) => ancestor.name),
    clickableAncestor: chain.find((ancestor) => isClickableHost(ancestor.name, ancestor.props))?.name,
    previousSibling,
    canUseToast: (element as SlotSourceElement).canUseToast,
    canUseMedia: /^src\/platform\/examples\/pages\//.test(element.file),
    builder: isSlotFile(element.file) && LOCAL_FILE.test(element.file),
  };
}

/* ───────────── Writes ───────────── */

/** The source's JSX name and the canvas's display name agree: equal, or the last part of a dotted name (`Layout.Stack`). */
const sameName = (jsx: string, shown: string) => jsx === shown || jsx.slice(jsx.lastIndexOf(".") + 1) === shown;

/**
 * The element at the selection, read again (the write carries the file's current hash); null after a status.
 * `expected`: the name the person acted on (the selection's, or the source the panel showed), so a location that now
 * starts another element (the file changed under it) is refused instead of edited.
 */
async function readElement(src: string, expected: string): Promise<SlotSourceElement | null> {
  const parsed = parseSrc(src);
  if (!parsed) return null;
  const element = await studioApi.element(parsed.file, parsed.loc);
  if (!element || !sameName(element.name, expected)) {
    fail(`${expected} is no longer at ${fileName(parsed.file)}:${parsed.line} — select it again`);
    return null;
  }
  return element;
}

/** Sends one slot op; `keep`: sources whose place the write must not move (noteEditTarget). Null when nothing changed. */
async function write(target: Target, op: SlotEditOp, label: string, keep: readonly string[] = []): Promise<SlotEditApplied | null> {
  const done = keep.map((src) => noteEditTarget(src));
  try {
    const response = await sendSlotEdit({ file: target.file, loc: target.loc, name: target.name, ops: [op], hash: target.hash }, label);
    if (!response.ok) {
      // The edit status already shows the server's reason; a server without the ops needs a restart.
      const slotWide = op.op === "clearSlot" || op.op === "resetSlot";
      if (isUnknownSlotOp(response.error)) fail(slotWide ? "Restart the dev server to reset or clear slots" : "Restart the dev server to add, remove or move layers");
      return null;
    }
    return response.before === response.after ? null : response;
  } finally {
    done.forEach((release) => release());
  }
}

const targetOf = (element: SourceElement): Target => ({ file: element.file, loc: element.loc, name: element.name, hash: element.hash });

/**
 * Selects an element the write created, only when the person kept `original` selected: awaited on the canvas, or kept
 * as selected from the source when the canvas cannot find it (`away`: an overlay's content, in a portal).
 */
function selectNew(original: StudioSelection, next: StudioSelection, before: WeakSet<Element>, text: string, options: { timeout?: number; away?: boolean } = {}): boolean {
  if (!sameSelectedElement(original, studioStore.getState().selection)) return false;
  if (options.away) markOffCanvas(next);
  else expectRender(next, before, showWhenRendered(text), options.timeout);
  studioStore.setState({ selection: next });
  flushStudioStore();
  return true;
}

/** A Shift multi-selection: structural edits work on one layer at a time, never on the first of several only. */
function single(verb: string): boolean {
  if (!hasExtraSelection()) return true;
  fail(`${verb} works on one layer at a time — select one`);
  return false;
}

/** registry insertTargetFor's wrapper (`<Stack gap="md">`, the spacing ladder's in-surface step) as the op sends it. */
const WRAP: SlotWrap = { tag: "Stack", props: { gap: { kind: "string", value: "md" } } };

export type InsertRequest = {
  /** The slot's host (the selected component instance). */
  selection: NodeSelection;
  /** Its source (GET /element); read again before the write. */
  element: SourceElement;
  slot: ContentSlot;
  item: PaletteItem;
  /** `paletteFor(…).context` the picker listed the item with; computed again when absent. */
  context?: PaletteContext;
  /** Why the item goes against the host rules here (paletteFor warnings): it inserts all the same, the status says it. */
  warning?: string;
};

/**
 * Adds a palette item at the end of a slot (registry insertTargetFor): into the slot, into its only column Stack or
 * Grid, or with the current content in a new `<Stack gap="md">` (gap-less slots). The new element is selected.
 */
export function insertIntoSlot(request: InsertRequest): Promise<boolean> {
  return exclusive(() => runInsert(request));
}

async function runInsert({ selection, element, slot, item, context, warning }: InsertRequest): Promise<boolean> {
  const check = canStructurallyEdit(selection);
  if (!check.ok) return fail(check.reason);
  const host = await readElement(selection.src, element.name);
  if (!host) return false;
  const content = slotContentOf(host, slot);
  if (content.insertBlock) return fail(content.insertBlock);
  const code = item.build(context ?? paletteFor(slotHostContext(selection, host, slot)).context);

  // A gap-less slot holding one Stack: its props tell a column frame (insert into it) from a button row (wrap).
  let summary = content.summary;
  let frame: Target | null = null;
  const only = onlyFrame(content);
  if (only && slot.gap === "none" && slot.kind !== "atom") {
    const child = await studioApi.element(host.file, only.loc);
    if (child && child.name === only.name) {
      summary = { ...summary, only: { name: child.name, props: hostPropsOf(child.attributes) } };
      frame = targetOf(child);
    }
  }
  const target = insertTargetFor(slot, summary);
  const into = target.mode === "into" && frame ? frame : null;
  const where = `${host.name} › ${slot.name}`;
  const op: InsertChildOp = {
    op: "insertChild",
    code,
    ...(into || slot.prop === "children" ? {} : { prop: slot.prop }),
    // "into" without the frame's source (it could not be read): wrap instead, never write into an unknown element.
    ...(target.mode === "wrap" || (target.mode === "into" && !into) ? { wrap: WRAP } : {}),
    ...(item.requires?.length ? { requires: [...item.requires] } : {}),
    ...(item.state?.length ? { state: item.state.map((entry) => ({ ...entry })) } : {}),
  };
  if (!(await confirmRepeats(selection, { verb: "add", name: item.label, where }))) return false;

  writing("Adding…");
  // Everything on the canvas before the write: the inserted element is a new one, never one of these.
  const before = renderedNow(canvasApi.getWorldElement());
  // An overlay's slot renders in a portal the canvas does not walk: the new element is selected from the source.
  const away = !slotOnCanvas(selection, slot);
  const response = await write(into ?? targetOf(host), op, `Add ${item.label} to ${where}`, [selection.src, ...(into ? [`${into.file}:${into.loc}`] : [])]);
  if (!response) return false;
  // A limit warns, it never blocks (Figma): the status says what the slot holds now.
  const limit = slot.max !== undefined && content.summary.count >= slot.max ? `${slot.name} now holds ${content.summary.count + 1} layers (limit ${slot.max})` : undefined;
  // So does a host rule (user, 2026-10-04): the item goes in, the usage harness reports it at Save.
  const text = outcomeOf(`Added ${item.label} to ${where}`, response, [limit, warning && `Not recommended: ${warning}`].filter(Boolean).join(" · ") || undefined);
  announce(text);
  const loc = answeredLoc(response, "inserted");
  if (!loc) return true;
  // Synchronously (no request in between): Vite may reload the page as soon as it sees the write.
  const next: NodeSelection = { kind: "node", src: `${response.file}:${loc}`, name: tagAt(response.after, loc) ?? item.root, frameId: selection.frameId, panelId: selection.panelId, instance: selection.instance };
  if (selectNew(selection, next, before, text, { away })) remember(response.file, response.after, selection, next, { before: false, after: true }, { before: false, after: away });
  return true;
}

/* The selection a removal left (its parent) and when: a held ⌫ (key repeat), a quick second press or a double click on
 * Remove must not go on to remove that parent too. */
let lastRemoval: { selection: StudioSelection; at: number } | null = null;
const REMOVAL_SETTLE_MS = 700;
const justRemoved = (selection: StudioSelection) => Boolean(lastRemoval && performance.now() - lastRemoval.at < REMOVAL_SETTLE_MS && sameSelectedElement(lastRemoval.selection, selection));

/**
 * Removes the selected element from its example (the server removes its lines, the attribute that holds it, or the
 * `&&` around it). Its parent, read before the write, is selected at its place after it; `parent` overrides it.
 */
export function removeSelection(selection: NodeSelection, options: { parent?: StudioSelection | null } = {}): Promise<boolean> {
  if (justRemoved(selection)) return Promise.resolve(false);
  return exclusive(async () => single("Remove") && runRemove(selection, options.parent));
}

/** Removes one layer of a slot from the inspector row (the host stays selected). */
export function removeSlotLayer(host: NodeSelection, layer: { name: string; src: string }): Promise<boolean> {
  const child: NodeSelection = { kind: "node", src: layer.src, name: layer.name, frameId: host.frameId, panelId: host.panelId, instance: host.instance };
  return exclusive(() => runRemove(child, host));
}

/** The parent read before a removal, at its place after it (its opening tag's line mapped through the write), else its frame. */
function parentAfter(parent: StudioSelection | null, removed: SourceElement, response: SlotEditApplied): StudioSelection | null {
  if (parent?.kind !== "node") return parent;
  const at = parseSrc(parent.src);
  if (!at || at.file !== response.file) return parent;
  // A changed line is the removed element's own (on the parent's opening line): above it, the tag keeps its place.
  const line = mapLine(response.before, response.after, at.line) ?? (at.line <= removed.startLine ? at.line : null);
  if (line === null) return parent.frameId ? { kind: "frame", frameId: parent.frameId } : null;
  return line === at.line ? parent : { ...parent, src: `${at.file}:${line}:${at.column}` };
}

async function runRemove(selection: NodeSelection, parentHint?: StudioSelection | null): Promise<boolean> {
  const check = canStructurallyEdit(selection);
  if (!check.ok) return fail(check.reason);
  const element = await readElement(selection.src, selection.name);
  if (!element) return false;
  const block = await structuralBlock(selection, "remove");
  if (block) return fail(block);
  const away = isOffCanvasSelection(selection) || !selectedHit(selection);
  // Read before the write: the element is gone after it.
  const parent = parentHint !== undefined ? parentHint : parentSelectionOf(selection);
  const parentAt = parent?.kind === "node" ? parseSrc(parent.src) : null;
  // A parent whose opening tag sits above the removed lines keeps its place through the write.
  const keep = parent?.kind === "node" && parentAt && parentAt.file === element.file && parentAt.line <= element.startLine ? [parent.src] : [];
  if (!(await confirmRepeats(selection, { verb: "remove", name: element.name }))) return false;
  writing("Removing…");
  const response = await write(targetOf(element), { op: "removeElement" }, `Remove ${element.name}`, keep);
  if (!response) return false;
  announce(outcomeOf(`Removed ${element.name}`, response));
  if (sameSelectedElement(selection, studioStore.getState().selection)) {
    const next = parentAfter(parent, element, response);
    if (next && parent && isOffCanvasSelection(parent)) markOffCanvas(next);
    studioStore.setState({ selection: next });
    flushStudioStore();
    lastRemoval = next ? { selection: next, at: performance.now() } : null;
    if (next) remember(response.file, response.after, selection, next, { before: true, after: false }, { before: away, after: false });
  }
  return true;
}

/** Duplicates the selected element right after itself (⌘D) and selects the copy. */
export function duplicateSelection(selection: NodeSelection): Promise<boolean> {
  return exclusive(async () => {
    if (!single("Duplicate")) return false;
    const check = canStructurallyEdit(selection);
    if (!check.ok) return fail(check.reason);
    const element = await readElement(selection.src, selection.name);
    if (!element) return false;
    const block = await structuralBlock(selection, "duplicate");
    if (block) return fail(block);
    if (!(await confirmRepeats(selection, { verb: "duplicate", name: element.name }))) return false;
    writing("Duplicating…");
    // The copy renders where the original does: off the canvas with an overlay's content.
    const away = isOffCanvasSelection(selection) || !selectedHit(selection);
    const before = renderedNow(canvasApi.getWorldElement());
    const response = await write(targetOf(element), { op: "duplicateElement" }, `Duplicate ${element.name}`, [selection.src]);
    if (!response) return false;
    const text = outcomeOf(`Duplicated ${element.name}`, response);
    announce(text);
    const loc = answeredLoc(response, "inserted");
    if (!loc) return true;
    const copy: NodeSelection = { kind: "node", src: `${response.file}:${loc}`, name: tagAt(response.after, loc) ?? selection.name, frameId: selection.frameId, panelId: selection.panelId, instance: selection.instance };
    // React may reuse a sibling's DOM node for the copy: a short wait, then the copy is found by its location.
    if (selectNew(selection, copy, before, text, { timeout: 3000, away })) remember(response.file, response.after, selection, copy, { before: false, after: true }, { before: away, after: away });
    return true;
  });
}

/** Moves the selected element before its previous ("prev", Move up) or after its next element sibling ("next"). */
export function moveSelection(selection: NodeSelection, to: "prev" | "next"): Promise<boolean> {
  return exclusive(async () => single("Move") && (await runMove(selection, to)) !== null);
}

/** Moves one layer of a slot from its inspector row (the host stays selected); its new location, else null. */
export async function moveSlotLayer(host: NodeSelection, layer: { name: string; src: string }, to: "prev" | "next"): Promise<string | null> {
  const child: NodeSelection = { kind: "node", src: layer.src, name: layer.name, frameId: host.frameId, panelId: host.panelId, instance: host.instance };
  let moved: string | null = null;
  await exclusive(async () => {
    moved = await runMove(child, to);
    return moved !== null;
  });
  return moved;
}

async function runMove(selection: NodeSelection, to: "prev" | "next"): Promise<string | null> {
  const check = canStructurallyEdit(selection);
  if (!check.ok) { fail(check.reason); return null; }
  const element = await readElement(selection.src, selection.name);
  if (!element) return null;
  const block = await structuralBlock(selection, "move");
  if (block) { fail(block); return null; }
  if (!(await confirmRepeats(selection, { verb: "move", name: element.name }))) return null;
  writing("Moving…");
  const direction = to === "prev" ? "up" : "down";
  // What the canvas shows before the write: the selection waits for the re-render instead of outlining the sibling that
  // still stands at the new place (as edit/arrange.ts stepLayer does; BACKLOG "Move up/down drops the selection").
  const before = renderedNow(canvasApi.getWorldElement());
  const response = await write(targetOf(element), { op: "moveElement", to }, `Move ${element.name} ${direction}`);
  if (!response) return null;
  announce(outcomeOf(`Moved ${element.name} ${direction}`, response));
  const loc = answeredLoc(response, "moved");
  if (!loc) return null;
  const src = `${response.file}:${loc}`;
  const current = studioStore.getState().selection;
  if (current?.kind === "node" && sameSelectedElement(selection, current)) {
    // A new selection at the new place, not a remap of the old one: SelectionLayer follows a remapped selection by its
    // DOM node, which React gives the sibling now standing there (same component, no key), so it would outline that one.
    const moved: NodeSelection = { ...current, src };
    const away = isOffCanvasSelection(current);
    if (away) markOffCanvas(moved);
    expectRender(moved, before, () => undefined, 1500);
    studioStore.setState({ selection: moved });
    flushStudioStore();
    remember(response.file, response.after, selection, moved, { before: false, after: false }, { before: away, after: away });
  }
  return src;
}

/* ───────────── Reset and clear a slot (Figma's slot "More actions": Reset slot, Delete contents) ───────────── */

export type SlotActions = {
  /**
   * The slot differs from the saved file (GET /element's flags; false too when the drafts list shows the file has no
   * draft: everything matches the saved file); null when that is unknown (no flags while the file has a draft, or no
   * drafts list).
   */
  modified: boolean | null;
  /** The saved file has no such host (it was added since the last save): nothing to reset to. */
  isNew: boolean;
  /** Figma's "Modified" tag: a slot that differs from the saved file, on a host the saved file has. */
  tagged: boolean;
  /** How many layers "Clear contents" removes (clearCountOf). */
  count: number;
  /** Why "Reset slot" is off, as a caption; null when it can run. */
  resetBlock: string | null;
  /** Why "Clear contents" is off, as a caption; null when it can run. */
  clearBlock: string | null;
};

/** Whether the component requires the slot's prop (`children` included), from the generated API docs. */
const requiresSlot = (host: string, prop: string) => Boolean(componentSchema(host.slice(host.lastIndexOf(".") + 1))?.props.some((entry) => entry.name === prop && entry.required));

/** The drafts list (GET /drafts) says whether `file` has a draft; null when there is no list (an older server). */
function hasDraft(file: string): boolean | null {
  const drafts = studioDrafts.get();
  return drafts.available ? drafts.drafts.some((row) => row.file === file) : null;
}

/**
 * What a slot's "More actions" offer, read from the host's source (the server's own refusals): "Reset slot" needs a
 * slot that differs from the saved file, "Clear contents" a slot with layers the component does not require. The server
 * sends the Modified flags only while the file has a draft, so a file without one (the drafts list says so) matches the
 * saved file. Display only for an unknown Modified state: the server has the final say.
 */
export function slotActionsOf(element: SourceElement, slot: ContentSlot, content: SlotContent = slotContentOf(element, slot)): SlotActions {
  const flagged = slotModifiedOf(element, slot);
  const draft = flagged === null ? hasDraft(element.file) : null;
  const modified = flagged ?? (draft === false ? false : null);
  const isNew = (element as SlotSourceElement).newSinceSave === true;
  const count = clearCountOf(content);
  const resetBlock = isNew ? "New since the last save"
    : modified === null ? (draft ? "Can't compare" : "Nothing saved to go back to")
      : modified ? null : "Matches the saved file";
  const clearBlock = count === 0 ? "Already empty"
    : requiresSlot(element.name, slot.prop) ? `Required by ${element.name} — replace ${slot.prop === "children" ? "its content" : `its ${slot.prop}`} instead`
      : null;
  return { modified, isNew, tagged: modified === true && !isNew, count, resetBlock, clearBlock };
}

/** The usual caption of "Reset slot". */
export const resetCaption = "Back to the saved file";

/* A `.map` row: Clear takes the whole list, every row. */
const isListRow = (layer: SlotLayer) => (layer.kind === "element" && layer.via === "map") || (layer.kind === "expression" && layer.form === "map");

/**
 * What "Clear contents" removes, counted the way the slot's block caption counts it ("Stack · 3 layers"): `whole` when
 * one layer stands for more, a single layout frame ("Stack with 3 layers": its layers go with it; `frameLayers` is read
 * from the frame, null until then) or a `.map` ("the list (every row)"); else the count ("3 layers").
 */
function cleared(content: SlotContent, frameLayers: number | null): { text: string; whole: boolean } {
  const frame = onlyFrame(content);
  if (frame) return { text: frameLayers === null ? `${frame.name} with its layers` : frameLayers ? `${frame.name} with ${plural(frameLayers, "layer")}` : frame.name, whole: true };
  const listed = clearedLayers(content);
  if (listed.length && listed.every(isListRow)) return { text: "the list (every row)", whole: true };
  return { text: plural(listed.length, "layer"), whole: false };
}

/** What "Clear contents" removes: "Stack with 3 layers", "the list (every row)", "3 layers" (the canvas menu's caption). */
export const clearedText = (content: SlotContent, frameLayers: number | null) => cleared(content, frameLayers).text;

/**
 * The usual caption of "Clear contents": "Removes 3 layers · ⌘Z to undo"; "Removes Stack with 3 layers" and "Removes the
 * list (every row)" leave the undo out to fit the 240px menu on one line (the status after the write says it).
 */
export function clearCaption(content: SlotContent, frameLayers: number | null): string {
  const { text, whole } = cleared(content, frameLayers);
  return whole ? `Removes ${text}` : `Removes ${text} · ${undoShortcut} to undo`;
}

/** A caption that names the slot (the canvas menu; the inspector block already shows the name): "Content · already empty". */
export const namedCaption = (slot: string, text: string) => `${slot} · ${text.charAt(0).toLowerCase()}${text.slice(1)}`;

/** Empties a slot of the selected host (Figma's "Delete contents"); the host stays selected. */
export function clearSlot(selection: NodeSelection, slot: ContentSlot): Promise<boolean> {
  return exclusive(() => runSlotEdit(selection, slot, "clear"));
}

/** Puts a slot of the selected host back the way the saved file has it (Figma's "Reset slot"); the host stays selected. */
export function resetSlot(selection: NodeSelection, slot: ContentSlot): Promise<boolean> {
  return exclusive(() => runSlotEdit(selection, slot, "reset"));
}

async function runSlotEdit(selection: NodeSelection, slot: ContentSlot, verb: "clear" | "reset"): Promise<boolean> {
  const check = canStructurallyEdit(selection);
  if (!check.ok) return fail(check.reason);
  const host = await readElement(selection.src, selection.name);
  if (!host) return false;
  const where = `${host.name} › ${slot.name}`;
  const actions = slotActionsOf(host, slot);
  // What the server would refuse, told from the fresh read. An unknown Modified state (no flags) is the server's call.
  const block = verb === "clear" ? actions.clearBlock : actions.isNew || actions.modified === false ? actions.resetBlock : null;
  if (block) return fail(namedCaption(where, block));
  if (!(await confirmRepeats(selection, { verb, name: slot.name, where }))) return false;
  writing(verb === "clear" ? "Clearing…" : "Resetting…");
  const prop = slot.prop === "children" ? {} : { prop: slot.prop };
  const op: SlotEditOp = verb === "clear" ? { op: "clearSlot", ...prop } : { op: "resetSlot", ...prop };
  const away = isOffCanvasSelection(selection);
  const response = await write(targetOf(host), op, verb === "clear" ? `Clear ${where}` : `Reset ${where}`);
  if (!response) return false;
  announce(outcomeOf(verb === "clear" ? `Cleared ${where}` : `Reset ${where} to the saved file`, response));
  // The host's own line changes (`<Card …>` ↔ `<Card … />`) and the imports above it may lose or gain lines: the
  // selection follows it now, synchronously (Vite may reload the page as soon as it sees the write), as the same
  // element (its DOM node stays), and ⌘Z / ⌘⇧Z put it back.
  const current = studioStore.getState().selection;
  if (current?.kind !== "node" || !sameSelectedElement(selection, current)) return true;
  const loc = response.file === host.file ? hostLocAfter(response.before, response.after, host.loc, host.name, mapLine) : null;
  if (loc && `${response.file}:${loc}` !== current.src) remapSelection(`${response.file}:${loc}`);
  const next = studioStore.getState().selection ?? current;
  if (away) markOffCanvas(next);
  flushStudioStore();
  remember(response.file, response.after, selection, next, { before: false, after: false }, { before: away, after: away });
  return true;
}

/* ───────────── Picker requests (canvas chip, context menu) ───────────── */

/** A request to open the insert picker on the canvas for a slot of the selected element (`point`: client px). */
export type SlotPickerRequest = { src: string; prop: string; point: { x: number; y: number } | null; at: number };

let pickerRequest: SlotPickerRequest | null = null;
const pickerListeners = new Set<() => void>();

/** Opens the insert picker for `prop` of the selected element: at `point`, else at the slot's + chip (SlotLayer). */
export function openSlotPicker(selection: NodeSelection, prop: string, point?: { x: number; y: number }) {
  pickerRequest = { src: selection.src, prop, point: point ?? null, at: Date.now() };
  pickerListeners.forEach((listener) => listener());
}

export const slotPickerRequests = {
  get: () => pickerRequest,
  clear() {
    if (!pickerRequest) return;
    pickerRequest = null;
    pickerListeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    pickerListeners.add(listener);
    return () => { pickerListeners.delete(listener); };
  },
};

/* ───────────── "Show this slot" requests (a Layers slot row): the Slots section that mounts next consumes it ───────────── */

let focusRequest: { src: string; prop: string; at: number } | null = null;
const focusListeners = new Set<() => void>();

/** Asks the Slots section of `src` to bring its `prop` slot into view (its add button focused when it has one). */
export function focusSlot(src: string, prop: string) {
  focusRequest = { src, prop, at: Date.now() };
  focusListeners.forEach((listener) => listener());
}

/** The latest focusSlot request (the section checks its source and age). */
export const useSlotFocusRequest = () => useSyncExternalStore(
  (listener) => { focusListeners.add(listener); return () => { focusListeners.delete(listener); }; },
  () => focusRequest,
  () => null,
);

/* ───────────── Data-slot items (dataSlots.ts; server tools/studio/items.mjs) ───────────── */

/*
 * A data slot's items (TopNavigation's Top-Trailing actions) are objects in a prop, not JSX: add, remove, duplicate and
 * move them by index, with the content-slot rules (example and template content, admin, the dev server; a playground
 * shows the main component). The host is the selected component, or the owner of a selected item part. After an add, a
 * duplicate or a move the item is selected on the canvas once it renders; a removal selects the host.
 */

/**
 * `move`: an arrow move (groups stay as written); `drop`: a drag to place `to` (it joins the group it lands inside,
 * keeps its own beside a group-mate, else leaves it); `group`: a drop onto the item at `to` (both share one `group`);
 * `ungroup`: it leaves its group. Groups apply to slots whose items take a `group` field (TopNavigation `trailing`).
 */
export type DataItemVerb = "add" | "remove" | "duplicate" | "move" | "drop" | "group" | "ungroup";

/** Why the host's data slots cannot change here (a playground, docs code, Viewer…), or null. */
export function dataItemBlock(selection: NodeSelection): string | null {
  const check = canStructurallyEdit(withoutPart(selection));
  return check.ok ? null : check.reason;
}

/** Selects the slot's index-th item once the canvas shows the edit (its items differ from `before`); up to 5s. */
function selectItemWhenRendered(host: NodeSelection, slot: DataSlot, index: number, before: string) {
  const started = performance.now();
  const tick = () => {
    const current = studioStore.getState().selection;
    // Still the host or one of its parts (the write may have moved its line: same name, frame and instance).
    if (current?.kind !== "node" || current.name !== host.name || current.instance !== host.instance || current.frameId !== host.frameId) return;
    const owner = selectedHit(withoutPart(current) as NodeSelection);
    if (owner && renderedSignature(owner, slot) !== before) {
      const part = itemParts(owner, slot)[index];
      if (part) {
        selectPart(part, canvasApi.getWorldElement());
        flushStudioStore();
        return;
      }
    }
    // Timers, not frames: a hidden Studio pane runs no animation frames.
    if (performance.now() - started < 5000) window.setTimeout(tick, 80);
  };
  window.setTimeout(tick, 80);
}

/** One item op on the host's data slot; `index`/`to` as the source's array literal holds the items (`group`: `to` = the item it joins). */
/** `keepHost`: the host stays selected after an add (a Figma presence boolean switched on: its row must stay reachable). */
export function editDataItem(selection: NodeSelection, slot: DataSlot, verb: DataItemVerb, index = 0, to = 0, { keepHost = false }: { keepHost?: boolean } = {}): Promise<boolean> {
  return exclusive(() => runDataItem(selection, slot, verb, index, to, keepHost));
}

async function runDataItem(selection: NodeSelection, slot: DataSlot, verb: DataItemVerb, index: number, to: number, keepHost = false): Promise<boolean> {
  const hostSelection = withoutPart(selection) as NodeSelection;
  const check = canStructurallyEdit(hostSelection);
  if (!check.ok) return fail(check.reason);
  if (!single(verb === "add" ? "Add" : verb === "remove" ? "Remove" : verb === "duplicate" ? "Duplicate" : verb === "group" ? "Group" : verb === "ungroup" ? "Ungroup" : "Move")) return false;
  const host = await readElement(hostSelection.src, hostSelection.name);
  if (!host) return false;
  const where = `${host.name} › ${slot.name}`;
  const source = sourceItems(host, slot);
  if (source.state === "computed") return fail(`${where}: ${computedCaption(slot, source.code)}`);
  const items = source.state === "items" ? source.items : [];
  // Groups as the host is drawn now (TopNavigation: the compact types' Flat actions never share a pill).
  const grouping = slotGroupsAt(selectedHit(hostSelection), slot);
  if (verb === "group" && !grouping) return fail(`${where}: ${slot.groupsOffNote ?? "its items do not group here"}`);
  if (verb !== "add" && !items[index]) return fail(`${where} has no item ${index + 1} any more — select it again`);
  if ((verb === "move" || verb === "drop" || verb === "group") && !items[to]) return fail(`${where} has no place ${to + 1}`);
  if (verb === "add" && slot.form === "object" && items.length) return fail(`${where} holds its one ${slot.itemName.toLowerCase()} already — edit it, or remove it first`);
  const name = verb === "add" ? slot.itemName : itemTitle(slot, items[index].fields, index);
  // The repeat question speaks of moves for drags and (un)grouping, which also move the item.
  if (!(await confirmRepeats(hostSelection, { verb: verb === "drop" || verb === "group" || verb === "ungroup" ? "move" : verb, name, where }))) return false;

  let op: ItemEditOp;
  let warning: string | undefined;
  if (verb === "add") {
    const item = slot.newItem(items.length);
    op = { op: "insertItem", prop: slot.prop, code: item.code, ...(slot.form === "object" ? { single: true } : slot.form === "list" ? { list: true } : {}), ...(item.requires?.length ? { requires: [...item.requires] } : {}) };
    // A limit warns, it never blocks (Figma): the status says what the slot holds now.
    if (items.length >= slot.max) warning = `${slot.name} now holds ${plural(items.length + 1, slot.itemName.toLowerCase())}; ${slot.maxNote ?? `the component shows ${slot.max}`}`;
  } else if (verb === "remove") op = { op: "removeItem", prop: slot.prop, ...(slot.form !== "object" ? { index } : {}) };
  else if (verb === "duplicate") {
    op = { op: "duplicateItem", prop: slot.prop, index, ...(slot.form === "list" ? { list: true } : {}) };
    if (items.length >= slot.max) warning = `${slot.name} now holds ${plural(items.length + 1, slot.itemName.toLowerCase())}; ${slot.maxNote ?? `the component shows ${slot.max}`}`;
  } else if (verb === "group") op = { op: "groupItem", prop: slot.prop, index, with: to };
  else if (verb === "ungroup") op = { op: "ungroupItem", prop: slot.prop, index };
  else op = { op: "moveItem", prop: slot.prop, index, to, ...(grouping ? { regroup: verb === "drop" ? "drop" as const : "tidy" as const } : {}) };

  writing(verb === "add" ? "Adding…" : verb === "remove" ? "Removing…" : verb === "duplicate" ? "Duplicating…" : verb === "group" ? "Grouping…" : verb === "ungroup" ? "Ungrouping…" : "Moving…");
  const before = renderedSignature(selectedHit(hostSelection), slot);
  // The host or one of its parts, as selected now (the write moves its line: same file, name, frame and instance).
  const isHost = (candidate: StudioSelection | null): candidate is NodeSelection => candidate?.kind === "node" && candidate.name === host.name
    && candidate.frameId === hostSelection.frameId && candidate.instance === hostSelection.instance && parseSrc(candidate.src)?.file === host.file;
  // A removed item's part goes with the next render: its host is selected first, so the canvas never reports it lost.
  const selected = studioStore.getState().selection;
  if (verb === "remove" && isHost(selected) && selected.part) {
    studioStore.setState({ selection: withoutPart(selected) });
    flushStudioStore();
  }
  const other = verb === "group" ? itemTitle(slot, items[to].fields, to) : "";
  const label = verb === "add" ? `Add ${slot.itemName} to ${where}` : verb === "remove" ? `Remove ${name} from ${where}` : verb === "duplicate" ? `Duplicate ${name} in ${where}`
    : verb === "group" ? `Group ${name} with ${other} in ${where}` : verb === "ungroup" ? `Ungroup ${name} in ${where}` : `Move ${name} in ${where}`;
  // No `keep`: an inserted handler's useToast() line (and its import) moves the host down; it is remapped below.
  const response = await write(targetOf(host), op, label);
  if (!response) return false;
  // The host's line after the write, synchronously (Vite may re-render as soon as it sees it); a selected item keeps
  // its part path until the item is selected afresh.
  const loc = response.file === host.file ? hostLocAfter(response.before, response.after, host.loc, host.name, mapLine) : null;
  const current = studioStore.getState().selection;
  if (loc && isHost(current) && `${response.file}:${loc}` !== current.src) {
    remapSelection(`${response.file}:${loc}`);
    flushStudioStore();
  }
  const done = verb === "add" ? `Added ${slot.itemName} to ${where}` : verb === "remove" ? `Removed ${name} from ${where}` : verb === "duplicate" ? `Duplicated ${name} in ${where}`
    : verb === "group" ? `Grouped ${name} with ${other} in ${where}` : verb === "ungroup" ? `Took ${name} out of its group in ${where}`
      : `Moved ${name} to place ${(response.item?.index ?? to) + 1} in ${where}`;
  announce(outcomeOf(done, response, warning));
  if (verb === "remove") return true;
  const at = response.item?.prop === slot.prop && Number.isInteger(response.item.index) ? response.item.index : null;
  if (at !== null && !keepHost) selectItemWhenRendered(hostSelection, slot, at, before);
  return true;
}
