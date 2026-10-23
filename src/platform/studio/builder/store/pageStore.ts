import { useEffect, useSyncExternalStore } from "react";
import { headerFigma, headerLayoutGuides, withHeaderCanvas, headerProject, headerTitle, withHeaderGuides, withHeaderLayoutGuides, withHeaderOs, withHeaderProject, keepsRevision, MAX_REVISIONS, planSync, PAGE_ID, slugOf, textHash, trashExpired, withHeaderTitle, withScreenTitles, type CanvasBackground, type LayoutGuide, type PageGuide, type RevisionReason } from "./pageModel";
import type { PageDoc } from "../../../../../tools/studio/browser-engine.mjs";
import { fitFigma, joinFigma, validateFigma, type PageFigma } from "../../../../../tools/studio/page-figma.mjs";

/*
 * Builder pages kept in the browser (Studio builder GĐ2; spec docs/research/studio-builder-pages-spec-2026-10-06.md §3
 * 2c). IndexedDB "zen-studio-builder":
 *   pages      { id, title, text, createdAt, updatedAt, trashedAt?, sync? }  the working copy of every page
 *   revisions  { key, page, text, at, reason }                              earlier texts, MAX_REVISIONS per page
 *   settings   { key, value }                                                the linked folder's handle (mirrors.ts)
 *   assets     { id, name, type, size, createdAt, blob }                     uploaded photos (builder/assets/uploads.ts)
 * Reads are cached so the board renders synchronously; writes update the cache at once, then IndexedDB, tell other tabs
 * (BroadcastChannel) and the folder mirror, if one is connected (mirrors.ts: the dev server's .zen-studio/pages/ or a
 * folder linked with File System Access). A mirror is the source of truth: `syncMirror` follows pageModel.planSync, and
 * never loses this copy's text (a conflict keeps it as a revision; a page gone from the folder goes to the Trash).
 * Trash: 30 days, then deleted with its revisions. Without IndexedDB (a private window that blocks it) pages live in
 * memory for the session and `pagesPersist()` is false.
 */

export type PageRecord = {
  id: string;
  title: string;
  text: string;
  createdAt: number;
  updatedAt: number;
  /** In the Trash since then. */
  trashedAt?: number;
  /** The Studio folder the page sits in (folderStore); none: "Not in a folder". Kept in this browser only. */
  folder?: string;
  /** The mirror this copy last matched, and the hash of the text both held. */
  sync?: { mirror: string; hash: string };
  /**
   * The page as a document (tools/studio/doc.mjs, core rebuild M2): the source of truth whenever it is here, and `text`
   * is its print. A text written without one (an import, a restored version, a new page) gets one when the page opens.
   */
  doc?: PageDoc;
  /**
   * A page pulled from Figma (tools/studio/figma-pull.mjs, its header names the frame): the document the last pull made,
   * the base a new pull of that frame is compared with (figma-diff.mjs). Kept across edits, here and beside the page in a
   * connected folder (`<id>.figma-base.json`, tools/studio/page-figma.mjs), so another browser there compares three ways too.
   */
  figma?: FigmaBase;
  /**
   * Its latest exports to Figma (Export › Figma, newest first, five at most): each the pull of the frame it places (the
   * base) and the page it came from. A pull of a frame the Zen plugin placed names its page and export (figma-pull.mjs),
   * and Update from Figma compares with that export. Kept here and in the connected folder, as `figma`.
   */
  figmaExports?: Array<FigmaBase & { version: string; at: number }>;
};
/**
 * What a Figma frame is compared with: `base`, the pull of the frame as it was; `synced`, the page as it stood then (a
 * pushed page holds what Figma cannot, figma-diff.mjs); `version`, the export the frame came from.
 */
export type FigmaBase = { base: PageDoc; synced?: PageDoc; version?: string; at?: number };
export type PageMeta = Omit<PageRecord, "text" | "sync" | "doc" | "figma" | "figmaExports">;
export type Revision = { key: number; page: string; text: string; at: number; reason: RevisionReason };

