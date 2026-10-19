import { useEffect, useSyncExternalStore } from "react";
import { run, SETTINGS, type PageMeta } from "./pageStore";

/*
 * The order of the pages in the Pages panel and its dividers (Figma's pages list, F4): the person drags pages into the
 * order they want and adds dividers between groups; nothing reorders them by itself (the list used to follow the last
 * edit). One order per list — a folder's, or the pages in no folder of a project or of Drafts — kept in this browser's
 * IndexedDB settings store (key "pageOrder"), as folders are (folderStore.ts). A page the order does not name yet (a
 * new one, one moved in) comes after the named ones, oldest first, so a new page lands at the end as in Figma.
 */

export type PageEntry = { kind: "page"; id: string; page: PageMeta } | { kind: "divider"; id: string };

const KEY = "pageOrder";
const DIVIDER = "divider:";
export const isDividerId = (id: string) => id.startsWith(DIVIDER);

let orders: Record<string, string[]> = {};
let loaded = false;
let version = 0;
const listeners = new Set<() => void>();
const notify = () => { version += 1; listeners.forEach((listener) => listener()); };
const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("zen-studio-page-order");
channel?.addEventListener("message", () => { loaded = false; void load(); });

async function load(): Promise<void> {
  if (loaded) return;
  const row = await run<{ key: string; value: Record<string, string[]> } | undefined>(SETTINGS, "readonly", (store) => store.get(KEY) as IDBRequest<{ key: string; value: Record<string, string[]> } | undefined>);
  orders = row?.value && typeof row.value === "object" ? row.value : orders;
  loaded = true;
  notify();
}

/** Keeps a list's order: written first, then shown, so what the list shows survives a reload at once. */
async function save(scope: string, ids: string[]): Promise<void> {
  orders = { ...orders, [scope]: ids };
  try {
    await run(SETTINGS, "readwrite", (store) => store.put({ key: KEY, value: orders }));
  } finally {
    notify();
  }
  channel?.postMessage("changed");
}

/** A list's rows: its pages in the person's order with its dividers, then the pages the order does not name yet. */
export function orderedEntries(scope: string, pages: readonly PageMeta[]): PageEntry[] {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const named = new Set<string>();
  const entries: PageEntry[] = [];
  for (const id of orders[scope] ?? []) {
    if (isDividerId(id)) { entries.push({ kind: "divider", id }); continue; }
    const page = byId.get(id);
    if (page && !named.has(id)) { named.add(id); entries.push({ kind: "page", id, page }); }
  }
  const rest = pages.filter((page) => !named.has(page.id)).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  return [...entries, ...rest.map((page) => ({ kind: "page" as const, id: page.id, page }))];
}

/** Each list's rows as the Pages panel shows them now (StudioFolders sets them as it renders). */
const shown = new Map<string, PageEntry[]>();
export const showEntries = (scope: string, rows: PageEntry[]) => { shown.set(scope, rows); };

/** Moves the row `id` of the list `scope` before `before` (null: to the end). */
export async function moveEntry(scope: string, id: string, before: string | null): Promise<void> {
  await load();
  const rows = shown.get(scope) ?? [];
  const ids = rows.map((row) => row.id).filter((entry) => entry !== id);
  const at = before === null ? ids.length : ids.indexOf(before);
  ids.splice(at < 0 ? ids.length : at, 0, id);
  await save(scope, ids);
}

/** Adds a divider after the row `after` of the list `scope` (Figma's divider between groups of pages). */
export async function addDivider(scope: string, after: string): Promise<void> {
  await load();
  const rows = shown.get(scope) ?? [];
  const ids = rows.map((row) => row.id);
  const at = ids.indexOf(after);
  ids.splice(at < 0 ? ids.length : at + 1, 0, `${DIVIDER}${Date.now().toString(36)}`);
  await save(scope, ids);
}

export async function removeDivider(scope: string, id: string): Promise<void> {
  await load();
  const rows = shown.get(scope) ?? [];
  await save(scope, rows.map((row) => row.id).filter((entry) => entry !== id));
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** Re-renders when an order changes (and loads them once). */
export function usePageOrder(): number {
  const current = useSyncExternalStore(subscribe, () => version, () => version);
  useEffect(() => { if (!loaded) void load(); }, []);
  return current;
}
