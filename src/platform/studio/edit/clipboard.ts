import { useEffect } from "react";
import type { MenuEntry } from "../../../components/Menu";
import { announceEditStatus, applyEdit, currentEditStatus, parseSrc, studioApi, subscribeStudioWrites } from "../api";
import { canvasApi, getViewport, getViewportBox } from "../canvas/viewport";
import { copyFrameForFigma, copyFrameNow, copyFrameWhenRead, frameFigmaClip } from "../builder/export/figmaClipboard";
import { openQuickInsert } from "../builder/library/quickInsertState";
import { frameInView, rootSelection } from "../builder/library/target";
import { nodeKind, propSpecs } from "../inspector/propSchema";
import { annotatedAt, findBySrc, isTypingTarget, parentHit, rectOf, type FiberHit } from "../select/picker";
import { wrappedChildLoc } from "../select/resize";
import { multiSelection, selectedLayers } from "../select/multiSelection";
import { expectRender, mapSrc, renderedNow } from "../select/remap";
import { canStructurallyEdit, insideWrap, isFloatWrapper, pasteIntoSlot, pasteWarningIn, rememberInsert, removeSelection, selectedSlotOf, slotPasteTarget, slotPasteWarning, studioWrapOf, swapSelection } from "../slots/actions";
import { canEdit, flushStudioStore, studioStore } from "../store";
import type { EditOp, EditValue, SourceElement, StateDecl, StudioNodeRef, StudioSelection } from "../types";
import type { NodeSelection } from "./arrange";
import { floatingCode } from "./autoLayoutPlan";
import { dropTargetAt, isDropContainer, type DropContext } from "./drag";
import { boxIn, FLOATS, floats, freeBlock, layerBoxesIn, localTo, screenOfBlock } from "./freeBlock";
import { freeInsertAt, needsWidth, pageMarginFor, widgetWidthIn } from "./insertPlace";
import { codeOfLayers, removeLayers, statesRead } from "./multi";
import { textEditSession } from "./textEdit";

/*
 * The clipboard on the canvas, Figma-like (docs/research/studio-figma-editing-plan-2026-10-03.md, Phase 3).
 *
 * - ⌘C copies the selected layer: its exact JSX goes to the system clipboard (it pastes into an editor as code) and the
 *   Studio remembers where it came from. ⌘X copies, then removes it.
 * - ⌘V pastes into the selected layer when it is a layout (Stack, Grid, Box, Card, Form parts…; as its last child),
 *   else right after it (Figma). In the same file the copy keeps its code as written (op moveTo + copy, names checked
 *   where it lands); from another file, after a cut, or code / plain text from elsewhere, op pasteCode: Zen components
 *   join the imports, other names must exist there. Plain text becomes a <Text>.
 * - Into a component's slot (Figma: paste into a selected slot): with its Layers slot row selected, at the slot's end;
 *   with a layer of a prop slot selected (PageHeader › Actions holds Export), right after it in that slot. The slot's own
 *   insert rules apply (slots/actions.ts pasteIntoSlot, op insertChild `paste`); ⇧⌘R there swaps the layer.
 * - ⇧⌘R pastes to replace the selected layer. ⌥⌘C / ⌥⌘V copy and paste its properties (the literal, non-content
 *   props the target accepts), one undo step.
 * Every paste is one draft edit and one undo step; the pasted layer gets selected.
 * - A component in its Studio wrap Stack is copied, cut and pasted beside with that Stack (its size goes along); the
 *   useState values a copy reads are declared where it pastes in another file (op pasteCode `state`, edit/multi.ts
 *   statesRead), as an Assets insert does. Layers of several files copy together (they paste as code).
 */

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const key = (mac: string, other: string) => (isMac ? mac : other);
export const clipboardShortcuts = {
  copy: key("⌘C", "Ctrl+C"),
  cut: key("⌘X", "Ctrl+X"),
  paste: key("⌘V", "Ctrl+V"),
  replace: key("⇧⌘R", "Ctrl+Shift+R"),
  copyProps: key("⌥⌘C", "Ctrl+Alt+C"),
  pasteProps: key("⌥⌘V", "Ctrl+Alt+V"),
};

/**
 * `file` / `loc`: where the copied element sits (null loc: several layers or a cut, pasted as code; null file: several
 * files); `tag`: the element at `loc` (its wrap Stack's "Stack" for a wrapped component, `name` being the component);
 * `state`: the useState values the code reads in `file`; `size` / `floats` / `several`: the layers' box on the canvas
 * (zoom undone), whether they all floated and were more than one, for Paste here on the empty canvas
 * (builder/boardPaste.ts); `copiedAt`: when.
 */
type Clip = { file: string | null; loc: string | null; name: string; tag: string; code: string; cut: boolean; wrapped: boolean; state: StateDecl[]; size: { width: number; height: number } | null; floats: boolean; several: boolean; copiedAt: number };
type PropsClip = { name: string; values: Array<{ name: string; value: EditValue }> };

let clip: Clip | null = null;
let propsClip: PropsClip | null = null;
const fail = (message: string) => announceEditStatus({ kind: "error", message, at: Date.now() });
const done = (message: string) => announceEditStatus({ kind: "draft", message, at: Date.now() });

// The copied layer's place follows the Studio's own writes (lines added above it), and is forgotten when it goes.
if (typeof window !== "undefined") {
  const stop = subscribeStudioWrites((write) => {
    if (!clip?.loc || write.file !== clip.file) return;
    const next = mapSrc(`${clip.file}:${clip.loc}`, write);
    clip.loc = next ? parseSrc(next)?.loc ?? null : null;
  });
  import.meta.hot?.dispose(stop);
}

const selectedNode = (): NodeSelection | null => {
  const selection = studioStore.getState().selection;
  return selection?.kind === "node" && !selection.part ? selection : null;
};

