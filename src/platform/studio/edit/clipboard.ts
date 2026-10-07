import { useEffect } from "react";
import type { MenuEntry } from "../../../components/Menu";
import { announceEditStatus, applyEdit, parseSrc, studioApi, subscribeStudioWrites } from "../api";
import { canvasApi } from "../canvas/viewport";
import { openQuickInsert } from "../builder/library/quickInsertState";
import { propSpecs } from "../inspector/propSchema";
import { findBySrc, isTypingTarget, parentHit, type FiberHit } from "../select/picker";
import { multiSelection, selectedLayers } from "../select/multiSelection";
import { expectRender, mapSrc, renderedNow } from "../select/remap";
import { canStructurallyEdit, rememberInsert, removeSelection } from "../slots/actions";
import { canEdit, flushStudioStore, studioStore } from "../store";
import type { EditOp, EditValue, SourceElement, StateDecl, StudioSelection } from "../types";
import type { NodeSelection } from "./arrange";
import { isDropContainer } from "./drag";
import { codeOfLayers, removeLayers } from "./multi";
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
 * - ⇧⌘R pastes to replace the selected layer. ⌥⌘C / ⌥⌘V copy and paste its properties (the literal, non-content
 *   props the target accepts), one undo step.
 * Every paste is one draft edit and one undo step; the pasted layer gets selected.
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

type Clip = { file: string; loc: string | null; name: string; code: string; cut: boolean };
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
let ready: { src: string; element: SourceElement; code: string } | null = null;
let readFor: string | null = null;
async function readLayer(selection: NodeSelection): Promise<{ element: SourceElement; code: string } | null> {
  const at = parseSrc(selection.src);
  if (!at) return null;
  const [element, source] = await Promise.all([studioApi.element(at.file, at.loc), studioApi.source(at.file).catch(() => null)]);
  if (!element || !source || element.name.slice(element.name.lastIndexOf(".") + 1) !== selection.name.slice(selection.name.lastIndexOf(".") + 1)) return null;
  const code = codeOf(element, source.content);
  return code ? { element, code } : null;
}
function prefetch() {
  const selection = selectedNode();
  if (!selection || selection.src === readFor) return;
  readFor = selection.src;
  ready = null;
  void readLayer(selection).then((read) => { if (read && readFor === selection.src) ready = { src: selection.src, ...read }; });
}

/** ⌘C / ⌘X on a multi-selection: the layers' code in source order (they paste together, in that order). */
async function copyLayers(cut: boolean) {
  const layers = selectedLayers();
  const read = await codeOfLayers(layers);
  if (typeof read === "string") { fail(read); return false; }
  await navigator.clipboard?.writeText(read.code).catch(() => undefined);
  clip = { file: read.file, loc: null, name: `${layers.length} layers`, code: read.code, cut };
  if (cut) return removeLayers(layers);
  done(`Copied ${layers.length} layers · ${clipboardShortcuts.paste} to paste`);
  return true;
}

/** Copies the selected layer (`text`: the clipboard event's data to fill, else the async clipboard API). */
async function copyLayer(selection: NodeSelection, data: DataTransfer | null, cut: boolean): Promise<boolean> {
  const cached = ready && ready.src === selection.src ? ready : null;
  if (cached && data) data.setData("text/plain", cached.code);
  const read = cached ?? (await readLayer(selection));
  if (!read) {
    fail(`${selection.name} could not be copied (restart the dev server if this persists)`);
    return false;
  }
  if (!cached || !data) await navigator.clipboard?.writeText(read.code).catch(() => undefined);
  const at = parseSrc(selection.src)!;
  clip = { file: at.file, loc: at.loc, name: read.element.name, code: read.code, cut };
  if (!cut) done(`Copied ${read.element.name} · ${clipboardShortcuts.paste} to paste`);
  return true;
}

/* ── where a paste goes ──────────────────────────────────────────────────────────────────────────────────────────── */

type Spot = { parent: FiberHit; parentFile: string; after?: string; replace?: string; frameId: string | null; panelId: string | null };

function hitOf(selection: NodeSelection): FiberHit | null {
  const world = canvasApi.getWorldElement();
  if (!world) return null;
  const hits = findBySrc(world, selection.src);
  return hits[selection.instance] ?? hits[0] ?? null;
}

