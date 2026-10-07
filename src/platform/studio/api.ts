import { useSyncExternalStore } from "react";
import { HISTORY_LIMIT, applyHunks, locateHunks, makePatch, upgradeRecords } from "./history";
import { askShared, sharedConfirmed } from "./sharedConfirm";
import { isLocalFile, localDetachPlan, localEdit, localElement, localSource, localWrite } from "./builder/localApi";
import { canEdit, flushStudioStore, studioStore, useStudio } from "./store";
import { STUDIO_API, STUDIO_ROLE_HEADER, STUDIO_TOKEN_HEADER } from "./types";
import type { DetachPlan, DiscardResult, DraftConflict, DraftInfo, EditRequest, FrameDraft, FrameDraftsResponse, EditResponse, PingResponse, SaveResult, SavedDraft, SourceElement, SourceFile, StudioEditRecord, StudioSnippetSync, StudioWrite, WriteRequest, WriteResponse } from "./types";

/** GET /detach-plan as the client sees it: `unavailable` when no dev server answers it (offline, or one started before detach existed). */
export type DetachPlanReply = DetachPlan | { ok: false; reason: string; unavailable: true };
/** One value the client measures on the rendered instance (see DetachPlan). */
export type DetachSlot = Extract<DetachPlan, { ok: true }>["slots"][number];

/** The code view rebuilds the text before the newest edit with it (it lives in the pure ./history module). */
export { textBeforeEdit } from "./history";

/*
 * Client of the Zen Studio dev-server API (tools/studio/vite-plugin-zen-studio.mjs, spec §8) and the undo/redo of
 * source edits. Nothing here throws into React: failures come back as null, false or an error response.
 */

const DEV = import.meta.env.DEV;
/** Undo and redo keep up to HISTORY_LIMIT edits each (./history) as line patches in sessionStorage, within this many characters. */
const HISTORY_BUDGET = 2_000_000;
/** Every request gives up after this, so a stuck dev server never leaves an edit or undo pending. */
const REQUEST_TIMEOUT = 15_000;
/** POST /save also runs the style and usage harness on the saved files (the server allows it up to 60 s). */
const SAVE_TIMEOUT = 75_000;

export class StudioApiError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

type Reply<T> = { status: number; body: T };

async function call<T>(path: string, init?: RequestInit, timeout = REQUEST_TIMEOUT): Promise<Reply<T> | null> {
  if (!DEV) return null;
  try {
    const response = await fetch(`${STUDIO_API}${path}`, { cache: "no-store", signal: AbortSignal.timeout(timeout), ...init });
    const body = (await response.json()) as T;
    return { status: response.status, body };
  } catch {
    return null;
  }
}

const errorOf = (body: unknown, fallback: string) => {
  const value = body as { code?: unknown; error?: unknown } | null;
  return { code: typeof value?.code === "string" ? value.code : "invalid", error: typeof value?.error === "string" ? value.error : fallback };
};

/* The dev server's per-start token (GET /ping); a restarted server answers 403 { reason: "token" } until it is renewed. */
let token: string | null = null;
let tokenRequest: Promise<string | null> | null = null;

function serverToken(renew: boolean): Promise<string | null> {
  if (token && !renew) return Promise.resolve(token);
  tokenRequest ??= studioApi.ping().then((ping) => ping?.token ?? null).finally(() => { tokenRequest = null; });
  return tokenRequest;
}

/** A request with the role and the server's token (writes, and GET /drafts); renews the token once when refused for it. */
async function authorized<T>(path: string, body?: unknown, timeout?: number): Promise<Reply<T> | null> {
  const attempt = async (renew: boolean) => {
    const key = await serverToken(renew);
    const headers: Record<string, string> = { [STUDIO_ROLE_HEADER]: studioStore.getState().role };
    if (key) headers[STUDIO_TOKEN_HEADER] = key;
    if (body === undefined) return call<T>(path, { headers }, timeout);
    headers["content-type"] = "application/json";
    return call<T>(path, { method: "POST", headers, body: JSON.stringify(body) }, timeout);
  };
  const reply = await attempt(false);
  if (reply?.status === 403 && (reply.body as { reason?: unknown } | null)?.reason === "token") return attempt(true);
  return reply;
}

const post = <T,>(path: string, body: unknown, timeout?: number) => authorized<T>(path, body ?? {}, timeout);

const isText = (value: unknown): value is string => typeof value === "string" && value.length > 0;

