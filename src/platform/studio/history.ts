import type { StudioEditHunk, StudioEditPatch, StudioEditRecord } from "./types";

/*
 * Undo/redo patches of Zen Studio source edits. Pure: no DOM, no React, type-only imports and erasable TypeScript, so
 * `node src/platform/studio/history.selftest.mjs` imports this file directly.
 *
 * A patch is the change from `before` to `after` as hunks of whole lines, each with unchanged lines above and below
 * it. On the exact recorded text a hunk is only checked where it was recorded. On a text changed outside the Studio it
 * applies only where its lines occur exactly once, line-aligned, with its lines above and its lines below each also
 * occurring exactly once; anything else is refused. An undo either restores the edit or does nothing: it never writes
 * into a look-alike, a copy pasted inside the edited lines, or the twin of a deleted block.
 */

/** Undo and redo each keep up to this many edits. */
export const HISTORY_LIMIT = 100;

/** Unchanged lines kept around a hunk at least, and at most when look-alikes force more. */
const CONTEXT_LINES = 2;
const MAX_CONTEXT_LINES = 12;
/** Above this many line pairs the middle of the file is one changed range (no LCS). */
const LCS_LIMIT = 4_000_000;

export type HistoryDirection = "undo" | "redo";

/** Lines with their line breaks (the last one may have none). "\r\n" files keep the "\r" in the line. */
const splitLines = (text: string) => text.match(/[^\n]*\n|[^\n]+$/g) ?? [];

/**
 * Where `needle` sits in `text` on whole lines (at most two places: callers only need to know whether there is exactly
 * one). It starts at a line start, at offset 0 when anchored at the start. It ends at a line end; a needle whose last
 * line has no line break ended its file, so it (like a needle anchored at the end) only matches at the end of the
 * text. An empty needle only matches an empty text.
 */
function occurrences(text: string, needle: string, atStart = false, atEnd = false): number[] {
  if (!needle) return text === "" ? [0] : [];
  if (atEnd || !needle.endsWith("\n")) {
    const at = text.length - needle.length;
    return at >= 0 && text.endsWith(needle) && (atStart ? at === 0 : at === 0 || text[at - 1] === "\n") ? [at] : [];
  }
  if (atStart) return text.startsWith(needle) ? [0] : [];
  const found: number[] = [];
  for (let index = text.indexOf(needle); index >= 0 && found.length < 2; index = text.indexOf(needle, index + 1)) {
    if (index === 0 || text[index - 1] === "\n") found.push(index);
  }
  return found;
}

const once = (text: string, needle: string) => occurrences(text, needle).length === 1;

/** Changed line ranges [aFrom, aTo) → [bFrom, bTo) between two line lists, in order, more than 4 equal lines apart. */
function changedRanges(a: string[], b: string[]): Array<[number, number, number, number]> {
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head += 1;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail += 1;
  const n = a.length - head - tail;
  const m = b.length - head - tail;
  const ranges: Array<[number, number, number, number]> = [];
  if (n > 0 && m > 0 && n * m <= LCS_LIMIT) {
    const lcs: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i -= 1) for (let j = m - 1; j >= 0; j -= 1) lcs[i][j] = a[head + i] === b[head + j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && a[head + i] === b[head + j]) { i += 1; j += 1; continue; }
      const fromA = i;
      const fromB = j;
      while ((i < n || j < m) && !(i < n && j < m && a[head + i] === b[head + j])) {
        if (j >= m || (i < n && lcs[i + 1][j] >= lcs[i][j + 1])) i += 1;
        else j += 1;
      }
      ranges.push([head + fromA, head + i, head + fromB, head + j]);
    }
  } else if (n > 0 || m > 0) ranges.push([head, head + n, head, head + m]);
  // Ranges at most 2 * CONTEXT_LINES unchanged lines apart become one.
  const merged: typeof ranges = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] - last[1] <= CONTEXT_LINES * 2) merged[merged.length - 1] = [last[0], range[1], last[2], range[3]];
    else merged.push([...range]);
  }
  return merged;
}

