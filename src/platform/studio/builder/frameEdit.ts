import { announceEditStatus, applyEdit, squashEdits } from "../api";
import { studioStore } from "../store";
import type { EditOp, EditResponse } from "../types";
import { loadEngine, zenComponents } from "./engine";
import { frameOf, literalOf, type PageFrame } from "./render/frames";
import { selectFrameWhenShown } from "../board/frames";
import { boardBoxes, sectionContents } from "../board/sections";
import { FRAME_GAP, placeFrames, type FramePlace } from "./render/framePlace";
import type { PageNode, PageTree } from "./render/renderPage";
import { getPage, pageFile } from "./store/pageStore";

/*
 * Writes of free frames on a builder page (user, 2026-10-15: "kéo frame đi mọi nơi", "cho phép copy"): a move sets the
 * frames' x / y; a copy (⌥-drag, ⌘D, ⌘C ⌘V) adds the frame again under a new id at its own place, a Section's copy
 * with everything it holds (copySection). Each is one edit and one undo step. Frames still in the row of unplaced frames are pinned where they show (in a move's edit; before an
 * added frame, an edit of its own that joinPin makes one undo step with the frame's), so placing one frame never moves another (render/framePlace.ts).
 */

type Engine = Awaited<ReturnType<typeof loadEngine>>;
type Board = { engine: Engine; file: string; text: string; hash: string; tree: PageTree & { board: PageNode }; nodes: PageNode[]; frames: PageFrame[]; places: FramePlace[] };

async function readBoard(localPage: string): Promise<Board | null> {
  const [engine, page] = await Promise.all([loadEngine(), getPage(localPage)]);
  if (!page) return null;
  const tree = engine.parsePage(page.text, { components: new Set(zenComponents) }) as unknown as PageTree;
  if (!tree.board) return null;
  const nodes = tree.board.children.filter((child): child is PageNode => child.kind === "element");
  const frames = nodes.map(frameOf);
  return { engine, file: pageFile(localPage), text: page.text, hash: engine.sha1(page.text), tree: tree as Board["tree"], nodes, frames, places: placeFrames(frames) };
}

const number = (name: string, value: number): EditOp => ({ op: "setProp", name, value: { kind: "number", value: Math.round(value) } });
const placeOps = (place: FramePlace): EditOp[] => [number("x", place.x), number("y", place.y)];
const same = (a: FramePlace | null, b: FramePlace) => Boolean(a && Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y));

/** Pins every frame still in the row where it shows (before a frame is added at a place of its own). */
export const pinRow = (localPage: string) => moveFrames(localPage, new Map(), "Place frames");

/**
 * After pinRow and the edit that adds a frame (`response`): the two become one undo step named `label`, so one ⌘Z takes
 * the frame away as Figma's does. `pinned`: the page's text and hash before the pin (null: nothing was pinned); the
 * join happens only when the step below the frame's is that pin.
 */
export function joinPin(pinned: { text: string; hash: string } | null, response: EditResponse, label: string) {
  if (!pinned || !response.ok || studioStore.getState().undo.at(-2)?.hashBefore !== pinned.hash) return;
  squashEdits(2, label, pinned.text, response.after);
}

/** The frames' new places (frame id → place, world px from the board's frame origin), with the row pinned. */
export async function moveFrames(localPage: string, moves: ReadonlyMap<string, FramePlace>, label: string): Promise<boolean> {
  const board = await readBoard(localPage);
  if (!board) return false;
  const opsByLoc: Record<string, EditOp[]> = {};
  board.frames.forEach((frame, index) => {
    const to = moves.get(frame.id) ?? (frame.place ? null : board.places[index]);
    if (to && !same(frame.place, to)) opsByLoc[frame.loc] = placeOps(to);
  });
  const locs = Object.keys(opsByLoc);
  if (!locs.length) return true;
  const first = board.nodes[board.frames.findIndex((frame) => frame.loc === locs[0])];
  const response = await applyEdit({ file: board.file, loc: first.loc, name: first.name, ops: [{ op: "many", action: "setProps", locs, opsByLoc }], hash: board.hash }, label);
  return Boolean(response.ok);
}

