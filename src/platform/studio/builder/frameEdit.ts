import { announceEditStatus, applyEdit } from "../api";
import { studioStore } from "../store";
import type { EditOp } from "../types";
import { loadEngine, zenComponents } from "./engine";
import { frameOf, literalOf, type PageFrame } from "./render/frames";
import { FRAME_GAP, placeFrames, type FramePlace } from "./render/framePlace";
import type { PageNode, PageTree } from "./render/renderPage";
import { getPage, pageFile } from "./store/pageStore";

/*
 * Writes of free frames on a builder page (user, 2026-10-15: "kéo frame đi mọi nơi", "cho phép copy"): a move sets the
 * frames' x / y; a copy (⌥-drag, ⌘D, ⌘C ⌘V) adds the frame again under a new id at its own place. Each is one edit and
 * one undo step. Frames still in the row of unplaced frames are pinned where they show (in a move's edit; before an
 * added frame, as its own step), so placing one frame never moves another (render/framePlace.ts).
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

/** A copied frame (⌘C on a frame): its element as parsed, and as code for the system clipboard. */
export type FrameClip = { page: string; frameId: string; node: PageNode; code: string };

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
  const kind = original.name === "Overlay" ? "overlay" : "screen";
  const id = engine.freeFrameId(kind, board.nodes.map((node) => String(literalOf(node, "id") ?? "")));
  const place = at ?? (index >= 0 ? besidePlace(board, index, options.heights ?? new Map()) : placeFrames([...board.frames, { width: 0, place: null }]).at(-1)!);
  const where = { id, x: Math.round(place.x), y: Math.round(place.y) };
  const state = literalOf(original, "state");
  const newFrame = `${kind}:${id}${typeof state === "string" ? `:${state}` : ""}`;
  const label = options.label ?? (kind === "overlay" ? "Duplicate overlay" : "Duplicate screen");
  // Frames still in the row are pinned first (one more undo step, only on a page written before free frames).
  if (board.frames.some((frame) => !frame.place) && !(await pinRow(localPage))) return null;
  const fresh = board.frames.some((frame) => !frame.place) ? await readBoard(localPage) : board;
  if (!fresh) return null;
  // The original's element printed again without document ids: the engine gives the copy and its layers their own.
  const code = engine.elementText(copyOf(original, where), { ids: false });
  const after = index >= 0 ? fresh.nodes[index]?.loc : undefined;
  const response = await applyEdit({ file: fresh.file, loc: fresh.tree.board.loc, name: "Board", ops: [{ op: "insertChild", code, ...(after ? { after } : {}) }], hash: fresh.hash }, label);
  if (!response.ok) return null;
  studioStore.setState({ selection: { kind: "frame", frameId: newFrame } });
  return newFrame;
}

/** A frame copied from the page it is on (⌘C): its element, and its code without its place for the system clipboard. */
export async function frameClip(localPage: string, frameId: string): Promise<FrameClip | null> {
  const board = await readBoard(localPage);
  const index = board ? board.frames.findIndex((frame) => frame.id === frameId) : -1;
  if (!board || index < 0) return null;
  const node = board.nodes[index];
  const props = Object.fromEntries(Object.entries(node.props).filter(([name]) => name !== "x" && name !== "y"));
  return { page: localPage, frameId, node, code: board.engine.elementText({ ...node, props }, { ids: false }) };
}