/** The layer's code with its continuation lines moved back by its own indentation (it reads well when pasted). */
function codeOf(element: SourceElement, content: string): string | null {
  if (!element.range) return null;
  const offset = content.charCodeAt(0) === 0xfeff ? 1 : 0;
  const code = content.slice(element.range.start + offset, element.range.end + offset);
  const lineStart = content.lastIndexOf("\n", element.range.start + offset - 1) + 1;
  const indent = /^[ \t]*/.exec(content.slice(lineStart))?.[0] ?? "";
  return indent ? code.split("\n").map((line, i) => (i > 0 && line.startsWith(indent) ? line.slice(indent.length) : line)).join("\n") : code;
}

/* The selected layer's code, read when it is selected: a copy event must fill the clipboard synchronously. */
type Read = { element: SourceElement; code: string; loc: string; tag: string; wrapped: boolean; state: StateDecl[] };
let ready: ({ src: string } & Read) | null = null;
let readFor: string | null = null;
async function readLayer(selection: NodeSelection): Promise<Read | null> {
  const at = parseSrc(selection.src);
  if (!at) return null;
  const [element, source] = await Promise.all([studioApi.element(at.file, at.loc), studioApi.source(at.file).catch(() => null)]);
  if (!element || !source || element.name.slice(element.name.lastIndexOf(".") + 1) !== selection.name.slice(selection.name.lastIndexOf(".") + 1)) return null;
  // A component in its Studio wrap Stack is copied with that Stack (GĐ4 M4): the size it was given goes along.
  const wrap = await studioWrapOf(selection);
  const wrapLoc = wrap ? parseSrc(wrap.src)?.loc ?? null : null;
  const outer = wrapLoc ? await studioApi.element(at.file, wrapLoc).catch(() => null) : null;
  const code = codeOf(outer ?? element, source.content);
  if (!code) return null;
  // The dev server reads the state from the AST (GET /element stateReads: scope-aware, DOM refs such as a Popover's
  // anchor too); an older server leaves it out and the text scan stands in.
  return { element, code, loc: outer && wrapLoc ? wrapLoc : at.loc, tag: outer ? outer.name : element.name, wrapped: Boolean(outer), state: element.stateReads ?? statesRead(code, source.content) };
}
function prefetch() {
  const selection = selectedNode();
  if (!selection || selection.src === readFor) return;
  readFor = selection.src;
  ready = null;
  figmaReady = null;
  void readLayer(selection).then((read) => { if (read && readFor === selection.src) ready = { src: selection.src, ...read }; });
  // A Screen of a page you made: its Figma export too, as ⌘C on its frame carries it (builder/frameKeys.ts).
  const screen = screenOf(selection);
  figmaReading = null;
  if (screen) {
    const html = frameFigmaClip(screen.localPage, screen.frameId).then((next) => ("html" in next ? next.html : Promise.reject(new Error(next.error))));
    figmaReading = { src: selection.src, html };
    html.then((done) => { if (readFor === selection.src) figmaReady = { src: selection.src, html: done }; }, () => undefined);
  }
}

/** The selected Screen (or Overlay) of a page you made, which copies for Figma too; null for any other layer. */
function screenOf(selection: NodeSelection): { localPage: string; frameId: string } | null {
  const { localPage } = studioStore.getState();
  return localPage && selection.frameId && /^(screen|overlay):/.test(selection.frameId) && (selection.name === "Screen" || selection.name === "Overlay") ? { localPage, frameId: selection.frameId } : null;
}
/** The selected Screen's Figma export, read ahead for the copy event (the clipboard's HTML: export/figmaClipboard.ts). */
let figmaReady: { src: string; html: string } | null = null;
/** That read itself, for a ⌘C that comes before it is done. */
let figmaReading: { src: string; html: Promise<string> } | null = null;

/** The menu's Copy for Figma on a selected Screen: what ⌘C reads ahead goes in a copy event (Figma's canvas takes it). */
function copyScreenForFigma(node: NodeSelection) {
  const screen = screenOf(node)!;
  if (ready?.src === node.src && figmaReady?.src === node.src && copyFrameNow(ready.code, figmaReady.html)) {
    done(`Copied ${node.name} for Figma · ${clipboardShortcuts.paste} on a Figma canvas or in the Zen plugin places it`);
    return;
  }
  void copyFrameForFigma(screen.localPage, screen.frameId);
}

/** ⌘C / ⌘X on a multi-selection: the layers' code in source order (they paste together, in that order). */
async function copyLayers(cut: boolean) {
  const layers = selectedLayers();
  const read = await codeOfLayers(layers);
  if (typeof read === "string") { fail(read); return false; }
  await navigator.clipboard?.writeText(read.code).catch(() => undefined);
  clip = { file: read.file, loc: null, name: `${layers.length} layers`, tag: "", code: read.code, cut, wrapped: false, state: read.state, ...measure(layers), copiedAt: Date.now() };
  if (cut) return removeLayers(layers);
  done(`Copied ${layers.length} layers · ${clipboardShortcuts.paste} to paste`);
  return true;
}