/** A frame's or Section's new box on the board (Figma's X / Y / W / H, a resize handle): only the fields given change. */
export type FrameBoxChange = Partial<{ x: number; y: number; width: number; height: number }>;

/**
 * Sets the place and size of frames and Sections in one edit (one ⌘Z): x / y on any of them, width / height on a Screen
 * (its height is the least it takes: content past it grows the frame) or a Section. An Overlay takes its content's
 * size. Frames still in the row are pinned where they show, as a move does.
 */
export async function setFrameBoxes(localPage: string, changes: ReadonlyMap<string, FrameBoxChange>, label: string): Promise<boolean> {
  const board = await readBoard(localPage);
  if (!board) return false;
  const opsByLoc: Record<string, EditOp[]> = {};
  board.frames.forEach((frame, index) => {
    const change = changes.get(frame.id);
    const ops: EditOp[] = [];
    const place = frame.place ?? board.places[index];
    const to = { x: change?.x ?? place.x, y: change?.y ?? place.y };
    if (!same(frame.place, to)) ops.push(...placeOps(to));
    if (change && frame.kind !== "overlay") {
      const limits = frame.kind === "section" ? { min: 100, max: 40000 } : frame.kind === "slice" ? { min: 1, max: 40000 } : { min: 100, max: 4096 };
      for (const name of ["width", "height"] as const) {
        const value = change[name];
        if (value !== undefined) ops.push(number(name, Math.min(limits.max, Math.max(limits.min, value))));
      }
    }
    if (ops.length) opsByLoc[frame.loc] = ops;
  });
  const locs = Object.keys(opsByLoc);
  if (!locs.length) return true;
  const first = board.nodes[board.frames.findIndex((frame) => frame.loc === locs[0])];
  const response = await applyEdit({ file: board.file, loc: first.loc, name: first.name, ops: [{ op: "many", action: "setProps", locs, opsByLoc }], hash: board.hash }, label);
  return Boolean(response.ok);
}

/** A free spot for a copy of frame `index`: beside it to the right (Figma's Duplicate), past any frame in the way. */
function besidePlace(board: Board, index: number, heights: ReadonlyMap<string, number>): FramePlace {
  const boxes = board.frames.map((frame, at) => ({ ...board.places[at], width: frame.width, height: heights.get(frame.id) ?? 900 }));
  const own = boxes[index];
  const place = { x: own.x + own.width + FRAME_GAP, y: own.y };
  for (let guard = 0; guard < boxes.length; guard += 1) {
    const hit = boxes.find((box) => box.x < place.x + own.width + FRAME_GAP && place.x < box.x + box.width + FRAME_GAP && box.y < place.y + own.height && place.y < box.y + box.height);
    if (!hit) break;
    place.x = hit.x + hit.width + FRAME_GAP;
  }
  return place;
}

/** A frame's element under a new frame id and place (the rest as written). */
const copyOf = (node: PageNode, props: Record<string, string | number>): PageNode => ({
  ...node,
  props: { ...node.props, ...Object.fromEntries(Object.entries(props).map(([name, value]) => [name, { kind: "literal" as const, value }])) },
});

/** A layer of the board at its place (what a Section's copy carries). */
type Placed = { node: PageNode; place: FramePlace };

/**
 * A copied frame (⌘C on a frame): its element as parsed, and as code for the system clipboard. A Section's also carries
 * what it holds (`held`: its frames and Sections, any depth, at their places).
 */
export type FrameClip = { page: string; frameId: string; node: PageNode; code: string; held?: Placed[] };

/**
 * Adds a copy of `frameId` at `at` (null: beside the original) on `localPage`, after the original in Layers; selects it.
 * `source` copies a frame from another page (⌘C there, ⌘V here). Returns the copy's frame id.
 */