/** A folder that keeps a copy of every page (mirrors.ts). */
export interface PageMirror {
  /** Stable per folder ("dev:<root>", "folder:<name>"): sync records name it. */
  key: string;
  kind: "dev" | "folder";
  /** Where the pages are, for people (".zen-studio/pages", the folder's name). */
  label: string;
  list(): Promise<Array<{ id: string; text: string; mtime: number }>>;
  write(id: string, text: string): Promise<void>;
  /** Moves the page to the folder's trash (never deletes). */
  trash(id: string): Promise<void>;
  /** An uploaded photo, kept in the folder's assets/ beside the pages (a linked folder, and the dev server's since 2026-10-08). */
  writeAsset?(id: string, blob: Blob): Promise<void>;
  /** An uploaded photo from the folder's assets/; null when it has none. */
  readAsset?(id: string): Promise<Blob | null>;
  /** Moves a photo out of the folder's assets/ to its trash (never deletes): a photo removed in Assets › Photos. */
  trashAsset?(id: string): Promise<void>;
  /** A page's comments beside it (`<id>.comments.json`, comments/commentStore.ts); null when it has none. */
  readComments?(id: string): Promise<unknown | null>;
  /** Writes a page's comments beside it. */
  writeComments?(id: string, comments: unknown): Promise<void>;
  /** A page's Figma bases beside it (`<id>.figma-base.json`, tools/studio/page-figma.mjs); null when it has none. */
  readFigma?(id: string): Promise<unknown | null>;
  /** Writes a page's Figma bases beside it. */
  writeFigma?(id: string, figma: unknown): Promise<void>;
}

/** Where the pages are kept, for the Pages panel. */
export type StorageState =
  | { kind: "browser" }
  | { kind: "mirror"; mirror: "dev" | "folder"; label: string; syncing: boolean; error: string | null }
  /** A linked folder the browser needs permission for again (a click on Reconnect). */
  | { kind: "reconnect"; label: string };

const DB = "zen-studio-builder";
const PAGES = "pages";
const REVISIONS = "revisions";
export const SETTINGS = "settings";
export const ASSETS = "assets";
export const isPageId = (id: string) => PAGE_ID.test(id);
/** The engine's file name of a page ("local:<id>.zen.tsx"), and back. */
export const pageFile = (id: string) => `local:${id}.zen.tsx`;
export const pageIdOf = (file: string) => /^local:([a-z0-9][a-z0-9-]*)\.zen\.tsx$/.exec(file)?.[1] ?? null;

const cache = new Map<string, PageRecord>();
let listed = false;
let persistent = true;
const listeners = new Set<() => void>();
let version = 0;
const notify = () => { version += 1; listeners.forEach((listener) => listener()); };
const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("zen-studio-pages");
channel?.addEventListener("message", (event: MessageEvent<{ id?: string }>) => {
  // Another tab wrote a page: read it again.
  const id = event.data?.id;
  if (typeof id === "string") void readRecord(id).then((record) => { if (record) cache.set(id, record); else cache.delete(id); notify(); });
});

let opening: Promise<IDBDatabase | null> | null = null;
function open(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB, 3);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PAGES)) db.createObjectStore(PAGES, { keyPath: "id" });
        if (!db.objectStoreNames.contains(REVISIONS)) db.createObjectStore(REVISIONS, { keyPath: "key", autoIncrement: true }).createIndex("page", "page");
        if (!db.objectStoreNames.contains(SETTINGS)) db.createObjectStore(SETTINGS, { keyPath: "key" });
        if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { persistent = false; resolve(null); };
      request.onblocked = () => { persistent = false; resolve(null); };
    } catch {
      persistent = false;
      resolve(null);
    }
  });
  return opening;
}

