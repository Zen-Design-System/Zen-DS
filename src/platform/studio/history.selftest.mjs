#!/usr/bin/env node
// Zen Studio undo-history selftest: makePatch / locateHunks / applyHunks / textBeforeEdit / upgradeRecords from
// ./history.ts (imported directly: Node strips the types), without a server or a browser.
//   node src/platform/studio/history.selftest.mjs [--cases=20000] [--seed=7]   summary; exit 1 on any failure
// The fuzz runs `cases` undos and as many redos. Each one either restores exactly (the text before the edit, with
// whatever else changed in the file kept) or refuses; a write anywhere else is a failure.
import { HISTORY_LIMIT, applyHunks, locateHunks, makePatch, textBeforeEdit, upgradeRecords } from "./history.ts";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => arg.replace(/^--/, "").split("=")));
const CASES = Number(args.cases ?? 20000);
const SEED = Number(args.seed ?? 7);

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}
const ok = (label, condition) => check(label, Boolean(condition), true);
const lines = (...rows) => `${rows.join("\n")}\n`;

/** The Studio's undo/redo of one record on `text`: the new text, or null when refused. `exact`: the hash matched. */
function step(text, patch, direction, exact) {
  const positions = locateHunks(text, patch, direction, exact);
  return positions ? applyHunks(text, patch, positions, direction) : null;
}
/** As the Studio decides it: exact when the file is the recorded text of that side (same hash). */
const undo = (text, record) => step(text, record.patch, "undo", text === record.after);
const redo = (text, record) => step(text, record.patch, "redo", text === record.before);
const record = (before, after) => ({ before, after, patch: makePatch(before, after) });
/** Every line of `text` is a whole line of one of `sources` (nothing glued together, nothing cut). */
const noGlue = (text, ...sources) => {
  const known = new Set(sources.flatMap((source) => source.split(/\r?\n/)));
  return text.split(/\r?\n/).every((line) => known.has(line));
};

check("history limit", HISTORY_LIMIT, 100);

/* ── look-alike removeProp: two identical Buttons, attributes on their own lines ─────────────────────────────────── */
const button = (attrs, label = "Save") => ["      <Button", ...attrs.map((attr) => `        ${attr}`), "      >", `        ${label}`, "      </Button>"];
const actions = (...buttons) => lines("export function Actions() {", "  return (", '    <Stack direction="row">', ...buttons.flat(), "    </Stack>", "  );", "}");
const LEVEL = 'level="primary"';
const SIZE = 'size="sm"';
{
  const before = actions(button([LEVEL, SIZE]), button([LEVEL, SIZE]));
  const first = record(before, actions(button([LEVEL]), button([LEVEL, SIZE])));
  check("look-alike: one unique hunk", first.patch.hunks.map((hunk) => hunk.ambiguous), [false]);
  check("look-alike: exact undo", undo(first.after, first), before);
  check("look-alike: exact redo", redo(before, first), first.after);
  // A peer edits the edited Button's other lines: refuse (never the twin).
  check("look-alike: undo after its level changed", undo(actions(button(['level="secondary"']), button([LEVEL, SIZE])), first), null);
  check("look-alike: undo after its label changed", undo(actions(button([LEVEL], "Send"), button([LEVEL, SIZE])), first), null);
  // After the undo, the same peer edit: redo must not strip the second Button's size.
  check("look-alike: redo after its level changed", redo(actions(button(['level="secondary"', SIZE]), button([LEVEL, SIZE])), first), null);
  check("look-alike: redo after its label changed", redo(actions(button([LEVEL, SIZE], "Send"), button([LEVEL, SIZE])), first), null);
  // The same on the second Button.
  const second = record(before, actions(button([LEVEL, SIZE]), button([LEVEL])));
  check("look-alike #2: undo after its label changed", undo(actions(button([LEVEL, SIZE]), button([LEVEL], "Send")), second), null);
  check("look-alike #2: redo after its level changed", redo(actions(button([LEVEL, SIZE]), button(['level="secondary"', SIZE])), second), null);
  // An edit elsewhere in the file is kept.
  check("look-alike: undo keeps an outside edit", undo(`// note\n${first.after}`, first), `// note\n${before}`);
  check("look-alike: redo keeps an outside edit", redo(`// note\n${before}`, first), `// note\n${first.after}`);
}

