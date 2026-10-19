import { typographyStyles } from "../../../tokens/typography.generated";
import type { DetachPlan, EditRequest, EditResponse, SourceElement, SourceFile, WriteRequest, WriteResponse } from "../types";
import { engineOptions, loadDetach, loadEngine, zenComponents } from "./engine";
import { getPage, pageFile, pageIdOf, putPage, setPageDoc } from "./store/pageStore";
import { loadPathKit } from "../draw/pathKit";
import type { PageDoc } from "../../../../tools/studio/browser-engine.mjs";
import { LEGACY_FRAME } from "../../../../tools/studio/screen-chrome.mjs";

/*
 * The Studio's source API for builder pages kept in the browser (Studio builder GĐ2 M1; spec
 * docs/research/studio-builder-pages-spec-2026-10-06.md §3): the same requests and answers as the dev server's
 * /__zen-studio routes (GET /source, GET /element, POST /edit, POST /write), computed by the same engine in the browser
 * against the PageStore. api.ts routes every file named "local:<id>.zen.tsx" here, so history, the Inspector, slots and
 * every canvas edit work unchanged. An edit that would leave an invalid page (dialect.mjs) is refused with its reason.
 *
 * Core rebuild M2 (docs/research/studio-doc-engine-plan-2026-10-10.md): a page is a JSON document (tools/studio/doc.mjs)
 * and its text is that document's print. An edit runs on the document (editDoc: the same engine, on a print that carries
 * each element's id), so every element keeps its id across edits; undo and redo bring back the document of the text they
 * put back. A page gets its document when it opens (ensurePageDoc).
 *
 * M3: an edit, undo and redo answer with `locs`, where each element is in the new text by its id, so the selection
 * follows its element exactly (select/remap.ts mapSrc) instead of guessing from a text diff.
 */

/** The documents of the texts this session wrote, by the text's hash: undo and redo put a text back with its ids. */
const documents = new Map<string, PageDoc>();
const remember = (hash: string, doc: PageDoc) => {
  documents.delete(hash);
  documents.set(hash, doc);
  if (documents.size > 400) documents.delete(documents.keys().next().value as string);
};

type Engine = Awaited<ReturnType<typeof loadEngine>>;
type Edited = { doc: PageDoc; text: string; locs: Record<string, string | null> | null };

/**
 * After an edit (`before` → `edited`): each Screen's phone parts linked to its desktop header follow it, and a part the
 * edit changed on the phone becomes the person's own (tools/studio/responsive-header.mjs, component-usage-rules §17).
 * The Screens' edits join this one (one ⌘Z); `locs` carry the elements from `before` to the final text.
 */
function withPhoneSync(engine: Engine, before: string | null, edited: Edited, file: string, options: Record<string, unknown>): Edited {
  const components = new Set(zenComponents);
  let current = edited;
  // One Screen request per round, planned again on the new text (an edit above a Screen moves its place); a Screen takes
  // up to three (each new part alone, then the rest), a page seldom has more than a few Screens.
  for (let round = 0; round < 24; round++) {
    const [plan] = engine.planPhoneSync(before, current.text, { components });
    if (!plan) break;
    const next = engine.editDoc(current.doc, current.text, { file, loc: plan.loc, name: plan.name, ops: plan.ops }, { components, applyOps: engine.applyOps, dataFieldEdit: engine.dataFieldEdit, sha1: engine.sha1, options: { ...options, hash: engine.sha1(current.text) } });
    if ("error" in next) break;
    const locs = current.locs && next.locs ? Object.fromEntries(Object.entries(current.locs).map(([from, at]) => [from, at === null ? null : next.locs![at] ?? at])) : current.locs ?? next.locs;
    current = { doc: next.doc, text: next.text, locs };
  }
  return current;
}

/**
 * A page's boolean groups follow the edit (one ⌘Z with it; plan F9b): each group's result (`d`) is its shapes combined
 * now, written by tools/studio/path-ops.mjs planBooleans, one group per round. Skia's PathOps load on the first page
 * that has a group.
 */
async function withBooleans(engine: Engine, edited: Edited, file: string, options: Record<string, unknown>): Promise<Edited> {
  if (!edited.text.includes('type="boolean"')) return edited;
  const kit = await loadPathKit();
  const components = new Set(zenComponents);
  let current = edited;
  for (let round = 0; round < 24; round++) {
    const [plan] = engine.planBooleans(kit, current.text, { components });
    if (!plan) break;
    const next = engine.editDoc(current.doc, current.text, { file, loc: plan.loc, name: plan.name, ops: plan.ops }, { components, applyOps: engine.applyOps, dataFieldEdit: engine.dataFieldEdit, sha1: engine.sha1, options: { ...options, hash: engine.sha1(current.text) } });
    if ("error" in next) break;
    const locs = current.locs && next.locs ? Object.fromEntries(Object.entries(current.locs).map(([from, at]) => [from, at === null ? null : next.locs![at] ?? at])) : current.locs ?? next.locs;
    current = { doc: next.doc, text: next.text, locs };
  }
  return current;
}