/** One request in its own transaction; null when IndexedDB is unavailable or the request fails. */
export function run<T>(storeName: string, mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return open().then((db) => new Promise<T | null>((resolve) => {
    if (!db) { resolve(null); return; }
    try {
      const request = work(db.transaction(storeName, mode).objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  }));
}

const readRecord = (id: string) => run<PageRecord | undefined>(PAGES, "readonly", (store) => store.get(id) as IDBRequest<PageRecord | undefined>).then((record) => record ?? null);
const writeRecord = (record: PageRecord) => run(PAGES, "readwrite", (store) => store.put(record));
const isLive = (record: PageRecord) => record.trashedAt === undefined;
const metaOf = ({ text: _text, sync: _sync, doc: _doc, figma: _figma, figmaExports: _figmaExports, ...meta }: PageRecord): PageMeta => meta;

/** Whether pages survive a reload (IndexedDB works here). */
export const pagesPersist = () => persistent;

/** Reads every record once (live and trashed), then empties the Trash of pages past their 30 days. */
async function loadAll(): Promise<void> {
  if (listed) return;
  const all = await run<PageRecord[]>(PAGES, "readonly", (store) => store.getAll() as IDBRequest<PageRecord[]>);
  for (const record of all ?? []) if (!cache.has(record.id)) cache.set(record.id, record);
  listed = true;
  const now = Date.now();
  for (const record of [...cache.values()]) if (record.trashedAt !== undefined && trashExpired(record.trashedAt, now)) await deleteForever(record.id);
  notify();
}

const live = () => [...cache.values()].filter(isLive).sort((a, b) => b.updatedAt - a.updatedAt).map(metaOf);
const trashed = () => [...cache.values()].filter((record) => !isLive(record)).sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0)).map(metaOf);

/** Every live page (newest first). */
export async function listPages(): Promise<PageMeta[]> {
  await loadAll();
  return live();
}

/** A live page's record (cache first); null when missing or in the Trash. */
export async function getPage(id: string): Promise<PageRecord | null> {
  let record = cache.get(id) ?? null;
  if (!record) {
    record = await readRecord(id);
    if (record) { cache.set(id, record); notify(); }
  }
  return record && isLive(record) ? record : null;
}

/** The cached record of a live page, or undefined until it is read. */
export const cachedPage = (id: string) => { const record = cache.get(id); return record && isLive(record) ? record : undefined; };

/* ── revisions ──────────────────────────────────────────────────────────────────────────────────────────────────── */

/** When each page last kept a revision (this session; the first edit of a session always keeps one). */
const lastRevisionAt = new Map<string, number>();

async function addRevision(page: string, text: string, reason: RevisionReason, at = Date.now()): Promise<void> {
  lastRevisionAt.set(page, at);
  await run(REVISIONS, "readwrite", (store) => store.add({ page, text, at, reason }));
  const all = await listRevisions(page);
  for (const old of all.slice(MAX_REVISIONS)) await run(REVISIONS, "readwrite", (store) => store.delete(old.key));
}

/** A page's revisions, newest first. */
export async function listRevisions(page: string): Promise<Revision[]> {
  const rows = await run<Revision[]>(REVISIONS, "readonly", (store) => store.index("page").getAll(page) as IDBRequest<Revision[]>);
  return (rows ?? []).sort((a, b) => b.at - a.at || b.key - a.key);
}

/** Puts a revision's text back (the current text becomes a revision first, so this can be undone the same way). */
export async function restoreRevision(page: string, key: number): Promise<void> {
  const revision = (await listRevisions(page)).find((row) => row.key === key);
  if (!revision) throw new Error("That version is no longer kept");
  await putPage(page, revision.text, { reason: "restore" });
}

/* ── writes ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Gives a page its document (builder/localApi.ts ensurePageDoc) without writing its text: the page is not edited by
 * opening it (no revision, no new "edited" time, nothing to the mirror). Refused when the text changed meanwhile.
 */
export async function setPageDoc(id: string, text: string, doc: PageDoc): Promise<boolean> {
  const record = cache.get(id) ?? (await readRecord(id));
  if (!record || record.text !== text || record.doc) return false;
  const next: PageRecord = { ...record, doc };
  cache.set(id, next);
  await writeRecord(next);
  return true;
}

