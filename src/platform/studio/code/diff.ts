/** Unified-diff marks for the code view: `added` = 1-based lines of `after`; each removed block shows after line `after` (0 = above line 1). */
export type LineChanges = { added: number[]; removed: Array<{ after: number; lines: string[] }> };

/** Above this many cells (middle lines before × after) the middle counts as replaced instead of being diffed. */
const MAX_CELLS = 2000 * 2000;

const splitLines = (text: string) => text.split(/\r\n|\n|\r/);

type Step = { kind: "same"; oldIndex: number; newIndex: number } | { kind: "removed"; oldIndex: number; newIndex: number } | { kind: "added"; newIndex: number };

/**
 * Line alignment of two texts: common prefix and suffix trimmed, then an LCS walk of the middle (indexes are 0-based
 * into the whole line lists). `steps` is null when the middle is too big to diff (it then counts as replaced).
 */
function align(a: string[], b: string[]) {
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < a.length - prefix && suffix < b.length - prefix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) suffix += 1;
  const oldMiddle = a.slice(prefix, a.length - suffix);
  const newMiddle = b.slice(prefix, b.length - suffix);
  if (oldMiddle.length * newMiddle.length > MAX_CELLS) return { prefix, suffix, oldMiddle, newMiddle, steps: null };

  // lcs[i * (m + 1) + j] = LCS length of oldMiddle[i..] and newMiddle[j..] (≤ 2000, fits 16 bits).
  const n = oldMiddle.length;
  const m = newMiddle.length;
  const width = m + 1;
  const lcs = new Uint16Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i * width + j] = oldMiddle[i] === newMiddle[j] ? lcs[(i + 1) * width + j + 1] + 1 : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1]);
    }
  }
  // Walk forward; on a tie the removal comes first, so a replaced line reads − old, + new.
  const steps: Step[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && oldMiddle[i] === newMiddle[j]) {
      steps.push({ kind: "same", oldIndex: prefix + i, newIndex: prefix + j });
      i += 1;
      j += 1;
    } else if (i < n && (j >= m || lcs[(i + 1) * width + j] >= lcs[i * width + j + 1])) {
      steps.push({ kind: "removed", oldIndex: prefix + i, newIndex: prefix + j });
      i += 1;
    } else {
      steps.push({ kind: "added", newIndex: prefix + j });
      j += 1;
    }
  }
  return { prefix, suffix, oldMiddle, newMiddle, steps };
}

/** Line changes from `before` to `after`: common prefix and suffix trimmed, then an LCS diff of the middle. */
export function lineChanges(before: string, after: string): LineChanges {
  const { prefix, oldMiddle, newMiddle, steps } = align(splitLines(before), splitLines(after));
  const changes: LineChanges = { added: [], removed: [] };
  const remove = (afterLine: number, line: string) => {
    const last = changes.removed[changes.removed.length - 1];
    if (last && last.after === afterLine) last.lines.push(line);
    else changes.removed.push({ after: afterLine, lines: [line] });
  };
  if (!steps) {
    oldMiddle.forEach((line) => remove(prefix, line));
    newMiddle.forEach((_, index) => changes.added.push(prefix + index + 1));
    return changes;
  }
  for (const step of steps) {
    if (step.kind === "removed") remove(step.newIndex, oldMiddle[step.oldIndex - prefix]);
    else if (step.kind === "added") changes.added.push(step.newIndex + 1);
  }
  return changes;
}

/**
 * Where a line of `before` sits in `after` (1-based both): its new number when the line is unchanged, null when it was
 * removed or changed (or the change is too big to diff line by line).
 */
export function mapLine(before: string, after: string, line: number): number | null {
  if (before === after) return line;
  const a = splitLines(before);
  const b = splitLines(after);
  if (!Number.isInteger(line) || line < 1 || line > a.length) return null;
  const index = line - 1;
  const { prefix, suffix, steps } = align(a, b);
  if (index < prefix) return line;
  if (index >= a.length - suffix) return line + (b.length - a.length);
  if (!steps) return null;
  for (const step of steps) {
    if (step.kind !== "added" && step.oldIndex === index) return step.kind === "same" ? step.newIndex + 1 : null;
  }
  return null;
}

/**
 * The changed block around line `line` of `before` (1-based): the lines between the nearest unchanged lines above and
 * below it, in both texts (`before` and `after`: [first, last] 1-based, last < first when the block is empty there).
 * Null when the line is unchanged or the change is too big to diff line by line.
 */
export function changedBlockOf(before: string, after: string, line: number): { before: [number, number]; after: [number, number] } | null {
  if (before === after) return null;
  const a = splitLines(before);
  const b = splitLines(after);
  if (!Number.isInteger(line) || line < 1 || line > a.length) return null;
  const { prefix, suffix, steps } = align(a, b);
  const index = line - 1;
  if (index < prefix || index >= a.length - suffix || !steps) return null;
  // Old line → new line for the unchanged lines (prefix and suffix included).
  const same = new Map<number, number>();
  for (let i = 0; i < prefix; i += 1) same.set(i, i);
  for (let i = a.length - suffix; i < a.length; i += 1) same.set(i, i + (b.length - a.length));
  for (const step of steps) if (step.kind === "same") same.set(step.oldIndex, step.newIndex);
  if (same.has(index)) return null;
  let up = index - 1;
  while (up >= 0 && !same.has(up)) up -= 1;
  let down = index + 1;
  while (down < a.length && !same.has(down)) down += 1;
  const newUp = up >= 0 ? same.get(up)! : -1;
  const newDown = down < a.length ? same.get(down)! : b.length;
  return { before: [up + 2, down], after: [newUp + 2, newDown] };
}
