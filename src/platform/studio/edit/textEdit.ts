import { useSyncExternalStore } from "react";
import { applyEdit, parseSrc, studioApi } from "../api";
import { canvasApi, getViewport } from "../canvas/viewport";
import { inspectorStatus } from "../inspector/status";
import { multiSelection } from "../select/multiSelection";
import { rowOf } from "../inspector/detach";
import { childHits, fiberOf, findBySrc, srcOf, type Fiber } from "../select/picker";
import { canEdit, studioStore } from "../store";
import { cellFieldOf, rowFieldsOf, tableCellOf } from "../table/tableCells";
import type { DataSource, EditOp, SourceElement, StudioSelection } from "../types";

/*
 * Inline text editing on the canvas (Figma: double-click a text layer, or Enter on it, edits it in place).
 * docs/research/studio-figma-editing-plan-2026-10-03.md, Phase 1.
 *
 * The rendered text node under the pointer leads (through React fibers) to the annotated JSX elements around it; the
 * first one whose source holds that exact text — a literal text child (`<Button>Save</Button>`) or a string prop
 * (`<ListItem title="Invoices">`) — is what the edit writes (op setText / setProp: one draft edit, one undo step).
 * Text from data (`title={one.name}` in a `.map` row, `{studio.name}`) is written where the data holds it (op
 * setDataField, the row counted on the canvas; plan WP-F, E2E DA-02) when the dev server says it can be. A Table cell's
 * text writes its row (2026-10-10): the row the <tr> draws, named by its key, in the data the Table reads; a column
 * without `cell` draws the row's field itself, so that field of the Table's rows is written.
 * While typing, the rendered text node gets the new value so the layout reflows live, as in Figma; the editor
 * (TextEditor.tsx) draws the text over it. Other text that comes from an expression is not edited here.
 */

export type TextTarget = {
  /** The rendered text node being edited and the element that holds it. */
  node: Text;
  host: HTMLElement;
  /** The annotated JSX element the edit writes to. */
  file: string;
  loc: string;
  src: string;
  element: SourceElement;
  /**
   * `data`: the text comes from data (a `.map` row's item, a Table cell's row, a data const): op setDataField writes it
   * there (WP-C). `rowKey` / `table`: a Table cell's row key and Table loc; `field`: the row field a column without
   * `cell` draws (sent on the Table).
   */
  op: { kind: "text"; index: number } | { kind: "prop"; name: string } | { kind: "data"; prop?: string; child?: number; row?: number; rowKey?: string; rowFields?: Record<string, string | number | boolean>; table?: string; field?: string[]; source: string };
  /** The rendered text at the start (restored on a failed or empty edit). */
  original: string;
  /** How many places the edit changes (a `.map` row renders the same source several times). */
  instances: number;
  /** The text may hold line breaks (its white-space keeps them). */
  multiline: boolean;
  /** Where the caret starts: an offset in the text, or the whole text selected. */
  caret: number | "all";
};

/* ── session store (one editor at a time) ─────────────────────────────────────────────────────────────────────────── */