/* ── deleted edited block: its twin must not inherit the edit ─────────────────────────────────────────────────────── */
{
  // Removing the first Button's size makes both Buttons identical; a peer then deletes the edited one.
  const edit = record(actions(button([LEVEL, SIZE]), button([LEVEL])), actions(button([LEVEL]), button([LEVEL])));
  check("deleted block: undo refuses", undo(actions(button([LEVEL])), edit), null);
  // Two identical Buttons, the first loses its size; after the undo a peer deletes the first: redo refuses.
  const twins = record(actions(button([LEVEL, SIZE]), button([LEVEL, SIZE])), actions(button([LEVEL]), button([LEVEL, SIZE])));
  check("deleted block: redo refuses", redo(actions(button([LEVEL, SIZE])), twins), null);
  // The edited line itself deleted.
  check("deleted line: undo refuses", undo(actions(button([]), button([LEVEL])), edit), null);
}

/* ── shifted duplicate: a copy of the edited block now sits at the recorded offset ────────────────────────────────── */
{
  const page = (title) => lines("<Page>", "  <Card>", `    <Title>${title}</Title>`, "    <Body />", "  </Card>", "</Page>");
  const edit = record(page("One"), page("Two"));
  const card = (title) => `  <Card>\n    <Title>${title}</Title>\n    <Body />\n  </Card>\n`;
  const shifted = edit.after.replace(card("Two"), card("Two") + card("Two"));
  ok("shifted duplicate: the copy is at the recorded offset", shifted.indexOf("    <Title>Two") === edit.patch.hunks[0].start);
  check("shifted duplicate: undo refuses", undo(shifted, edit), null);
  const shiftedBefore = edit.before.replace(card("One"), card("One") + card("One"));
  check("shifted duplicate: redo refuses", redo(shiftedBefore, edit), null);
}

/* ── line alignment: a needle never matches inside a line (file-start glue) ──────────────────────────────────────── */
{
  const removeImport = record(lines('import a from "a";', "foo();", "bar();"), lines("foo();", "bar();"));
  const peer = lines("xfoo();", "bar();");
  const undone = undo(peer, removeImport);
  ok("file start: no glued lines on undo", undone === null || noGlue(undone, removeImport.before, peer));
  check("file start: undo refuses", undone, null);
  const addFirst = record(lines("b();", "c();"), lines("a();", "b();", "c();"));
  const peer2 = lines("xa();", "b();", "c();");
  check("file start: inserted first line, peer glued text before it", undo(peer2, addFirst), null);
  // Inside the file: the context's first line is now a suffix of a longer line.
  const middle = record(lines("// head", "keep();", "x();", "end();", "// tail"), lines("// head", "keep();", "end();", "// tail"));
  const peer3 = lines("// head", "dontkeep();", "end();", "// tail");
  const undone3 = undo(peer3, middle);
  ok("mid-line needle: no glued lines", undone3 === null || noGlue(undone3, middle.before, peer3));
  // A line prepended to the file does not block an edit a few lines down.
  const near = record(lines("a", "b", "c", "d", "e", "f"), lines("a", "b", "C", "d", "e", "f"));
  check("near the start: undo after a prepended line", undo(`z\n${near.after}`, near), `z\n${near.before}`);
}