/** Gives an open page its document (a text written without one: an older page, an import, a restored version). */
export async function ensurePageDoc(id: string): Promise<void> {
  const page = await getPage(id);
  if (!page) return;
  if (LEGACY_FRAME.test(page.text) && (await moveScreenFrame(id, page))) return;
  if (await linkPhoneChrome(id, page)) return;
  if (page.doc) return;
  const engine = await loadEngine();
  const { doc, errors } = engine.docFromText(page.text, { components: new Set(zenComponents) });
  // A page with dialect errors stays text; its errors show as before.
  if (!doc || errors.length) return;
  // The text stays as written (the person's formatting; the user's call, 2026-10-11: the page file stays TSX and its
  // document travels beside it in this browser). Refused when an edit landed meanwhile: that edit brought its own.
  if (await setPageDoc(id, page.text, doc)) remember(engine.sha1(page.text), doc);
}

/**
 * A page made before the master layout (tools/studio/screen-frame.mjs): its Screen's own Sidebar and Page header move
 * into the root AppShell, once, as an edit of its own (undo brings the old frame back). A page from a template showed
 * both its AppShell's Sidebar and the Screen's. The move runs on the print with ids too, so every element keeps its id
 * (a pulled page's Figma links). True when the page was rewritten.
 */
async function moveScreenFrame(id: string, page: { text: string; doc?: PageDoc }): Promise<boolean> {
  const engine = await loadEngine();
  const file = pageFile(id);
  const moved = engine.migrateScreenFrame(page.text, { file });
  if (!moved.changed) return false;
  const components = new Set(zenComponents);
  const plain = engine.docFromText(moved.text, { components });
  if (!plain.doc || plain.errors.length) return false;
  let doc = plain.doc;
  if (page.doc) {
    const tracked = engine.migrateScreenFrame(engine.printPage(page.doc, { ids: true }), { file });
    const read = tracked.changed ? engine.docFromText(tracked.text, { components }).doc : null;
    if (read && JSON.stringify(engine.withoutIds(read)) === JSON.stringify(engine.withoutIds(plain.doc))) doc = read;
  }
  await putPage(id, moved.text, { doc });
  remember(engine.sha1(moved.text), doc);
  return true;
}

/**
 * A Screen whose phone parts are not decided yet (a new or template page, or one made before 2026-10-16) gets them drawn
 * from its desktop AppShell and linked, once, as it opens (component-usage-rules §17). True when the page was rewritten.
 */
async function linkPhoneChrome(id: string, page: { text: string; doc?: PageDoc }): Promise<boolean> {
  const engine = await loadEngine();
  const components = new Set(zenComponents);
  if (!engine.planPhoneSync(null, page.text, { components }).length) return false;
  const doc = page.doc ?? engine.docFromText(page.text, { components }).doc;
  if (!doc) return false;
  const file = pageFile(id);
  const options = { ...(await engineOptions()), typographyKeys: Object.keys(typographyStyles), file };
  const linked = withPhoneSync(engine, null, { doc, text: page.text, locs: null }, file, options);
  if (linked.text === page.text) return false;
  await putPage(id, linked.text, { doc: linked.doc });
  remember(engine.sha1(linked.text), linked.doc);
  return true;
}

export const isLocalFile = (file: string | null | undefined): file is string => typeof file === "string" && file.startsWith("local:");

async function pageText(file: string): Promise<{ id: string; text: string } | null> {
  const id = pageIdOf(file);
  if (!id) return null;
  const page = await getPage(id);
  return page ? { id, text: page.text } : null;
}

export async function localSource(file: string): Promise<SourceFile | null> {
  const page = await pageText(file);
  if (!page) return null;
  const engine = await loadEngine();
  return { file, content: page.text, hash: engine.sha1(page.text) };
}

/** As GET /element: the element, its slots, and where each expression gets its value (mock rows are edited at the data). */
export async function localElement(file: string, loc: string): Promise<SourceElement | null> {
  const page = await pageText(file);
  if (!page) return null;
  const engine = await loadEngine();
  const element = engine.withSlots(engine.describeElement(page.text, file, loc), engine.describeSlots(page.text, file, loc, {}));
  if (!element) return null;
  const attrs = (element.attributes as Array<{ kind: string; name: string; dataSource?: unknown }>).filter((attr) => attr.kind === "expression" && attr.name);
  const children: Array<{ child: { dataSource?: unknown }; index: number }> = [];
  let index = -1;
  for (const child of (element.children as Array<{ kind: string; value?: string; dataSource?: unknown }> | undefined) ?? []) {
    if (child.kind === "text" && !String(child.value ?? "").trim()) continue;
    index += 1;
    if (child.kind === "expression") children.push({ child, index });
  }
  const targets: Array<{ prop: string } | { child: number } | { tableRows: true }> = [...attrs.map((attr) => ({ prop: attr.name })), ...children.map((entry) => ({ child: entry.index }))];
  // A Table: whether its rows can be edited (a column without `cell` draws its row's field), as GET /element says.
  const table = attrs.some((attr) => attr.name === "columns") && (element.attributes as Array<{ name: string }>).some((attr) => attr.name === "rows" || attr.name === "data");
  if (table) targets.push({ tableRows: true });
  if (targets.length) {
    const origins = engine.originsOf(page.text, file, loc, targets, { read: () => null });
    attrs.forEach((attr, at) => { attr.dataSource = origins[at]; });
    children.forEach((entry, at) => { entry.child.dataSource = origins[attrs.length + at]; });
    if (table) (element as { tableRows?: unknown }).tableRows = origins[targets.length - 1];
  }
  return element as unknown as SourceElement;
}

