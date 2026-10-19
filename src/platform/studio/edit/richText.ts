/*
 * The words of a text layer as runs (Figma's mixed styles, F6b): each run is some words and the style they have of
 * their own (TextRun: bold, italic, underline, strikethrough, a tone, another text style); a run with none is plain text.
 * Pure: toggling a style over a range, merging, and the JSX children a Text is written with; `node
 * richText.selftest.mjs` runs it as is. The editor (RichTextEditor.tsx) reads runs from the canvas and writes them back.
 */

export type RunStyle = { bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean; tone?: string; textStyle?: string };
export type Run = RunStyle & { text: string };
export type ToggleKey = "bold" | "italic" | "underline" | "strikethrough";

const KEYS = ["bold", "italic", "underline", "strikethrough", "tone", "textStyle"] as const;

/** The style of a run without its words, with false / empty values left out. */
export function styleOf(run: RunStyle): RunStyle {
  const out: RunStyle = {};
  for (const key of KEYS) {
    const value = run[key];
    if (value) (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

const sameStyle = (a: RunStyle, b: RunStyle) => KEYS.every((key) => (a[key] || undefined) === (b[key] || undefined));
const isPlain = (run: RunStyle) => KEYS.every((key) => !run[key]);

/** Neighbours with the same style become one run; empty runs go. */
export function mergeRuns(runs: readonly Run[]): Run[] {
  const out: Run[] = [];
  for (const run of runs) {
    if (!run.text) continue;
    const last = out.at(-1);
    if (last && sameStyle(last, run)) last.text += run.text;
    else out.push({ ...styleOf(run), text: run.text });
  }
  return out;
}

/** The runs split so that `at` (a character offset) falls between two runs. */
function splitAt(runs: readonly Run[], at: number): Run[] {
  const out: Run[] = [];
  let offset = 0;
  for (const run of runs) {
    const end = offset + run.text.length;
    if (at > offset && at < end) {
      out.push({ ...run, text: run.text.slice(0, at - offset) }, { ...run, text: run.text.slice(at - offset) });
    } else out.push({ ...run });
    offset = end;
  }
  return out;
}

/**
 * Figma's ⌘B / ⌘I / ⌘U / ⇧⌘X on the words from `start` to `end`: when every one of them already has the style it goes,
 * else they all get it. An empty range changes nothing (the caret's next words are typed in the style around them).
 */
export function toggleStyle(runs: readonly Run[], start: number, end: number, key: ToggleKey): Run[] {
  if (end <= start) return mergeRuns(runs);
  const split = splitAt(splitAt(runs, start), end);
  let offset = 0;
  const inside: Run[] = [];
  for (const run of split) {
    if (offset >= start && offset + run.text.length <= end && run.text) inside.push(run);
    offset += run.text.length;
  }
  const on = !inside.every((run) => run[key]);
  offset = 0;
  const next = split.map((run) => {
    const within = offset >= start && offset + run.text.length <= end;
    offset += run.text.length;
    return within ? { ...run, [key]: on } : run;
  });
  return mergeRuns(next);
}

/** Every run's words, in order. */
export const textOf = (runs: readonly Run[]) => runs.map((run) => run.text).join("");

/** Whether the runs are one plain text (no word has a style of its own). */
export const isPlainText = (runs: readonly Run[]) => runs.every(isPlain);

/**
 * Words as JSX: a literal where JSX keeps them as they are (on one line, single spaces, edges included), else a string
 * expression ({"…"}: a line break, braces, angle brackets, an entity-like "&x", runs of spaces).
 */
function wordsCode(text: string): string {
  const literal = !/[\n{}<>]|&[A-Za-z#]|\s{2}/.test(text);
  return literal ? text : `{${JSON.stringify(text)}}`;
}

/** The JSX children a Text is written with for `runs`: words, and TextRun around the words with a style. */
export function runsCode(runs: readonly Run[]): string {
  return mergeRuns(runs).map((run) => {
    if (isPlain(run)) return wordsCode(run.text);
    const props = [
      run.bold ? "bold" : "",
      run.italic ? "italic" : "",
      run.underline ? "underline" : "",
      run.strikethrough ? "strikethrough" : "",
      run.tone ? `tone=${JSON.stringify(run.tone)}` : "",
      run.textStyle ? `textStyle=${JSON.stringify(run.textStyle)}` : "",
    ].filter(Boolean).join(" ");
    return `<TextRun ${props}>${wordsCode(run.text)}</TextRun>`;
  }).join("");
}