/** Into the selected layout (last), else after the selected layer; `replace`: in the selected layer's place. */
function spotFor(selection: NodeSelection, replace: boolean): Spot | string {
  const hit = hitOf(selection);
  if (!hit) return "Select a layer on the canvas to paste next to or into";
  const frame = hit.hosts[0]?.closest("[data-studio-frame]") ?? null;
  const into = !replace && isDropContainer(hit);
  const parent = into ? hit : parentHit(hit, frame);
  if (!parent) return `${selection.name} has no parent layer to paste beside`;
  const parsed = parseSrc(parent.src);
  if (!parsed) return "The layer's place is unknown";
  const spot: Spot = { parent, parentFile: parsed.file, frameId: selection.frameId, panelId: selection.panelId };
  if (replace) spot.replace = selection.src;
  else if (!into) spot.after = selection.src;
  return spot;
}

/** Selects the layer a paste created once the canvas shows it; its undo goes back to `from` (the selection pasted at). */
function follow(response: { file: string; after: string }, loc: string, name: string, spot: Spot, before: WeakSet<Element>, from: StudioSelection) {
  const next: StudioSelection = { kind: "node", src: `${response.file}:${loc}`, name, frameId: spot.frameId, panelId: spot.panelId, instance: 0 };
  multiSelection.clear();
  expectRender(next, before, () => undefined, 1500);
  studioStore.setState({ selection: next });
  flushStudioStore();
  rememberInsert(response.file, response.after, from, next, Boolean(spot.replace));
}

const textLayer = (text: string) => `<Text>{${JSON.stringify(text.trim())}}</Text>`;

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
  const spot = spotFor(selection, replace);
  if (typeof spot === "string") { fail(spot); return false; }
  pasting = true;
  try {
    const before = renderedNow(canvasApi.getWorldElement());
    const verb = replace ? "Paste to replace" : "Paste";
    // The same file, its source still there: copy it as written (names checked where it lands).
    if (own && own.loc && !own.cut && own.file === spot.parentFile) {
      const origin = await studioApi.element(own.file, own.loc);
      if (origin && origin.name === own.name) {
        const op: Extract<EditOp, { op: "moveTo" }> = { op: "moveTo", parent: parseSrc(spot.parent.src)!.loc, copy: true };
        if (spot.after) op.after = parseSrc(spot.after)?.loc;
        if (spot.replace) op.replace = parseSrc(spot.replace)?.loc;
        const response = await applyEdit({ file: own.file, loc: own.loc, name: origin.name, ops: [op], hash: origin.hash }, `${verb} ${origin.name}`);
        if (response.ok && response.inserted) follow(response, response.inserted.loc, selectedName(origin.name), spot, before, selection);
        return response.ok;
      }
    }
    const at = parseSrc(spot.parent.src)!;
    const parent = await studioApi.element(at.file, at.loc);
    if (!parent) { fail(`${spot.parent.name} is no longer there — select it again`); return false; }
    const op: Extract<EditOp, { op: "pasteCode" }> = { op: "pasteCode", code, ...(state?.length ? { state: state.map((entry) => ({ ...entry })) } : {}) };
    if (spot.after) op.after = parseSrc(spot.after)?.loc;
    if (spot.replace) op.replace = parseSrc(spot.replace)?.loc;
    const name = /^<([\w.]+)/.exec(code)?.[1] ?? "layer";
    const response = await applyEdit({ file: at.file, loc: at.loc, name: parent.name, ops: [op], hash: parent.hash }, `${verb} ${name}`);
    if (response.ok && response.inserted) follow(response, response.inserted.loc, selectedName(name), spot, before, selection);
    return response.ok;
  } finally {
    pasting = false;
  }
}

/** Inserts `code` (one JSX element) into the selected layout, else right after the selected layer (Assets click). */
export const insertCode = (selection: NodeSelection, code: string, state?: readonly StateDecl[]) => pasteAt(selection, code, false, state);

/** The canvas names a `Layout.Stack` layer "Stack". */
const selectedName = (name: string) => name.slice(name.lastIndexOf(".") + 1);

/* ── properties ──────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Props that carry content, identity or behaviour, never "how it looks": not copied by ⌥⌘C. */
const NOT_STYLE = /^(key|ref|children|className|style|id|name|value|defaultValue|checked|defaultChecked|selected|open|defaultOpen|href|src|srcSet|alt|htmlFor|type|form|action|label|title|description|caption|placeholder|legend|heading|subtitle|content|text|tooltip|helperText|errorText|error|message|icon|leadingIcon|trailingIcon|data-.*|aria-.*|on[A-Z].*)$/;

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
    if (NOT_STYLE.test(attribute.name)) return [];
    const value = literalOf(attribute);
    return value ? [{ name: attribute.name, value }] : [];
  });
  if (!values.length) { fail(`${element.name} has no properties to copy (only values written in the code are copied)`); return; }
  propsClip = { name: element.name, values };
  done(`Copied ${values.length} propert${values.length === 1 ? "y" : "ies"} of ${element.name} · ${clipboardShortcuts.pasteProps} to paste`);
}

