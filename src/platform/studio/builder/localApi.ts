import { typographyStyles } from "../../../tokens/typography.generated";
import type { DetachPlan, EditRequest, EditResponse, SourceElement, SourceFile, WriteRequest, WriteResponse } from "../types";
import { engineOptions, loadDetach, loadEngine, zenComponents } from "./engine";
import { getPage, pageIdOf, putPage } from "./store/pageStore";

/*
 * The Studio's source API for builder pages kept in the browser (Studio builder GĐ2 M1; spec
 * docs/research/studio-builder-pages-spec-2026-10-06.md §3): the same requests and answers as the dev server's
 * /__zen-studio routes (GET /source, GET /element, POST /edit, POST /write), computed by the same engine in the browser
 * against the PageStore. api.ts routes every file named "local:<id>.zen.tsx" here, so history, the Inspector, slots and
 * every canvas edit work unchanged. An edit that would leave an invalid page (dialect.mjs) is refused with its reason.
 */

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
  const targets = [...attrs.map((attr) => ({ prop: attr.name })), ...children.map((entry) => ({ child: entry.index }))];
  if (targets.length) {
    const origins = engine.originsOf(page.text, file, loc, targets, { read: () => null });
    attrs.forEach((attr, at) => { attr.dataSource = origins[at]; });
    children.forEach((entry, at) => { entry.child.dataSource = origins[attrs.length + at]; });
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
  const page = await pageText(request.file);
  if (!page) return { ok: false, code: "not-found", error: `${request.file} is not a page in this browser` };
  const engine = await loadEngine();
  const before = page.text;
  const hashBefore = engine.sha1(before);
  if (request.hash && request.hash !== hashBefore) return { ok: false, code: "stale", error: `${request.file} changed since it was read` };
  let after: string;
  let changed: { from: number; to: number };
  let extras: Record<string, unknown> = {};
  const [first] = request.ops;
  if (request.ops.length === 1 && first?.op === "setDataField") {
    const result = engine.dataFieldEdit(before, request.file, request.loc, request.name, first);
    if ("error" in result) return { ok: false, code: result.code === "stale" || result.code === "not-found" || result.code === "forbidden" ? result.code : "invalid", error: result.error };
    if (result.file !== request.file) return { ok: false, code: "forbidden", error: "A page's data lives in the page itself" };
    after = result.code;
    changed = engine.changedRange(before, after);
  } else {
    // Op "detach" runs once the recipes have registered with the engine.
    if (request.ops.some((op) => op.op === "detach")) await loadDetach();
    const result = engine.applyOps(before, request.loc, request.name, request.ops, { ...(await engineOptions()), typographyKeys: Object.keys(typographyStyles), file: request.file, hash: request.hash, shared: request.shared });
    if (typeof result.error === "string") return { ok: false, code: result.code === "stale" || result.code === "not-found" || result.code === "forbidden" ? result.code : "invalid", error: result.error };
    after = result.code;
    changed = result.changed as { from: number; to: number };
    extras = Object.fromEntries(EXTRAS.filter((key) => result[key] !== undefined).map((key) => [key, result[key]]));
  }
  if (after !== before) {
    const errors = engine.validateDialect(after, { components: new Set(zenComponents) });
    if (errors.length) return { ok: false, code: "invalid", error: `Not written: the page would break (line ${errors[0].line}: ${errors[0].message})` };
    await putPage(page.id, after);
  }
  return { ok: true, file: request.file, hash: engine.sha1(after), hashBefore, before, after, changed, draft: false, ...extras } as EditResponse;
}

/** As POST /write (undo / redo put a whole text back): refused when the page changed since it was read. */
export async function localWrite(request: WriteRequest): Promise<WriteResponse> {
  const page = await pageText(request.file);
  if (!page) return { ok: false, code: "invalid", error: `${request.file} is not a page in this browser` };
  const engine = await loadEngine();
  if (engine.sha1(page.text) !== request.expectHash) return { ok: false, code: "stale", error: `${request.file} changed since this edit; not overwritten` };
  if (request.content !== page.text) await putPage(page.id, request.content);
  return { ok: true, hash: engine.sha1(request.content), draft: false };
}