let session: TextTarget | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const textEditSession = {
  get: () => session,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

export const useTextEditSession = () => useSyncExternalStore(textEditSession.subscribe, textEditSession.get, () => null);

/** Ends the session without writing (the editor already committed or gave up). */
export function endTextEdit() {
  if (!session) return;
  session = null;
  emit();
}

/* ── finding the text under the pointer ──────────────────────────────────────────────────────────────────────────── */

const CANVAS_ROOTS = ".studio-world, .studio-portal-root";
/** Props whose string value never renders as the element's visible text. */
const NOT_TEXT_PROPS = /^(className|class|style|id|key|href|src|srcSet|alt|type|role|name|value|htmlFor|target|rel|lang|dir|tabIndex|icon|leadingIcon|trailingIcon|textStyle|tone|level|size|variant|theme|as|data-.*|aria-.*)$/;

/** Text as the comparison sees it: runs of white space (no-break spaces too) as one space, no edge spaces. */
export const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

function rectsOf(node: Text): DOMRect[] {
  const range = document.createRange();
  range.selectNodeContents(node);
  return Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
}

const contains = (rect: DOMRect, x: number, y: number, slop = 2) =>
  x >= rect.left - slop && x <= rect.right + slop && y >= rect.top - slop && y <= rect.bottom + slop;

function visibleText(node: Text) {
  if (!normalizeText(node.nodeValue ?? "")) return false;
  const parent = node.parentElement;
  if (!parent) return false;
  const style = getComputedStyle(parent);
  return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0;
}

/** The visible, non-blank text node whose glyphs are under (x, y) on the canvas, or null. */
export function textNodeAt(x: number, y: number): Text | null {
  const seen = new Set<Element>();
  for (const element of document.elementsFromPoint(x, y)) {
    if (!element.closest(CANVAS_ROOTS) || element.matches(CANVAS_ROOTS)) continue;
    // Its text nodes, deepest first (an overlay such as a row's click target lies over the text it covers).
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let count = 0;
    for (let node = walker.nextNode() as Text | null; node && count < 400; node = walker.nextNode() as Text | null, count++) {
      const parent = node.parentElement;
      if (!parent || seen.has(parent)) continue;
      if (visibleText(node) && rectsOf(node).some((rect) => contains(rect, x, y))) return node;
    }
    seen.add(element);
  }
  return null;
}

/** The caret offset in `node` nearest to (x, y). */
export function offsetAt(node: Text, x: number, y: number): number {
  const text = node.nodeValue ?? "";
  const range = document.createRange();
  let best = text.length;
  let bestDistance = Infinity;
  for (let index = 0; index < text.length && index < 4000; index++) {
    range.setStart(node, index);
    range.setEnd(node, index + 1);
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) continue;
    const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
    const middle = rect.left + rect.width / 2;
    const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
    const distance = dy * 4 + dx;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = x < middle ? index : index + 1;
    }
  }
  return best;
}

/** The annotated JSX elements around a rendered node, nearest first (docs scaffolding skipped). */
function annotatedChain(node: Node, limit: number): Array<{ src: string; fiber: Fiber }> {
  const chain: Array<{ src: string; fiber: Fiber }> = [];
  let fiber = fiberOf(node) ?? fiberOf(node.parentElement);
  for (let guard = 0; fiber && guard < 4000 && chain.length < limit; fiber = fiber.return, guard++) {
    const src = srcOf(fiber);
    if (src && !chain.some((entry) => entry.src === src)) chain.push({ src, fiber });
  }
  return chain;
}

const preservesBreaks = (host: Element) => /^(pre|pre-wrap|pre-line|break-spaces)$/.test(getComputedStyle(host).whiteSpace);

type Match = { element: SourceElement; op: TextTarget["op"] };

/**
 * Where `text` is written: the nearest element's literal text child, else a string prop of it, else (text passed on
 * through an expression such as `{children}` or `{name}`) a string prop of an element further out.
 */
/** The row of a `.map` list the rendered `node` belongs to (the hit of `src` that contains it), or undefined. */
function rowAt(src: string, node: Node): number | undefined {
  const world = canvasApi.getWorldElement();
  if (!world) return undefined;
  const hits = findBySrc(world, src);
  const instance = hits.findIndex((hit) => hit.hosts.some((host) => host.contains(node)));
  if (instance < 0) return undefined;
  const row = rowOf({ kind: "node", src, name: hits[instance].name, instance, frameId: null } as Parameters<typeof rowOf>[0]);
  return row && "row" in row ? row.row : undefined;
}

/**
 * The props the JSX element was written with: the outermost fiber carrying its data-zen-src (a component passes the
 * attribute on to its root DOM node, whose props are not the component's).
 */
function writtenProps(fiber: Fiber | undefined, src: string): Record<string, unknown> {
  let owner = fiber;
  for (let next = fiber?.return; next && srcOf(next) === src; next = next.return) owner = next;
  return (owner?.memoizedProps ?? {}) as Record<string, unknown>;
}

/** The text the element's live prop (or string children) renders, for matching the clicked text to its source. */
const liveText = (value: unknown) => (typeof value === "string" || typeof value === "number" ? normalizeText(String(value)) : null);

type DataOp = Extract<TextTarget["op"], { kind: "data" }>;

/**
 * Text from data the dev server can write at its source: an expression prop or child whose live value is the text.
 * `from`: what feeds it (a `.map` row, a Table cell's row, a data const).
 */
