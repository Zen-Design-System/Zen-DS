/*
 * The pure part of the builder PageStore (Studio builder GĐ2 M2, spec docs/research/studio-builder-pages-spec-2026-10-06.md
 * §3 2c): the page header's title, a text hash, the revision and Trash rules, and the sync plan between the browser's
 * copy (IndexedDB) and a folder mirror (the dev server's .zen-studio/pages/, or a folder linked with File System
 * Access). No imports, so `node pageModel.selftest.mjs` runs it as is.
 */

export const PAGE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
/** A page in the Trash is deleted for good after this long. */
export const TRASH_DAYS = 30;
export const TRASH_MS = TRASH_DAYS * 24 * 60 * 60 * 1000;
/** Revisions kept per page (oldest dropped first). */
export const MAX_REVISIONS = 50;
/** Edits closer together than this share one revision (the text before the burst). */
export const REVISION_GAP_MS = 2 * 60 * 1000;

const HEADER = /^(﻿?\/\/ @zen-page )(\{.*\})([ \t]*\r?\n)/;

/** The header's title (`// @zen-page {"format":1,"title":"…"}` on line 1), or null. */
export function headerTitle(text: string): string | null {
  const match = HEADER.exec(text);
  if (!match) return null;
  try {
    const value = JSON.parse(match[2]) as { title?: unknown };
    return typeof value.title === "string" ? value.title : null;
  } catch {
    return null;
  }
}

/** The text with the header's title replaced (the rest byte for byte); unchanged when it has no readable header. */
/**
 * The page renamed from `from` to `to`: a Screen that still carries the page's name (a blank page's Screen takes it when
 * the page is made) takes the new one; Screens named otherwise keep their names (user, 2026-10-09: name the page as you
 * work, its Screen follows).
 */
export function withScreenTitles(text: string, from: string, to: string): string {
  if (from === to) return text;
  const old = JSON.stringify(from);
  return text.replace(/<Screen\b[^>]*>/g, (tag) => tag.replace(`title=${old}`, `title=${JSON.stringify(to)}`));
}

export function withHeaderTitle(text: string, title: string): string {
  const match = HEADER.exec(text);
  if (!match) return text;
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(match[2]) as Record<string, unknown>;
  } catch {
    return text;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return text;
  return `${match[1]}${JSON.stringify({ ...value, title })}${match[3]}${text.slice(match[0].length)}`;
}

/** A page id from a title or file name: "Checkout flow" → "checkout-flow" (Vietnamese marks dropped). */
export function slugOf(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "page";
}

/** The page id a file name asks for ("checkout.zen.tsx" → "checkout"), or null when it is not a valid id. */
export function idFromFileName(name: string): string | null {
  const stem = name.replace(/\.zen\.tsx$|\.tsx$/i, "");
  return PAGE_ID.test(stem) ? stem : null;
}

/** cyrb53: a fast 53-bit string hash, enough to tell whether two texts differ (not for security). */
export function textHash(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export type RevisionReason = "edit" | "rename" | "restore" | "import" | "folder" | "conflict";

/**
 * Whether a write keeps the previous text as a revision: always for a rename, restore, import or a change from the
 * folder; for an edit, only when the page's last revision is older than REVISION_GAP_MS (a burst of edits is one step).
 */
export function keepsRevision(reason: RevisionReason, lastRevisionAt: number | null, now: number): boolean {
  if (reason !== "edit") return true;
  return lastRevisionAt === null || now - lastRevisionAt >= REVISION_GAP_MS;
}

/** Whether a page trashed at `trashedAt` is past its 30 days. */
export const trashExpired = (trashedAt: number, now: number) => now - trashedAt >= TRASH_MS;

/** Whole days left before a trashed page is deleted (at least 0). */
export const trashDaysLeft = (trashedAt: number, now: number) => Math.max(0, Math.ceil((trashedAt + TRASH_MS - now) / (24 * 60 * 60 * 1000)));

/* ── sync with a folder mirror ──────────────────────────────────────────────────────────────────────────────────── */

/** `sync`: the mirror this copy last matched, and the hash of the text both held then. */
export type LocalRow = { id: string; text: string; trashedAt?: number; sync?: { mirror: string; hash: string } };
export type RemoteRow = { id: string; text: string; mtime: number };
export type SyncStep =
  /** The folder's text wins (new there, changed there, or both changed: `keepLocal` saves this copy as a revision). */
  | { kind: "take"; id: string; text: string; mtime: number; reason: "new" | "folder" | "conflict" }
  /** This copy is newer (or the folder never had it): write it there. */
  | { kind: "push"; id: string; text: string }
  /** Trashed here while the folder still has it: move it to the folder's trash. */
  | { kind: "trash-remote"; id: string }
  /** Gone from the folder after it was synced: move it to this Trash (never deleted). */
  | { kind: "trash-local"; id: string }
  /** Same text on both sides: remember it as synced. */
  | { kind: "mark"; id: string; hash: string };

/**
 * What to do so this browser's pages and the folder's agree. The folder is the source of truth on a conflict; this
 * copy's text is never lost (a conflict keeps it as a revision, a page removed from the folder goes to the Trash).
 * A sync record from another mirror counts as never synced (linking a new folder pushes the pages it lacks).
 */
export function planSync(local: LocalRow[], remote: RemoteRow[], mirror: string): SyncStep[] {
  const steps: SyncStep[] = [];
  const byId = new Map(local.map((row) => [row.id, row]));
  const remoteIds = new Set<string>();
  for (const row of remote) {
    remoteIds.add(row.id);
    const mine = byId.get(row.id);
    const hash = textHash(row.text);
    if (!mine) { steps.push({ kind: "take", id: row.id, text: row.text, mtime: row.mtime, reason: "new" }); continue; }
    if (mine.trashedAt !== undefined) { steps.push({ kind: "trash-remote", id: row.id }); continue; }
    const synced = mine.sync?.mirror === mirror ? mine.sync.hash : null;
    if (mine.text === row.text) { if (synced !== hash) steps.push({ kind: "mark", id: row.id, hash }); continue; }
    const mineHash = textHash(mine.text);
    if (synced !== null && mineHash === synced) steps.push({ kind: "take", id: row.id, text: row.text, mtime: row.mtime, reason: "folder" });
    else if (synced !== null && hash === synced) steps.push({ kind: "push", id: row.id, text: mine.text });
    else steps.push({ kind: "take", id: row.id, text: row.text, mtime: row.mtime, reason: "conflict" });
  }
  for (const mine of local) {
    if (remoteIds.has(mine.id) || mine.trashedAt !== undefined) continue;
    if (mine.sync?.mirror === mirror) steps.push({ kind: "trash-local", id: mine.id });
    else steps.push({ kind: "push", id: mine.id, text: mine.text });
  }
  return steps;
}