/** One GET /drafts row, or null when malformed. */
function draftOf(value: unknown): DraftInfo | null {
  const row = value as Partial<DraftInfo> | null;
  if (!row || !isText(row.file)) return null;
  const lines = (row.changedLines ?? {}) as Partial<DraftInfo["changedLines"]>;
  const count = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.round(n) : 0);
  const baseHash = typeof row.baseHash === "string" ? row.baseHash : "";
  const diskHash = typeof row.diskHash === "string" ? row.diskHash : null;
  return {
    file: row.file,
    baseHash,
    diskHash,
    stale: typeof row.stale === "boolean" ? row.stale : diskHash !== baseHash,
    changedLines: { added: count(lines.added), removed: count(lines.removed) },
    updatedAt: typeof row.updatedAt === "number" ? row.updatedAt : 0,
  };
}

/** Save results as the client uses them (rows a server answers as plain file names become { file }). */
function saveResultOf(body: unknown): SaveResult {
  const value = body as { saved?: unknown; conflicts?: unknown; harness?: { ok?: unknown; findings?: unknown } } | null;
  const saved: SavedDraft[] = (Array.isArray(value?.saved) ? value.saved : []).flatMap((row: unknown) => {
    if (isText(row)) return [{ file: row, hash: "" }];
    const entry = row as Partial<SavedDraft> | null;
    return entry && isText(entry.file) ? [{ file: entry.file, hash: typeof entry.hash === "string" ? entry.hash : "", rebased: entry.rebased === true, partial: entry.partial === true }] : [];
  });
  const conflicts: DraftConflict[] = (Array.isArray(value?.conflicts) ? value.conflicts : []).flatMap((row: unknown) => {
    const entry = row as Partial<DraftConflict> | null;
    return entry && isText(entry.file) ? [{ file: entry.file, conflict: true as const, reason: isText(entry.reason) ? entry.reason : "the disk changed the same lines" }] : [];
  });
  const findings = (Array.isArray(value?.harness?.findings) ? value.harness.findings : []).filter(isText);
  return { ok: true, saved, conflicts, harness: { ok: value?.harness?.ok !== false && !findings.length, findings } };
}

const NO_SERVER = "The Zen Studio dev server did not answer";