/**
 * As GET /detach-plan (GĐ4 M4): whether the element can be detached and what to measure, from the detach recipes,
 * loaded on first use. The plan's raw answer; api.ts reads it as it reads the dev server's.
 */
export async function localDetachPlan(file: string, loc: string, name: string, instances?: number): Promise<DetachPlan | { ok: false; reason: string }> {
  const page = await pageText(file);
  if (!page) return { ok: false, reason: `${file} is not a page in this browser` };
  const { detachPlan } = await loadDetach();
  return detachPlan(page.text, loc, name, { file, instances }) as DetachPlan | { ok: false; reason: string };
}

const EXTRAS = ["snippet", "detached", "wrapped", "unwrapped", "inserted", "moved", "removed", "cleared", "reset", "item", "updated"] as const;

/** As POST /edit: one apply on the page's text, kept valid, saved to the PageStore (no drafts: a page saves as it goes). */
export async function localEdit(request: EditRequest): Promise<EditResponse> {
  const id = pageIdOf(request.file);
  const record = id ? await getPage(id) : null;
  if (!id || !record) return { ok: false, code: "not-found", error: `${request.file} is not a page in this browser` };
  const engine = await loadEngine();
  const before = record.text;
  const hashBefore = engine.sha1(before);
  if (request.hash && request.hash !== hashBefore) return { ok: false, code: "stale", error: `${request.file} changed since it was read` };
  const components = new Set(zenComponents);
  const doc = record.doc ?? engine.docFromText(before, { components }).doc;
  if (!doc) return { ok: false, code: "invalid", error: `${request.file} is not a page the Studio can read` };
  // Op "detach" runs once the recipes have registered with the engine.
  if (request.ops.some((op) => op.op === "detach")) await loadDetach();
  const options = { ...(await engineOptions()), typographyKeys: Object.keys(typographyStyles), file: request.file, hash: request.hash, shared: request.shared };
  const edited = engine.editDoc(doc, before, request, { components, applyOps: engine.applyOps, dataFieldEdit: engine.dataFieldEdit, sha1: engine.sha1, options });
  if ("error" in edited) return { ok: false, code: edited.code === "stale" || edited.code === "not-found" || edited.code === "forbidden" ? edited.code : "invalid", error: edited.error };
  // The Screens' linked phone parts follow the edit (one ⌘Z with it).
  const synced = withPhoneSync(engine, before, { doc: edited.doc, text: edited.text, locs: edited.locs }, request.file, options);
  // Boolean groups follow their shapes in the same edit (F9b).
  const settled = await withBooleans(engine, synced, request.file, options);
  const result = { ...edited, ...settled };
  const after = result.text;
  if (after !== before) {
    remember(hashBefore, doc);
    remember(engine.sha1(after), result.doc);
    await putPage(id, after, { doc: result.doc });
  }
  const extras = Object.fromEntries(EXTRAS.filter((key) => result.answer[key] !== undefined).map((key) => [key, result.answer[key]]));
  const locs = result.locs ? { locs: result.locs } : {};
  return { ok: true, file: request.file, hash: engine.sha1(after), hashBefore, before, after, changed: engine.changedRange(before, after), draft: false, ...extras, ...locs } as EditResponse;
}

/** As POST /write (undo / redo put a whole text back): refused when the page changed since it was read. */
export async function localWrite(request: WriteRequest): Promise<WriteResponse> {
  const id = pageIdOf(request.file);
  const page = id ? await getPage(id) : null;
  if (!id || !page) return { ok: false, code: "invalid", error: `${request.file} is not a page in this browser` };
  const engine = await loadEngine();
  if (engine.sha1(page.text) !== request.expectHash) return { ok: false, code: "stale", error: `${request.file} changed since this edit; not overwritten` };
  // The text's document when this session wrote it (its ids come back); else the page gets one when it opens again.
  const doc = documents.get(engine.sha1(request.content));
  if (request.content !== page.text) await putPage(id, request.content, doc ? { doc } : {});
  const locs = doc && page.doc ? engine.locMap(page.doc, page.text, doc, request.content, { components: new Set(zenComponents) }) : null;
  return { ok: true, hash: engine.sha1(request.content), draft: false, ...(locs ? { locs } : {}) };
}