function dataMatch(element: SourceElement, props: Record<string, unknown>, wanted: string): { op: DataOp; from: DataSource["kind"] } | null {
  const prop = element.attributes.find((attribute) => attribute.kind === "expression" && attribute.dataSource?.editable && !NOT_TEXT_PROPS.test(attribute.name) && liveText(props[attribute.name]) === wanted);
  if (prop?.dataSource) return { op: { kind: "data", prop: prop.name, source: prop.dataSource.source ?? prop.value ?? prop.name }, from: prop.dataSource.kind };
  // Expression children, counted as the server counts them (whitespace-only text left out).
  let index = -1;
  for (const child of element.children) {
    if (child.kind === "text" && !child.value.trim()) continue;
    index += 1;
    if (child.kind === "expression" && child.dataSource?.editable && liveText(props.children) === wanted) return { op: { kind: "data", child: index, source: child.dataSource.source ?? child.raw }, from: child.dataSource.kind };
  }
  return null;
}

/** "Name · row 2" for a Table cell's edit label. */
function cellName(header: unknown, id: string, row: number) {
  return `${typeof header === "string" && header.trim() ? header.trim() : id} · row ${row + 1}`;
}

async function sourceOf(chain: Array<{ src: string; fiber?: Fiber }>, text: string, node?: Node): Promise<Match | { reason: string } | null> {
  const wanted = normalizeText(text);
  let reason: string | null = null;
  for (let index = 0; index < chain.length; index++) {
    const at = parseSrc(chain[index].src);
    if (!at) continue;
    const element = await studioApi.element(at.file, at.loc);
    if (!element) continue;
    // A Table cell whose column has no `cell`: the Table draws the row's field itself, so that field is written.
    const cell = index === 0 && element.tableRows && node ? tableCellOf(node) : null;
    if (cell && cell.src === chain[0].src && cell.columnDef && !cell.columnDef.cell) {
      const field = cellFieldOf(cell, text, normalizeText);
      if (!field) return { reason: "This text is drawn by the Table from its row; edit the row's data in the code" };
      if (!element.tableRows!.editable) return { reason: `This text comes from the Table's rows: ${element.tableRows!.reason ?? "they are computed in the code"}` };
      return { element, op: { kind: "data", field, row: cell.row, ...(cell.rowKey !== null ? { rowKey: cell.rowKey } : {}), rowFields: rowFieldsOf(cell.item), source: cellName(cell.columnDef.header, cell.columnDef.id, cell.row) } };
    }
    const child = element.children.find((entry) => entry.kind === "text" && normalizeText(entry.value) === wanted);
    if (child && child.kind === "text") return { element, op: { kind: "text", index: child.index } };
    const prop = element.attributes.find((attribute) => attribute.kind === "string" && !NOT_TEXT_PROPS.test(attribute.name) && normalizeText(attribute.value ?? "") === wanted);
    if (prop) return { element, op: { kind: "prop", name: prop.name } };
    const data = dataMatch(element, writtenProps(chain[index].fiber, chain[index].src), wanted);
    if (data?.from === "cell") {
      // A Table column's cell: the row the <tr> draws, named by its key in the data the Table reads.
      const hit = node ? tableCellOf(node) : null;
      if (hit) {
        const table = hit.src ? parseSrc(hit.src) : null;
        const header = hit.columnDef ? cellName(hit.columnDef.header, hit.columnDef.id, hit.row) : `row ${hit.row + 1}`;
        return { element, op: { ...data.op, row: hit.row, ...(hit.rowKey !== null ? { rowKey: hit.rowKey } : {}), rowFields: rowFieldsOf(hit.item), ...(table && table.file === element.file ? { table: table.loc } : {}), source: `${header}: ${data.op.source}` } };
      }
    } else if (data) {
      const repeated = element.attributes.some((attribute) => attribute.dataSource?.kind === "row") || element.children.some((child) => child.kind === "expression" && child.dataSource?.kind === "row");
      const row = repeated && node ? rowAt(chain[index].src, node) : undefined;
      if (!repeated || row !== undefined) return { element, op: { ...data.op, row } };
    }
    if (index === 0) {
      const expression = element.children.find((entry) => entry.kind === "expression");
      const from = expression && expression.kind === "expression" ? expression.raw.replace(/^\{\s*|\s*\}$/g, "") : null;
      const inPlayground = studioStore.getState().selection?.kind === "node" && Boolean((studioStore.getState().selection as { panelId?: string | null }).panelId);
      reason = from ? (inPlayground ? `This text comes from ${from}: change it in Playground properties` : `This text comes from ${from}: edit it in the code`) : null;
      // Only text passed on through an expression is looked for further out.
      if (!expression && !element.attributes.some((attribute) => attribute.kind === "expression")) break;
    }
  }
  return reason ? { reason } : null;
}

/* ── starting ────────────────────────────────────────────────────────────────────────────────────────────────────── */

let starting = 0;