/**
 * Writes a page's text (its title comes from the header line). `reason` decides whether the previous text is kept as a
 * revision (pageModel.keepsRevision); a connected mirror gets the new text. `doc`: the document `text` is the print of
 * (builder/localApi.ts); without it the page has none until it opens again. `figma`: the last Figma pull's document (null
 * forgets it); left out, the page keeps the one it had.
 */
export async function putPage(id: string, text: string, { title, reason = "edit", folder, doc, figma }: { title?: string; reason?: RevisionReason; folder?: string | null; doc?: PageDoc; figma?: FigmaBase | null } = {}): Promise<PageRecord> {
  if (!isPageId(id)) throw new Error(`Bad page id ${JSON.stringify(id)}`);
  const now = Date.now();
  const previous = cache.get(id) ?? (await readRecord(id));
  const record: PageRecord = {
    id,
    title: title ?? headerTitle(text) ?? previous?.title ?? id,
    text,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    ...(previous?.sync ? { sync: previous.sync } : {}),
    ...(doc ? { doc } : {}),
  };
  const nextFigma = figma === undefined ? previous?.figma : figma ?? undefined;
  if (nextFigma) record.figma = nextFigma;
  if (previous?.figmaExports) record.figmaExports = previous.figmaExports;
  // A write keeps the page in its folder unless `folder` moves it (null: out of every folder).
  const nextFolder = folder === undefined ? previous?.folder : folder ?? undefined;
  if (nextFolder) record.folder = nextFolder;
  cache.set(id, record);
  notify();
  if (previous && previous.text !== text && keepsRevision(reason, lastRevisionAt.get(id) ?? null, now)) await addRevision(id, previous.text, reason, now);
  await writeRecord(record);
  channel?.postMessage({ id });
  pushToMirror(id);
  if (figma) void shareFigma(record);
  return record;
}

/** Moves a page into a Studio folder (null: out of every folder). The text and its revisions stay as they are. */
export async function movePage(id: string, folder: string | null): Promise<void> {
  const record = cache.get(id) ?? (await readRecord(id));
  if (!record || (record.folder ?? null) === folder) return;
  const next: PageRecord = { ...record };
  if (folder) next.folder = folder; else delete next.folder;
  cache.set(id, next);
  notify();
  await writeRecord(next);
  channel?.postMessage({ id });
}

/** Renames a page: its header title, the list's name and a Screen still named after the page (one revision). */
export async function renamePage(id: string, title: string): Promise<void> {
  const page = await getPage(id);
  if (!page) throw new Error("The page is gone");
  await putPage(id, withScreenTitles(withHeaderTitle(page.text, title), page.title, title), { title, reason: "rename" });
}

/** The page's mobile OS (header `os`): its phone and tablet Screens draw that OS's status and bottom bars. */
export async function setPageOs(id: string, os: "ios" | "android"): Promise<void> {
  const page = await getPage(id);
  if (!page) throw new Error("The page is gone");
  const text = withHeaderOs(page.text, os);
  if (text !== page.text) await putPage(id, text, { title: page.title, reason: "edit" });
}

/** The page's ruler guides (header `guides`, F10): written with the page, outside ⌘Z (as the page's OS and project). */
export async function setPageGuides(id: string, guides: readonly PageGuide[]): Promise<void> {
  const page = await getPage(id);
  if (!page) throw new Error("The page is gone");
  const text = withHeaderGuides(page.text, guides);
  if (text === page.text) return;
  const header = { ...(page.doc?.header ?? {}) };
  if (guides.length) header.guides = guides.map((guide) => ({ ...guide })); else delete header.guides;
  await putPage(id, text, { title: page.title, reason: "edit", ...(page.doc ? { doc: { ...page.doc, header } } : {}) });
}

