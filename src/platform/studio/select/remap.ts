import { parseSrc, subscribeStudioWrites } from "../api";
import { mapLine } from "../code/diff";
import { studioStore } from "../store";
import type { StudioPartRef, StudioSelection, StudioWrite } from "../types";

/*
 * Keeps the selection on the same JSX element when the Studio rewrites its file (an inspector edit, undo, redo). A
 * selection is stored as "<file>:<line>:<col>", so a write that adds or removes lines above it would otherwise point it
 * at whatever element starts there now. The canvas (SelectionLayer) adds two more checks: the selected DOM node read
 * again after the re-render, and a name check that drops a selection it can no longer trust.
 */

export type { StudioWrite };

/* A remapped selection → the selection it replaced: the same element at a new location, not a new pick. */
const previous = new WeakMap<StudioSelection, StudioSelection>();

/** Whether `next` is `base` itself or `base` moved by writes since (not a selection the person made). */
export function sameSelectedElement(base: StudioSelection | null, next: StudioSelection | null): boolean {
  if (!base || !next) return false;
  let cursor: StudioSelection | undefined = next;
  for (let guard = 0; cursor && guard < 100; guard++) {
    if (cursor === base) return true;
    cursor = previous.get(cursor);
  }
  return false;
}

/** Moves the node selection to `src` (same element, new location). */
export function remapSelection(src: string) {
  const current = studioStore.getState().selection;
  if (current?.kind !== "node" || current.src === src) return;
  const next: StudioSelection = { ...current, src };
  previous.set(next, current);
  studioStore.setState({ selection: next });
}

/** Moves the selected part to its new DOM path after a re-render (same part, same panel). */
export function remapPart(part: StudioPartRef) {
  const current = studioStore.getState().selection;
  if (current?.kind !== "node" || !current.part || (current.part.name === part.name && current.part.path.join(".") === part.path.join("."))) return;
  const next: StudioSelection = { ...current, part };
  previous.set(next, current);
  studioStore.setState({ selection: next });
}

/* Elements the inspector is writing right now ("file:line:col"). Editing an element never moves its own start, even
 * when its first line changes (an attribute on the same line as the tag). */
const editing = new Map<string, number>();

/** Marks `src` as the target of an edit in flight; call the returned function when the request is done. */
export function noteEditTarget(src: string): () => void {
  editing.set(src, (editing.get(src) ?? 0) + 1);
  let done = false;
  return () => {
    if (done) return;
    done = true;
    const count = (editing.get(src) ?? 1) - 1;
    if (count > 0) editing.set(src, count);
    else editing.delete(src);
  };
}

/** `file:line:col` after a write to its file: the new location, the same one when the element was the edit target,
 * or null when its line changed for another reason (the canvas then reads the element's new location after the re-render). */
export function mapSrc(src: string, write: StudioWrite): string | null {
  const parsed = parseSrc(src);
  if (!parsed || parsed.file !== write.file) return src;
  if (write.kind === "edit" && editing.has(src)) return src;
  const line = mapLine(write.before, write.after, parsed.line);
  return line === null ? null : `${parsed.file}:${line}:${parsed.column}`;
}

/* Waiting for the re-render that follows a write: until then the canvas still shows the old annotations, so a
 * mismatch between the stored location and the DOM is expected, not a reason to drop the selection. */
let awaitingRender = 0;
/** True for a short while after the Studio wrote a file, until Vite re-rendered it. */
export const awaitingWriteRender = () => performance.now() < awaitingRender;
/** Called after Vite applied an update. */
export function writeRendered() {
  awaitingRender = 0;
}

/*
 * A selection the Studio moves onto an element that only the next render shows (a detach's new root, the component its
 * undo gives back). Until then the canvas still shows the render before the write, whose element at that location (if
 * any) is another one: the canvas waits for an element of the selection's name that was not on the page before the
 * write, and never drops the selection meanwhile.
 */
/** How a wait ended: the canvas showed the element, it did not render in time, or another wait replaced it. */
export type RenderWaitEnd = "shown" | "timeout" | "replaced";
type Expectation = { selection: StudioSelection; before: WeakSet<Element>; settled: (end: RenderWaitEnd) => void; timer: number };
let expectation: Expectation | null = null;

/** Every element rendered inside `root` right now: what "before the write" means for expectRender. */
export function renderedNow(root: Element | null): WeakSet<Element> {
  const seen = new WeakSet<Element>();
  if (!root) return seen;
  seen.add(root);
  root.querySelectorAll("*").forEach((element) => seen.add(element));
  return seen;
}

function settle(end: RenderWaitEnd) {
  const pending = expectation;
  if (!pending) return;
  expectation = null;
  window.clearTimeout(pending.timer);
  pending.settled(end);
}

/** Waits for `selection` to render as a new element (not one of `before`); `settled` runs once, when the wait ends. */
export function expectRender(selection: StudioSelection, before: WeakSet<Element>, settled: (end: RenderWaitEnd) => void, timeout = 10_000) {
  settle("replaced");
  expectation = { selection, before, settled, timer: window.setTimeout(() => settle("timeout"), timeout) };
}

/** The elements rendered before the write the selection is waiting for (it, or it moved by writes since); null when it waits for nothing. */
export function awaitedRender(selection: StudioSelection | null): WeakSet<Element> | null {
  const pending = expectation;
  return pending && sameSelectedElement(pending.selection, selection) ? pending.before : null;
}

/** The canvas shows the awaited element. */
export function awaitedRenderShown(selection: StudioSelection | null) {
  if (expectation && sameSelectedElement(expectation.selection, selection)) settle("shown");
}

const writeListeners = new Set<(write: StudioWrite) => void>();
/** Calls `listener` after every write the Studio made (after the selection was remapped). */
export function onStudioWrite(listener: (write: StudioWrite) => void): () => void {
  writeListeners.add(listener);
  return () => { writeListeners.delete(listener); };
}

function onWrite(write: StudioWrite) {
  if (write.before === write.after) return;
  awaitingRender = performance.now() + 2500;
  const selection = studioStore.getState().selection;
  if (selection?.kind === "node") {
    const next = mapSrc(selection.src, write);
    if (next && next !== selection.src) remapSelection(next);
  }
  writeListeners.forEach((listener) => listener(write));
}

const unsubscribe = subscribeStudioWrites(onWrite);
import.meta.hot?.dispose(unsubscribe);