export const studioApi = {
  async ping(): Promise<PingResponse | null> {
    const reply = await call<PingResponse>("/ping");
    if (!reply || reply.status !== 200 || !reply.body?.ok) return null;
    token = reply.body.token ?? null;
    return reply.body;
  },
  /** Rejects with a StudioApiError when the dev server is missing or the file cannot be read. */
  async source(file: string): Promise<SourceFile> {
    // A builder page kept in this browser (Studio builder GĐ2): read from the PageStore, no server.
    if (isLocalFile(file)) {
      const local = await localSource(file);
      if (!local) throw new StudioApiError("not-found", `${file} is not a page in this browser`);
      return local;
    }
    const reply = await call<SourceFile>(`/source?file=${encodeURIComponent(file)}`);
    if (!reply) throw new StudioApiError("offline", NO_SERVER);
    if (reply.status !== 200) {
      const { code, error } = errorOf(reply.body, `Cannot read ${file}`);
      throw new StudioApiError(code, error);
    }
    return reply.body;
  },
  /** The JSX element whose opening tag starts at `loc` ("line:column"); null when missing or offline. */
  async element(file: string, loc: string): Promise<SourceElement | null> {
    if (isLocalFile(file)) return localElement(file, loc);
    const reply = await call<SourceElement>(`/element?file=${encodeURIComponent(file)}&loc=${encodeURIComponent(loc)}`);
    return reply && reply.status === 200 ? reply.body : null;
  },
  /**
   * Whether the element at `loc` (named `name`) can be detached into Zen primitives, and what to measure on it.
   * `instances`: how many times it renders in its frame (more than one outside a .map callback is refused).
   */
  async detachPlan(file: string, loc: string, name: string, instances?: number): Promise<DetachPlanReply> {
    const count = instances !== undefined && Number.isInteger(instances) && instances > 0 ? `&instances=${instances}` : "";
    // A builder page: the same plan from the detach recipes in the browser (GĐ4 M4, loaded on first use).
    const reply = isLocalFile(file)
      ? await localDetachPlan(file, loc, name, count ? instances : undefined).then((body) => ({ status: 200, body: body as unknown }), (error: unknown) => ({ status: 500, body: { ok: false, reason: `Detach could not load (${error instanceof Error ? error.message : String(error)})` } as unknown }))
      : await call<unknown>(`/detach-plan?file=${encodeURIComponent(file)}&loc=${encodeURIComponent(loc)}&name=${encodeURIComponent(name)}${count}`);
    if (!reply) return { ok: false, reason: DEV ? NO_SERVER : "Detaching needs the Studio dev server", unavailable: true };
    const body = reply.body as { ok?: unknown; component?: unknown; repeated?: unknown; slots?: unknown; reason?: unknown } | null;
    if (reply.status === 200 && body?.ok === true && typeof body.component === "string") {
      const slots = (Array.isArray(body.slots) ? body.slots : []).filter((slot: Partial<DetachSlot> | null): slot is DetachSlot =>
        Boolean(slot) && typeof slot?.key === "string" && typeof slot.kind === "string" && typeof slot.selector === "string");
      return { ok: true, component: body.component, repeated: body.repeated === true, slots };
    }
    if (typeof body?.reason === "string" && body.reason) return { ok: false, reason: body.reason };
    const { error } = errorOf(body, "This element cannot be detached");
    // A dev server started before detach existed does not know the endpoint.
    if (reply.status === 404 && /Unknown endpoint/.test(error)) return { ok: false, reason: "Restart the dev server to detach components", unavailable: true };
    return { ok: false, reason: error };
  },
  /**
   * The files with unsaved admin drafts (GET /drafts). null when this server has no drafts (an older plugin answers
   * 404), refuses this role, or does not answer: the Studio then shows no draft UI.
   */
  async drafts(): Promise<DraftInfo[] | null> {
    const reply = await authorized<unknown>("/drafts");
    if (!reply || reply.status !== 200) return null;
    const body = reply.body as { ok?: unknown; drafts?: unknown } | unknown[] | null;
    const rows = Array.isArray(body) ? body : body && (body as { ok?: unknown }).ok !== false && Array.isArray((body as { drafts?: unknown }).drafts) ? (body as { drafts: unknown[] }).drafts : null;
    return rows ? rows.map(draftOf).filter((row): row is DraftInfo => row !== null) : null;
  },
  /**
   * Which draft changes each canvas frame owns (POST /frame-drafts). null when the server has no frame drafts (an
   * older plugin), refuses, or does not answer: frames then show no Save or Discard of their own.
   */
  async frameDrafts(frames: Array<{ id: string; locs: string[] }>): Promise<FrameDraftsResponse | null> {
    const reply = await post<unknown>("/frame-drafts", { frames });
    const body = reply?.status === 200 ? (reply.body as Partial<FrameDraftsResponse> | null) : null;
    if (!body || body.ok !== true || !body.frames || typeof body.frames !== "object" || !body.outside) return null;
    const count = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.round(n) : 0);
    const out: Record<string, FrameDraft> = {};
    for (const [id, entry] of Object.entries(body.frames)) {
      out[id] = { changes: count(entry?.changes), added: count(entry?.added), removed: count(entry?.removed), files: Array.isArray(entry?.files) ? entry.files.filter(isText) : [] };
    }
    return { ok: true, frames: out, outside: { changes: count(body.outside.changes), files: Array.isArray(body.outside.files) ? body.outside.files.filter(isText) : [] } };
  },
  /**
   * Writes the drafts of `files` (all when omitted), or only a frame's changes (`frame`: its locs), to disk, then runs
   * the style and usage harness on the written files.
   */
  async save(files?: string[], frame?: { locs: string[] }): Promise<SaveResult> {
    const reply = await post<unknown>("/save", frame ? { frame } : files ? { files } : {}, SAVE_TIMEOUT);
    if (!reply) return { ok: false, code: "invalid", error: NO_SERVER };
    if (reply.status === 200 && (reply.body as { ok?: unknown } | null)?.ok !== false) return saveResultOf(reply.body);
    const { code, error } = errorOf(reply.body, "Save refused");
    return { ok: false, code: code === "forbidden" ? code : "invalid", error };
  },
  /** Drops the drafts of `files` (all when omitted), or only a frame's changes (`frame`): the rest reads from disk again. */
  /** Builder pages in the dev server's .zen-studio/pages/ (GET /pages); null without a server or token. */
  async pages(): Promise<{ dir: string; pages: Array<{ id: string; text: string; mtime: number }> } | null> {
    const reply = await authorized<{ ok?: unknown; dir?: unknown; pages?: unknown }>("/pages");
    if (!reply || reply.status !== 200 || reply.body?.ok === false || !Array.isArray(reply.body?.pages)) return null;
    const pages = (reply.body.pages as Array<{ id?: unknown; text?: unknown; mtime?: unknown }>).flatMap((row) => (isText(row?.id) && typeof row.text === "string" ? [{ id: row.id, text: row.text, mtime: typeof row.mtime === "number" ? row.mtime : 0 }] : []));
    return { dir: typeof reply.body.dir === "string" ? reply.body.dir : ".zen-studio/pages", pages };
  },
  /** POST /pages/write or /pages/trash; rejects with a StudioApiError when refused. */
  async pageWrite(action: "write" | "trash", id: string, text?: string): Promise<void> {
    const reply = await post<{ ok?: unknown }>(`/pages/${action}`, action === "write" ? { id, text } : { id });
    if (!reply) throw new StudioApiError("invalid", NO_SERVER);
    if (reply.status !== 200 || reply.body?.ok === false) {
      const { code, error } = errorOf(reply.body, `Page ${action} refused`);
      throw new StudioApiError(code, error);
    }
  },
  async discard(files?: string[], frame?: { locs: string[] }): Promise<DiscardResult> {
    const reply = await post<{ ok?: unknown; discarded?: unknown; partial?: unknown }>("/discard", frame ? { frame } : files ? { files } : {});
    if (!reply) return { ok: false, code: "invalid", error: NO_SERVER };
    if (reply.status === 200 && reply.body?.ok !== false) {
      const listed = Array.isArray(reply.body?.discarded) ? reply.body.discarded.filter(isText) : null;
      const partial = Array.isArray(reply.body?.partial) ? reply.body.partial.filter(isText) : [];
      return { ok: true, discarded: listed ?? files ?? [], partial };
    }
    const { code, error } = errorOf(reply.body, "Discard refused");
    return { ok: false, code: code === "forbidden" ? code : "invalid", error };
  },
  async write(request: WriteRequest): Promise<WriteResponse> {
    if (isLocalFile(request.file)) return localWrite(request);
    const reply = await post<WriteResponse>("/write", request);
    if (!reply) return { ok: false, code: "invalid", error: NO_SERVER };
    if (reply.status === 200 && reply.body?.ok) return reply.body;
    const { code, error } = errorOf(reply.body, "Write refused");
    return { ok: false, code: code === "stale" || code === "forbidden" ? code : "invalid", error };
  },
};