/** A frame's layout guides (header `layoutGuides`, F10): written with the page, outside ⌘Z (as its guides). */
export async function setFrameLayoutGuides(id: string, frame: string, guides: readonly LayoutGuide[]): Promise<void> {
  const page = await getPage(id);
  if (!page) throw new Error("The page is gone");
  const text = withHeaderLayoutGuides(page.text, frame, guides);
  if (text === page.text) return;
  const header = { ...(page.doc?.header ?? {}) };
  const all = headerLayoutGuides(text);
  if (Object.keys(all).length) header.layoutGuides = all; else delete header.layoutGuides;
  await putPage(id, text, { title: page.title, reason: "edit", ...(page.doc ? { doc: { ...page.doc, header } } : {}) });
}

/** The page's canvas background (header `canvas`, F10): written with the page, outside ⌘Z (as its OS). */
export async function setPageCanvas(id: string, canvas: CanvasBackground): Promise<void> {
  const page = await getPage(id);
  if (!page) throw new Error("The page is gone");
  const text = withHeaderCanvas(page.text, canvas);
  if (text === page.text) return;
  const header = { ...(page.doc?.header ?? {}) };
  if (canvas === "canvas") delete header.canvas; else header.canvas = canvas;
  await putPage(id, text, { title: page.title, reason: "edit", ...(page.doc ? { doc: { ...page.doc, header } } : {}) });
}

/** Moves the page into a Studio project (header `project`; null: back to Drafts). The page's document keeps its
 *  layers, with the same header. */
export async function setPageProject(id: string, project: string | null): Promise<void> {
  const page = await getPage(id);
  if (!page) throw new Error("The page is gone");
  const text = withHeaderProject(page.text, project);
  if (text === page.text) return;
  const header = { ...(page.doc?.header ?? {}) };
  if (project) header.project = project; else delete header.project;
  await putPage(id, text, { title: page.title, reason: "edit", ...(page.doc ? { doc: { ...page.doc, header } } : {}) });
}

/** A copy of the page under a new id ("<title> copy"); returns the new id. */
export async function duplicatePage(id: string): Promise<string> {
  const page = await getPage(id);
  if (!page) throw new Error("The page is gone");
  const title = `${page.title} copy`;
  const copy = await freeId(title);
  await putPage(copy, withHeaderTitle(page.text, title), { title, reason: "import", folder: page.folder ?? null });
  return copy;
}

/** A page from a file (Import): the file's text byte for byte, under the id its name asks for when free. */
export async function importPage(text: string, wantedId: string | null, { doc, figma }: { doc?: PageDoc; figma?: FigmaBase } = {}): Promise<string> {
  const title = headerTitle(text) ?? wantedId ?? "Imported page";
  await loadAll();
  const id = wantedId && !cache.has(wantedId) ? wantedId : await freeId(title);
  await putPage(id, text, { title, reason: "import", doc, figma });
  return id;
}

/**
 * The live page pulled from this Figma frame (its header's `figma`), or null. A frame the Zen plugin placed from a page
 * here names that page and its export (`page`, `version`): that page, when this browser or its connected folder keeps
 * that export (another browser on the same dev server exported it).
 */
export async function findPulledPage(source: { file: string | null; node: string; page?: string; version?: string }): Promise<string | null> {
  await loadAll();
  const pushed = source.page ? cache.get(source.page) : undefined;
  if (pushed && isLive(pushed)) {
    const exported = (record: PageRecord) => source.version
      ? record.figma?.version === source.version || Boolean(record.figmaExports?.some((entry) => entry.version === source.version))
      : Boolean(record.figmaExports?.length);
    if (exported(pushed)) return pushed.id;
    // Exported from another browser on this dev server or folder: its bases are beside the page.
    const joined = await loadSharedFigma(pushed.id);
    if (joined && exported(joined)) return pushed.id;
  }
  for (const record of cache.values()) {
    if (!isLive(record)) continue;
    const own = headerFigma(record.text);
    if (own && own.node === source.node && (own.file === source.file || !own.file || !source.file)) return record.id;
  }
  return null;
}

