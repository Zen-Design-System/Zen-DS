// Zen Studio admin drafts: the pure bookkeeping behind the dev server's draft layer (vite-plugin-zen-studio.mjs).
// Admin edits go into an in-memory draft per file; nothing reaches the disk until POST /__zen-studio/save. No fs, no
// server here, so `node tools/studio/selftest.mjs` tests it directly.
//
//   nextDraft(prev, disk, content, now)   the draft after an edit/write, or null when the text equals the disk or its base again
//   planSave(draft, disk)                  (async) what Save writes: the draft, the draft rebased onto a changed disk, or a conflict
//   rebaseDraft(base, content, disk)       (async) the draft's hunks (history.ts makePatch) applied to the disk text, or null
//   followDisk(draft, disk)                (async) a drafted file changed on disk: the draft rebased onto it (both show), or kept (stale)
//   changedLines(before, after)            added / removed line counts (git numstat-like, line LCS)
//   draftInfo(file, draft, disk, lines?)   one row of GET /drafts (DraftInfo in src/platform/studio/types.ts)
//   serializeDrafts(map) / parseDrafts(text, isAllowed)   the persisted file (node_modules/.cache/zen-studio/)
//
// The rebase uses the Studio's undo/redo hunks (src/platform/studio/history.ts), with the same rules: a hunk applies
// to the changed disk only where its lines and its context lines each occur exactly once; anything else is a
// conflict, never a write on a look-alike. history.ts is imported at run time (Node strips its types): Vite's config
// bundler then neither bundles it (it warns about its extensionless type import) nor restarts the dev servers when
// the client changes it.
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HISTORY_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../src/platform/studio/history.ts");
let history = null;
/** src/platform/studio/history.ts (makePatch, locateHunks, applyHunks), loaded once (tried again after a failure). */
export const loadHistory = () => (history ??= import(pathToFileURL(HISTORY_FILE).href).catch((error) => {
  history = null;
  throw error;
}));

export const DRAFTS_FORMAT = 1;

/** sha1 hex of the text (utf8), as jsx-source.mjs and the client hash files. */
export const sha1 = (text) => createHash("sha1").update(text, "utf8").digest("hex");

/** Above this many line pairs the changed middle counts as all removed and all added (no LCS). */
const LCS_LIMIT = 4_000_000;

/** Lines with their line breaks, as history.ts splits them. */
const splitLines = (text) => text.match(/[^\n]*\n|[^\n]+$/g) ?? [];

/**
 * The draft of a file after an edit or a write produced `content`. `prev`: its draft so far (undefined when none);
 * `disk`: the file on disk now. A new draft starts from the disk (`base`, `baseHash`); an existing one keeps its base.
 * null: `content` equals the disk, or the draft's base (every edit undone: the disk, which may have changed since, is
 * what readers see again), so there is nothing to save.
 */
export function nextDraft(prev, disk, content, now = Date.now()) {
  if (typeof content !== "string") throw new TypeError("content must be a string");
  if (disk === content || (prev && prev.base === content)) return null;
  if (prev) return { base: prev.base, baseHash: prev.baseHash, content, updatedAt: now };
  if (typeof disk !== "string") throw new TypeError("a draft starts from the disk text");
  return { base: disk, baseHash: sha1(disk), content, updatedAt: now };
}

/**
 * The draft's changes (base → content) applied to `disk`, a text that changed since the draft started; null when a
 * hunk cannot be placed there (its lines changed, or they or their context are no longer unique).
 */
export async function rebaseDraft(base, content, disk) {
  if (disk === base) return content;
  if (content === base) return disk;
  let historyModule;
  try {
    historyModule = await loadHistory();
  } catch {
    return null;
  }
  const { applyHunks, locateHunks, makePatch } = historyModule;
  const patch = makePatch(base, content);
  // "redo": the base side of each hunk is what the disk must still hold; the draft side replaces it.
  const positions = locateHunks(disk, patch, "redo", false);
  return positions ? applyHunks(disk, patch, positions, "redo") : null;
}

/**
 * What Save does with a draft given the disk text now (null: the file is gone).
 *   { text, rebased: false, unchanged: true }   the disk already holds the draft: nothing to write
 *   { text, rebased: false }                    the disk is still the draft's base: write the draft
 *   { text, rebased: true }                     the disk changed: write the draft's hunks applied to it
 *   { conflict: reason }                        keep the draft; `reason` is a short sentence
 */