/** "src/x.tsx:12:4" → parts; null when malformed. */
export function parseSrc(src: string): { file: string; line: number; column: number; loc: string } | null {
  const match = /^(.*):(\d+):(\d+)$/.exec(src);
  return match ? { file: match[1], line: Number(match[2]), column: Number(match[3]), loc: `${match[2]}:${match[3]}` } : null;
}

/* ── status line ("Saved to button.tsx:84") ──────────────────────────────────────────────────────────────────────── */

export type StudioEditStatus = {
  /**
   * saved: written to disk (an edit on a server without drafts, or a Save); draft: kept as an admin draft; warning: a
   * Save that left harness findings or conflicts.
   */
  kind: "saved" | "draft" | "unchanged" | "undone" | "redone" | "warning" | "error";
  message: string;
  file?: string;
  line?: number;
  /** Saved edits in a file with example snippets: whether the snippet followed (see StudioSnippetSync). */
  snippet?: StudioSnippetSync;
  /** Extra lines under the message (a Save's harness findings and conflicts). */
  details?: string[];
  /** The change went into the file's admin draft (an undo or redo on a drafts server). */
  draft?: boolean;
  at: number;
} | null;

let status: StudioEditStatus = null;
const statusListeners = new Set<() => void>();
const fileName = (file: string) => file.slice(file.lastIndexOf("/") + 1);

function setStatus(next: StudioEditStatus) {
  status = next;
  statusListeners.forEach((listener) => listener());
}

/** Sets the inspector footer's edit line (the drafts module reports Save and Discard through it). */
export function announceEditStatus(next: NonNullable<StudioEditStatus>) {
  setStatus(next);
}

/** The outcome of the last edit, undo or redo, for the inspector footer. */
export function useStudioEditStatus(): StudioEditStatus {
  return useSyncExternalStore(
    (listener) => { statusListeners.add(listener); return () => { statusListeners.delete(listener); }; },
    () => status,
    () => null,
  );
}

/* ── writes (for views that follow the source: selection remapping, code marks) ─────────────────────────────────── */

const writeListeners = new Set<(write: StudioWrite) => void>();

/** Called after every successful edit, undo and redo with the whole file before and after it. */
export function subscribeStudioWrites(listener: (write: { file: string; before: string; after: string; kind: "edit" | "undo" | "redo" }) => void): () => void {
  writeListeners.add(listener);
  return () => { writeListeners.delete(listener); };
}