/** Keeps `base` as the document of the page's last Figma pull (with the page it left and its export), without writing its text. */
export async function setFigmaBase(id: string, base: PageDoc, { synced, version }: { synced?: PageDoc; version?: string } = {}): Promise<void> {
  const record = cache.get(id) ?? (await readRecord(id));
  if (!record) return;
  const next: PageRecord = { ...record, figma: { base, ...(synced ? { synced } : {}), ...(version ? { version } : {}), at: Date.now() } };
  cache.set(id, next);
  await writeRecord(next);
  await shareFigma(next);
}

/** Keeps an export to Figma (its version, the pull of its frame, the page it came from): the five latest, newest first. */
export async function keepFigmaExport(id: string, entry: { version: string; base: PageDoc; synced: PageDoc }): Promise<void> {
  const record = cache.get(id) ?? (await readRecord(id));
  if (!record || record.figmaExports?.[0]?.version === entry.version) return;
  const others = (record.figmaExports ?? []).filter((kept) => kept.version !== entry.version);
  const next: PageRecord = { ...record, figmaExports: [{ ...entry, at: Date.now() }, ...others].slice(0, 5) };
  cache.set(id, next);
  await writeRecord(next);
  await shareFigma(next);
}

/*
 * A page's Figma bases beside it in the connected folder (figma round trip P6b, leftover 2026-10-23): what one browser
 * exported or pulled, another on the same dev server or folder reads before it compares a pull, so Update from Figma
 * lists only what the designer changed there too.
 */

/** The folder file's limit, kept under the dev server's 8 MB (pages-folder.mjs MAX_FIGMA, its request body). */
const MAX_SHARED_FIGMA = 6 * 1024 * 1024;

/** The page's Figma bases as the folder keeps them (tools/studio/page-figma.mjs). */
const figmaFileOf = (record: PageRecord): PageFigma => ({
  format: 1,
  exports: (record.figmaExports ?? []).map(({ version, at, base, synced }) => ({ version, at, base, synced: synced ?? base })),
  ...(record.figma ? { pull: { ...record.figma, at: record.figma.at ?? record.updatedAt } } : {}),
});

/** The folder's Figma bases for the page when it keeps valid ones; null otherwise. */
async function readSharedFigma(id: string): Promise<PageFigma | null> {
  const source = mirror;
  if (!source?.readFigma) return null;
  try {
    const shared = await source.readFigma(id);
    return shared && !validateFigma(shared).length ? (shared as PageFigma) : null;
  } catch {
    return null;
  }
}

/** Writes the page's Figma bases beside it, joined with what the folder holds (another browser's exports stay). */
async function shareFigma(record: PageRecord): Promise<void> {
  const target = mirror;
  if (!target?.writeFigma || (!record.figmaExports?.length && !record.figma)) return;
  try {
    const joined = joinFigma(await readSharedFigma(record.id), figmaFileOf(record));
    await target.writeFigma(record.id, fitFigma(joined, MAX_SHARED_FIGMA));
  } catch {
    // The folder keeps the bases it had; this browser still has its own.
  }
}

/**
 * Joins the folder's Figma bases for the page into this browser's copy: an export or a pull made in another browser
 * becomes a base here (by its version; the later pull wins). Returns the record after, or null without the page.
 */
export async function loadSharedFigma(id: string): Promise<PageRecord | null> {
  const shared = await readSharedFigma(id);
  const record = cache.get(id) ?? (await readRecord(id));
  if (!record || !shared) return record ?? null;
  const joined = joinFigma(figmaFileOf(record), shared);
  const next: PageRecord = { ...record };
  if (joined.exports.length) next.figmaExports = joined.exports; else delete next.figmaExports;
  if (joined.pull) next.figma = joined.pull;
  if (JSON.stringify([next.figmaExports, next.figma]) === JSON.stringify([record.figmaExports, record.figma])) return record;
  cache.set(id, next);
  await writeRecord(next);
  return next;
}

