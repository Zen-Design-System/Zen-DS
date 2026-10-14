import { useEffect, useSyncExternalStore } from "react";
import { slugOf } from "./pageModel";
import { listPages, movePage, run, SETTINGS, trashPage } from "./pageStore";

/*
 * Studio folders (user, 2026-10-09: the Studio space holds folders, each with its pages / canvases). A folder is a name
 * and an id kept in this browser's IndexedDB settings store (key "folders"); a page names its folder in its own record
 * (PageRecord.folder). The page files a mirror keeps (.zen-studio/pages/, a linked folder) do not carry the folder.
 */

export type StudioFolder = { id: string; name: string; createdAt: number };

const KEY = "folders";
let folders: StudioFolder[] = [];
let loaded = false;
const listeners = new Set<() => void>();
let version = 0;
const notify = () => { version += 1; listeners.forEach((listener) => listener()); };
const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("zen-studio-folders");
channel?.addEventListener("message", () => { loaded = false; void load(); });

async function load(): Promise<void> {
  if (loaded) return;
  const row = await run<{ key: string; value: StudioFolder[] } | undefined>(SETTINGS, "readonly", (store) => store.get(KEY) as IDBRequest<{ key: string; value: StudioFolder[] } | undefined>);
  folders = Array.isArray(row?.value) ? row.value : folders;
  loaded = true;
  notify();
}

async function save(next: StudioFolder[]): Promise<void> {
  folders = next;
  notify();
  await run(SETTINGS, "readwrite", (store) => store.put({ key: KEY, value: next }));
  channel?.postMessage("changed");
}

/** A new folder ("Checkout flows"), at the end of the list; returns its id. */
export async function createFolder(name: string): Promise<string> {
  await load();
  const base = `folder-${slugOf(name)}`;
  let id = base;
  for (let n = 2; folders.some((folder) => folder.id === id); n += 1) id = `${base}-${n}`;
  await save([...folders, { id, name, createdAt: Date.now() }]);
  return id;
}

export async function renameFolder(id: string, name: string): Promise<void> {
  await load();
  await save(folders.map((folder) => (folder.id === id ? { ...folder, name } : folder)));
}

/** Deletes a folder: its pages go to the Trash (30 days to restore them, out of any folder). */
export async function deleteFolder(id: string): Promise<void> {
  await load();
  for (const page of (await listPages()).filter((entry) => entry.folder === id)) {
    await movePage(page.id, null);
    await trashPage(page.id);
  }
  await save(folders.filter((folder) => folder.id !== id));
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** The folders in the order they were made, re-rendering on changes. */
export function useFolders(): StudioFolder[] {
  useSyncExternalStore(subscribe, () => version, () => version);
  useEffect(() => { if (!loaded) void load(); }, []);
  return folders;
}