/**
 * The change from `before` to `after` as hunks of whole lines. Changes a few lines apart share a hunk; changes far
 * apart (an element and its example snippet) are separate hunks, so an outside edit between them never blocks undo.
 *
 * Context: two unchanged lines each side, grown (up to 12) until `above` on its own and `below` on its own each occur
 * exactly once, line-aligned, in both texts; then so does the whole hunk (`above + present + below`, present =
 * inserted on the undo side, removed on the redo side). Context that reaches the start of the file only matches
 * there (only when nothing shorter is unique); a hunk that ends the file has no `below` and only matches at the end.
 * A hunk whose context runs into a neighbouring hunk merges with it; one still not unique (the 12-line limit, the
 * end of the file) is `ambiguous` and applies only to the exact recorded text.
 */
export function makePatch(before: string, after: string): StudioEditPatch {
  const a = splitLines(before);
  const b = splitLines(after);
  const offsets = [0];
  for (const line of a) offsets.push(offsets[offsets.length - 1] + line.length);
  let ranges = changedRanges(a, b);
  // Context lines are unchanged lines, the same in both texts, but each must be unique in both.
  const unique = (context: string) => once(after, context) && once(before, context);

  for (;;) {
    const hunks: StudioEditHunk[] = [];
    let merge = -1;
    for (let k = 0; k < ranges.length && merge < 0; k += 1) {
      const [aFrom, aTo, bFrom, bTo] = ranges[k];
      // Unchanged lines up to the neighbouring hunks or the ends of the file.
      const roomAbove = aFrom - (k > 0 ? ranges[k - 1][1] : 0);
      const roomBelow = (k + 1 < ranges.length ? ranges[k + 1][0] : a.length) - aTo;
      const above = (lines: number) => a.slice(aFrom - lines, aFrom).join("");
      const below = (lines: number) => a.slice(aTo, aTo + lines).join("");

      let up = Math.min(CONTEXT_LINES, roomAbove);
      if (k === 0 && up === aFrom && aFrom >= 2) up = aFrom - 1;
      const upOk = () => (k === 0 && up === aFrom) || unique(above(up));
      while (!upOk() && up < Math.min(MAX_CONTEXT_LINES, roomAbove)) up += 1;
      let down = Math.min(CONTEXT_LINES, roomBelow);
      const downOk = () => down === 0 || unique(below(down));
      while (!downOk() && down < Math.min(MAX_CONTEXT_LINES, roomBelow)) down += 1;

      const ok = upOk() && downOk();
      if (!ok) {
        // The context stopped at a neighbouring hunk before the limit: one hunk with it, then try again.
        if (!upOk() && k > 0 && roomAbove < MAX_CONTEXT_LINES) merge = k - 1;
        else if (!downOk() && k + 1 < ranges.length && roomBelow < MAX_CONTEXT_LINES) merge = k;
        if (merge >= 0) break;
      }
      const removed = a.slice(aFrom, aTo).join("");
      const inserted = b.slice(bFrom, bTo).join("");
      hunks.push({ start: offsets[aFrom], removed, inserted, above: above(up), below: below(down), ambiguous: !ok });
    }
    if (merge < 0) return { hunks };
    const [first, second] = [ranges[merge], ranges[merge + 1]];
    ranges = [...ranges.slice(0, merge), [first[0], second[1], first[2], second[3]], ...ranges.slice(merge + 2)];
  }
}

/**
 * Where each hunk's present side (undo: `inserted`, redo: `removed`) sits in `text`, or null when any hunk cannot be
 * placed (the record is then dropped).
 *
 * `exact`: `text` is the recorded text of that side (its hash is the record's hashAfter for undo, hashBefore for
 * redo). Each hunk is then only checked at the offset it was recorded at. Otherwise a hunk applies only when it is not
 * ambiguous (a hunk without the flag comes from an older Studio and counts as ambiguous), the whole hunk occurs
 * exactly once, line-aligned, and so do its `above` and `below` lines on their own: a copy of them anywhere else (a
 * duplicate pasted inside the edited lines, say) refuses the record.
 */