/** Moves a page to the Trash (and the mirror's copy to the folder's trash). */
export async function trashPage(id: string): Promise<void> {
  const record = cache.get(id) ?? (await readRecord(id));
  if (!record || !isLive(record)) return;
  const next: PageRecord = { ...record, trashedAt: Date.now() };
  delete next.sync;
  cache.set(id, next);
  notify();
  await writeRecord(next);
  channel?.postMessage({ id });
  if (mirror) {
    const target = mirror;
    await queued(id, () => target.trash(id)).catch((error: unknown) => setMirrorError(error));
  }
}

/** Takes a page out of the Trash (the mirror gets it back). */
export async function restorePage(id: string): Promise<void> {
  const record = cache.get(id) ?? (await readRecord(id));
  if (!record || isLive(record)) return;
  const next: PageRecord = { ...record, updatedAt: Date.now() };
  delete next.trashedAt;
  cache.set(id, next);
  notify();
  await writeRecord(next);
  channel?.postMessage({ id });
  pushToMirror(id);
}

/** Deletes a page and its revisions for good (from the Trash). */
export async function deleteForever(id: string): Promise<void> {
  cache.delete(id);
  lastRevisionAt.delete(id);
  notify();
  await run(PAGES, "readwrite", (store) => store.delete(id));
  for (const revision of await listRevisions(id)) await run(REVISIONS, "readwrite", (store) => store.delete(revision.key));
  channel?.postMessage({ id });
}

/** A new page id from a title ("Checkout flow" → "checkout-flow", then "-2"… when taken, Trash included). */
export async function freeId(title: string): Promise<string> {
  await loadAll();
  const base = slugOf(title);
  let id = base;
  for (let n = 2; cache.has(id) || (await readRecord(id)); n += 1) id = `${base}-${n}`;
  return id;
}

/* ── mirror ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

let mirror: PageMirror | null = null;
/** The folder connected now (uploaded photos go to its assets/ too), or null. */
export const activeMirror = () => mirror;
let storage: StorageState = { kind: "browser" };
const setStorage = (next: StorageState) => { storage = next; notify(); };
const setMirrorError = (error: unknown) => {
  if (storage.kind === "mirror") setStorage({ ...storage, error: error instanceof Error ? error.message : String(error) });
};

/** One mirror call at a time per page, in order (a write never overtakes the one before it). */
const chains = new Map<string, Promise<unknown>>();
function queued<T>(id: string, task: () => Promise<T>): Promise<T> {
  const next = (chains.get(id) ?? Promise.resolve()).catch(() => undefined).then(task);
  chains.set(id, next);
  return next;
}

/** Sends the page's current text to the mirror, then records it as synced. */
function pushToMirror(id: string) {
  if (!mirror) return;
  const target = mirror;
  void queued(id, async () => {
    const record = cache.get(id);
    if (!record || !isLive(record) || mirror !== target) return;
    const text = record.text;
    await target.write(id, text);
    const now = cache.get(id);
    if (now && now.text === text) {
      const next = { ...now, sync: { mirror: target.key, hash: textHash(text) } };
      cache.set(id, next);
      await writeRecord(next);
    }
    if (storage.kind === "mirror" && storage.error) setStorage({ ...storage, error: null });
  }).catch((error: unknown) => setMirrorError(error));
}

/** Connects a mirror (or none) and syncs with it. */
export async function connectMirror(next: PageMirror | null): Promise<void> {
  mirror = next;
  if (!next) { setStorage({ kind: "browser" }); return; }
  setStorage({ kind: "mirror", mirror: next.kind, label: next.label, syncing: true, error: null });
  await syncMirror();
}

/** A linked folder that needs a click before the browser lets the Studio read it again. */
export function needsReconnect(label: string) {
  mirror = null;
  setStorage({ kind: "reconnect", label });
}