/*
 * Between the press that starts an edit and the editor (the source is read first, a few ms), keys must not reach the
 * canvas: a fast Enter-then-type would otherwise run Delete or the tool keys on the layer. Printable keys are kept and
 * typed into the editor when it opens; Escape gives up the start.
 */
let pendingStart = false;
let typedAhead = "";

/** The characters typed while the editor was opening (once). */
export function takeTypedAhead(): string {
  const typed = typedAhead;
  typedAhead = "";
  return typed;
}

if (typeof window !== "undefined") {
  const guard = (event: KeyboardEvent) => {
    if (!pendingStart || event.metaKey || event.ctrlKey || event.isComposing) return;
    if (event.key === "Escape") {
      starting += 1;
      pendingStart = false;
      typedAhead = "";
    } else if (event.key.length === 1 && !event.altKey) typedAhead += event.key;
    else if (event.key === "Backspace") typedAhead = typedAhead.slice(0, -1);
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  window.addEventListener("keydown", guard, true);
  import.meta.hot?.dispose(() => window.removeEventListener("keydown", guard, true));
}

function canStart(): boolean {
  const state = studioStore.getState();
  return canEdit(state) && state.tool === "select" && !state.presenting && multiSelection.get().length === 0 && !session;
}

async function open(node: Text, chain: Array<{ src: string }>, caret: TextTarget["caret"], fallback: () => void) {
  const run = ++starting;
  const original = node.nodeValue ?? "";
  pendingStart = true;
  typedAhead = "";
  let found: Awaited<ReturnType<typeof sourceOf>>;
  try {
    found = await sourceOf(chain, original, node);
  } finally {
    if (run === starting) pendingStart = false;
  }
  if (run !== starting || session) return;
  if (!found || "reason" in found) {
    if (found && "reason" in found) inspectorStatus.set("neutral", found.reason);
    fallback();
    return;
  }
  const host = node.parentElement;
  if (!host || !node.isConnected) return;
  const src = `${found.element.file}:${found.element.loc}`;
  const world = document.querySelector(".studio-world");
  session = {
    node,
    host,
    file: found.element.file,
    loc: found.element.loc,
    src,
    element: found.element,
    op: found.op,
    original,
    // A row's data (a .map row, a Table cell) is one place, however many rows the source line draws.
    instances: found.op.kind === "data" && (found.op.row !== undefined || found.op.field) ? 1 : world ? Math.max(1, findBySrc(world, src).length) : 1,
    multiline: preservesBreaks(host),
    caret,
  };
  emit();
}

const focusContent = () => window.dispatchEvent(new CustomEvent("zen-studio:focus-content"));

/**
 * A double-click at (x, y) on the element `ownerSrc` (the selection, or what the double-click just selected): edits
 * the text under the pointer when that element's own source holds it. Returns true when it takes the double-click
 * (the source lookup is async; text that turns out not to be editable falls back to the inspector's Content field).
 */
export function tryStartTextEdit(x: number, y: number, ownerSrc: string): boolean {
  if (!canStart()) return false;
  const node = textNodeAt(x, y);
  if (!node) return false;
  const chain = annotatedChain(node, 6);
  const at = chain.findIndex((entry) => entry.src === ownerSrc);
  // The text must belong to the element itself, not to a child layer of it (that one is selected first).
  if (at !== 0) return false;
  void open(node, chain, offsetAt(node, x, y), focusContent);
  return true;
}

/* Enter on a selected text layer (an element whose source content is only text) edits it with the text selected. */
const elementCache = new Map<string, SourceElement | null>();
let cachedFor: string | null = null;

function prefetch(selection: StudioSelection | null) {
  if (selection?.kind !== "node" || selection.part) return;
  if (cachedFor === selection.src) return;
  cachedFor = selection.src;
  const at = parseSrc(selection.src);
  if (!at) return;
  void studioApi.element(at.file, at.loc).then((element) => {
    if (elementCache.size > 50) elementCache.clear();
    elementCache.set(selection.src, element);
  });
}

if (typeof window !== "undefined") {
  let last = studioStore.getState().selection;
  prefetch(last);
  const stop = studioStore.subscribe(() => {
    const next = studioStore.getState().selection;
    if (next === last) return;
    last = next;
    cachedFor = null;
    elementCache.clear();
    prefetch(next);
  });
  import.meta.hot?.dispose(stop);
}

/** Enter: true when the selected layer is a text layer and its editor opens. */
export function startTextEditOnSelection(): boolean {
  const selection = studioStore.getState().selection;
  if (!canStart() || selection?.kind !== "node" || selection.part) return false;
  // The source, read when the layer was selected; until it arrives, the rendered tree decides (no annotated child layer,
  // only text) and the editor opens once the source confirms it.
  const element = elementCache.get(selection.src);
  if (element && element.children.some((child) => child.kind !== "text")) return false;
  const texts = element ? element.children.filter((child) => child.kind === "text" && normalizeText(child.value)) : null;
  if (texts && !texts.length) return false;
  const world = document.querySelector(".studio-world");
  const hit = world ? findBySrc(world, selection.src)[selection.instance] ?? findBySrc(world, selection.src)[0] : null;
  if (!hit || (!element && childHits(hit).length)) return false;
  for (const host of hit.hosts) {
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const value = normalizeText(node.nodeValue ?? "");
      if (!value || (texts && !texts.some((child) => child.kind === "text" && normalizeText(child.value) === value))) continue;
      const chain = annotatedChain(node, 6);
      if (chain[0]?.src !== selection.src) continue;
      void open(node, chain, "all", () => undefined);
      return true;
    }
  }
  return false;
}

