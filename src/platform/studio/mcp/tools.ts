import { applyEdit, parseSrc, studioApi } from "../api";
import { loadEngine, zenComponents } from "../builder/engine";
import { framePicture } from "../builder/export/htmlExport";
import { ensurePageDoc } from "../builder/localApi";
import { getPage, pageFile } from "../builder/store/pageStore";
import { studioStore } from "../store";
import type { EditOp } from "../types";
import { FRAME_NAMES, findLayer, frameOf, layerLine, outline, type DocNode } from "./tree";

/*
 * The Studio MCP's tools as the open tab runs them (spec docs/research/studio-mcp-canvas-2026-10-15.md §5, M0; the
 * definitions the AI sees are tools/studio/mcp/tools.mjs). Reads come from the page's document (stable layer ids);
 * every write goes through api.ts applyEdit, as an Inspector edit does: it shows at once, is one undo step, and is
 * refused for the same reasons. M0 works on pages made in the Studio only.
 */

export type ToolContent = Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: "image/png" }>;
export type ToolAnswer = { ok: true; content: ToolContent } | { ok: false; code: string; error: string };

const answer = (text: string): ToolAnswer => ({ ok: true, content: [{ type: "text", text }] });
const refuse = (code: string, error: string): ToolAnswer => ({ ok: false, code, error });

const NOT_A_STUDIO_PAGE = "The open page is not a page made in the Studio. For now the AI edits those only: ask the person to open one (Studio › a page) or make one (New page).";
/** Props an AI may not write: the layer's identity and React's own. */
const RESERVED_PROPS = new Set(["data-zen-id", "key", "ref", "children"]);
const PROP_NAME = /^[A-Za-z][\w-]*$/;

type OpenPage = { id: string; file: string; title: string; text: string; board: DocNode; idAt: Map<string, string>; locOf: Map<string, string> };

/** The open Studio page with its document and where each layer sits in its text; null on another kind of page. */
async function openPage(): Promise<OpenPage | null> {
  const id = studioStore.getState().localPage;
  if (!id) return null;
  await ensurePageDoc(id);
  const record = await getPage(id);
  if (!record?.doc) return null;
  const engine = await loadEngine();
  const { idAt, locOf } = engine.locsOf(record.doc, record.text, { components: new Set(zenComponents) });
  return { id, file: pageFile(id), title: record.title, text: record.text, board: record.doc.board as DocNode, idAt, locOf };
}

const literal = (node: DocNode, name: string): unknown => {
  const value = node.props[name];
  return value?.kind === "literal" ? value.value : undefined;
};

const frames = (board: DocNode) => board.children.filter((child): child is DocNode => child.kind === "element" && FRAME_NAMES.has(child.name));

/** The canvas's id for a frame layer (builder/render/frames.ts frameOf): "screen:<id>[:<state>]" or "overlay:<id>". */
function canvasFrameId(node: DocNode): string {
  const id = String(literal(node, "id") ?? "untitled");
  if (node.name === "Overlay") return `overlay:${id}`;
  const state = literal(node, "state");
  return `screen:${id}${typeof state === "string" ? `:${state}` : ""}`;
}

/** The layers the person has selected, by id (the canvas selection: a frame or a layer). */
function selectedIds(page: OpenPage): string[] {
  const selection = studioStore.getState().selection;
  if (!selection) return [];
  if (selection.kind === "frame") {
    const frame = frames(page.board).find((node) => canvasFrameId(node) === selection.frameId);
    return frame ? [frame.id] : [];
  }
  if (selection.kind !== "node") return [];
  const src = parseSrc(selection.src);
  if (!src || src.file !== page.file) return [];
  const id = page.idAt.get(src.loc);
  return id ? [id] : [];
}

/** The frame holding the selection, else null. */
function selectedFrame(page: OpenPage): DocNode | null {
  const [first] = selectedIds(page);
  return first ? frameOf(page.board, first) : null;
}