/** Makes this copy and the mirror agree (pageModel.planSync). */
export async function syncMirror(): Promise<void> {
  const target = mirror;
  if (!target) return;
  if (storage.kind === "mirror") setStorage({ ...storage, syncing: true });
  try {
    await loadAll();
    const remote = await target.list();
    if (mirror !== target) return;
    let steps = planSync([...cache.values()], remote, target.key);
    // "The folder lost this page" is read from a listing that can predate a page this tab has just written: its file
    // lands while the listing runs (the folder's change event fires on the temporary file), and the page is marked
    // synced before the plan is made. A page made in a project then went to the Trash a second later (user,
    // 2026-10-18: "Tạo page mới trong project vừa tạo nó lại nhảy vào draft"). A fresh listing confirms the loss first.
    if (steps.some((step) => step.kind === "trash-local")) {
      const again = new Set((await target.list()).map((row) => row.id));
      if (mirror !== target) return;
      steps = steps.filter((step) => step.kind !== "trash-local" || !again.has(step.id));
    }
    for (const step of steps) {
      const record = cache.get(step.id);
      if (step.kind === "take") {
        if (record && record.text !== step.text) await addRevision(step.id, record.text, step.reason === "conflict" ? "conflict" : "folder");
        const next: PageRecord = {
          id: step.id,
          title: headerTitle(step.text) ?? record?.title ?? step.id,
          text: step.text,
          createdAt: record?.createdAt ?? step.mtime,
          updatedAt: Math.max(step.mtime, record?.updatedAt ?? 0),
          sync: { mirror: target.key, hash: textHash(step.text) },
        };
        cache.set(step.id, next);
        await writeRecord(next);
        channel?.postMessage({ id: step.id });
      } else if (step.kind === "mark" && record) {
        const next = { ...record, sync: { mirror: target.key, hash: step.hash } };
        cache.set(step.id, next);
        await writeRecord(next);
      } else if (step.kind === "push") {
        pushToMirror(step.id);
      } else if (step.kind === "trash-remote") {
        await queued(step.id, () => target.trash(step.id));
      } else if (step.kind === "trash-local" && record) {
        const next: PageRecord = { ...record, trashedAt: Date.now() };
        delete next.sync;
        cache.set(step.id, next);
        await writeRecord(next);
        channel?.postMessage({ id: step.id });
      }
    }
    if (storage.kind === "mirror") setStorage({ ...storage, syncing: false, error: null });
  } catch (error) {
    if (storage.kind === "mirror") setStorage({ ...storage, syncing: false, error: error instanceof Error ? error.message : String(error) });
  }
  notify();
}

/* ── hooks ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const useVersion = () => useSyncExternalStore(subscribe, () => version, () => version);

/** The live page's record as it is now (re-renders on every write, here or in another tab); null until read, when gone or trashed. */
export function usePage(id: string | null): PageRecord | null {
  useVersion();
  useEffect(() => { if (id && !cache.has(id)) void getPage(id); }, [id]);
  const record = id ? cache.get(id) ?? null : null;
  return record && isLive(record) ? record : null;
}

/** Every live page's meta (newest first), re-rendering on changes. */
/** A live page's Studio project (header `project`; null: a draft; undefined: not read yet), re-rendering only when it
 *  changes — not on every edit, as usePage does (StudioApp and the canvas read it). */
export function usePageProject(id: string | null): string | null | undefined {
  const read = () => {
    const record = id ? cache.get(id) : undefined;
    return record && isLive(record) ? headerProject(record.text) : undefined;
  };
  return useSyncExternalStore(subscribe, read, read);
}

export function usePages(): PageMeta[] {
  useVersion();
  useEffect(() => { if (!listed) void loadAll(); }, []);
  return live();
}

/** The pages in the Trash (latest first). */
export function useTrash(): PageMeta[] {
  useVersion();
  useEffect(() => { if (!listed) void loadAll(); }, []);
  return trashed();
}

/** Where the pages are kept (browser only, a mirror and its state, or a folder to reconnect). */
export function useStorage(): StorageState {
  useVersion();
  return storage;
}