/** Tells the write listeners about a change the Studio made to a file (edits, undo, redo; a Discard reports its revert). */
export function emitWrite(write: StudioWrite) {
  writeListeners.forEach((listener) => {
    try {
      listener(write);
    } catch (error) {
      console.error("[zen-studio] a write listener failed", error);
    }
  });
}

/* ── undo history: line patches (makePatch, locateHunks, applyHunks in ./history) ────────────────────────────────── */

const lineAt = (text: string, offset: number) => {
  let line = 1;
  for (let index = text.indexOf("\n"); index >= 0 && index < offset; index = text.indexOf("\n", index + 1)) line += 1;
  return line;
};

/** The lines `inserted` covers at `offset` of `text` (its last line break not counted). */
function rangeAt(text: string, offset: number, inserted: string) {
  const from = lineAt(text, offset);
  const breaks = (inserted.replace(/\n$/, "").match(/\n/g) ?? []).length;
  return { from, to: from + breaks };
}

const recordSize = (record: StudioEditRecord) => record.patch.hunks.reduce((sum, hunk) => sum + hunk.removed.length + hunk.inserted.length + hunk.above.length + hunk.below.length, 200);

/** Newest records first within the budget; the newest undo record always stays. */
function trimHistory(undo: StudioEditRecord[], redo: StudioEditRecord[]) {
  const keptUndo = undo.slice(-HISTORY_LIMIT);
  const keptRedo = redo.slice(-HISTORY_LIMIT);
  let total = [...keptUndo, ...keptRedo].reduce((sum, record) => sum + recordSize(record), 0);
  while (total > HISTORY_BUDGET && keptRedo.length) total -= recordSize(keptRedo.shift()!);
  while (total > HISTORY_BUDGET && keptUndo.length > 1) total -= recordSize(keptUndo.shift()!);
  return { undo: keptUndo, redo: keptRedo };
}

/**
 * The store persists its session part 150ms after a change, but a source edit usually triggers a full reload sooner:
 * write the undo/redo stacks into the stored session at once so ⌘Z still works after the reload.
 */
function setHistory(undo: StudioEditRecord[], redo: StudioEditRecord[]) {
  studioStore.setState(trimHistory(undo, redo));
  flushStudioStore();
}

/** The stack without this record (by identity, wherever it now sits). */
function without(stack: StudioEditRecord[], record: StudioEditRecord) {
  const index = stack.lastIndexOf(record);
  return index < 0 ? stack : [...stack.slice(0, index), ...stack.slice(index + 1)];
}

// Records stored by an older Studio become patches (or exact-only hunks); anything malformed is dropped.
if (typeof window !== "undefined") {
  const { undo, redo } = studioStore.getState();
  const [nextUndo, nextRedo] = [upgradeRecords(undo), upgradeRecords(redo)];
  const same = (stack: StudioEditRecord[], next: StudioEditRecord[]) => stack.length === next.length && stack.every((record, index) => record === next[index]);
  if (!same(undo, nextUndo) || !same(redo, nextRedo)) setHistory(nextUndo, nextRedo);
}

/* ── edit, undo, redo: one at a time, in the order they were asked for ───────────────────────────────────────────── */

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/** Sends an edit; on success pushes an undo record (clears redo). A no-op edit (nothing changed) records nothing. */
export function applyEdit(request: EditRequest, label: string): Promise<EditResponse> {
  return enqueue(() => sendEdit(request, label));
}

/*
 * Edits read before one of the Studio's own writes. A panel reads an element (and its file hash) and sends its edit a
 * moment later; when another panel's edit to the same file landed in between (a nested toggle, then the owner's, two
 * quick toggles), the server refuses it as stale although nothing but the Studio changed the file. Prop-level ops on an
 * element whose start the write did not move are rebased onto that write and sent once more; anything else stays
 * refused (the file changed in a way the request did not see).
 */
/** `props`: the write only set or removed attributes (rebasable across); a structural op, undo or redo is not. */
type OwnWrite = { hashBefore: string; hash: string; before: string; after: string; props: boolean };
const ownWrites = new Map<string, OwnWrite[]>();
const OWN_WRITES_KEPT = 12;
const REBASABLE_OPS = new Set<string>(["setProp", "removeProp", "setStateInit", "setField", "setTextStyle", "setTypography", "setText"]);

function noteOwnWrite(file: string, write: OwnWrite) {
  if (write.hashBefore === write.hash) return;
  ownWrites.set(file, [...(ownWrites.get(file) ?? []), write].slice(-OWN_WRITES_KEPT));
}