/* ── committing ──────────────────────────────────────────────────────────────────────────────────────────────────── */

const short = (value: string) => (value.length > 32 ? `${value.slice(0, 32)}…` : value);

function opFor(target: TextTarget, value: string): EditOp {
  if (target.op.kind === "data") {
    const { prop, child, row, rowKey, rowFields, table, field } = target.op;
    const at = field ? { field } : prop ? { prop } : { child };
    return { op: "setDataField", ...at, ...(row !== undefined ? { row } : {}), ...(rowKey !== undefined ? { rowKey } : {}), ...(rowFields ? { rowFields } : {}), ...(table !== undefined ? { table } : {}), value: { kind: "string", value } };
  }
  return target.op.kind === "text"
    ? { op: "setText", index: target.op.index, value }
    : { op: "setProp", name: target.op.name, value: { kind: "string", value } };
}

/** Puts the rendered text back as it was (a cancelled, empty or failed edit). */
export function restoreText(target: TextTarget) {
  if (target.node.isConnected && target.node.nodeValue !== target.original) target.node.nodeValue = target.original;
}

/**
 * Writes `value` to the source (one draft edit, one undo step) and ends the session. Unchanged text writes nothing;
 * empty text is refused (Figma removes an empty text layer; here the layer stays and says how to remove it).
 */
export function commitTextEdit(target: TextTarget, raw: string): void {
  if (session === target) endTextEdit();
  const value = target.multiline ? raw.replace(/^\s+|\s+$/g, "") : raw.replace(/\s*\n\s*/g, " ").trim();
  if (normalizeText(value) === normalizeText(target.original) && value.trim() === target.original.trim()) {
    restoreText(target);
    return;
  }
  if (!normalizeText(value)) {
    restoreText(target);
    inspectorStatus.set("negative", "Text can't be empty — remove the layer instead");
    return;
  }
  target.node.nodeValue = value;
  const label = target.op.kind === "data" ? `${target.op.source} → "${short(value)}"` : `${target.element.name} ${target.op.kind === "prop" ? target.op.name : "text"} → "${short(value)}"`;
  const send = (element: SourceElement) => applyEdit({ file: target.file, loc: target.loc, name: element.name, ops: [opFor(target, value)], hash: element.hash }, label);
  void send(target.element).then(async (response) => {
    if (response.ok) return;
    // The file changed since the editor opened (another edit): read it again and write once more when the text is
    // still where it was.
    if (response.code === "stale") {
      const fresh = await studioApi.element(target.file, target.loc);
      const still = fresh && target.op.kind !== "data" && (target.op.kind === "text"
        ? fresh.children.some((child) => child.kind === "text" && child.index === (target.op as { index: number }).index && normalizeText(child.value) === normalizeText(target.original))
        : fresh.attributes.some((attribute) => attribute.name === (target.op as { name: string }).name && attribute.kind === "string" && normalizeText(attribute.value ?? "") === normalizeText(target.original)));
      if (fresh && still) {
        const retry = await send(fresh);
        if (retry.ok) return;
      }
    }
    restoreText(target);
    inspectorStatus.set("negative", ("error" in response && response.error) || "The text was not saved");
  });
}

/** For the canvas zoom of the text (1 in the unscaled portal root). */
export const zoomOf = (node: Node) => (node.parentElement?.closest(".studio-world") ? getViewport().zoom : 1);