export async function planSave(draft, disk) {
  if (typeof disk !== "string") return { conflict: "the file is no longer on disk" };
  if (disk === draft.content) return { text: disk, rebased: false, unchanged: true };
  if (sha1(disk) === draft.baseHash) return { text: draft.content, rebased: false };
  const text = await rebaseDraft(draft.base, draft.content, disk);
  if (text === null) return { conflict: "the file on disk changed the drafted lines or the lines around them since the draft started" };
  // A draft with no changes left (undone back to its base) adds nothing to the changed disk.
  if (text === disk) return { text, rebased: false, unchanged: true };
  return { text, rebased: true };
}

/**
 * A drafted file changed on disk (another session, an editor, a Save elsewhere): the draft follows it when it can, so
 * readers see the disk change and the admin's edits together.
 *   { draft: null }               the disk now holds the draft (or the draft had no edits left): drop it
 *   { draft, changed: false }     keep it as it is (the disk still holds its base, or the change collides: stale)
 *   { draft, changed: true }      the draft's hunks re-applied to the new disk text, which becomes its base
 */
export async function followDisk(draft, disk) {
  if (typeof disk !== "string") return { draft, changed: false };
  if (disk === draft.content) return { draft: null };
  if (sha1(disk) === draft.baseHash) return { draft, changed: false };
  const content = await rebaseDraft(draft.base, draft.content, disk);
  if (content === null) return { draft, changed: false };
  if (content === disk) return { draft: null };
  return { draft: { base: disk, baseHash: sha1(disk), content, updatedAt: draft.updatedAt }, changed: true };
}

/** Added and removed line counts from `before` to `after` (a changed line is one of each), like git's numstat. */
export function changedLines(before, after) {
  const a = splitLines(before);
  const b = splitLines(after);
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head += 1;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail += 1;
  const n = a.length - head - tail;
  const m = b.length - head - tail;
  if (!n || !m || n * m > LCS_LIMIT) return { added: m, removed: n };
  // Length of the longest common subsequence, two rows.
  let prev = new Uint32Array(m + 1);
  let row = new Uint32Array(m + 1);
  for (let i = 1; i <= n; i += 1) {
    const line = a[head + i - 1];
    for (let j = 1; j <= m; j += 1) row[j] = line === b[head + j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], row[j - 1]);
    [prev, row] = [row, prev];
  }
  const common = prev[m];
  return { added: m - common, removed: n - common };
}

/**
 * One GET /drafts row (DraftInfo). `disk`: the file on disk now, null when it is gone. `lines`: changedLines of the
 * draft when the caller has them cached.
 */
export function draftInfo(file, draft, disk, lines = changedLines(draft.base, draft.content)) {
  const diskHash = typeof disk === "string" ? sha1(disk) : null;
  return { file, baseHash: draft.baseHash, diskHash, stale: diskHash !== draft.baseHash, changedLines: lines, updatedAt: draft.updatedAt };
}

/** The persisted drafts file: { format, drafts: { [file]: { base, baseHash, content, updatedAt } } }, files sorted. */
export function serializeDrafts(drafts) {
  const out = {};
  for (const file of [...drafts.keys()].sort()) {
    const { base, baseHash, content, updatedAt } = drafts.get(file);
    out[file] = { base, baseHash, content, updatedAt };
  }
  return `${JSON.stringify({ format: DRAFTS_FORMAT, drafts: out })}\n`;
}

/**
 * The drafts in a persisted file, made safe to use: entries for files `isAllowed(file)` refuses, with a base that does
 * not match its hash, or with missing fields are dropped (and counted). `error`: the text is not a drafts file at all.
 */
export function parseDrafts(text, isAllowed = () => true) {
  const drafts = new Map();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { drafts, dropped: 0, error: "not JSON" };
  }
  if (!data || typeof data !== "object" || data.format !== DRAFTS_FORMAT || !data.drafts || typeof data.drafts !== "object" || Array.isArray(data.drafts)) {
    return { drafts, dropped: 0, error: "not a Zen Studio drafts file" };
  }
  let dropped = 0;
  for (const [file, entry] of Object.entries(data.drafts)) {
    const valid = entry && typeof entry === "object"
      && typeof entry.base === "string" && typeof entry.content === "string" && typeof entry.baseHash === "string"
      && entry.baseHash === sha1(entry.base) && isAllowed(file);
    if (!valid) { dropped += 1; continue; }
    const updatedAt = Number.isFinite(entry.updatedAt) ? entry.updatedAt : 0;
    drafts.set(file, { base: entry.base, baseHash: entry.baseHash, content: entry.content, updatedAt });
  }
  return { drafts, dropped };
}
