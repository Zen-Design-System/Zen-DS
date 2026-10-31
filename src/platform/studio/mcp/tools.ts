import { applyEdit, parseSrc, revertEdits, squashEdits, studioApi } from "../api";
import { zoomToSelection } from "../canvas/zoomToSelection";
import { loadEngine, zenComponents } from "../builder/engine";
import { framePicture } from "../builder/export/htmlExport";
import { ensurePageDoc } from "../builder/localApi";
import { addFrame } from "../builder/proto/addFrame";
import { freeId, getPage, listPages, pageFile, putPage } from "../builder/store/pageStore";
import { selectLayers } from "../select/multiSelection";
import { openLocalPage } from "../shell/navigation";
import { studioStore } from "../store";
import type { EditOp, EditResponse, EditValue } from "../types";
import { childLayers, FRAME_NAMES, findLayer, frameOf, layerLine, outline, type DocNode } from "./tree";
import { withHeaderProject } from "../builder/store/pageModel";
import { activeProjectId } from "../project/activeProject";

/*
 * The Studio MCP's tools as the open tab runs them (spec docs/research/studio-mcp-canvas-2026-10-15.md §5; M0, M1; the
 * definitions the AI sees are tools/studio/mcp/tools.mjs). Reads come from the page's document (stable layer ids);
 * every write goes through api.ts applyEdit, as an Inspector edit does: it shows at once, is refused for the same
 * reasons, and each call is one undo step (a call that took several writes is squashed into one). Pages made in the
 * Studio only (M2 adds the example and template pages).
 */

export type ToolContent = Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: "image/png" }>;
export type ToolAnswer = { ok: true; content: ToolContent } | { ok: false; code: string; error: string };
type Args = Record<string, unknown>;
/** A write tool's result: its answer, the layer it made or changed (for batch's `as`), and how many writes it took. */
type Done = { answer: ToolAnswer; id?: string; writes: number };
/** How a write is labelled in the undo history: alone ("AI · Add Button"), or inside a batch (squashed afterwards). */
type Ctx = { label: (what: string) => string };

const answer = (text: string): ToolAnswer => ({ ok: true, content: [{ type: "text", text }] });
const refuse = (code: string, error: string): ToolAnswer => ({ ok: false, code, error });
const refused = (code: string, error: string): Done => ({ answer: refuse(code, error), writes: 0 });
const ALONE: Ctx = { label: (what) => `AI · ${what}` };

const NOT_A_STUDIO_PAGE = "The open page is not a page made in the Studio. For now the AI edits those only: ask the person to open one (open_page, list_pages) or make one (create_page).";
const VIEWER = "The person is viewing as Viewer in Zen Studio: ask them to switch to Admin to allow changes.";
/** Props an AI may not write: the layer's identity and React's own. */
const RESERVED_PROPS = new Set(["data-zen-id", "key", "ref", "children"]);
const PROP_NAME = /^[A-Za-z][\w-]*$/;

type OpenPage = { id: string; file: string; title: string; text: string; board: DocNode; vars: Record<string, unknown>; idAt: Map<string, string>; locOf: Map<string, string> };

