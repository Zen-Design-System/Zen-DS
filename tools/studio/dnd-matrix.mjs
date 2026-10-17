#!/usr/bin/env node
// Drag-and-drop matrix for builder pages (user, 2026-10-17: "test hết mọi case kéo thả … hơn 10,000 case"): every
// Assets item dropped at every place of a set of seed pages, and every layer moved to every place, through the engine
// the Studio runs in the browser (editDoc → applyOps, as builder/localApi.ts localEdit). Each case is judged:
//   - an accepted drop must leave a valid page (validateDialect), with the new layer there once more and nothing lost;
//   - a refusal must say why in words (no "undefined", no stack);
//   - the drag's op (pasteCode) and the click's / MCP's op (insertChild) must agree on the same place;
//   - Zen's page rules: a Top / Bottom Navigation, Sidebar or AppShell never lands in a Screen's content (a Screen's bars
//     hold them), nothing lands on the Board outside a frame.
// The browser half (real pointer drags, Play scroll) is the opt-in E2E group dnd (tools/studio/e2e/scenarios/dnd.mjs).
// Run: node tools/studio/dnd-matrix.mjs [--json=<file>] [--seed=<name>] [--limit=<n>]
import fs from "node:fs";
import { eachElement, newPageText, parsePage, validateDialect } from "./dialect.mjs";
import { childless, codeOfItem, components, edit, FILE, grow, items, resetDocs } from "./dnd-engine.mjs";

const flag = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

/* ── seed pages ─────────────────────────────────────────────────────────────────────────────────────────────────── */

function seeds() {
  const list = [];
  const phone = newPageText({ title: "Phone", device: "phone", chrome: true });
  let rich = phone;
  for (const id of ["list-box", "card", "grid", "input-field", "metric-card", "bar-chart"]) {
    const code = codeOfItem(id);
    if (!code) throw new Error(`seed: no Assets item ${id}`);
    rich = grow(rich, "Stack", code);
  }
  rich = grow(rich, "Stack", '<Box padding="md" height={160} />');
  rich = grow(rich, "Box", '<Shape type="rectangle" position="absolute" insetLeft={24} insetTop={24} width={64} height={64} />');
  list.push({ name: "phone-rich", text: rich });
  list.push({ name: "phone-empty", text: newPageText({ title: "Empty", device: "phone", empty: true }) });
  list.push({ name: "phone-plain", text: newPageText({ title: "Plain", device: "phone", chrome: false }) });
  list.push({ name: "desktop", text: newPageText({ title: "Desk", device: "desktop", chrome: true }) });
  list.push({ name: "tablet", text: newPageText({ title: "Tab", device: "tablet", chrome: true }) });
  return list;
}

/* ── places a drop can go ───────────────────────────────────────────────────────────────────────────────────────── */

// A Screen's bars never land in its content; an AppShell lands on a Screen only. A Sidebar in content is allowed (no
// rule says otherwise yet: BACKLOG question), counted apart.
const CHROME = new Set(["TopNavigation", "BottomNavigation"]);
/** Every element, its parents, and whether it sits in a Screen bar (a prop) rather than in the content. */
function elementsOf(text) {
  const out = [];
  const board = parsePage(text, { components }).board;
  eachElement(board, (node, parents) => {
    const holder = parents[parents.length - 1];
    const inProp = holder ? !holder.children?.some((child) => child === node || (child.kind === "map" && child.node === node)) : false;
    out.push({ node, parents, inProp });
  });
  return out;
}

/** The places of `text`: into each element (before each child, after the last, into an empty one). */
function placesOf(text) {
  const places = [];
  for (const { node, parents, inProp } of elementsOf(text)) {
    if (node.name === "Board") continue;
    const kids = (node.children ?? []).filter((child) => child.kind === "element");
    const where = { parent: node, parents, inProp };
    if (!kids.length) places.push({ ...where, index: 0 });
    kids.forEach((kid, index) => places.push({ ...where, index, before: kid.loc }));
    if (kids.length) places.push({ ...where, index: kids.length, after: kids[kids.length - 1].loc });
  }
  // The Board itself (outside every frame).
  const board = parsePage(text, { components }).board;
  places.push({ parent: board, parents: [], inProp: false, index: board.children.filter((child) => child.kind === "element").length, after: board.children.filter((child) => child.kind === "element").at(-1)?.loc });
  return places;
}