export async function copyFrame(localPage: string, frameId: string, at: FramePlace | null, options: { label?: string; heights?: ReadonlyMap<string, number>; source?: FrameClip } = {}): Promise<string | null> {
  const board = await readBoard(localPage);
  if (!board) return null;
  const { engine } = board;
  const index = options.source ? -1 : board.frames.findIndex((frame) => frame.id === frameId);
  if (!options.source && index < 0) { announceEditStatus({ kind: "error", message: "That frame is no longer on the page", at: Date.now() }); return null; }
  const original = options.source?.node ?? board.nodes[index];
  // A Section copies with everything it holds (⌥-drag, ⌘D, ⌘C ⌘V alike).
  if (original.name === "Section") {
    const own = frameOf(original).place ?? { x: 0, y: 0 };
    return copySection(localPage, frameId, at ? { dx: at.x - own.x, dy: at.y - own.y } : null, { ...options, label: options.label?.replace("frame", "section") });
  }
  const kind = original.name === "Overlay" ? "overlay" : original.name === "Slice" ? "slice" : "screen";
  const id = engine.freeFrameId(kind, board.nodes.map((node) => String(literalOf(node, "id") ?? "")));
  const place = at ?? (index >= 0 ? besidePlace(board, index, options.heights ?? new Map()) : placeFrames([...board.frames, { width: 0, place: null }]).at(-1)!);
  const where = { id, x: Math.round(place.x), y: Math.round(place.y) };
  const state = literalOf(original, "state");
  const newFrame = `${kind}:${id}${typeof state === "string" ? `:${state}` : ""}`;
  const label = options.label ?? (kind === "overlay" ? "Duplicate overlay" : kind === "slice" ? "Duplicate slice" : "Duplicate screen");
  // Frames still in the row are pinned first (the same undo step: joinPin).
  const pinned = board.frames.some((frame) => !frame.place) ? { text: board.text, hash: board.hash } : null;
  if (pinned && !(await pinRow(localPage))) return null;
  const fresh = pinned ? await readBoard(localPage) : board;
  if (!fresh) return null;
  // The original's element printed again without document ids: the engine gives the copy and its layers their own.
  const code = engine.elementText(copyOf(original, where), { ids: false });
  const after = index >= 0 ? fresh.nodes[index]?.loc : undefined;
  const response = await applyEdit({ file: fresh.file, loc: fresh.tree.board.loc, name: "Board", ops: [{ op: "insertChild", code, ...(after ? { after } : {}) }], hash: fresh.hash }, label);
  joinPin(pinned, response, label);
  if (!response.ok) return null;
  selectFrameWhenShown(newFrame, (frameId) => studioStore.setState({ selection: { kind: "frame", frameId } }));
  return newFrame;
}

/** Section `sectionId` and what it holds on the board as shown (board/sections.ts), in board order, at their places. */
function heldBy(board: Board, sectionId: string): Placed[] {
  const held = new Set([sectionId, ...sectionContents(sectionId, boardBoxes())]);
  return board.frames.flatMap((frame, index) => (held.has(frame.id) ? [{ node: board.nodes[index], place: frame.place ?? board.places[index] }] : []));
}

/**
 * Adds a copy of Section `sectionId` with everything it holds (its frames and Sections, any depth), all moved by
 * `offset` (null: the copy beside the Section, Figma's Duplicate), in one edit and one undo step; selects the copy.
 * Each copy takes a new id; links stay as written (a link to a frame copied with it still opens that frame, as Figma's
 * copies on a page keep theirs). The Section copies go first, so they draw behind the frames. `source` copies a Section
 * from another page (⌘C there, ⌘V here). Returns the copy's frame id.
 */