/** The open Studio page with its document and where each layer sits in its text; null on another kind of page. */
async function openPage(): Promise<OpenPage | null> {
  const id = studioStore.getState().localPage;
  if (!id) return null;
  await ensurePageDoc(id);
  const record = await getPage(id);
  if (!record?.doc) return null;
  const engine = await loadEngine();
  const { idAt, locOf } = engine.locsOf(record.doc, record.text, { components: new Set(zenComponents) });
  return { id, file: pageFile(id), title: record.title, text: record.text, board: record.doc.board as DocNode, vars: (record.doc as { vars?: Record<string, unknown> }).vars ?? {}, idAt, locOf };
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

/** A layer of the open page by id, with where it sits in the text; a refusal the AI can act on otherwise. */
type Layer = { node: DocNode; loc: string; parent: DocNode | null };
function layerOf(page: OpenPage, id: unknown, what = "id"): Layer | Done {
  if (typeof id !== "string" || !id) return refused("invalid", `\`${what}\` (a layer id from get_tree) is required`);
  const found = findLayer(page.board, id);
  const loc = page.locOf.get(id);
  if (!found || !loc) return refused("not-found", `No layer #${id} on this page (it may have been removed): call get_tree again`);
  return { node: found.node, loc, parent: found.ancestors[found.ancestors.length - 1] ?? null };
}
const isDone = (value: object): value is Done => "answer" in value;

/** The open page, refusing when there is none or the person cannot edit. */
async function editablePage(): Promise<OpenPage | Done> {
  if (studioStore.getState().role !== "admin") return refused("forbidden", VIEWER);
  return (await openPage()) ?? refused("not-a-studio-page", NOT_A_STUDIO_PAGE);
}

/** One applyEdit on a layer of `page` (with the page's hash: a change made meanwhile is refused as stale). */
async function edit(page: OpenPage, node: DocNode, loc: string, ops: EditOp[], label: string): Promise<EditResponse> {
  const engine = await loadEngine();
  return applyEdit({ file: page.file, loc, name: node.name, ops, hash: engine.sha1(page.text) }, label);
}

/** The layer at `loc` of the text the page holds now, with its outline; `fallback` when it cannot be found. */
async function shown(loc: string | undefined, id: string | undefined, depth: number): Promise<{ id?: string; text: string }> {
  const after = await openPage();
  if (!after) return { text: "(the page is no longer open)" };
  const own = id ?? (loc ? after.idAt.get(loc) : undefined);
  const node = own ? findLayer(after.board, own)?.node : null;
  return node ? { id: node.id, text: outline(node, { depth }) } : { id: own, text: "(not found in the page now)" };
}

const changedText = (response: Extract<EditResponse, { ok: true }>) => response.before !== response.after;

const BREAKPOINT_KEYS: readonly string[] = ["desktop", "tablet", "mobile"];

/** EditValues for `props`: a literal sets the prop, null removes it (removals come back as names). */
function propValues(props: unknown): { set: Record<string, EditValue>; remove: string[] } | string {
  const out = { set: {} as Record<string, EditValue>, remove: [] as string[] };
  if (props === undefined) return out;
  if (!props || typeof props !== "object" || Array.isArray(props)) return "`props` must be an object of prop names to values";
  for (const [name, value] of Object.entries(props)) {
    if (!PROP_NAME.test(name) || RESERVED_PROPS.has(name)) return `"${name}" cannot be set here`;
    if (value === null) out.remove.push(name);
    else if (typeof value === "string") out.set[name] = { kind: "string", value };
    else if (typeof value === "boolean") out.set[name] = { kind: "boolean", value };
    else if (typeof value === "number" && Number.isFinite(value)) out.set[name] = { kind: "number", value };
    // One value per breakpoint ({ desktop, tablet, mobile }: Stack / Grid / Box layout props) or a list of breakpoints
    // (hideOn), written as the object or array literal (studio-responsive-breakpoints §4).
    else if (Array.isArray(value) && value.every((item) => BREAKPOINT_KEYS.includes(item as string))) out.set[name] = { kind: "expression", code: JSON.stringify(BREAKPOINT_KEYS.filter((key) => value.includes(key))) };
    else if (typeof value === "object" && Object.keys(value).length && Object.entries(value).every(([key, item]) => BREAKPOINT_KEYS.includes(key) && ["string", "number", "boolean"].includes(typeof item))) {
      out.set[name] = { kind: "expression", code: `{ ${BREAKPOINT_KEYS.filter((key) => key in value).map((key) => `${key}: ${JSON.stringify((value as Record<string, unknown>)[key])}`).join(", ")} }` };
    } else return `"${name}": only a string, number, boolean, null, { desktop, tablet, mobile } or a list of breakpoints can be written`;
  }
  return out;
}

const jsxOf = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

/* ── read ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

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

async function getPages(): Promise<ToolAnswer> {
  const open = studioStore.getState().localPage;
  const pages = (await listPages()).filter((page) => page.trashedAt === undefined);
  const rows = pages.map((page) => ({ id: page.id, title: page.title, ...(page.folder ? { folder: page.folder } : {}), updated: new Date(page.updatedAt).toISOString().slice(0, 16), ...(page.id === open ? { open: true } : {}) }));
  return answer(rows.length ? JSON.stringify(rows, null, 2) : "No pages made in the Studio yet: create_page makes one.");
}

async function getTree(args: Args): Promise<ToolAnswer> {
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
  // The page's prototype variables (W-52 B), which layers read as {vars.x} and proto.set changes in Play.
  const vars = Object.entries(page.vars);
  const varsLine = vars.length ? `\nVariables (Play): ${vars.map(([name, start]) => `${name} = ${JSON.stringify(start)}`).join(", ")}` : "";
  return answer(`Page "${page.title}", ${where}:${varsLine}\n${outline(root, { depth })}`);
}

async function getNode(args: Args): Promise<ToolAnswer> {
  const page = await openPage();
  if (!page) return refuse("not-a-studio-page", NOT_A_STUDIO_PAGE);
  const layer = layerOf(page, args.id);
  if (isDone(layer)) return layer.answer;
  const element = await studioApi.element(page.file, layer.loc);
  const props = Object.fromEntries((element?.attributes ?? []).filter((attr) => attr.name !== "data-zen-id").map((attr) => [attr.name, attr.kind === "string" ? attr.value : attr.kind === "true" ? true : { code: attr.value ?? attr.raw }]));
  // A slot holds one layer, or several (a fragment, 2026-10-16): each listed by its component and id.
  const slots = Object.entries(layer.node.props).flatMap(([name, value]) => (value.kind === "element" ? [{ prop: name, layer: `${value.node.name} #${value.node.id}` }]
    : value.kind === "fragment" ? value.children.flatMap((child) => (child.kind === "element" ? [{ prop: name, layer: `${child.name} #${child.id}` }] : [])) : []));
  const parent = layer.parent;
  const index = parent ? childLayers(parent).findIndex((child) => child.id === layer.node.id) : -1;
  return answer(JSON.stringify({
    id: layer.node.id,
    component: layer.node.name,
    props,
    text: (element?.children ?? []).filter((child) => child.kind === "text").map((child) => (child.kind === "text" ? child.value : "")),
    slots,
    layers: childLayers(layer.node).map((child) => `${child.name} #${child.id}`),
    parent: parent ? { id: parent.id, component: parent.name, index } : null,
    frame: frameOf(page.board, layer.node.id)?.id ?? null,
    wrap: element?.wrap ?? null,
    note: `Every prop of ${layer.node.name}: zen-ds get_component.`,
  }, null, 2));
}

async function getCode(args: Args): Promise<ToolAnswer> {
  const page = await openPage();
  if (!page) return refuse("not-a-studio-page", NOT_A_STUDIO_PAGE);
  if (args.id === undefined) return answer(page.text);
  const layer = layerOf(page, args.id);
  if (isDone(layer)) return layer.answer;
  const engine = await loadEngine();
  return answer(engine.elementText(layer.node as never));
}

async function getScreenshot(args: Args): Promise<ToolAnswer> {
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

/* ── write ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

async function update(args: Args, ctx: Ctx): Promise<Done> {
  const page = await editablePage();
  if (isDone(page)) return page;
  const layer = layerOf(page, args.id);
  if (isDone(layer)) return layer;
  const { node, loc } = layer;
  if (node.name === "Board") return refused("invalid", "The Board holds the frames and has no props to change: pick a frame or a layer");
  const values = propValues(args.props);
  if (typeof values === "string") return refused("invalid", values);
  const ops: EditOp[] = [...Object.entries(values.set).map(([name, value]): EditOp => ({ op: "setProp", name, value })), ...values.remove.map((name): EditOp => ({ op: "removeProp", name }))];
  if (args.text !== undefined) {
    if (typeof args.text !== "string") return refused("invalid", "`text` must be a string");
    const element = await studioApi.element(page.file, loc);
    const own = element?.children.find((child) => child.kind === "text" && child.value.trim());
    if (!own || own.kind !== "text") return refused("invalid", `${node.name} #${node.id} has no text of its own: set its text prop (label, title…) or change the text layer inside it (get_tree id=${node.id})`);
    ops.push({ op: "setText", index: own.index, value: args.text });
  }
  if (!ops.length) return refused("invalid", "Nothing to change: give `props` or `text`");
  const what = [...Object.keys((args.props as object | undefined) ?? {}), ...(args.text !== undefined ? ["text"] : [])].join(", ");
  const response = await edit(page, node, loc, ops, ctx.label(`${node.name} ${what}`));
  if (!response.ok) return refused(response.code, response.error);
  const now = await shown(undefined, node.id, 1);
  return { answer: answer(changedText(response) ? `Changed:\n${now.text}` : `No change: the layer already had these values.\n${now.text}`), id: node.id, writes: changedText(response) ? 1 : 0 };
}

async function insert(args: Args, ctx: Ctx): Promise<Done> {
  const page = await editablePage();
  if (isDone(page)) return page;
  const layer = layerOf(page, args.parent, "parent");
  if (isDone(layer)) return layer;
  const code = jsxOf(args.jsx);
  if (!code) return refused("invalid", "`jsx` (one JSX element) is required");
  const op: Extract<EditOp, { op: "insertChild" }> = { op: "insertChild", code };
  if (args.prop !== undefined) {
    if (typeof args.prop !== "string" || !PROP_NAME.test(args.prop) || RESERVED_PROPS.has(args.prop)) return refused("invalid", "`prop` must be a slot prop's name");
    op.prop = args.prop;
  } else if (typeof args.index === "number") {
    // The index-th layer among the parent's children, as a place in the element's children (texts included).
    const element = await studioApi.element(page.file, layer.loc);
    const places = (element?.children ?? []).map((child, place) => ({ child, place })).filter(({ child }) => child.kind !== "text");
    const before = places[Math.max(0, Math.floor(args.index))];
    if (before) op.index = before.place;
  }
  const response = await edit(page, layer.node, layer.loc, [op], ctx.label(`Add ${/^<([A-Z][\w.]*)/.exec(code)?.[1] ?? "layer"}`));
  if (!response.ok) return refused(response.code, response.error);
  const added = await shown(response.inserted?.loc, undefined, 3);
  return { answer: answer(`Added to #${layer.node.id}:\n${added.text}`), id: added.id, writes: changedText(response) ? 1 : 0 };
}

async function replace(args: Args, ctx: Ctx): Promise<Done> {
  const page = await editablePage();
  if (isDone(page)) return page;
  const layer = layerOf(page, args.id);
  if (isDone(layer)) return layer;
  const code = jsxOf(args.jsx);
  if (!code) return refused("invalid", "`jsx` (the JSX that takes the layer's place) is required");
  if (FRAME_NAMES.has(layer.node.name) || layer.node.name === "Board") return refused("invalid", "A frame is not replaced: change its layers, or delete it and add_frame");
  const response = await edit(page, layer.node, layer.loc, [{ op: "replaceElement", code }], ctx.label(`Replace ${layer.node.name}`));
  if (!response.ok) return refused(response.code, response.error);
  const now = await shown(response.inserted?.loc, undefined, 3);
  return { answer: answer(`Replaced #${layer.node.id} with:\n${now.text}`), id: now.id, writes: changedText(response) ? 1 : 0 };
}

async function move(args: Args, ctx: Ctx): Promise<Done> {
  const page = await editablePage();
  if (isDone(page)) return page;
  const layer = layerOf(page, args.id);
  if (isDone(layer)) return layer;
  const target = layerOf(page, args.parent, "parent");
  if (isDone(target)) return target;
  const siblings = childLayers(target.node).filter((child) => child.id !== layer.node.id);
  const index = typeof args.index === "number" ? Math.max(0, Math.floor(args.index)) : siblings.length;
  const before = siblings[index] ? page.locOf.get(siblings[index].id) : undefined;
  const op: EditOp = { op: "moveTo", parent: target.loc, ...(before ? { before } : {}) };
  const response = await edit(page, layer.node, layer.loc, [op], ctx.label(`Move ${layer.node.name}`));
  if (!response.ok) return refused(response.code, response.error);
  const now = await shown(response.moved?.loc, layer.node.id, 1);
  return { answer: answer(`Moved into #${target.node.id} at ${Math.min(index, siblings.length)}:\n${now.text}`), id: layer.node.id, writes: changedText(response) ? 1 : 0 };
}

async function duplicate(args: Args, ctx: Ctx): Promise<Done> {
  const page = await editablePage();
  if (isDone(page)) return page;
  const layer = layerOf(page, args.id);
  if (isDone(layer)) return layer;
  const response = await edit(page, layer.node, layer.loc, [{ op: "duplicateElement" }], ctx.label(`Duplicate ${layer.node.name}`));
  if (!response.ok) return refused(response.code, response.error);
  const copy = await shown(response.inserted?.loc, undefined, 2);
  return { answer: answer(`Copied #${layer.node.id}:\n${copy.text}`), id: copy.id, writes: changedText(response) ? 1 : 0 };
}

async function remove(args: Args, ctx: Ctx): Promise<Done> {
  const page = await editablePage();
  if (isDone(page)) return page;
  const layer = layerOf(page, args.id);
  if (isDone(layer)) return layer;
  if (layer.node.name === "Board") return refused("invalid", "The Board holds the page's frames and cannot be deleted");
  const response = await edit(page, layer.node, layer.loc, [{ op: "removeElement" }], ctx.label(`Delete ${layer.node.name}`));
  if (!response.ok) return refused(response.code, response.error);
  return { answer: answer(`Deleted ${layer.node.name} #${layer.node.id} (the person can bring it back with ⌘Z).`), writes: changedText(response) ? 1 : 0 };
}

async function wrap(args: Args, ctx: Ctx): Promise<Done> {
  const page = await editablePage();
  if (isDone(page)) return page;
  const ids = Array.isArray(args.ids) ? args.ids : [];
  if (!ids.length) return refused("invalid", "`ids` (the layers to wrap) is required");
  const layers: Layer[] = [];
  for (const id of ids) {
    const layer = layerOf(page, id);
    if (isDone(layer)) return layer;
    layers.push(layer);
  }
  const parent = layers[0].parent;
  if (!parent || layers.some((layer) => layer.parent?.id !== parent.id)) return refused("invalid", "The layers to wrap must sit side by side in one parent");
  const tag = args.tag === undefined ? "Stack" : args.tag;
  if (tag !== "Stack" && tag !== "Grid" && tag !== "Box") return refused("invalid", "`tag` is Stack, Grid or Box");
  const values = propValues(args.props);
  if (typeof values === "string") return refused("invalid", values);
  // The first in the parent's order takes the op; the others come along (`with`), in source order.
  const order = childLayers(parent).map((child) => child.id);
  layers.sort((a, b) => order.indexOf(a.node.id) - order.indexOf(b.node.id));
  const [first, ...others] = layers;
  const op: EditOp = { op: "wrap", tag, props: values.set, ...(others.length ? { with: others.map((layer) => layer.loc) } : {}) };
  const response = await edit(page, first.node, first.loc, [op], ctx.label(`Wrap in ${tag}`));
  if (!response.ok) return refused(response.code, response.error);
  const now = await shown(response.wrapped?.loc, undefined, 2);
  return { answer: answer(`Wrapped in:\n${now.text}`), id: now.id, writes: changedText(response) ? 1 : 0 };
}

async function unwrap(args: Args, ctx: Ctx): Promise<Done> {
  const page = await editablePage();
  if (isDone(page)) return page;
  const layer = layerOf(page, args.id);
  if (isDone(layer)) return layer;
  const response = await edit(page, layer.node, layer.loc, [{ op: "unwrap" }], ctx.label(`Remove ${layer.node.name}`));
  if (!response.ok) return refused(response.code, response.error);
  const now = await shown(response.unwrapped?.loc, undefined, 1);
  return { answer: answer(`Removed ${layer.node.name} #${layer.node.id}; its layer is now:\n${now.text}`), id: now.id, writes: changedText(response) ? 1 : 0 };
}

const WRITES: Record<string, (args: Args, ctx: Ctx) => Promise<Done>> = { update, insert, replace, move, duplicate, delete: remove, wrap, unwrap };

/** "$name" in an id field (id, parent, ids) becomes the id an earlier op named with `as`. */
function resolveNames(args: Args, names: Map<string, string>): Args | string {
  const one = (value: unknown): unknown => {
    if (typeof value !== "string" || !value.startsWith("$")) return value;
    const id = names.get(value.slice(1));
    if (!id) throw new Error(`${value} names no earlier op (give that op "as": "${value.slice(1)}")`);
    return id;
  };
  try {
    return { ...args, ...(args.id !== undefined ? { id: one(args.id) } : {}), ...(args.parent !== undefined ? { parent: one(args.parent) } : {}), ...(Array.isArray(args.ids) ? { ids: args.ids.map(one) } : {}) };
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

async function batch(args: Args): Promise<ToolAnswer> {
  const ops = Array.isArray(args.ops) ? args.ops : [];
  if (!ops.length || ops.length > 50) return refuse("invalid", "`ops` holds 1 to 50 operations");
  const start = await editablePage();
  if (isDone(start)) return start.answer;
  const before = start.text;
  const names = new Map<string, string>();
  const lines: string[] = [];
  let writes = 0;
  const inside: Ctx = { label: () => "AI batch" };
  const takeBack = async () => {
    const now = await openPage();
    return writes ? revertEdits(writes, before, now?.text ?? before) : true;
  };
  for (const [index, raw] of ops.entries()) {
    const op = raw as { tool?: unknown; args?: unknown; as?: unknown };
    const run = typeof op.tool === "string" ? WRITES[op.tool] : undefined;
    const fail = async (why: string) => {
      const back = await takeBack();
      return refuse("refused", `Op ${index + 1} (${String(op.tool)}) was refused: ${why}. ${writes ? (back ? `The ${index} op(s) before it were taken back: the page is as it was.` : "The ops before it could not be taken back: check the page (get_tree).") : "Nothing changed."}`);
    };
    if (!run) return fail(`batch runs ${Object.keys(WRITES).join(", ")}`);
    const resolved = resolveNames((op.args ?? {}) as Args, names);
    if (typeof resolved === "string") return fail(resolved);
    const done = await run(resolved, inside);
    writes += done.writes;
    if (!done.answer.ok) return fail(done.answer.error);
    if (typeof op.as === "string" && done.id) names.set(op.as, done.id);
    const first = done.answer.content[0];
    lines.push(`${index + 1}. ${op.tool}${typeof op.as === "string" && done.id ? ` ($${op.as} = #${done.id})` : ""}: ${first?.type === "text" ? first.text.split("\n").slice(0, 2).join(" ").trim() : "done"}`);
  }
  const after = await openPage();
  if (writes && after) squashEdits(writes, `AI · ${ops.length} change${ops.length === 1 ? "" : "s"}`, before, after.text);
  return answer(`Done: ${ops.length} op(s), one undo step for the person.\n${lines.join("\n")}`);
}

async function createPage(args: Args): Promise<ToolAnswer> {
  if (studioStore.getState().role !== "admin") return refuse("forbidden", VIEWER);
  const title = typeof args.title === "string" ? args.title.trim().slice(0, 80) : "";
  if (!title) return refuse("invalid", "`title` is required");
  const device = args.device === undefined ? "desktop" : args.device;
  if (device !== "desktop" && device !== "tablet" && device !== "phone") return refuse("invalid", "`device` is desktop, tablet or phone");
  const [engine, id] = await Promise.all([loadEngine(), freeId(title)]);
  // In a Studio project (the page or the home open in the tab), the page is the project's and draws in its theme.
  await putPage(id, withHeaderProject(engine.newPageText({ title, device, chrome: args.chrome !== false }), activeProjectId()), { title });
  openLocalPage(id, { made: true });
  const page = await openPage();
  if (!page || page.id !== id) return answer(`Made the page "${title}" (${id}); open it with open_page.`);
  return answer(`Made and opened the page "${title}" (${id}). To remove it, the person moves it to the Trash in Pages.\n${outline(page.board, { depth: 6 })}`);
}

async function addFrameTool(args: Args): Promise<ToolAnswer> {
  const page = await editablePage();
  if (isDone(page)) return page.answer;
  const kind = args.kind === undefined ? "screen" : args.kind;
  if (kind !== "screen" && kind !== "overlay") return refuse("invalid", "`kind` is screen or overlay");
  const device = args.device;
  if (device !== undefined && device !== "desktop" && device !== "tablet" && device !== "phone") return refuse("invalid", "`device` is desktop, tablet or phone");
  const place = typeof args.x === "number" && typeof args.y === "number" ? { x: Math.round(args.x), y: Math.round(args.y) } : undefined;
  const before = page.text;
  const known = new Set(frames(page.board).map((node) => node.id));
  const undoBefore = studioStore.getState().undo;
  if (!(await addFrame(page.id, kind, { ...(place ? { place } : {}), ...(typeof device === "string" ? { device } : {}) }))) return refuse("invalid", "The frame could not be added (the page may have changed: call get_studio_state)");
  let now = await openPage();
  const added = now ? frames(now.board).find((node) => !known.has(node.id)) : undefined;
  if (now && added && typeof args.title === "string" && args.title.trim() && kind === "screen") {
    const loc = now.locOf.get(added.id);
    if (loc) await edit(now, added, loc, [{ op: "setProp", name: "title", value: { kind: "string", value: args.title.trim().slice(0, 80) } }], "AI batch");
    now = await openPage();
  }
  // addFrame may pin the frames' places first: every write it made is one undo step.
  const undo = studioStore.getState().undo;
  const writes = undo.filter((record) => !undoBefore.includes(record)).length;
  if (now && writes) squashEdits(writes, `AI · Add ${kind}`, before, now.text);
  const frame = now && added ? findLayer(now.board, added.id)?.node : null;
  return frame ? answer(`Added:\n${outline(frame, { depth: 4 })}`) : answer("Added a frame: call get_studio_state for its id.");
}

/* ── view ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Selects the layers (a frame alone selects the frame); false when one is not on the page. */
function selectIds(page: OpenPage, ids: string[]): string | null {
  const layers: Layer[] = [];
  for (const id of ids) {
    const layer = layerOf(page, id);
    if (isDone(layer)) return layer.answer.ok ? "invalid" : layer.answer.error;
    layers.push(layer);
  }
  const [first] = layers;
  if (FRAME_NAMES.has(first.node.name) || first.node.name === "Board") {
    if (first.node.name === "Board") return "The Board is not selectable: pick a frame or a layer";
    studioStore.setState({ selection: { kind: "frame", frameId: canvasFrameId(first.node) } });
    return null;
  }
  const refOf = (layer: Layer) => {
    const frame = frameOf(page.board, layer.node.id);
    return { src: `${page.file}:${layer.loc}`, name: layer.node.name, frameId: frame ? canvasFrameId(frame) : null, panelId: null, instance: 0 };
  };
  selectLayers(refOf(first), layers.slice(1).filter((layer) => !FRAME_NAMES.has(layer.node.name)).map(refOf));
  return null;
}

async function select(args: Args): Promise<ToolAnswer> {
  const page = await openPage();
  if (!page) return refuse("not-a-studio-page", NOT_A_STUDIO_PAGE);
  const ids = Array.isArray(args.ids) ? args.ids.filter((id): id is string => typeof id === "string") : [];
  if (!ids.length) return refuse("invalid", "`ids` is required");
  const error = selectIds(page, ids);
  return error ? refuse("invalid", error) : answer(`Selected ${ids.map((id) => `#${id}`).join(", ")}.`);
}

async function focus(args: Args): Promise<ToolAnswer> {
  const page = await openPage();
  if (!page) return refuse("not-a-studio-page", NOT_A_STUDIO_PAGE);
  if (typeof args.id !== "string") return refuse("invalid", "`id` is required");
  const error = selectIds(page, [args.id]);
  if (error) return refuse("invalid", error);
  // The selection renders first; then the canvas zooms to it.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return answer(zoomToSelection() ? `Zoomed to #${args.id}.` : `Selected #${args.id} (it is not drawn on the canvas, so the view stayed).`);
}

async function openPageTool(args: Args): Promise<ToolAnswer> {
  if (typeof args.id !== "string" || !args.id) return refuse("invalid", "`id` (from list_pages) is required");
  const record = await getPage(args.id);
  if (!record || record.trashedAt !== undefined) return refuse("not-found", `No page ${args.id} in this browser: list_pages lists them`);
  openLocalPage(args.id);
  const page = await openPage();
  return page ? answer(`Opened "${page.title}" (${page.id}): ${frames(page.board).length} frame(s).`) : answer(`Opening ${args.id}…`);
}

/** Runs one tool call from the relay. */
export async function runTool(tool: string, args: Args, { tab }: { tab: string }): Promise<ToolAnswer> {
  const write = WRITES[tool];
  if (write) return (await write(args, ALONE)).answer;
  switch (tool) {
    case "get_studio_state": return getStudioState(tab);
    case "list_pages": return getPages();
    case "get_tree": return getTree(args);
    case "get_node": return getNode(args);
    case "get_code": return getCode(args);
    case "get_screenshot": return getScreenshot(args);
    case "batch": return batch(args);
    case "create_page": return createPage(args);
    case "add_frame": return addFrameTool(args);
    case "select": return select(args);
    case "focus": return focus(args);
    case "open_page": return openPageTool(args);
    default: return refuse("invalid", `This Studio does not know the tool ${tool}: reload the Studio tab`);
  }
}