/* ── CRLF ────────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const crlf = (...rows) => `${rows.join("\r\n")}\r\n`;
  const before = crlf('import { Button } from "zen";', "", "export const Actions = () => (", "  <Stack>", '    <Button level="primary">Save</Button>', '    <Button level="primary">Cancel</Button>', "  </Stack>", ");");
  const edit = record(before, before.replace('"primary">Save', '"secondary">Save'));
  check("crlf: undo keeps an outside edit", undo(`// note\r\n${edit.after}`, edit), `// note\r\n${before}`);
  check("crlf: redo keeps an outside edit", redo(`// note\r\n${before}`, edit), `// note\r\n${edit.after}`);
  // No final line break: the last line matches only at the end, so lines a peer appends after it refuse (no glue).
  const open = record("a\r\nb\r\nc", "a\r\nb\r\nC");
  check("crlf: undo of the last line, a line prepended", undo("z\r\na\r\nb\r\nC", open), "z\r\na\r\nb\r\nc");
  check("crlf: undo of the last line, a line appended", undo("a\r\nb\r\nC\r\nd", open), null);
  const appended = record("a\r\nb\r\nc", "a\r\nb\r\nc\r\nd");
  check("crlf: undo of an appended line, a line prepended", undo("z\r\na\r\nb\r\nc\r\nd", appended), "z\r\na\r\nb\r\nc");
  check("crlf: redo of an appended line, a line prepended", redo("z\r\na\r\nb\r\nc", appended), "z\r\na\r\nb\r\nc\r\nd");
  ok("crlf: no bare line feed", !undo(`// note\r\n${edit.after}`, edit).replace(/\r\n/g, "").includes("\n"));
}

/* ── no final line break ─────────────────────────────────────────────────────────────────────────────────────────── */
{
  // Each case: an edit elsewhere is kept; lines appended after the last line refuse (never glued, never a blank line).
  const cases = [
    ["the last line edited", "a\nb\nc", "a\nb\nC"],
    ["a line appended", "a\nb\nc", "a\nb\nc\nd"],
    ["the last line deleted", "a\nb\nc\nd", "a\nb\nc"],
    ["the final break removed", "a\nb\n", "a\nb"],
    ["the final break added", "a\nb", "a\nb\n"],
    ["a last line without a break inserted", "a\nb\n", "a\nb\nc"],
  ];
  for (const [name, beforeTail, afterTail] of cases) {
    // A few lines first: an edit on the first two lines is pinned to the start of the file (see makePatch).
    const [before, after] = [`x\ny\nw\n${beforeTail}`, `x\ny\nw\n${afterTail}`];
    const edit = record(before, after);
    check(`no final break, ${name}: exact undo`, undo(after, edit), before);
    check(`no final break, ${name}: exact redo`, redo(before, edit), after);
    check(`no final break, ${name}: undo, a line prepended`, undo(`z\n${after}`, edit), `z\n${before}`);
    check(`no final break, ${name}: redo, a line prepended`, redo(`z\n${before}`, edit), `z\n${after}`);
    const appendedAfter = after.endsWith("\n") ? `${after}e\n` : `${after}\ne`;
    const undone = undo(appendedAfter, edit);
    ok(`no final break, ${name}: undo, a line appended: refused or whole lines`, undone === null || noGlue(undone, before, appendedAfter));
    const appendedBefore = before.endsWith("\n") ? `${before}e\n` : `${before}\ne`;
    const redone = redo(appendedBefore, edit);
    ok(`no final break, ${name}: redo, a line appended: refused or whole lines`, redone === null || noGlue(redone, after, appendedBefore));
  }
  check("no final break: an appended line after the edited last line refuses", undo("a\nb\nC\nd", record("a\nb\nc", "a\nb\nC")), null);
}

/* ── two hunks (element + its snippet) with an outside edit between them ────────────────────────────────────────── */
{
  const filler = Array.from({ length: 10 }, (_, index) => `    // step ${index + 1}`);
  const file = (level, middle = filler) => lines(
    "export const examples = [",
    "  {",
    '    title: "Primary",',
    "    render: () => (",
    `      <Button level="${level}">Save</Button>`,
    "    ),",
    ...middle,
    "    code: `",
    `<Button level="${level}">Save</Button>`,
    "`,",
    "  },",
    "];",
  );
  const edit = record(file("primary"), file("secondary"));
  check("two hunks: both unique", edit.patch.hunks.map((hunk) => hunk.ambiguous), [false, false]);
  const peerMiddle = filler.map((line, index) => (index === 4 ? "    // changed by a peer" : line));
  const undone = undo(file("secondary", peerMiddle), edit);
  check("two hunks: undo restores both and keeps the outside edit", undone, file("primary", peerMiddle));
  check("two hunks: redo too", redo(undone, edit), file("secondary", peerMiddle));
}