/** Copies the selected layer (`text`: the clipboard event's data to fill, else the async clipboard API). */
async function copyLayer(selection: NodeSelection, data: DataTransfer | null, cut: boolean): Promise<boolean> {
  const pressedAt = Date.now();
  const cached = ready && ready.src === selection.src ? ready : null;
  if (cached && data) data.setData("text/plain", cached.code);
  const read = cached ?? (await readLayer(selection));
  if (!read) {
    fail(`${selection.name} could not be copied (restart the dev server if this persists)`);
    return false;
  }
  if (!cached || !data) await navigator.clipboard?.writeText(read.code).catch(() => undefined);
  const at = parseSrc(selection.src)!;
  clip = { file: at.file, loc: read.loc, name: read.element.name, tag: read.tag, code: read.code, cut, wrapped: read.wrapped, state: read.state, ...measure([selection]), copiedAt: Date.now() };
  if (cut) return true;
  // A Screen of a page you made goes to Figma as well: ⌘V on a Figma canvas or in the Zen plugin places it.
  const screen = screenOf(selection);
  if (!screen) { done(`Copied ${read.element.name} · ${clipboardShortcuts.paste} to paste`); return true; }
  const copied = `Copied ${read.element.name} · ${clipboardShortcuts.paste} pastes it here, on a Figma canvas or in the Zen plugin`;
  if (cached && data && figmaReady?.src === selection.src) { data.setData("text/html", figmaReady.html); done(copied); return true; }
  // Its Figma export is still being read: both go in a copy event of their own once it is (figmaClipboard.ts).
  const html = figmaReading?.src === selection.src ? figmaReading.html : frameFigmaClip(screen.localPage, screen.frameId).then((next) => ("html" in next ? next.html : Promise.reject(new Error(next.error))));
  done(`Copied ${read.element.name} — preparing it for Figma…`);
  void copyFrameWhenRead(read.code, html, pressedAt).then((canvas) => done(canvas ? copied : `Copied ${read.element.name} · ${clipboardShortcuts.paste} in the Zen plugin places it; copy again for a Figma canvas`), (error: unknown) => announceEditStatus({ kind: "error", message: `Copied for the Studio only — not for Figma: ${error instanceof Error ? error.message : String(error)}`, at: Date.now() }));
  return true;
}

/** The copied layers' box on the canvas in px (the zoom undone) and whether they all float (Figma's frame without auto
 *  layout): Paste here on the empty canvas makes a frame that size (builder/boardPaste.ts). */
function measure(layers: readonly StudioNodeRef[]): Pick<Clip, "size" | "floats" | "several"> {
  const world = canvasApi.getWorldElement();
  const hosts = world ? layers.flatMap((layer) => { const hits = findBySrc(world, layer.src); return (hits[layer.instance] ?? hits[0])?.hosts ?? []; }) : [];
  const rect = hosts.length ? rectOf(hosts) : null;
  const zoom = getViewport().zoom || 1;
  return { size: rect ? { width: Math.round(rect.width / zoom), height: Math.round(rect.height / zoom) } : null, floats: hosts.length > 0 && hosts.every(floats), several: layers.length > 1 };
}

/** What ⌘C / ⌘X last copied on the canvas (Paste here on the empty canvas, builder/boardPaste.ts): its code, name, box,
 *  whether it is several layers and whether they float, and when; null before any copy. */
export function copiedLayers() {
  return clip ? { code: clip.code, name: selectedName(clip.name), several: clip.several, size: clip.size, floats: clip.floats, copiedAt: clip.copiedAt } : null;
}

/* ── where a paste goes ──────────────────────────────────────────────────────────────────────────────────────────── */

/** `at`: px in a frame without auto layout, where the pasted layers float (Paste here, ⌘V with nothing selected). */
type Spot = { parent: FiberHit; parentFile: string; before?: string; after?: string; replace?: string; at?: { x: number; y: number }; frameId: string | null; panelId: string | null };

function hitOf(selection: NodeSelection): FiberHit | null {
  const world = canvasApi.getWorldElement();
  if (!world) return null;
  const hits = findBySrc(world, selection.src);
  return hits[selection.instance] ?? hits[0] ?? null;
}

/**
 * Into the selected layout (last), else after the selected layer; `replace`: in the selected layer's place. `beside`:
 * never into it (a wrapped component's Studio wrap Stack, which holds that component only).
 */
function spotFor(selection: NodeSelection, replace: boolean, beside = false): Spot | string {
  const hit = hitOf(selection);
  if (!hit) return "Select a layer on the canvas to paste next to or into";
  const frame = hit.hosts[0]?.closest("[data-studio-frame]") ?? null;
  const into = !replace && !beside && isDropContainer(hit);
  const parent = into ? hit : parentHit(hit, frame);
  if (!parent) return `${selection.name} has no parent layer to paste beside`;
  const parsed = parseSrc(parent.src);
  if (!parsed) return "The layer's place is unknown";
  const spot: Spot = { parent, parentFile: parsed.file, frameId: selection.frameId, panelId: selection.panelId };
  if (replace) spot.replace = selection.src;
  else if (!into) spot.after = selection.src;
  return spot;
}

/**
 * A paste beside (or instead of) a layer goes into that layer's JSX parent. The canvas parent is it, unless the layer
 * renders inside another component's body (an example's local `Page` puts its children in its own Stack): then it is
 * the nearest canvas ancestor of the same file whose source holds the layer (`<Page>` itself).
 */
async function sourceParent(spot: Spot): Promise<Spot> {
  const at = parseSrc(spot.after ?? spot.replace ?? "");
  if (!at) return spot;
  const child = await studioApi.element(at.file, at.loc).catch(() => null);
  if (!child?.range) return spot;
  const frame = spot.parent.hosts[0]?.closest("[data-studio-frame]") ?? null;
  for (let parent: FiberHit | null = spot.parent, guard = 0; parent && guard < 12; parent = parentHit(parent, frame), guard++) {
    const place = parseSrc(parent.src);
    if (!place || place.file !== at.file) continue;
    const element = await studioApi.element(place.file, place.loc).catch(() => null);
    if (element?.range && element.range.start <= child.range.start && child.range.end <= element.range.end) return { ...spot, parent, parentFile: place.file };
  }
  return spot;
}

/** Selects the layer a paste created once the canvas shows it; its undo goes back to `from` (the selection pasted at). */
function follow(response: { file: string; after: string }, loc: string, name: string, spot: Spot, before: WeakSet<Element>, from: StudioSelection | null, wrapped = false) {
  const at: NodeSelection = { kind: "node", src: `${response.file}:${loc}`, name, frameId: spot.frameId, panelId: spot.panelId, instance: 0 };
  // A wrapped component pasted with its wrap Stack: the component inside it is selected (the Stack when none is found).
  const next: StudioSelection = wrapped ? insideWrap(at, response.file, response.after, loc) : at;
  multiSelection.clear();
  expectRender(next, before, () => undefined, 1500);
  studioStore.setState({ selection: next });
  flushStudioStore();
  rememberInsert(response.file, response.after, from, next, Boolean(spot.replace));
}