/* ── judging ────────────────────────────────────────────────────────────────────────────────────────────────────── */

const count = (text, name) => (text.match(new RegExp(`<${name}[\\s/>]`, "g")) ?? []).length;
const tagsOf = (text) => {
  const tags = new Map();
  for (const match of text.matchAll(/<([A-Z]\w*)[\s/>]/g)) tags.set(match[1], (tags.get(match[1]) ?? 0) + 1);
  return tags;
};
const wordy = (message) => typeof message === "string" && message.trim().length > 8 && !/undefined|\[object|at \w+ \(|TypeError|ReferenceError/.test(message);
const inContent = (parents, node) => [...parents, node].some((step) => step.name === "Screen") && ![...parents, node].some((step) => step.name === "Overlay");

const findings = [];
let sidebarsInContent = 0;
let barsHoldingOther = 0;
const allFindings = [];
const tally = { cases: 0, accepted: 0, refused: 0, findings: 0, byKind: {} };
const note = (kind, detail) => {
  tally.findings += 1;
  tally.byKind[kind] = (tally.byKind[kind] ?? 0) + 1;
  allFindings.push({ kind, ...detail, parents: undefined, where: undefined });
  if ((tally.byKind[kind] ?? 0) <= 25) findings.push({ kind, ...detail });
};
const reasons = new Map();
const refusal = (message) => {
  const key = message.replace(/<[^>]+>/g, "<…>").replace(/\d+:\d+/g, "L:C").slice(0, 140);
  reasons.set(key, (reasons.get(key) ?? 0) + 1);
};

function judgeAccepted(seed, before, after, rootName, where, label) {
  const issues = validateDialect(after, { components });
  if (issues.length) note("accepted-invalid-page", { seed, label, where, issue: issues[0]?.message ?? String(issues[0]) });
  if (rootName && count(after, rootName) <= count(before, rootName)) note("accepted-but-missing", { seed, label, where });
  const lost = [...tagsOf(before)].filter(([name, n]) => (tagsOf(after).get(name) ?? 0) < n);
  if (lost.length) note("accepted-lost-layers", { seed, label, where, lost: lost.map(([name]) => name) });
  if (rootName && CHROME.has(rootName) && inContent(where.parents, where.parent)) note("chrome-in-content", { seed, label, where });
  const holds = (where.parent.children ?? []).some((child) => child.kind === "element" || child.kind === "map");
  if (rootName === "AppShell" && (where.parent.name !== "Screen" || holds)) note("app-shell-nested", { seed, label, where });
  if (rootName === "Sidebar" && inContent(where.parents, where.parent)) sidebarsInContent += 1;
  if (where.parent.name === "Board" && rootName !== "Screen" && rootName !== "Overlay") note("board-holds-layer", { seed, label });
}

const describe = (place) => `${place.parent.name}@${place.parent.loc}${place.inProp ? " (bar)" : ""} #${place.index}`;

/* ── run ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const started = Date.now();
const only = flag("seed");
const limit = Number(flag("limit") ?? Infinity);
for (const item of items) if (item.crash) note("item-code-crash", { item: item.id, error: item.crash });

for (const seed of seeds().filter((one) => !only || one.name === only)) {
  resetDocs();
  const places = placesOf(seed.text);
  // 1. Assets drops: the drag (pasteCode beside a child / into the parent) and the click / MCP path (insertChild).
  for (const item of items) {
    if (!item.code) continue;
    for (const place of places) {
      if (tally.cases >= limit) break;
      const where = { parent: place.parent, parents: place.parents, inProp: place.inProp, index: place.index };
      const paste = { op: "pasteCode", code: item.code, ...(place.before ? { before: place.before } : place.after ? { after: place.after } : {}) };
      const a = edit(seed.text, FILE, { loc: place.parent.loc, name: place.parent.name, ops: [paste] });
      const b = edit(seed.text, FILE, { loc: place.parent.loc, name: place.parent.name, ops: [{ op: "insertChild", code: item.code, index: place.index }] });
      for (const [op, result] of [["pasteCode", a], ["insertChild", b]]) {
        tally.cases += 1;
        if (result.crash) { note("crash", { seed: seed.name, label: `${op} ${item.id}`, where: describe(place), error: result.crash.slice(0, 300) }); continue; }
        if (result.text) { tally.accepted += 1; judgeAccepted(seed.name, seed.text, result.text, item.root, where, `${op} ${item.id} → ${describe(place)}`); }
        else {
          tally.refused += 1;
          refusal(result.error ?? "");
          if (!wordy(result.error)) note("refusal-without-words", { seed: seed.name, label: `${op} ${item.id} → ${describe(place)}`, error: result.error });
        }
      }
      // By design a drag opens only a layout's empty tag (arrange.mjs OPENABLE), while insertChild (the MCP) may fill
      // any component whose API takes children (a ListItem's): not a disagreement.
      const byDesign = !a.text && b.text && /has no children to drop into/.test(a.error ?? "") && !childless.has(place.parent.name);
      if (Boolean(a.text) !== Boolean(b.text) && !a.crash && !b.crash && !byDesign) note("drag-and-click-disagree", { seed: seed.name, label: `${item.id} → ${describe(place)}`, paste: a.text ? "ok" : a.error, insert: b.text ? "ok" : b.error });
    }
  }
  // 2. A Screen's bars (Assets › Top / Bottom navigation dragged to a Screen's top or foot, MCP insert with `prop`): into
  // an empty bar (insertChild prop), in place of the bar there (replaceElement). Any item is tried: only a bar's own
  // component belongs there.
  for (const screen of elementsOf(seed.text).filter(({ node }) => node.name === "Screen")) {
    for (const prop of ["topNavigation", "bottomNavigation"]) {
      const current = screen.node.props[prop]?.kind === "element" ? screen.node.props[prop].node : null;
      for (const item of items) {
        if (!item.code || tally.cases >= limit) continue;
        tally.cases += 1;
        const result = current
          ? edit(seed.text, FILE, { loc: current.loc, name: current.name, ops: [{ op: "replaceElement", code: item.code }] })
          : edit(seed.text, FILE, { loc: screen.node.loc, name: "Screen", ops: [{ op: "insertChild", prop, code: item.code }] });
        const label = `${current ? "replace" : "add"} ${prop} ← ${item.id} on ${screen.node.loc}`;
        const own = (prop === "topNavigation" ? "TopNavigation" : "BottomNavigation") === item.root;
        if (result.crash) { note("crash", { seed: seed.name, label, error: result.crash.slice(0, 300) }); continue; }
        if (!result.text) {
          tally.refused += 1;
          refusal(result.error ?? "");
          if (own) note("bar-refused", { seed: seed.name, label, error: result.error });
          continue;
        }
        tally.accepted += 1;
        const issues = validateDialect(result.text, { components });
        if (issues.length) note("accepted-invalid-page", { seed: seed.name, label, issue: issues[0]?.message ?? String(issues[0]) });
        // Another component in a bar (a custom header: a Search, a Stack) is the person's call, as in Figma: counted only.
        if (!own) barsHoldingOther += 1;
      }
    }
  }
  // 3. Moves: each layer of the content to each place (and ⌥ copies of the first few).
  const layers = elementsOf(seed.text).filter(({ node, inProp }) => !inProp && !["Board", "Screen"].includes(node.name));
  for (const layer of layers) {
    for (const place of places) {
      if (tally.cases >= limit) break;
      for (const copy of [false, true]) {
        if (copy && place.index % 2) continue;
        tally.cases += 1;
        const op = { op: "moveTo", parent: place.parent.loc, ...(place.before ? { before: place.before } : place.after ? { after: place.after } : {}), ...(copy ? { copy } : {}) };
        const result = edit(seed.text, FILE, { loc: layer.node.loc, name: layer.node.name, ops: [op] });
        const label = `${copy ? "copy" : "move"} ${layer.node.name}@${layer.node.loc} → ${describe(place)}`;
        if (result.crash) { note("crash", { seed: seed.name, label, error: result.crash.slice(0, 300) }); continue; }
        if (!result.text) {
          tally.refused += 1;
          refusal(result.error ?? "");
          if (!wordy(result.error)) note("refusal-without-words", { seed: seed.name, label, error: result.error });
          continue;
        }
        tally.accepted += 1;
        const issues = validateDialect(result.text, { components });
        if (issues.length) note("accepted-invalid-page", { seed: seed.name, label, issue: issues[0]?.message ?? String(issues[0]) });
        const before = tagsOf(seed.text);
        const after = tagsOf(result.text);
        const changed = [...new Set([...before.keys(), ...after.keys()])].filter((name) => (after.get(name) ?? 0) !== (before.get(name) ?? 0) * 1 && !copy);
        if (changed.length) note("move-changed-layers", { seed: seed.name, label, changed });
        if (CHROME.has(layer.node.name) && inContent(place.parents, place.parent)) note("chrome-in-content", { seed: seed.name, label });
      }
    }
  }
}

const ms = Date.now() - started;
const top = [...reasons].sort((a, b) => b[1] - a[1]).slice(0, 20);
console.log(`dnd-matrix: ${tally.cases} cases in ${(ms / 1000).toFixed(1)}s · ${tally.accepted} accepted · ${tally.refused} refused · ${tally.findings} findings`);
for (const [kind, n] of Object.entries(tally.byKind).sort((a, b) => b[1] - a[1])) console.log(`  ${kind}: ${n}`);
// Grouped: one line per kind and target (parent name), with one example.
const grouped = new Map();
for (const finding of allFindings) {
  const target = String(finding.label ?? finding.item ?? "").replace(/^.*→ /, "").replace(/@\d+:\d+/, "").replace(/ #\d+$/, "");
  const key = `${finding.kind} · ${target}`;
  const entry = grouped.get(key) ?? { n: 0, example: finding };
  entry.n += 1;
  grouped.set(key, entry);
}
console.log("Findings by kind and target:");
for (const [key, { n, example }] of [...grouped].sort((a, b) => b[1].n - a[1].n).slice(0, 60)) console.log(`  ${n} × ${key} — e.g. ${example.seed ?? ""} ${example.label ?? ""}${example.issue ? ` · ${example.issue}` : ""}${example.error ? ` · ${String(example.error).slice(0, 140)}` : ""}${example.paste ? ` · paste: ${String(example.paste).slice(0, 80)} | insert: ${String(example.insert).slice(0, 80)}` : ""}${example.changed ? ` · changed ${example.changed}` : ""}${example.lost ? ` · lost ${example.lost}` : ""}`);
if (process.argv.includes("--verbose")) for (const finding of findings.slice(0, 40)) console.log(`  · ${finding.kind} · ${finding.seed ?? ""} · ${finding.label ?? finding.item ?? ""}${finding.issue ? ` · ${finding.issue}` : ""}${finding.error ? ` · ${String(finding.error).slice(0, 160)}` : ""}${finding.lost ? ` · lost ${finding.lost}` : ""}${finding.changed ? ` · changed ${finding.changed}` : ""}${finding.paste ? ` · paste: ${String(finding.paste).slice(0, 90)} | insert: ${String(finding.insert).slice(0, 90)}` : ""}`);
console.log(`Allowed, counted: a Sidebar in a Screen's content ${sidebarsInContent} · another component in a Screen bar ${barsHoldingOther}`);
console.log("Refusals (most common):");
for (const [message, n] of top) console.log(`  ${n} × ${message}`);
const out = flag("json");
if (out) fs.writeFileSync(out, JSON.stringify({ tally, findings, refusals: Object.fromEntries(reasons) }, (key, value) => (key === "parents" ? undefined : key === "parent" && value?.loc ? `${value.name}@${value.loc}` : value), 2));
process.exitCode = tally.byKind.crash || tally.byKind["accepted-invalid-page"] || tally.byKind["accepted-lost-layers"] ? 1 : 0;