async function pasteProperties(selection: NodeSelection) {
  if (!propsClip) { fail(`Copy properties first (${clipboardShortcuts.copyProps})`); return; }
  if (!canEdit()) { fail("View only — switch to Admin to edit"); return; }
  const at = parseSrc(selection.src);
  const element = at ? await studioApi.element(at.file, at.loc) : null;
  if (!element || !at) { fail(`${selection.name} could not be read`); return; }
  const accepted = new Set(propSpecs(selectedName(element.name)).map((spec) => spec.name));
  const same = selectedName(element.name) === selectedName(propsClip.name);
  const values = propsClip.values.filter((entry) => same || accepted.has(entry.name));
  const bound = new Set(element.attributes.filter((attribute) => attribute.kind === "expression" && !literalOf(attribute)).map((attribute) => attribute.name));
  const ops: EditOp[] = values.filter((entry) => !bound.has(entry.name)).map((entry) => ({ op: "setProp", name: entry.name, value: entry.value }));
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
      const selection = ready_();
      if (!selection || !onCanvas(clipboardFocus())) return;
      event.preventDefault();
      void pasteAt(selection, event.clipboardData?.getData("text/plain") ?? null, false);
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

/** The clipboard actions for other entry points (Quick actions ⌘/). */
export const clipboardActions = {
  copy: (selection: NodeSelection) => (multiSelection.get().length ? copyLayers(false) : copyLayer(selection, null, false)),
  cut: (selection: NodeSelection) => (multiSelection.get().length ? copyLayers(true) : copyLayer(selection, null, true).then((copied) => { if (copied) void removeSelection(selection); })),
  paste: (selection: NodeSelection) => pasteFromMenu(selection, false),
  replace: (selection: NodeSelection) => pasteFromMenu(selection, true),
  copyProperties,
  pasteProperties,
  hasProperties: () => Boolean(propsClip),
};

/** The canvas menu's clipboard group (shell/CanvasMenu.tsx). */
export function clipboardMenuItems(selection: StudioSelection | null): MenuEntry[] {
  if (selection?.kind !== "node" || selection.part) return [];
  const node = selection as NodeSelection;
  const editable = canStructurallyEdit(node);
  const reason = editable.ok ? undefined : editable.reason;
  return [
    { id: "clip-copy", label: "Copy", icon: "icon-copy-line", shortcut: clipboardShortcuts.copy, onSelect: () => { void copyLayer(node, null, false); } },
    { id: "clip-cut", label: "Cut", icon: "icon-scissors-line", shortcut: clipboardShortcuts.cut, disabled: !editable.ok, caption: reason, onSelect: () => { void copyLayer(node, null, true).then((copied) => { if (copied) void removeSelection(node); }); } },
    { id: "clip-paste", label: "Paste", icon: "icon-clipboard-line", shortcut: clipboardShortcuts.paste, disabled: !editable.ok, caption: reason, onSelect: () => { void pasteFromMenu(node, false); } },
    { id: "clip-replace", label: "Paste to replace", icon: "icon-switch-horizontal-01-line", shortcut: clipboardShortcuts.replace, disabled: !editable.ok, caption: reason, onSelect: () => { void pasteFromMenu(node, true); } },
    // Figma's Swap instance (GĐ4 M2): Quick insert in its Swap mode, for a component layer.
    ...(/^[A-Z]/.test(selectedName(node.name)) ? [{ id: "swap-instance", label: "Swap instance…", icon: "icon-switch-horizontal-01-line" as const, disabled: !editable.ok, caption: reason, onSelect: () => openQuickInsert("swap") }] : []),
    { id: "clip-copy-props", label: "Copy properties", icon: "icon-brush-01-line", shortcut: clipboardShortcuts.copyProps, onSelect: () => { void copyProperties(node); } },
    { id: "clip-paste-props", label: "Paste properties", icon: "icon-brush-02-line", shortcut: clipboardShortcuts.pasteProps, disabled: !propsClip || !canEdit(), caption: propsClip ? `From ${propsClip.name}` : undefined, onSelect: () => { void pasteProperties(node); } },
  ];
}