/** A Discard (or anything that puts the file back outside the edit path) ends the chain: nothing rebases across it. */
export function forgetOwnWrites(file?: string) {
  if (file) ownWrites.delete(file);
  else ownWrites.clear();
}

/** Offset of a 1-based line and 0-based column in `text`, or -1. */
function offsetAt(text: string, line: number, column: number): number {
  let offset = 0;
  for (let current = 1; current < line; current += 1) {
    const next = text.indexOf("\n", offset);
    if (next < 0) return -1;
    offset = next + 1;
  }
  return offset + column;
}

/** "line:col" of `offset` in `text`. */
function locAt(text: string, offset: number): string {
  const head = text.slice(0, offset);
  const line = head.split("\n").length;
  return `${line}:${offset - (head.lastIndexOf("\n") + 1)}`;
}

/**
 * Where an element that started at `loc` in `before` starts in `after`: the same place when the change begins after its
 * start, shifted when the change lies wholly before it, null when the change covers its start.
 */
export function rebaseLoc(loc: string, before: string, after: string): string | null {
  if (before === after) return loc;
  const [line, column] = loc.split(":").map(Number);
  const offset = offsetAt(before, line, column);
  if (offset < 0 || offset > before.length) return null;
  let prefix = 0;
  const shortest = Math.min(before.length, after.length);
  while (prefix < shortest && before.charCodeAt(prefix) === after.charCodeAt(prefix)) prefix += 1;
  if (prefix > offset) return loc;
  let suffix = 0;
  while (suffix < shortest - prefix && before.charCodeAt(before.length - 1 - suffix) === after.charCodeAt(after.length - 1 - suffix)) suffix += 1;
  if (before.length - suffix > offset) return null;
  return locAt(after, offset + (after.length - before.length));
}

/** Whether `<name` starts at `loc` in `text` (the request names the element it was read as). */
function startsElement(text: string, loc: string, name: string): boolean {
  const [line, column] = loc.split(":").map(Number);
  const offset = offsetAt(text.startsWith("\uFEFF") ? text.slice(1) : text, line, column);
  return offset >= 0 && (text.startsWith("\uFEFF") ? text.slice(1) : text).startsWith(`<${name}`, offset);
}

/**
 * `request` moved onto the Studio's own writes since its hash, or null when that is not safe or not possible: only
 * across writes that set or removed attributes (a moved or inserted sibling could leave the same text where the element
 * was), from the newest write that starts at the request's hash, with the element found where the request says.
 */
function rebased(request: EditRequest): EditRequest | null {
  if (!request.hash || !request.ops.every((op) => REBASABLE_OPS.has(op.op))) return null;
  const chain = ownWrites.get(request.file) ?? [];
  let start = -1;
  for (let index = chain.length - 1; index >= 0; index -= 1) if (chain[index].hashBefore === request.hash) { start = index; break; }
  if (start < 0 || !startsElement(chain[start].before, request.loc, request.name)) return null;
  let loc: string | null = request.loc;
  let hash = request.hash;
  for (const write of chain.slice(start)) {
    if (write.hashBefore !== hash || !write.props || !loc) return null;
    loc = rebaseLoc(loc, write.before, write.after);
    hash = write.hash;
  }
  if (!loc || hash === request.hash || !startsElement(chain[chain.length - 1].after, loc, request.name)) return null;
  return { ...request, loc, hash };
}

async function postEdit(request: EditRequest): Promise<EditResponse> {
  if (isLocalFile(request.file)) return localEdit(request);
  const reply = await post<EditResponse>("/edit", request);
  if (!reply) return { ok: false, code: "invalid", error: NO_SERVER };
  if (reply.status === 200 && reply.body?.ok) return reply.body;
  const { code, error } = errorOf(reply.body, "Edit refused");
  if (code === "confirm") {
    const body = reply.body as { uses?: unknown; users?: unknown } | null;
    return { ok: false, code, error, uses: typeof body?.uses === "number" ? body.uses : undefined, users: Array.isArray(body?.users) ? body.users.filter((user): user is string => typeof user === "string") : undefined };
  }
  return { ok: false, code: code === "stale" || code === "not-found" || code === "forbidden" ? code : "invalid", error };
}