/* ── exact-hash fast path ────────────────────────────────────────────────────────────────────────────────────────── */
{
  const rows = (edited) => lines(...Array.from({ length: 14 }, (_, index) => ["<Row>", index === edited ? "  <Cell wide />" : "  <Cell />", "</Row>"]).flat());
  const edit = record(rows(-1), rows(7));
  check("fast path: identical blocks leave the hunk ambiguous", edit.patch.hunks.map((hunk) => hunk.ambiguous), [true]);
  check("fast path: exact undo", undo(edit.after, edit), edit.before);
  check("fast path: exact redo", redo(edit.before, edit), edit.after);
  check("fast path: textBeforeEdit exact", textBeforeEdit(edit.after, edit.patch, true), edit.before);
  check("fast path: textBeforeEdit not exact refuses", textBeforeEdit(edit.after, edit.patch), null);
  check("fast path: ambiguous hunk refused after an outside edit", undo(`// note\n${edit.after}`, edit), null);
  // Exact claimed on a text whose hunk is not at the recorded offset: refused, never searched.
  check("fast path: exact but moved", step(`// note\n${edit.after}`, edit.patch, "undo", true), null);
}

/* ── records stored by an older Studio ───────────────────────────────────────────────────────────────────────────── */
{
  const before = lines("a", "b", "c", "d", "e");
  const after = lines("a", "b", "X", "d", "e");
  const base = { file: "src/x.tsx", label: "Edit", hashBefore: "h0", hashAfter: "h1", changed: { from: 3, to: 3 }, at: 0 };
  const [single] = upgradeRecords([{ ...base, patch: { start: 4, removed: "c\n", inserted: "X\n" } }]);
  check("old single hunk: ambiguous", single.patch.hunks[0].ambiguous, true);
  check("old single hunk: exact undo", step(after, single.patch, "undo", true), before);
  check("old single hunk: refused when not exact", step(`z\n${after}`, single.patch, "undo", false), null);
  const unflagged = { hunks: [{ start: 4, removed: "c\n", inserted: "X\n", above: "a\nb\n", below: "d\ne\n" }] };
  const [previous] = upgradeRecords([{ ...base, patch: unflagged }]);
  check("hunk without the flag: kept", previous.patch, unflagged);
  check("hunk without the flag: refused when not exact", step(`z\n${after}`, previous.patch, "undo", false), null);
  check("hunk without the flag: exact undo", step(after, previous.patch, "undo", true), before);
  const [copies] = upgradeRecords([{ ...base, before, after }]);
  check("whole copies: become a patch", copies.patch, makePatch(before, after));
  ok("whole copies: no copies kept", !("before" in copies) && !("after" in copies));
  check("malformed records dropped", upgradeRecords([null, { ...base, hashAfter: 1 }, { ...base, patch: { hunks: [{ start: "0" }] } }, { ...base }]).length, 0);
  check("not an array", upgradeRecords("x"), []);
}

/* ── fuzz ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Few distinct lines, so look-alikes are everywhere. Blank lines only in files that end with a line break (a blank
// last line and a missing final break would read the same).
const ALPHABET = ["<Button>", "</Button>", '  level="primary"', '  size="sm"', "  Save", "<Stack>", "</Stack>", "}", ""];
const render = (content, sep, trailing) => (trailing ? content.map((line) => line + sep).join("") : content.join(sep));
const contentOf = (text) => (text.match(/[^\n]*\n|[^\n]+$/g) ?? []).map((line) => line.replace(/\r?\n$/, ""));

/** Applies ordered, disjoint replacements { s, e, lines } (an empty P insertion may share a point with one). */
function replaceAll(content, ops) {
  const next = [...content];
  for (let k = ops.length - 1; k >= 0; k -= 1) next.splice(ops[k].s, ops[k].e - ops[k].s, ...ops[k].lines);
  return next;
}