/** Plain text pasted as a layer: a <Text> (builder/boardPaste.ts too). */
export const textLayer = (text: string) => `<Text>{${JSON.stringify(text.trim())}}</Text>`;

let pasting = false;

/** Pastes `code` (the clipboard's text; null: the Studio's own clip) next to / into / instead of the selection. */
async function pasteAt(selection: NodeSelection, text: string | null, replace: boolean, state?: readonly StateDecl[]): Promise<boolean> {
  if (pasting) return false;
  const check = canStructurallyEdit(selection);
  if (!check.ok) { fail(check.reason); return false; }
  const own = clip && (text === null || text.trim() === clip.code.trim()) ? clip : null;
  const raw = own ? own.code : text?.trim() ?? "";
  if (!raw) { fail("The clipboard is empty — copy a layer first"); return false; }
  const code = raw.startsWith("<") ? raw : textLayer(raw);
  pasting = true;
  try {
    // Into a content slot (user, 2026-10-12): the slot its Layers row selected, or the prop slot of the component that
    // holds the selected layer (PageHeader › Actions: after that layer; ⇧⌘R swaps it). A selected layout takes the paste
    // as its child (below), as does a children slot; a wrapped component counts by its Studio wrap Stack.
    const hit = hitOf(selection);
    // A selected floating wrapper Box (a component's own frame in a free frame) takes nothing inside: beside it, as its component.
    const wrapper = isFloatWrapper(hit?.hosts[0]);
    const intoLayout = !replace && !wrapper && Boolean(hit && isDropContainer(hit)) && !selectedSlotOf(selection);
    const wrapped = intoLayout || selectedSlotOf(selection) ? undefined : await studioWrapOf(selection);
    const slotted = intoLayout ? null : slotPasteTarget(selection) ?? (wrapped ? slotPasteTarget(wrapped) : null);
    if (slotted && (!replace || slotted.after)) {
      const file = parseSrc(slotted.host.src)?.file;
      const reads = state ?? (own && own.file !== file ? own.state : undefined);
      const name = selectedName(own?.wrapped ? own.name : /^<([\w.]+)/.exec(code)?.[1] ?? "layer");
      if (replace) return await swapSelection(slotted.after!, code, name, reads, await slotPasteWarning(slotted.host, slotted.slot, code));
      return await pasteIntoSlot({ host: slotted.host, slot: slotted.slot, code, name, after: slotted.after, from: selection, state: reads });
    }
    let spot = spotFor(selection, replace, wrapper);
    if (typeof spot === "string") { fail(spot); return false; }
    // Beside or instead of a wrapped component: beside or instead of its wrap Stack (the Stack holds that component only),
    // or of the floating Box that is its layer in a frame without auto layout (slots/actions.ts floatWrapOf).
    if (spot.after || spot.replace) {
      const wrap = wrapped !== undefined ? wrapped : await studioWrapOf(selection);
      // Paste to replace keeps a floating Box: the component inside it is what changes, so the layer stays where it floats.
      const outer = wrap && !(replace && wrap.name === "Box") ? spotFor(wrap, replace, true) : null;
      if (outer && typeof outer !== "string") spot = outer;
      spot = await sourceParent(spot);
    }
    // In a frame without auto layout the paste floats (floatPaste): the code as it lands, and whether a Box of its own
    // holds the component (then the component is selected inside it, as inside a wrap Stack).
    const floated = replace ? null : floatPaste(spot, code, own);
    const landing = floated?.code ?? code;
    const verb = replace ? "Paste to replace" : "Paste";
    // The host rules an insert from the picker follows (a control in a clickable card…): the paste goes in all the same.
    const warning = await pasteWarningIn(spot.parent, spot.frameId, spot.panelId, code);
    const before = renderedNow(canvasApi.getWorldElement());
    // The same file, its source still there: copy it as written (names checked where it lands). A copy that floats at
    // a point goes through pasteCode (the server's floatAt places it).
    if (own && own.file && own.loc && !own.cut && own.file === spot.parentFile && !spot.at && !floated) {
      const origin = await studioApi.element(own.file, own.loc);
      if (origin && origin.name === own.tag) {
        const op: Extract<EditOp, { op: "moveTo" }> = { op: "moveTo", parent: parseSrc(spot.parent.src)!.loc, copy: true };
        if (spot.after) op.after = parseSrc(spot.after)?.loc;
        if (spot.replace) op.replace = parseSrc(spot.replace)?.loc;
        const response = await applyEdit({ file: own.file, loc: own.loc, name: origin.name, ops: [op], hash: origin.hash }, `${verb} ${own.name}`);
        if (response.ok) notRecommended(warning);
        if (response.ok && response.inserted) follow(response, response.inserted.loc, selectedName(own.name), spot, before, selection, own.wrapped);
        return response.ok;
      }
    }
    const at = parseSrc(spot.parent.src)!;
    const parent = await studioApi.element(at.file, at.loc);
    if (!parent) { fail(`${spot.parent.name} is no longer there — select it again`); return false; }
    // The Studio's own copy from another file (or several files) brings the state it reads; in its own file it is there.
    const reads = state ?? (own && own.file !== at.file ? own.state : undefined);
    const op: Extract<EditOp, { op: "pasteCode" }> = { op: "pasteCode", code: landing, ...(reads?.length ? { state: reads.map((entry) => ({ ...entry })) } : {}) };
    if (spot.after) op.after = parseSrc(spot.after)?.loc;
    if (spot.replace) op.replace = parseSrc(spot.replace)?.loc;
    if (spot.at) op.at = spot.at;
    const name = own?.wrapped ? own.name : /^<([\w.]+)/.exec(code)?.[1] ?? "layer";
    const response = await applyEdit({ file: at.file, loc: at.loc, name: parent.name, ops: [op], hash: parent.hash }, `${verb} ${name}`);
    if (response.ok) notRecommended(warning);
    if (response.ok && response.inserted) {
      // A component floated in a Box of its own: the component inside it is selected (Figma selects the instance).
      const inside = floated?.wrapped ? wrappedChildLoc(response.after, response.inserted.loc) : null;
      follow(response, inside ?? response.inserted.loc, inside ? selectedName(name) : floated?.wrapped ? "Box" : selectedName(name), spot, before, selection, Boolean(own?.wrapped));
    }
    return response.ok;
  } finally {
    pasting = false;
  }
}