async function sendEdit(request: EditRequest, label: string): Promise<EditResponse> {
  const state = studioStore.getState();
  if (!canEdit(state)) {
    const error = state.role === "admin" ? "Editing needs the dev server" : "View only — switch to Admin to edit";
    return { ok: false, code: "forbidden", error };
  }
  // Shared code (plan WP-B2): a yes given for this file earlier in the page load goes along at once.
  if (sharedConfirmed(request.file)) request = { ...request, shared: true };
  let result = await postEdit(request);
  if (!result.ok && result.code === "confirm") {
    const ok = await askShared({ file: request.file, uses: result.uses ?? 0, users: result.users ?? [] });
    if (!ok) {
      setStatus({ kind: "unchanged", message: "Not changed: the shared code stays as it is", file: request.file, at: Date.now() });
      return { ok: false, code: "forbidden", error: "Cancelled: the shared code was not changed" };
    }
    request = { ...request, shared: true };
    result = await postEdit(request);
  }
  if (!result.ok && result.code === "stale") {
    const retry = rebased(request);
    if (retry) result = await postEdit(retry);
  }
  if (!result.ok) {
    setStatus({ kind: "error", message: result.error, file: request.file, at: Date.now() });
    return result;
  }
  if (result.before === result.after) {
    setStatus({ kind: "unchanged", message: "No change", file: result.file, line: result.changed.from, at: Date.now() });
    return result;
  }
  const record: StudioEditRecord = {
    file: result.file,
    label,
    hashBefore: result.hashBefore,
    hashAfter: result.hash,
    patch: makePatch(result.before, result.after),
    changed: result.changed,
    at: Date.now(),
  };
  setHistory([...studioStore.getState().undo, record], []);
  noteOwnWrite(result.file, { hashBefore: result.hashBefore, hash: result.hash, before: result.before, after: result.after, props: request.ops.every((op) => REBASABLE_OPS.has(op.op)) });
  emitWrite({ file: result.file, before: result.before, after: result.after, kind: "edit" });
  const where = `${fileName(result.file)}:${result.changed.from}`;
  // On a drafts server an edit that is not a draft brought the file back to what the disk holds (nothing was written).
  // A builder page saves as it goes (in this browser, no drafts).
  if (isLocalFile(result.file)) setStatus({ kind: "saved", message: `Saved in this browser · ${where}`, file: result.file, line: result.changed.from, at: Date.now() });
  else if (result.draft) setStatus({ kind: "draft", message: `Draft · ${where}`, file: result.file, line: result.changed.from, snippet: result.snippet, at: Date.now() });
  else if (server.drafts) setStatus({ kind: "unchanged", message: `Back to the saved file · ${where}`, file: result.file, line: result.changed.from, snippet: result.snippet, at: Date.now() });
  else setStatus({ kind: "saved", message: `Saved to ${where}`, file: result.file, line: result.changed.from, snippet: result.snippet, at: Date.now() });
  return result;
}

/**
 * Reverses (undo) or re-applies (redo) the newest record as a patch on the file as it is now, so edits made elsewhere
 * in the file meanwhile are kept. A record whose patch no longer applies is dropped with a status, never left to block
 * the older ones.
 */
async function step(direction: "undo" | "redo"): Promise<boolean> {
  const state = studioStore.getState();
  if (!canEdit(state)) return false;
  const stack = direction === "undo" ? state.undo : state.redo;
  const record = stack[stack.length - 1];
  if (!record) return false;
  const verb = direction === "undo" ? "Undo" : "Redo";
  const drop = (message: string) => {
    const latest = studioStore.getState();
    if (direction === "undo") setHistory(without(latest.undo, record), latest.redo);
    else setHistory(latest.undo, without(latest.redo, record));
    setStatus({ kind: "error", message, file: record.file, at: Date.now() });
    return false;
  };

  let source: SourceFile;
  try {
    source = await studioApi.source(record.file);
  } catch (error) {
    if (error instanceof StudioApiError && error.code === "not-found") return drop(`${verb} skipped: ${fileName(record.file)} is no longer there`);
    setStatus({ kind: "error", message: error instanceof Error ? error.message : NO_SERVER, file: record.file, at: Date.now() });
    return false;
  }
  const current = source.content;
  // The file is exactly the recorded text of this side: the hunks are checked where they were recorded, not searched.
  const exact = source.hash === (direction === "undo" ? record.hashAfter : record.hashBefore);
  const positions = locateHunks(current, record.patch, direction, exact);
  if (!positions) return drop(`${verb} skipped: the file changed outside the Studio (“${record.label}”)`);
  const next = applyHunks(current, record.patch, positions, direction);

  const response = await studioApi.write({ file: record.file, content: next, expectHash: source.hash });
  if (!response.ok) {
    const message = response.code === "stale" ? `${fileName(record.file)} changed during the ${direction}; try again` : response.error;
    setStatus({ kind: "error", message, file: record.file, at: Date.now() });
    return false;
  }
  // The record again describes before → after, as the file now holds them (outside edits elsewhere included).
  const before = direction === "undo" ? next : current;
  const after = direction === "undo" ? current : next;
  const patch = makePatch(before, after);
  const first = patch.hunks[0];
  const moved: StudioEditRecord = {
    ...record,
    patch: patch.hunks.length ? patch : record.patch,
    hashBefore: direction === "undo" ? response.hash : source.hash,
    hashAfter: direction === "undo" ? source.hash : response.hash,
    // The first hunk sits at the same offset in both texts (nothing changed above it).
    changed: first ? rangeAt(after, first.start, first.inserted) : record.changed,
  };
  const latest = studioStore.getState();
  if (direction === "undo") setHistory(without(latest.undo, record), [...latest.redo, moved]);
  else setHistory([...latest.undo, moved], without(latest.redo, record));
  noteOwnWrite(record.file, { hashBefore: source.hash, hash: response.hash, before: current, after: next, props: false });
  emitWrite({ file: record.file, before: current, after: next, kind: direction });
  const line = direction === "undo" ? lineAt(next, positions[0]) : moved.changed.from;
  setStatus({ kind: direction === "undo" ? "undone" : "redone", message: `${direction === "undo" ? "Undid" : "Redid"} “${record.label}”`, file: record.file, line, draft: response.draft === true, at: Date.now() });
  return true;
}

