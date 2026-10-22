import { useEffect, useSyncExternalStore } from "react";
import { emptyComments, mergeComments, validateComments, type CommentAuthor, type PageComments } from "../../../../tools/studio/page-comments.mjs";
import { activeMirror, run, SETTINGS } from "../builder/store/pageStore";

/*
 * A page's comments in this browser (Figma's Comment tool, C; spec docs/research/studio-comments-spec-2026-10-22.md):
 * kept in IndexedDB (settings `comments:<page>`) and beside the page file in the connected folder (the dev server's
 * .zen-studio/pages/<page>.comments.json, or a linked folder's), the two joined by tools/studio/page-comments.mjs
 * mergeComments when the page opens and whenever the window comes back to it. Each change writes both and tells the other
 * tabs. The person who comments is named once in this browser (`commenter`).
 */

const KEY = (page: string) => `comments:${page}`;
const COMMENTER_KEY = "zen-studio-commenter";
const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("zen-studio-comments");

const cache = new Map<string, PageComments>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** One write at a time per page, in order. */
const chains = new Map<string, Promise<unknown>>();
const queue = (page: string, work: () => Promise<unknown>) => {
  const next = (chains.get(page) ?? Promise.resolve()).then(work, work).catch(() => undefined);
  chains.set(page, next);
  return next;
};

const valid = (doc: unknown): doc is PageComments => validateComments(doc).length === 0;

async function readStored(page: string): Promise<PageComments | null> {
  const row = await run<{ key: string; value: unknown } | undefined>(SETTINGS, "readonly", (store) => store.get(KEY(page)));
  return row && valid(row.value) ? row.value : null;
}

async function readMirror(page: string): Promise<PageComments | null> {
  const mirror = activeMirror();
  if (!mirror?.readComments) return null;
  try {
    const doc = await mirror.readComments(page);
    return valid(doc) ? doc : null;
  } catch {
    return null;
  }
}

async function store(page: string, doc: PageComments, toMirror: boolean) {
  await run(SETTINGS, "readwrite", (settings) => settings.put({ key: KEY(page), value: doc }));
  const mirror = activeMirror();
  if (toMirror && mirror?.writeComments) await mirror.writeComments(page, doc);
}

/** Reads the page's comments from here and from the folder, joins them, and keeps both up to date. */
export async function loadComments(page: string): Promise<PageComments> {
  const [stored, mirrored] = await Promise.all([readStored(page), readMirror(page)]);
  const joined = mergeComments(mergeComments(cache.get(page) ?? emptyComments(), stored ?? emptyComments()), mirrored ?? emptyComments());
  const text = JSON.stringify(joined);
  const changed = text !== JSON.stringify(cache.get(page) ?? null);
  cache.set(page, joined);
  if (changed) notify();
  // Either copy behind the joined one catches up (the folder only when it lacks something).
  if (text !== JSON.stringify(stored ?? emptyComments()) || text !== JSON.stringify(mirrored ?? emptyComments())) void queue(page, () => store(page, joined, text !== JSON.stringify(mirrored ?? emptyComments())));
  return joined;
}

/** Changes the page's comments (`change` gets the current ones, returns the next): here, the folder and the other tabs. */
export async function changeComments(page: string, change: (doc: PageComments) => PageComments): Promise<boolean> {
  const next = change(cache.get(page) ?? emptyComments());
  if (!valid(next)) return false;
  cache.set(page, next);
  notify();
  channel?.postMessage({ page });
  await queue(page, () => store(page, next, true));
  return true;
}

/** The page's comments as last read (empty until they are), re-rendering on every change. */
export function usePageComments(page: string | null): PageComments {
  useEffect(() => {
    if (!page) return undefined;
    void loadComments(page);
    // Back to the window: another browser may have commented in the folder meanwhile.
    const onFocus = () => { void loadComments(page); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [page]);
  return useSyncExternalStore(subscribe, () => (page ? cache.get(page) ?? EMPTY : EMPTY), () => EMPTY);
}
const EMPTY = emptyComments();

// Another tab changed a page's comments: read them again.
channel?.addEventListener("message", (event: MessageEvent<{ page?: string }>) => { if (event.data?.page) void loadComments(event.data.page); });

/* ── the person who comments ───────────────────────────────────────────────────────────────────────────────────── */

let commenterCache: CommentAuthor | null | undefined;
const commenterListeners = new Set<() => void>();

/** The name (and avatar colour) this browser comments as, or null until one is given. */
export function commenter(): CommentAuthor | null {
  if (commenterCache !== undefined) return commenterCache;
  try {
    const value = JSON.parse(localStorage.getItem(COMMENTER_KEY) ?? "null") as CommentAuthor | null;
    commenterCache = value && typeof value.name === "string" && value.name.trim() ? { name: value.name.trim().slice(0, 60), color: typeof value.color === "string" ? value.color : "violet" } : null;
  } catch {
    commenterCache = null;
  }
  return commenterCache;
}

export function setCommenter(next: CommentAuthor) {
  commenterCache = { name: next.name.trim().slice(0, 60), color: next.color };
  try { localStorage.setItem(COMMENTER_KEY, JSON.stringify(commenterCache)); } catch { /* kept for this session */ }
  commenterListeners.forEach((listener) => listener());
}

export const useCommenter = () => useSyncExternalStore((listener) => { commenterListeners.add(listener); return () => { commenterListeners.delete(listener); }; }, commenter, () => null);

/** A new id for a thread or a comment. */
export const newCommentId = (prefix: "t" | "c") => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