/* ── pasting at a point: Paste here, ⌘V with nothing selected ─────────────────────────────────────────────────────── */

const NO_DRAG: DropContext = { hosts: [], frame: undefined, parentHost: null, origin: null, layerSrc: null, copy: false };
/* The frame without auto layout a paste floats in (freeBlock), and px in it (localTo): ./freeBlock.ts, shared with the
 * library target. */

/**
 * A paste into a frame without auto layout floats (Figma's): the Studio's own floating layer at its offsets (as ⌘V
 * with nothing selected, spotInView); anything else (an Assets item, code) beside the layer it pastes after at its own
 * size with the page gap (edit/insertPlace.ts; UX review 2026-10-27 §2.4, the user's decision A). `code` comes back
 * floating (position, insets, a width for a component with none of its own), with the layer it is wrapped in when a
 * Box of its own holds it; null: the frame is a layout, the paste joins its flow.
 */
function floatPaste(spot: Spot, code: string, own: Clip | null): { code: string; wrapped: boolean } | null {
  const block = freeBlock(spot.parent.hosts[0]);
  if (!block) return null;
  const world = canvasApi.getWorldElement();
  const original = own?.file && own.loc && world ? findBySrc(world, `${own.file}:${own.loc}`)[0]?.hosts[0] : undefined;
  if (original instanceof HTMLElement && floats(original) && original.offsetParent instanceof HTMLElement) {
    const box = original.getBoundingClientRect();
    const at = localTo(original.offsetParent, box.left, box.top);
    spot.at = { x: Math.round(at.x), y: Math.round(at.y) };
    return { code, wrapped: false };
  }
  const device = screenOfBlock(block)?.dataset.device;
  const afterHit = spot.after && world ? findBySrc(world, spot.after)[0] : null;
  const afterRect = afterHit ? rectOf(afterHit.hosts) : null;
  const beside = afterRect && afterRect.width > 0 ? boxIn(block, afterRect) : null;
  const tag = /^<([\w.]+)/.exec(code)?.[1] ?? "Box";
  const root = tag.slice(tag.lastIndexOf(".") + 1);
  const width = needsWidth(root) ? widgetWidthIn(block.clientWidth, device) : null;
  const at = freeInsertAt({ width: block.clientWidth }, layerBoxesIn(block), beside, width, { margin: pageMarginFor(device) });
  return { code: floatingCode(code, root, at.x, at.y, width ?? undefined), wrapped: !FLOATS.has(root) };
}

/** Paste here: the layout under the pointer (where a drop would go), at the pointer in a frame without auto layout. */
function spotAtPoint(point: { x: number; y: number }): Spot | string {
  const found = dropTargetAt(point.x, point.y, NO_DRAG);
  const target = found.target;
  if (!target) return found.reason ?? "Paste here pastes into a frame: right-click inside one";
  const world = canvasApi.getWorldElement();
  const hits = world ? findBySrc(world, target.parentSrc) : [];
  const inside = (hit: FiberHit) => { const rect = rectOf(hit.hosts); return Boolean(rect && rect.left <= point.x && point.x <= rect.right && rect.top <= point.y && point.y <= rect.bottom); };
  const parent = hits.find(inside) ?? hits[0];
  const parsed = parent ? parseSrc(parent.src) : null;
  if (!parent || !parsed) return "The layer under the pointer is no longer there";
  const spot: Spot = { parent, parentFile: parsed.file, frameId: target.frameId, panelId: target.panelId };
  const block = freeBlock(parent.hosts[0]);
  if (block) {
    const at = localTo(block, point.x, point.y);
    spot.at = { x: Math.round(at.x), y: Math.round(at.y) };
  } else if (target.before) spot.before = target.before;
  else if (target.after) spot.after = target.after;
  return spot;
}

/**
 * ⌘V with nothing selected (or a frame): into the selected frame or the one most in view, as Figma pastes at the layer's
 * place. A frame without auto layout takes it where the copied layer floats (its offsets in its own frame), else in the
 * middle of what shows of it; a layout takes it as its last layer.
 */