/**
 * After a Discard: the undo records of `file` that produced the dropped draft are removed (newest first, down to the
 * record that left the file as the disk holds it, `keep` = the disk's and the draft base's hashes), and its redo
 * records too. Older records of the file (edits saved before) stay, so ⌘Z can still undo them.
 */
export function forgetDraftHistory(file: string, keep: ReadonlyArray<string | null>) {
  forgetOwnWrites(file);
  const kept = new Set(keep.filter((hash): hash is string => Boolean(hash)));
  const { undo, redo } = studioStore.getState();
  const nextUndo = [...undo];
  for (let index = nextUndo.length - 1; index >= 0; index -= 1) {
    const record = nextUndo[index];
    if (record.file !== file) continue;
    if (kept.has(record.hashAfter)) break;
    nextUndo.splice(index, 1);
    if (kept.has(record.hashBefore)) break;
  }
  const nextRedo = redo.filter((record) => record.file !== file);
  if (nextUndo.length !== undo.length || nextRedo.length !== redo.length) setHistory(nextUndo, nextRedo);
}

/** Runs `task` after every edit, undo and redo asked for before it (a Save waits for the edit typed just before ⌘S). */
export function afterPendingEdits<T>(task: () => Promise<T>): Promise<T> {
  return enqueue(task);
}

/** Undo the newest edit. Presses made while one runs wait their turn (⌘Z ⌘Z undoes two edits). */
export function undoEdit(): Promise<boolean> {
  return enqueue(() => step("undo"));
}

export function redoEdit(): Promise<boolean> {
  return enqueue(() => step("redo"));
}

/* ── dev server presence ─────────────────────────────────────────────────────────────────────────────────────────── */

/** `drafts`: this server keeps admin edits as drafts until Save (PingResponse.drafts). */
type ServerState = { ready: boolean; writable: boolean; root: string | null; drafts: boolean };

// A production build has no dev server: ready at once, read-only.
let server: ServerState = DEV ? { ready: false, writable: false, root: null, drafts: false } : { ready: true, writable: false, root: null, drafts: false };
let pinged = false;
const serverListeners = new Set<() => void>();

function pingOnce() {
  if (pinged || !DEV) return;
  pinged = true;
  void studioApi.ping().then((ping) => {
    // A page opened on a non-loopback host gets no token: it can read the source but not write it.
    server = { ready: true, writable: Boolean(ping?.writable) && ping?.token !== null, root: ping?.root ?? null, drafts: ping?.drafts === true };
    serverListeners.forEach((listener) => listener());
  });
}

/** On a builder page the "server" is the engine in this browser: ready and writable, no drafts, any host or build. */
const LOCAL_SERVER: ServerState = { ready: true, writable: true, root: null, drafts: false };

/** Pings the dev server once per session. */
export function useStudioServer(): ServerState {
  const local = useStudio((state) => Boolean(state.localPage));
  const real = useSyncExternalStore(
    (listener) => {
      pingOnce();
      serverListeners.add(listener);
      return () => { serverListeners.delete(listener); };
    },
    () => server,
    () => server,
  );
  return local ? LOCAL_SERVER : real;
}