/* ── tools ───────────────────────────────────────────────────────────────────────────────────────────────────── */

async function getStudioState(tab: string): Promise<ToolAnswer> {
  const state = studioStore.getState();
  const page = await openPage();
  const editable = state.role === "admin";
  const base = { tab, role: state.role, editable: Boolean(page) && editable, preview: state.preview };
  if (!page) {
    return answer(JSON.stringify({ ...base, page: { kind: state.space === "studio" && !state.localPage ? "studio-home" : "component-page", name: state.page }, note: NOT_A_STUDIO_PAGE }, null, 2));
  }
  const frameList = frames(page.board).map((node) => ({
    id: node.id,
    kind: node.name === "Overlay" ? "overlay" : "screen",
    title: String(literal(node, "title") ?? literal(node, "id") ?? node.id),
    device: literal(node, "device") ?? (node.name === "Overlay" ? undefined : "desktop"),
    ...(typeof literal(node, "x") === "number" ? { x: literal(node, "x"), y: literal(node, "y") } : {}),
    ...(typeof literal(node, "width") === "number" ? { width: literal(node, "width"), height: literal(node, "height") } : {}),
  }));
  const selection = selectedIds(page).map((id) => {
    const found = findLayer(page.board, id);
    return found ? { id, layer: layerLine(found.node), frame: frameOf(page.board, id)?.id ?? null } : { id };
  });
  return answer(JSON.stringify({
    ...base,
    page: { kind: "studio-page", id: page.id, title: page.title },
    frames: frameList,
    selection,
    ...(editable ? {} : { note: "The person is viewing as Viewer: changes are refused until they switch to Admin." }),
  }, null, 2));
}

async function getTree(args: Record<string, unknown>): Promise<ToolAnswer> {
  const page = await openPage();
  if (!page) return refuse("not-a-studio-page", NOT_A_STUDIO_PAGE);
  const depth = typeof args.depth === "number" && Number.isInteger(args.depth) ? Math.min(20, Math.max(1, args.depth)) : 8;
  let root: DocNode = page.board;
  if (typeof args.id === "string" && args.id) {
    const found = findLayer(page.board, args.id);
    if (!found) return refuse("not-found", `No layer #${args.id} on this page (it may have been removed): call get_tree without an id`);
    root = found.node;
  } else {
    root = selectedFrame(page) ?? page.board;
  }
  const where = root === page.board ? `the whole page (${frames(page.board).length} frames)` : `#${root.id}`;
  return answer(`Page "${page.title}", ${where}:\n${outline(root, { depth })}`);
}

/** EditOps for `props`: a literal sets the prop, null removes it. */
function propOps(props: unknown): EditOp[] | string {
  if (props === undefined) return [];
  if (!props || typeof props !== "object" || Array.isArray(props)) return "`props` must be an object of prop names to values";
  const ops: EditOp[] = [];
  for (const [name, value] of Object.entries(props)) {
    if (!PROP_NAME.test(name) || RESERVED_PROPS.has(name)) return `"${name}" cannot be set here`;
    if (value === null) ops.push({ op: "removeProp", name });
    else if (typeof value === "string") ops.push({ op: "setProp", name, value: { kind: "string", value } });
    else if (typeof value === "boolean") ops.push({ op: "setProp", name, value: { kind: "boolean", value } });
    else if (typeof value === "number" && Number.isFinite(value)) ops.push({ op: "setProp", name, value: { kind: "number", value } });
    else return `"${name}": only a string, number, boolean or null can be written`;
  }
  return ops;
}