function spotInView(frameId: string | null): Spot | string {
  const world = canvasApi.getWorldElement();
  const frame = frameId ? world?.querySelector(`[data-studio-frame="${CSS.escape(frameId)}"]`) ?? null : frameInView();
  if (!frame || !/^(?:example|screen|overlay):/.test(frame.getAttribute("data-studio-frame") ?? "")) return "Nothing here takes a paste: bring a frame into view, or select a layer";
  const screenHost = frame.querySelector(".studio-builder-screen");
  const screen = screenHost && freeBlock(screenHost) ? annotatedAt(screenHost) : null;
  const root = screen ? null : rootSelection(frame);
  const parent = screen ?? (root && world ? findBySrc(world, root.src)[root.instance] ?? null : null);
  const parsed = parent ? parseSrc(parent.src) : null;
  if (!parent || !parsed) return "This frame has no layer to paste into yet";
  const host = parent.hosts[0];
  const frameOfHost = frame.getAttribute("data-studio-frame");
  const spot: Spot = { parent, parentFile: parsed.file, frameId: frameOfHost, panelId: root?.panelId ?? null };
  if (!isDropContainer(parent) && !screen) { spot.after = parent.src; return spot; }
  const block = freeBlock(host);
  if (!block) return spot;
  // Where the copied layer floats (it is on the canvas still): the same offsets here.
  const original = clip?.file && clip.loc && world ? findBySrc(world, `${clip.file}:${clip.loc}`)[0]?.hosts[0] : undefined;
  if (original instanceof HTMLElement && floats(original) && original.offsetParent instanceof HTMLElement) {
    const box = original.getBoundingClientRect();
    const at = localTo(original.offsetParent, box.left, box.top);
    spot.at = { x: Math.round(at.x), y: Math.round(at.y) };
    return spot;
  }
  // Else in the middle of the part of the frame in view (its corner offset by half its size when it is on the canvas).
  const view = getViewportBox();
  const rect = block.getBoundingClientRect();
  const left = Math.max(rect.left, view.left);
  const top = Math.max(rect.top, view.top);
  const right = Math.min(rect.right, view.left + view.width);
  const bottom = Math.min(rect.bottom, view.top + view.height);
  const centre = right > left && bottom > top ? { x: (left + right) / 2, y: (top + bottom) / 2 } : { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  const at = localTo(block, centre.x, centre.y);
  const size = original ? original.getBoundingClientRect() : null;
  spot.at = { x: Math.max(0, Math.round(at.x - (size ? size.width / at.scale / 2 : 0))), y: Math.max(0, Math.round(at.y - (size ? size.height / at.scale / 2 : 0))) };
  return spot;
}

/* Plain text pasted with nothing selected: F6 (Session C, edit/textCreate.ts) makes Figma's text layer of it. */
let plainTextPaste: ((text: string) => Promise<boolean>) | null = null;
/** Lets the text tool make the layer a paste of plain text with nothing selected creates (null: a <Text> here). */
export const setPlainTextPaste = (paste: ((text: string) => Promise<boolean>) | null) => { plainTextPaste = paste; };
/** Pictures on the clipboard (a copied image, a screenshot) with no layer copied: Figma places them (F8, canvas/fileDrop.ts). */
let imagePaste: ((files: File[]) => boolean) | null = null;
export const setImagePaste = (paste: ((files: File[]) => boolean) | null) => { imagePaste = paste; };

/** Pastes `text` (null: the Studio's own clip) at `point` (Paste here), or with nothing selected into the frame in view. */
async function pasteOnCanvas(text: string | null, point: { x: number; y: number } | null): Promise<boolean> {
  if (pasting) return false;
  const own = clip && (text === null || text.trim() === clip.code.trim()) ? clip : null;
  const raw = own ? own.code : text?.trim() ?? "";
  if (!raw) { fail("The clipboard is empty — copy a layer first"); return false; }
  if (!own && !point && !raw.startsWith("<") && plainTextPaste) return plainTextPaste(raw);
  const code = raw.startsWith("<") ? raw : textLayer(raw);
  const selection = studioStore.getState().selection;
  const spot = point ? spotAtPoint(point) : spotInView(selection?.kind === "frame" ? selection.frameId : null);
  if (typeof spot === "string") { fail(spot); return false; }
  const into: NodeSelection = { kind: "node", src: spot.parent.src, name: spot.parent.name, frameId: spot.frameId, panelId: spot.panelId, instance: 0 };
  const check = canStructurallyEdit(into);
  if (!check.ok) { fail(check.reason); return false; }
  pasting = true;
  try {
    const at = parseSrc(spot.parent.src)!;
    const parent = await studioApi.element(at.file, at.loc);
    if (!parent) { fail(`${spot.parent.name} is no longer there`); return false; }
    const reads = own && own.file !== at.file ? own.state : undefined;
    const op: Extract<EditOp, { op: "pasteCode" }> = { op: "pasteCode", code, ...(reads?.length ? { state: reads.map((entry) => ({ ...entry })) } : {}), ...(spot.at ? { at: spot.at } : {}) };
    if (spot.before) op.before = parseSrc(spot.before)?.loc;
    else if (spot.after) op.after = parseSrc(spot.after)?.loc;
    const root = /^<([\w.]+)/.exec(code)?.[1] ?? "layer";
    const name = own?.wrapped ? own.name : root;
    const warning = await pasteWarningIn(spot.parent, spot.frameId, spot.panelId, code);
    const before = renderedNow(canvasApi.getWorldElement());
    const response = await applyEdit({ file: at.file, loc: at.loc, name: parent.name, ops: [op], hash: parent.hash }, point ? `Paste ${selectedName(name)} here` : `Paste ${selectedName(name)}`);
    if (response.ok) notRecommended(warning);
    // A layer that cannot float itself lands in its floating Box (the Box is the layer a click selects).
    const boxed = Boolean(spot.at) && !FLOATS.has(selectedName(root));
    if (response.ok && response.inserted) follow(response, response.inserted.loc, boxed ? "Box" : selectedName(name), spot, before, selection, !boxed && Boolean(own?.wrapped));
    return response.ok;
  } finally {
    pasting = false;
  }
}

/** "Not recommended: …" under the paste's outcome line (it pasted all the same, as an insert from the picker does). */
/** Adds the host rules' "Not recommended" reason to the edit's status (the layer still lands). */
export function notRecommended(reason: string | null) {
  const now = currentEditStatus();
  if (!reason || !now) return;
  announceEditStatus({ ...now, details: [...(now.details ?? []), `Not recommended: ${reason}`] });
}

/** Inserts `code` (one JSX element) into the selected layout, else right after the selected layer (Assets click). */
export const insertCode = (selection: NodeSelection, code: string, state?: readonly StateDecl[]) => pasteAt(selection, code, false, state);

/** The canvas names a `Layout.Stack` layer "Stack". */
const selectedName = (name: string) => name.slice(name.lastIndexOf(".") + 1);
/** Whether Swap instance applies: a component's layer, not a layout primitive or a Shape. */
const swappable = (name: string) => /^[A-Z]/.test(name) && nodeKind(name) !== "primitive" && nodeKind(name) !== "shape";

/* ── properties ──────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Figma's visual properties, the only ones ⌥⌘C copies (plan F3, walk §2): fill (`surface`, `fill`, a text's `tone`),
 * stroke, effects, corner radius, opacity and a text's style. Never X / Y / W / H, layout, content or behaviour.
 */
const VISUAL = /^(surface|fill|tone|border|stroke|strokeWeight|strokeAlign|effectStyle|radius|radiusTopLeft|radiusTopRight|radiusBottomRight|radiusBottomLeft|opacity|textStyle)$/;

function literalOf(attribute: SourceElement["attributes"][number]): EditValue | null {
  if (attribute.kind === "string") return { kind: "string", value: attribute.value ?? "" };
  if (attribute.kind === "true") return { kind: "boolean", value: true };
  if (attribute.kind !== "expression") return null;
  const raw = (attribute.value ?? "").trim();
  if (raw === "true" || raw === "false") return { kind: "boolean", value: raw === "true" };
  if (/^-?\d+(\.\d+)?$/.test(raw)) return { kind: "number", value: Number(raw) };
  return null;
}

async function copyProperties(selection: NodeSelection) {
  const at = parseSrc(selection.src);
  const element = at ? await studioApi.element(at.file, at.loc) : null;
  if (!element) { fail(`${selection.name} could not be read`); return; }
  const values = element.attributes.flatMap((attribute) => {
    if (!VISUAL.test(attribute.name)) return [];
    const value = literalOf(attribute);
    return value ? [{ name: attribute.name, value }] : [];
  });
  if (!values.length) { fail(`${element.name} has no fill, stroke, effect, radius, opacity or text style to copy (only values written in the code are copied)`); return; }
  propsClip = { name: element.name, values };
  done(`Copied ${values.length} propert${values.length === 1 ? "y" : "ies"} of ${element.name} · ${clipboardShortcuts.pasteProps} to paste`);
}

async function pasteProperties(selection: NodeSelection) {
  if (!propsClip) { fail(`Copy properties first (${clipboardShortcuts.copyProps})`); return; }
  if (!canEdit()) { fail("View only"); return; }
  const at = parseSrc(selection.src);
  const element = at ? await studioApi.element(at.file, at.loc) : null;
  if (!element || !at) { fail(`${selection.name} could not be read`); return; }
  const accepted = new Set(propSpecs(selectedName(element.name)).map((spec) => spec.name));
  const same = selectedName(element.name) === selectedName(propsClip.name);
  const values = propsClip.values.filter((entry) => same || accepted.has(entry.name));
  const bound = new Set(element.attributes.filter((attribute) => attribute.kind === "expression" && !literalOf(attribute)).map((attribute) => attribute.name));
  const ops: EditOp[] = values.filter((entry) => !bound.has(entry.name)).map((entry) => ({ op: "setProp", name: entry.name, value: entry.value }));
  // The same component looks the same after it, as in Figma: its own visual props the copy did not have go.
  const copied = new Set(propsClip.values.map((entry) => entry.name));
  if (same) for (const attribute of element.attributes) if (VISUAL.test(attribute.name) && !copied.has(attribute.name) && !bound.has(attribute.name)) ops.push({ op: "removeProp", name: attribute.name });
  if (!ops.length) { fail(`${element.name} takes none of the copied ${propsClip.name} properties`); return; }
  await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops, hash: element.hash }, `Paste properties on ${element.name}`);
}