export function locateHunks(text: string, patch: StudioEditPatch, direction: HistoryDirection, exact: boolean): number[] | null {
  const positions: number[] = [];
  let shift = 0;
  let presentEnd = 0;
  let needleEnd = 0;
  for (const [k, hunk] of patch.hunks.entries()) {
    const present = direction === "undo" ? hunk.inserted : hunk.removed;
    // The offset of the present side in the recorded text: hunks before this one already changed (undo) or not (redo).
    const expected = hunk.start + (direction === "undo" ? shift : 0);
    if (direction === "undo") shift += hunk.inserted.length - hunk.removed.length;
    const needle = hunk.above + present + hunk.below;
    let at: number;
    if (exact) {
      const from = expected - hunk.above.length;
      if (from < 0 || !text.startsWith(needle, from) || (from > 0 && text[from - 1] !== "\n")) return null;
      at = expected;
    } else {
      if (hunk.ambiguous !== false) return null;
      const atStart = k === 0 && hunk.start === hunk.above.length;
      const atEnd = hunk.below === "";
      const found = occurrences(text, needle, atStart, atEnd);
      if (found.length !== 1) return null;
      if (hunk.above && !atStart && !once(text, hunk.above)) return null;
      if (hunk.below && !once(text, hunk.below)) return null;
      at = found[0] + hunk.above.length;
    }
    // In file order, and no hunk's lines (context included) reach into another hunk's present lines.
    if (at - hunk.above.length < presentEnd || at < needleEnd) return null;
    presentEnd = at + present.length;
    needleEnd = presentEnd + hunk.below.length;
    positions.push(at);
  }
  return positions;
}

/** Applies the hunks at `positions` (from `locateHunks`), back to front. */
export function applyHunks(text: string, patch: StudioEditPatch, positions: number[], direction: HistoryDirection): string {
  let next = text;
  for (let k = patch.hunks.length - 1; k >= 0; k -= 1) {
    const hunk = patch.hunks[k];
    const present = direction === "undo" ? hunk.inserted : hunk.removed;
    const restore = direction === "undo" ? hunk.removed : hunk.inserted;
    next = next.slice(0, positions[k]) + restore + next.slice(positions[k] + present.length);
  }
  return next;
}

/**
 * The text before an edit, rebuilt from the text after it; null when the patch does not sit there any more. `exact`:
 * `after` is the edit's recorded result (its hash is the record's hashAfter).
 */
export function textBeforeEdit(after: string, patch: StudioEditPatch, exact = false): string | null {
  const positions = locateHunks(after, patch, "undo", exact);
  return positions ? applyHunks(after, patch, positions, "undo") : null;
}

const isHunk = (value: unknown): value is StudioEditHunk => {
  const hunk = value as Partial<StudioEditHunk> | null;
  return Boolean(hunk) && typeof hunk!.start === "number" && typeof hunk!.removed === "string" && typeof hunk!.inserted === "string" && typeof hunk!.above === "string" && typeof hunk!.below === "string";
};

/**
 * Stored history records, made safe to use: patches with hunks stay (hunks from an older Studio carry no `ambiguous`
 * flag and so apply only to the exact recorded text); a single-hunk patch without context lines becomes an ambiguous
 * hunk (exact text only); whole before/after copies become patches; anything malformed is dropped.
 */
export function upgradeRecords(records: unknown): StudioEditRecord[] {
  if (!Array.isArray(records)) return [];
  return records.flatMap((item: unknown) => {
    const record = item as (Partial<StudioEditRecord> & { before?: unknown; after?: unknown }) | null;
    if (!record || typeof record.file !== "string" || typeof record.hashBefore !== "string" || typeof record.hashAfter !== "string") return [];
    const patch = record.patch as (Partial<StudioEditPatch> & { start?: unknown; removed?: unknown; inserted?: unknown }) | undefined;
    if (patch && Array.isArray(patch.hunks)) return patch.hunks.every(isHunk) ? [record as StudioEditRecord] : [];
    if (patch && typeof patch.start === "number" && typeof patch.removed === "string" && typeof patch.inserted === "string") {
      const hunk: StudioEditHunk = { start: patch.start, removed: patch.removed, inserted: patch.inserted, above: "", below: "", ambiguous: true };
      return [{ ...record, patch: { hunks: [hunk] } } as StudioEditRecord];
    }
    if (typeof record.before !== "string" || typeof record.after !== "string") return [];
    const { before, after, ...rest } = record;
    return [{ ...rest, patch: makePatch(before, after) } as StudioEditRecord];
  });
}