async function update(args: Record<string, unknown>): Promise<ToolAnswer> {
  if (studioStore.getState().role !== "admin") return refuse("forbidden", "The person is viewing as Viewer in Zen Studio: ask them to switch to Admin to allow changes.");
  const page = await openPage();
  if (!page) return refuse("not-a-studio-page", NOT_A_STUDIO_PAGE);
  if (typeof args.id !== "string" || !args.id) return refuse("invalid", "`id` (a layer id from get_tree) is required");
  const found = findLayer(page.board, args.id);
  const loc = page.locOf.get(args.id);
  if (!found || !loc) return refuse("not-found", `No layer #${args.id} on this page (it may have been removed): call get_tree again`);
  const node = found.node;
  if (node.name === "Board") return refuse("invalid", "The Board holds the frames and has no props to change: pick a frame or a layer");
  const ops = propOps(args.props);
  if (typeof ops === "string") return refuse("invalid", ops);
  if (args.text !== undefined) {
    if (typeof args.text !== "string") return refuse("invalid", "`text` must be a string");
    const element = await studioApi.element(page.file, loc);
    const own = element?.children.find((child) => child.kind === "text" && child.value.trim());
    if (!own || own.kind !== "text") return refuse("invalid", `${node.name} #${node.id} has no text of its own: set its text prop (label, title…) or change the text layer inside it (get_tree id=${node.id})`);
    ops.push({ op: "setText", index: own.index, value: args.text });
  }
  if (!ops.length) return refuse("invalid", "Nothing to change: give `props` or `text`");
  const what = [...Object.keys((args.props as object | undefined) ?? {}), ...(args.text !== undefined ? ["text"] : [])].join(", ");
  const response = await applyEdit({ file: page.file, loc, name: node.name, ops }, `AI · ${node.name} ${what}`);
  if (!response.ok) return refuse(response.code, response.error);
  const after = await openPage();
  const now = after ? findLayer(after.board, node.id)?.node : null;
  const shown = now ? outline(now, { depth: 1 }) : layerLine(node);
  return answer(response.before === response.after ? `No change: the layer already had these values.\n${shown}` : `Changed (one undo step for the person):\n${shown}`);
}

async function getScreenshot(args: Record<string, unknown>): Promise<ToolAnswer> {
  const page = await openPage();
  if (!page) return refuse("not-a-studio-page", NOT_A_STUDIO_PAGE);
  let frame: DocNode | null;
  if (typeof args.id === "string" && args.id) {
    if (!findLayer(page.board, args.id)) return refuse("not-found", `No layer #${args.id} on this page: call get_tree`);
    frame = frameOf(page.board, args.id);
    if (!frame) return refuse("invalid", `#${args.id} is not inside a frame: give a frame's id (get_studio_state lists them)`);
  } else {
    frame = selectedFrame(page) ?? frames(page.board)[0] ?? null;
  }
  if (!frame) return refuse("invalid", "The page has no frame to draw");
  const picture = await framePicture({ id: page.id, title: page.title, text: page.text, frame: canvasFrameId(frame) });
  if ("error" in picture) return refuse("invalid", picture.error);
  const data = await base64(picture.png);
  const size = `${picture.width}×${picture.height} px${picture.scale < 1 ? `, drawn at ${Math.round(picture.scale * 100)}%` : ""}`;
  const notes = picture.notes.length ? ` Not in the picture: ${picture.notes.join("; ")}.` : "";
  return { ok: true, content: [{ type: "image", data, mimeType: "image/png" }, { type: "text", text: `Frame "${picture.title}" (#${frame.id}), ${size}.${notes}` }] };
}

async function base64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let at = 0; at < bytes.length; at += 0x8000) binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
  return btoa(binary);
}

/** Runs one tool call from the relay. */
export async function runTool(tool: string, args: Record<string, unknown>, { tab }: { tab: string }): Promise<ToolAnswer> {
  switch (tool) {
    case "get_studio_state": return getStudioState(tab);
    case "get_tree": return getTree(args);
    case "update": return update(args);
    case "get_screenshot": return getScreenshot(args);
    default: return refuse("invalid", `This Studio does not know the tool ${tool}: reload the Studio tab`);
  }
}