/* ── keys, clipboard events and the canvas menu ──────────────────────────────────────────────────────────────────── */

/** The canvas itself has focus (not a field, a panel control or the text editor). */
function onCanvas(target: EventTarget | null) {
  const element = target instanceof Element ? target : null;
  if (textEditSession.get() || isTypingTarget(element)) return false;
  return !element || element === document.body || element.matches(".studio-viewport");
}

/**
 * Where a copy, cut or paste event was meant: the focused element. The event's own target is where the DOM selection
 * sits, and a click on the canvas leaves that in the selection overlay's capture layer, so ⌘C after a click was
 * dropped (E2E K-07).
 */
const clipboardFocus = () => document.activeElement;

/** ⌘V with nothing or a frame selected pastes into a frame (the select tool, not presenting, the selection no layer). */
function pastesInView() {
  const state = studioStore.getState();
  return state.tool === "select" && !state.presenting && (!state.selection || state.selection.kind === "frame");
}

function ready_(): NodeSelection | null {
  const state = studioStore.getState();
  if (state.tool !== "select" || state.presenting) return null;
  return selectedNode();
}

export function useClipboard() {
  useEffect(() => {
    const unsubscribe = studioStore.subscribe(prefetch);
    prefetch();
    const onCopy = (event: ClipboardEvent) => {
      const selection = ready_();
      if (!selection || !onCanvas(clipboardFocus())) return;
      event.preventDefault();
      if (multiSelection.get().length) void copyLayers(false);
      else void copyLayer(selection, event.clipboardData, false);
    };
    const onCut = (event: ClipboardEvent) => {
      const selection = ready_();
      if (!selection || !onCanvas(clipboardFocus())) return;
      event.preventDefault();
      if (multiSelection.get().length) { void copyLayers(true); return; }
      const check = canStructurallyEdit(selection);
      if (!check.ok) { fail(check.reason); return; }
      void copyLayer(selection, event.clipboardData, true).then((copied) => { if (copied) void removeSelection(selection); });
    };
    const onPaste = (event: ClipboardEvent) => {
      if (!onCanvas(clipboardFocus())) return;
      // Pictures and no layer copied (no text): placed as Figma places them (F8).
      const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith("image/"));
      if (files.length && !event.clipboardData?.getData("text/plain") && imagePaste?.(files)) { event.preventDefault(); return; }
      const selection = ready_();
      if (selection) {
        event.preventDefault();
        void pasteAt(selection, event.clipboardData?.getData("text/plain") ?? null, false);
        return;
      }
      // Nothing (or a frame) selected: into the frame, at the layer's place (Figma).
      if (!pastesInView()) return;
      event.preventDefault();
      void pasteOnCanvas(event.clipboardData?.getData("text/plain") ?? null, null);
    };
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.isComposing) return;
      const code = event.code;
      const replace = event.shiftKey && !event.altKey && code === "KeyR";
      const props = event.altKey && !event.shiftKey && (code === "KeyC" || code === "KeyV");
      if (!replace && !props) return;
      const selection = ready_();
      if (!selection || !onCanvas(event.target ?? document.activeElement)) return;
      // ⇧⌘R would hard-reload the page; ⌥⌘C / ⌥⌘V have no browser meaning on the canvas.
      event.preventDefault();
      event.stopPropagation();
      if (replace) void pasteFromMenu(selection, true);
      else if (code === "KeyC") void copyProperties(selection);
      else void pasteProperties(selection);
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKey, true);
    return () => {
      unsubscribe();
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKey, true);
    };
  }, []);
}

