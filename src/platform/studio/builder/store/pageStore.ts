import { useEffect, useSyncExternalStore } from "react";

/*
 * Builder pages kept in the browser (Studio builder GĐ2 M1; spec docs/research/studio-builder-pages-spec-2026-10-06.md
 * §3 2c): IndexedDB "zen-studio-builder", store "pages" ({ id, title, text, createdAt, updatedAt }). Reads are cached so
 * the board renders synchronously; writes update the cache at once, then IndexedDB, and tell other tabs
 * (BroadcastChannel). M2 adds revisions, Trash, Export/Import and the folder mirrors. Without IndexedDB (a private
 * window that blocks it) pages live in memory for the session and `persistent` is false.
 */

export type PageRecord = { id: string; title: string; text: string; createdAt: number; updatedAt: number };
export type PageMeta = Omit<PageRecord, "text">;

const DB = "zen-studio-builder";
const STORE = "pages";
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const isPageId = (id: string) => ID.test(id);
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
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" }); };
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

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return open().then((db) => new Promise<T | null>((resolve) => {
    if (!db) { resolve(null); return; }
    try {
      const request = work(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  }));
}

const readRecord = (id: string) => run<PageRecord | undefined>("readonly", (store) => store.get(id) as IDBRequest<PageRecord | undefined>).then((record) => record ?? null);

/** Whether pages survive a reload (IndexedDB works here). */
export const pagesPersist = () => persistent;

/** Every page (newest first), read once from IndexedDB then kept in the cache. */
export async function listPages(): Promise<PageMeta[]> {
  if (!listed) {
    const all = await run<PageRecord[]>("readonly", (store) => store.getAll() as IDBRequest<PageRecord[]>);
    for (const record of all ?? []) cache.set(record.id, record);
    listed = true;
    notify();
  }
  return [...cache.values()].sort((a, b) => b.updatedAt - a.updatedAt).map(({ text: _text, ...meta }) => meta);
}

/** A page's record (cache first). */
export async function getPage(id: string): Promise<PageRecord | null> {
  const cached = cache.get(id);
  if (cached) return cached;
  const record = await readRecord(id);
  if (record) { cache.set(id, record); notify(); }
  return record;
}

/** The cached text of a page, or undefined until it is read. */
export const cachedPage = (id: string) => cache.get(id);

/** Writes a page's text (its title comes from the header line). */
export async function putPage(id: string, text: string, title?: string): Promise<PageRecord> {
  if (!isPageId(id)) throw new Error(`Bad page id ${JSON.stringify(id)}`);
  const now = Date.now();
  const previous = cache.get(id) ?? (await readRecord(id));
  const record: PageRecord = { id, title: title ?? headerTitle(text) ?? previous?.title ?? id, text, createdAt: previous?.createdAt ?? now, updatedAt: now };
  cache.set(id, record);
  notify();
  await run("readwrite", (store) => store.put(record));
  channel?.postMessage({ id });
  return record;
}

export async function deletePage(id: string): Promise<void> {
  cache.delete(id);
  notify();
  await run("readwrite", (store) => store.delete(id));
  channel?.postMessage({ id });
}

function headerTitle(text: string): string | null {
  const match = /^﻿?\/\/ @zen-page (\{.*\})/.exec(text);
  if (!match) return null;
  try {
    const value = JSON.parse(match[1]) as { title?: unknown };
    return typeof value.title === "string" ? value.title : null;
  } catch {
    return null;
  }
}

/** A new page id from a title ("Checkout flow" → "checkout-flow", then "-2"… when taken). */
export async function freeId(title: string): Promise<string> {
  await listPages();
  const base = title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "page";
  let id = base;
  for (let n = 2; cache.has(id) || (await readRecord(id)); n += 1) id = `${base}-${n}`;
  return id;
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** The page's record as it is now (re-renders on every write, here or in another tab); null until read or when gone. */
export function usePage(id: string | null): PageRecord | null {
  useSyncExternalStore(subscribe, () => version, () => version);
  useEffect(() => { if (id && !cache.has(id)) void getPage(id); }, [id]);
  return id ? cache.get(id) ?? null : null;
}

/** Every page's meta (newest first), re-rendering on changes. */
export function usePages(): PageMeta[] {
  useSyncExternalStore(subscribe, () => version, () => version);
  useEffect(() => { if (!listed) void listPages(); }, []);
  return [...cache.values()].sort((a, b) => b.updatedAt - a.updatedAt).map(({ text: _text, ...meta }) => meta);
}