export async function copySection(localPage: string, sectionId: string, offset: { dx: number; dy: number } | null, options: { label?: string; heights?: ReadonlyMap<string, number>; source?: FrameClip } = {}): Promise<string | null> {
  let board = await readBoard(localPage);
  if (!board) return null;
  // Frames still in the row are pinned first (the same undo step: joinPin).
  const pinned = board.frames.some((frame) => !frame.place) ? { text: board.text, hash: board.hash } : null;
  if (pinned) {
    if (!(await pinRow(localPage))) return null;
    board = await readBoard(localPage);
    if (!board) return null;
  }
  const { engine } = board;
  const index = options.source ? -1 : board.frames.findIndex((frame) => frame.id === sectionId);
  if (!options.source && index < 0) { announceEditStatus({ kind: "error", message: "That section is no longer on the page", at: Date.now() }); return null; }
  const parts = options.source ? [{ node: options.source.node, place: frameOf(options.source.node).place ?? { x: 0, y: 0 } }, ...(options.source.held ?? [])] : heldBy(board, sectionId);
  const own = parts[0].place;
  const to = index >= 0 ? besidePlace(board, index, options.heights ?? new Map()) : placeFrames([...board.frames, { width: frameOf(parts[0].node).width, place: null }]).at(-1)!;
  const move = offset ?? { dx: to.x - own.x, dy: to.y - own.y };
  const taken = board.nodes.map((node) => String(literalOf(node, "id") ?? ""));
  const sections: string[] = [];
  const frames: string[] = [];
  let copied = "";
  for (const part of parts) {
    const kind = part.node.name === "Section" ? "section" : part.node.name === "Slice" ? "slice" : part.node.name === "Overlay" ? "overlay" : "screen";
    const id = engine.freeFrameId(kind, taken);
    taken.push(id);
    if (!copied) copied = `section:${id}`;
    // Printed again without document ids: the engine gives each copy and its layers their own.
    const code = engine.elementText(copyOf(part.node, { id, x: Math.round(part.place.x + move.dx), y: Math.round(part.place.y + move.dy) }), { ids: false });
    (kind === "section" ? sections : frames).push(code);
  }
  // After the original in Layers; from another page, before the frames (a Section draws behind them).
  const after = index >= 0 ? board.nodes[index].loc : undefined;
  const response = await applyEdit({ file: board.file, loc: board.tree.board.loc, name: "Board", ops: [{ op: "insertChild", code: [...sections, ...frames].join("\n"), paste: true, ...(after ? { after } : { index: 0 }) }], hash: board.hash }, options.label ?? "Duplicate section");
  joinPin(pinned, response, options.label ?? "Duplicate section");
  if (!response.ok) return null;
  selectFrameWhenShown(copied, (frameId) => studioStore.setState({ selection: { kind: "frame", frameId } }));
  return copied;
}

/** A frame of the board as the source writes it: its file, loc and tag, and where it is (the row's place if unplaced). */
export async function frameNodeOf(localPage: string, frameId: string): Promise<{ file: string; loc: string; name: string; place: FramePlace; width: number } | null> {
  const board = await readBoard(localPage);
  const index = board ? board.frames.findIndex((frame) => frame.id === frameId) : -1;
  if (!board || index < 0) return null;
  const frame = board.frames[index];
  return { file: board.file, loc: frame.loc, name: board.nodes[index].name, place: frame.place ?? board.places[index], width: frame.width };
}

/** A frame copied from the page it is on (⌘C): its element, and its code without its place for the system clipboard. */
export async function frameClip(localPage: string, frameId: string): Promise<FrameClip | null> {
  const board = await readBoard(localPage);
  const index = board ? board.frames.findIndex((frame) => frame.id === frameId) : -1;
  if (!board || index < 0) return null;
  const node = board.nodes[index];
  const props = Object.fromEntries(Object.entries(node.props).filter(([name]) => name !== "x" && name !== "y"));
  const code = board.engine.elementText({ ...node, props }, { ids: false });
  if (node.name !== "Section") return { page: localPage, frameId, node, code };
  const held = heldBy(board, frameId).slice(1);
  return { page: localPage, frameId, node, code: [code, ...held.map((part) => board.engine.elementText(part.node, { ids: false }))].join("\n"), held };
}