/** A paste without a clipboard event (menu, ⇧⌘R): the Studio's clip, else the system clipboard's text. */
async function pasteFromMenu(selection: NodeSelection, replace: boolean) {
  if (clip) return pasteAt(selection, null, replace);
  const text = await navigator.clipboard?.readText().catch(() => null);
  return pasteAt(selection, text ?? "", replace);
}

/** Paste here (a canvas menu at `point`), or ⌘V's paste into the frame in view (null): the clip, else the clipboard's text. */
export async function pasteHere(point: { x: number; y: number } | null) {
  if (clip) return pasteOnCanvas(null, point);
  const text = await navigator.clipboard?.readText().catch(() => null);
  return pasteOnCanvas(text ?? "", point);
}

/** The clipboard actions for other entry points (Quick actions ⌘/). */
export const clipboardActions = {
  copy: (selection: NodeSelection) => (multiSelection.get().length ? copyLayers(false) : copyLayer(selection, null, false)),
  cut: (selection: NodeSelection) => (multiSelection.get().length ? copyLayers(true) : copyLayer(selection, null, true).then((copied) => { if (copied) void removeSelection(selection); })),
  paste: (selection: NodeSelection | null) => (selection ? pasteFromMenu(selection, false) : pasteHere(null)),
  replace: (selection: NodeSelection) => pasteFromMenu(selection, true),
  copyProperties,
  pasteProperties,
  hasProperties: () => Boolean(propsClip),
};

/** Figma's Paste here: the clipboard at the pointer that opened the menu (`point`), in the layout or frame under it. */
export function pasteHereItem(point: { x: number; y: number }): MenuEntry {
  return { id: "clip-paste-here", label: "Paste here", icon: "icon-clipboard-line", disabled: !canEdit(), onSelect: () => { void pasteHere(point); } };
}

/** The canvas menu's clipboard group (shell/CanvasMenu.tsx); `point`: where it opened (Paste here). */
export function clipboardMenuItems(selection: StudioSelection | null, point?: { x: number; y: number } | null): MenuEntry[] {
  if (selection?.kind !== "node" || selection.part) return [];
  const node = selection as NodeSelection;
  const editable = canStructurallyEdit(node);
  const reason = editable.ok ? undefined : editable.reason;
  return [
    { id: "clip-copy", label: "Copy", icon: "icon-copy-line", shortcut: clipboardShortcuts.copy, onSelect: () => { void copyLayer(node, null, false); } },
    // A Screen of a page you made: Copy carries it to Figma too; this names it (⌘V in the Zen plugin places it).
    ...(screenOf(node) ? [{ id: "clip-copy-figma", label: "Copy for Figma", icon: "icon-copy-line" as const, onSelect: () => { copyScreenForFigma(node); } }] : []),
    { id: "clip-cut", label: "Cut", icon: "icon-scissors-line", shortcut: clipboardShortcuts.cut, disabled: !editable.ok, caption: reason, onSelect: () => { void copyLayer(node, null, true).then((copied) => { if (copied) void removeSelection(node); }); } },
    { id: "clip-paste", label: "Paste", icon: "icon-clipboard-line", shortcut: clipboardShortcuts.paste, disabled: !editable.ok, caption: reason, onSelect: () => { void pasteFromMenu(node, false); } },
    ...(point ? [pasteHereItem(point)] : []),
    { id: "clip-replace", label: "Paste to replace", icon: "icon-switch-horizontal-01-line", shortcut: clipboardShortcuts.replace, disabled: !editable.ok, caption: reason, onSelect: () => { void pasteFromMenu(node, true); } },
    // Figma's Swap instance (GĐ4 M2): Quick insert in its Swap mode, for a component layer — never a drawn object (a
    // shape, a frame, text: user, 2026-10-17), as Figma offers it on instances only.
    ...(swappable(selectedName(node.name)) ? [{ id: "swap-instance", label: "Swap instance…", icon: "icon-switch-horizontal-01-line" as const, disabled: !editable.ok, caption: reason, onSelect: () => openQuickInsert("swap") }] : []),
    { id: "clip-copy-props", label: "Copy properties", icon: "icon-brush-01-line", shortcut: clipboardShortcuts.copyProps, onSelect: () => { void copyProperties(node); } },
    { id: "clip-paste-props", label: "Paste properties", icon: "icon-brush-02-line", shortcut: clipboardShortcuts.pasteProps, disabled: !propsClip || !canEdit(), caption: propsClip ? `From ${propsClip.name}` : undefined, onSelect: () => { void pasteProperties(node); } },
  ];
}