/** Every single replacement (p0, p1, Q) that turns `from` into `to`. */
function* descriptions(from, to) {
  let prefix = 0;
  while (prefix < from.length && prefix < to.length && from[prefix] === to[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < from.length && suffix < to.length && from[from.length - 1 - suffix] === to[to.length - 1 - suffix]) suffix += 1;
  for (let p0 = 0; p0 <= prefix; p0 += 1) {
    for (let p1 = Math.max(p0, from.length - suffix); p1 <= from.length; p1 += 1) {
      const q = to.length - (from.length - p1) - p0;
      if (q >= 0) yield { s: p0, e: p1, lines: to.slice(p0, p0 + q) };
    }
  }
}

/**
 * The correct results of reversing `edit` (regions of `present` → their old lines) on `present` changed by `peer`:
 * one per description of the peer edit that stays clear of the edit's regions (two orders when both insert at one point).
 */
function* expectedResults(present, regions, peer) {
  const clash = (p, r) => Math.max(p.s, r.s) < Math.min(p.e, r.e) || (p.s === p.e && r.s < p.s && p.s < r.e) || (r.s === r.e && p.s < r.s && r.s < p.e);
  if (regions.some((region) => clash(peer, region))) return;
  const ops = [...regions, peer].sort((x, y) => x.s - y.s || x.e - y.e);
  yield replaceAll(present, ops);
  const tie = ops.findIndex((op, k) => k > 0 && op.s === op.e && ops[k - 1].s === ops[k - 1].e && op.s === ops[k - 1].s);
  if (tie > 0) yield replaceAll(present, [...ops.slice(0, tie - 1), ops[tie], ops[tie - 1], ...ops.slice(tie + 1)]);
}

/** The patch's own description of the edit, as content regions of the present side (undo: after, redo: before). */
function patchRegions(patch, presentText, direction) {
  let shift = 0;
  return patch.hunks.map((hunk) => {
    const present = direction === "undo" ? hunk.inserted : hunk.removed;
    const restore = direction === "undo" ? hunk.removed : hunk.inserted;
    const offset = hunk.start + (direction === "undo" ? shift : 0);
    if (direction === "undo") shift += hunk.inserted.length - hunk.removed.length;
    const s = (presentText.slice(0, offset).match(/\n/g) ?? []).length;
    return { s, e: s + contentOf(present).length, lines: contentOf(restore) };
  });
}

function fuzz(direction, cases, seed) {
  const rand = mulberry32(seed);
  const int = (max) => Math.floor(rand() * (max + 1));
  const stats = { cases: 0, exact: 0, restored: 0, refused: 0, wrong: 0, ambiguousHunks: 0, hunks: 0 };
  const examples = [];
  while (stats.cases < cases) {
    const trailing = rand() < 0.75;
    const sep = rand() < 0.2 ? "\r\n" : "\n";
    const alphabet = trailing ? ALPHABET : ALPHABET.filter(Boolean);
    const pick = () => alphabet[int(alphabet.length - 1)];
    const some = (max) => Array.from({ length: int(max) }, pick);
    // The edit: one or two replacements of the original content.
    const c0 = Array.from({ length: 1 + int(29) }, pick);
    const cuts = Array.from({ length: rand() < 0.7 ? 2 : 4 }, () => int(c0.length)).sort((x, y) => x - y);
    const edits = [];
    for (let k = 0; k < cuts.length; k += 2) edits.push({ s: cuts[k], e: cuts[k + 1], lines: some(3) });
    const c1 = replaceAll(c0, edits);
    if (c1.join("\n") === c0.join("\n") && c1.length === c0.length) continue;
    // Regions in both coordinates: in c0 (→ inserted lines) and in c1 (→ removed lines).
    let delta = 0;
    const inBefore = edits.map((edit) => ({ s: edit.s, e: edit.e, lines: edit.lines }));
    const inAfter = edits.map((edit) => {
      const region = { s: edit.s + delta, e: edit.s + delta + edit.lines.length, lines: c0.slice(edit.s, edit.e) };
      delta += edit.lines.length - (edit.e - edit.s);
      return region;
    });
    const before = render(c0, sep, trailing);
    const after = render(c1, sep, trailing);
    const patch = makePatch(before, after);
    stats.hunks += patch.hunks.length;
    stats.ambiguousHunks += patch.hunks.filter((hunk) => hunk.ambiguous).length;
    const [present, target, regions, presentText, targetText] = direction === "undo" ? [c1, c0, inAfter, after, before] : [c0, c1, inBefore, before, after];
    const ownRegions = patchRegions(patch, presentText, direction);
    if (render(replaceAll(present, ownRegions), sep, trailing) !== targetText) {
      failures.push(`fuzz ${direction}: the patch does not describe the edit\n    ${JSON.stringify({ before, after, patch })}`);
      return stats;
    }

    // A peer's edit of the present side: random, a copy of the edited block, the block deleted, or nothing.
    const mode = rand();
    let peer;
    const region = regions[int(regions.length - 1)];
    if (mode < 0.05) peer = { s: 0, e: 0, lines: [] };
    else if (mode < 0.45) {
      const s = int(present.length);
      peer = { s, e: Math.min(present.length, s + int(3)), lines: some(3) };
    } else if (mode < 0.75) {
      const from = Math.max(0, region.s - int(3));
      const at = int(present.length);
      peer = { s: at, e: at, lines: present.slice(from, Math.min(present.length, region.e + int(3))) };
    } else {
      peer = { s: Math.max(0, region.s - int(3)), e: Math.min(present.length, region.e + int(3)), lines: rand() < 0.5 ? [] : some(2) };
    }
    const changed = replaceAll(present, [peer]);
    if (!trailing && changed.length && changed[changed.length - 1] === "") continue;
    const text = render(changed, sep, trailing);
    const exact = text === presentText;
    stats.cases += 1;
    const result = step(text, patch, direction, exact);
    if (exact) {
      stats.exact += 1;
      if (result !== targetText) failures.push(`fuzz ${direction}: exact text not restored\n    ${JSON.stringify({ before, after, result })}`);
      continue;
    }
    if (result === null) { stats.refused += 1; continue; }
    let right = false;
    search: for (const own of [ownRegions, regions]) {
      for (const description of descriptions(present, changed)) {
        for (const expected of expectedResults(present, own, description)) {
          if (render(expected, sep, trailing) === result) { right = true; break search; }
        }
      }
    }
    if (right) stats.restored += 1;
    else {
      stats.wrong += 1;
      if (examples.length < 3) examples.push(JSON.stringify({ before, after, peerText: text, result }));
    }
  }
  if (stats.wrong) failures.push(`fuzz ${direction}: ${stats.wrong} wrong writes, e.g.\n    ${examples.join("\n    ")}`);
  else passed += 1;
  return stats;
}

const started = Date.now();
const undoStats = fuzz("undo", CASES, SEED);
const redoStats = fuzz("redo", CASES, SEED + 1);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
const line = (name, stats) => `${name}: ${stats.cases} cases — ${stats.exact} exact restored, ${stats.restored} restored with outside edits, ${stats.refused} refused, ${stats.wrong} wrong (${stats.ambiguousHunks}/${stats.hunks} hunks ambiguous)`;
console.log(`history selftest: ${passed} passed, ${failures.length} failed`);
console.log(`  fuzz ${line("undo", undoStats)}`);
console.log(`  fuzz ${line("redo", redoStats)}`);
console.log(`  fuzz time ${seconds}s, seed ${SEED}`);
if (failures.length) {
  for (const failure of failures) console.log(`✗ ${failure}`);
  process.exit(1);
}
