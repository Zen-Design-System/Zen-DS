#!/usr/bin/env node
// Self-test of tools/studio/figma-diff.mjs (core rebuild M6, pulling a frame again): on the live Overviews read
// (fixtures/figma-overviews.json), a later pull where Figma renamed a heading, re-themed a Card, resized the Button,
// removed one card, added one and swapped two, against a page the Studio edited meanwhile (one edit on a spot Figma
// changed too). Three ways the Studio's edits stay and the conflict is flagged; two ways (no base) every difference shows.
// Run: node tools/studio/figma-diff.selftest.mjs
import fs from "node:fs";
import { validateDialect } from "./dialect.mjs";
import { docFromText, printPage } from "./doc.mjs";
import { figmaChanges, figmaSource, mergeFigma, sameFigmaSource } from "./figma-diff.mjs";
import { pageFromFigma, repoMapping } from "./figma-pull.mjs";
import { figmaPackage } from "./figma-push.mjs";
import { withBreakpointValue } from "./responsive-props.mjs";
import { NESTED_LAYERS } from "../../src/platform/studio/inspector/nestedLayers.generated.ts";

let passed = 0;
const failures = [];
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const ok = (label, value) => check(label, Boolean(value), true);

const live = JSON.parse(fs.readFileSync(new URL("./fixtures/figma-overviews.json", import.meta.url), "utf8"));
const mapping = await repoMapping();
// A pulled page as the Studio keeps it: imported from its print with ids (docFromText takes them).
const pageDoc = (frame) => docFromText(printPage(pageFromFigma(frame, { mapping }).doc, { ids: true })).doc;

/** A layer of the frame JSON by its Figma id (frames, instance slots and their layers, a table's rows, cells and parts). */
function layer(frame, id) {
  const stack = [frame];
  while (stack.length) {
    const node = stack.pop();
    if (node.id === id) return node;
    for (const key of ["children", "slots", "rows", "cells", "parts", "header"]) if (Array.isArray(node[key])) stack.push(...node[key]);
  }
  throw new Error(`no layer ${id}`);
}
/** An element of a document by id. */
function element(doc, id) {
  const stack = [doc.board];
  while (stack.length) {
    const node = stack.pop();
    if (node.id === id) return node;
    stack.push(...node.children.filter((child) => child.kind === "element"));
    for (const value of Object.values(node.props)) if (value.kind === "element") stack.push(value.node);
  }
  return null;
}

const GRID = "14243:64887";
const base = pageDoc(live.frame);

// The next pull: what changed in Figma.
const later = JSON.parse(JSON.stringify(live.frame));
layer(later, "I14243:64889;7063:62204;14240:50460").characters = "Foundations";
layer(later, "14243:64888").props.Theme = "Border";
layer(later, "14243:64886").props.Size = "Small";
const grid = layer(later, GRID);
grid.children = grid.children.filter((card) => card.id !== "14243:64892");
const templates = JSON.parse(JSON.stringify(layer(later, "14243:64891")).replaceAll("14243:64891", "14243:69999").replace('"characters":"Patterns"', '"characters":"Templates"').replace('"text":"Patterns"', '"text":"Templates"'));
templates.cell = { col: 3, row: 2, span: 2, rowSpan: 1 };
grid.children.push(templates);
// Foundation and Components swap places in the grid.
const foundation = layer(later, "14243:64889");
const components = layer(later, "14243:64888");
[foundation.cell, components.cell] = [components.cell, foundation.cell];
const incoming = pageDoc(later);

// The page meanwhile: the Studio re-themed the Components card (a spot Figma changed too), restyled the tagline and
// added a line of its own.
const current = JSON.parse(JSON.stringify(base));
element(current, "f14243-64888").props.theme = { kind: "literal", value: "flat" };
element(current, "f14243-64885").props.textStyle = { kind: "literal", value: "Display/2" };
element(current, "f14243-64884").children.push({ kind: "element", id: "nmine1", name: "Text", props: {}, children: [{ kind: "text", value: "Added in the Studio" }] });
// …and gave the Button a prototype action (option C: open an overlay by it), which Figma holds nowhere.
element(current, "f14243-64886").props.onClick = { kind: "proto", action: "open", args: ["pick-date"] };

check("the header names the frame", figmaSource(base.header), { file: "9nZv4uW2LT21yuHabMTCh1", node: "14243:64878" });
ok("two pulls of one frame match; another frame does not", sameFigmaSource(figmaSource(base.header), figmaSource(incoming.header)) && !sameFigmaSource(figmaSource(base.header), { file: "9nZv4uW2LT21yuHabMTCh1", node: "1:2" }));
check("a pull with nothing new in Figma: no change, whatever the Studio did", figmaChanges({ base, current, incoming: pageDoc(live.frame) }).changes.map((change) => change.key), []);

const { changes, threeWay } = figmaChanges({ base, current, incoming });
const keys = changes.map((change) => change.key).sort();
ok("three ways (a base)", threeWay);
check("what Figma changed, one change each", keys, [
  "add:f14243-69999",
  "order:f14243-64887",
  "prop:f14243-64886:size",
  "prop:f14243-64888:theme",
  "remove:f14243-64892",
  "text:fI14243-64889_7063-62204_14240-50460",
].sort());
check("the spot the Studio changed too is a conflict, the others are not", changes.filter((change) => change.conflict).map((change) => change.key), ["prop:f14243-64888:theme"]);
check("labels say what and where", [changes.find((change) => change.kind === "text").label, changes.find((change) => change.kind === "order").label, changes.find((change) => change.key === "prop:f14243-64888:theme").label], ["Text: “Foundation” → “Foundations”", "Grid (5 layers): its layers in Figma's new order", "Card “Components” · theme: default → “border”"]);
ok("a card added in Figma is labelled by its title", changes.find((change) => change.kind === "add").label === "Card “Templates” added");

const chosen = changes.filter((change) => !change.conflict);
const { doc: merged, skipped } = mergeFigma(current, incoming, chosen);
check("every chosen change lands", skipped, []);
const titles = element(merged, "f14243-64887").children.map((card) => element(merged, card.id)).map((card) => JSON.stringify(card).match(/"value":"(Foundations?|Components|Patterns|Resources & Tools|Development|Templates)"/)?.[1]);
check("the grid: swapped, Development gone, Templates added after the others (Figma's order)", titles, ["Components", "Foundations", "Patterns", "Resources & Tools", "Templates"]);
check("the Button takes Figma's new size", element(merged, "f14243-64886").props.size, { kind: "literal", value: "small" });
check("the unticked conflict keeps the Studio's theme", element(merged, "f14243-64888").props.theme, { kind: "literal", value: "flat" });
check("the Studio's own edits stay: the tagline's style, the line it added", [element(merged, "f14243-64885").props.textStyle.value, element(merged, "nmine1")?.children[0].value], ["Display/2", "Added in the Studio"]);
check("the Studio's prototype action stays through the pull (Figma holds none)", element(merged, "f14243-64886").props.onClick, { kind: "proto", action: "open", args: ["pick-date"] });
check("…and two ways (no base) it is no change either", figmaChanges({ current, incoming }).changes.filter((change) => change.name === "onClick").length, 0);
check("the merged page is valid dialect", validateDialect(printPage(merged)), []);
check("ticking the conflict too gives Figma's theme", element(mergeFigma(current, incoming, changes).doc, "f14243-64888").props.theme, { kind: "literal", value: "border" });

// Removed in Figma after the Studio changed it: a conflict.
{
  const edited = JSON.parse(JSON.stringify(base));
  element(edited, "f14243-64892").props.theme = { kind: "literal", value: "flat" };
  const removal = figmaChanges({ base, current: edited, incoming }).changes.find((change) => change.kind === "remove");
  ok("a layer Figma removed that the Studio edited is a conflict", removal?.conflict === true);
}
// Two ways (no base, another browser): every difference shows, none is a conflict.
{
  const two = figmaChanges({ current, incoming });
  ok("two ways: not three", !two.threeWay && two.changes.every((change) => !change.conflict));
  ok("two ways: the Studio's own restyle shows as a difference to choose", two.changes.some((change) => change.key === "prop:f14243-64885:textStyle"));
  ok("two ways: the Studio's added line is never removed", !two.changes.some((change) => change.id === "nmine1"));
}

// A pulled Table (fixtures/figma-table.json) whose second row Figma rejected: its rows and that row's Badge change.
{
  const table = JSON.parse(fs.readFileSync(new URL("./fixtures/figma-table.json", import.meta.url), "utf8"));
  const tableBase = pageDoc(table.frame);
  const next = JSON.parse(JSON.stringify(table.frame));
  const badge = layer(next, "I14730:78854;4035:10637;14730:78848;4081:18370;14730:78847;4035:11662;14730:78846");
  Object.assign(badge.props, { Text: "Rejected", Theme: "Red" });
  badge.text = "Rejected";
  const tableCell = layer(next, "I14730:78854;4035:10637;14730:78848");
  tableCell.texts = ["Rejected"];
  const tableNext = pageDoc(next);
  const found = figmaChanges({ base: tableBase, current: tableBase, incoming: tableNext });
  check("a table re-pulled: its rows and the row's Badge override change", found.changes.map((change) => change.key).sort(), ["prop:f14730-78798:overrides", "prop:f14730-78798:rows"]);
  check("a list of the same length is labelled as changed", found.changes.find((change) => change.name === "rows").label, "Table “Table rows” · rows: changed");
  const updated = element(mergeFigma(tableBase, tableNext, found.changes).doc, "f14730-78798");
  check("merged: row 2 rejected, its Badge red", [updated.props.rows.items[1].fields.status.value, updated.props.overrides.fields["Row[row-2]/status/Badge"].fields.theme.value], ["Rejected", "red"]);
}

// F6b. A word made bold in Figma (a styled segment): one text change, and the merge keeps the words and runs in order
//      (TextRun is part of its Text, never a layer of its own).
{
  const text = (segments) => ({ type: "FRAME", id: "1:1", name: "Plan", width: 800, layout: { mode: "VERTICAL", gap: 16, padding: [0, 0, 0, 0] }, children: [{ type: "TEXT", id: "1:2", characters: "Renews on Nov 2 for 3 seats", textStyle: "Body/Base/Regular", ...(segments ? { segments } : {}) }] });
  const plainDoc = pageDoc(text(null));
  const boldDoc = pageDoc(text([{ start: 10, end: 15, textStyle: "Body/Base/Bold" }]));
  const runChanges = figmaChanges({ base: plainDoc, current: JSON.parse(JSON.stringify(plainDoc)), incoming: boldDoc }).changes;
  check("a bold word from Figma: one text change, named for its styles", runChanges.map((change) => [change.kind, change.label]), [["text", "Text: “Renews on Nov 2 for 3 seats” text styles"]]);
  const mergedRuns = printPage(mergeFigma(JSON.parse(JSON.stringify(plainDoc)), boldDoc, runChanges).doc);
  ok("merged: the words and the run in their order", mergedRuns.includes("<Text>Renews on <TextRun bold>Nov 2</TextRun> for 3 seats</Text>"));
  check("a pull of the same runs again: no change", figmaChanges({ base: boldDoc, current: JSON.parse(JSON.stringify(boldDoc)), incoming: pageDoc(text([{ start: 10, end: 15, textStyle: "Body/Base/Bold" }])) }).changes.length, 0);
}

// F7. Per-breakpoint layout props (responsive-props.mjs; P2 of docs/research/studio-responsive-breakpoints-2026-10-26.md).
//     Figma has no breakpoints: a phone Screen pushes its mobile values and leaves out what hides on mobile; pulled back,
//     nothing changed; a designer's edit there changes only the mobile key, the others stay (a reset writes the prop's
//     own default), and hideOn is the Studio's own.
{
  const phonePage = `// @zen-page {"format":1,"title":"Responsive"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Box, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board data-zen-id="f1">
      <Screen id="screen-1" title="Home" device="phone" data-zen-id="f2">
        <Stack data-zen-id="f3">
          <Stack direction={{ desktop: "row", mobile: "column" }} gap={{ desktop: "lg", mobile: "sm" }} padding={{ desktop: "xl", mobile: "md" }} data-zen-id="f4">
            <Text data-zen-id="f5">One</Text>
            <Text data-zen-id="f6">Two</Text>
          </Stack>
          <Box hideOn={["mobile"]} data-zen-id="f7">
            <Text data-zen-id="f8">Aside</Text>
          </Box>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
  const current = docFromText(phonePage).doc;
  const { pkg } = figmaPackage(phonePage, { mapping, nestedLayers: NESTED_LAYERS, page: { id: "responsive", title: "Responsive" } });
  const placed = { ...pkg.frame, page: "responsive", version: "v1" };
  const base = pageFromFigma(placed, { mapping }).doc;
  const row = (doc) => element(doc, "f4");
  check("responsive: the pull of the phone push holds the mobile values (gap Small, padding Medium, a column) and no hidden Box", [row(base).props.gap?.value, row(base).props.padding?.value, row(base).props.direction, Boolean(element(base, "f7"))], ["sm", "md", undefined, false]);
  check("responsive: the frame as placed is no change, three ways and two (no base)", [figmaChanges({ base, current, incoming: base, synced: current }).changes.map((change) => change.label), figmaChanges({ current, incoming: base }).changes.map((change) => change.label)], [[], []]);
  // The designer: the row's gap to XSmall and its padding off.
  const edited = JSON.parse(JSON.stringify(placed));
  const rowFrame = (function find(node) { return node.key === "f4" ? node : (node.children ?? []).map(find).find(Boolean) ?? null; })(edited);
  Object.assign(rowFrame.layout, { gap: 8, gapVar: "Spacing/Gap/XSmall", padding: [0, 0, 0, 0], paddingVar: null });
  const incoming = pageFromFigma(edited, { mapping }).doc;
  const { changes: responsive } = figmaChanges({ base, current, incoming, synced: current });
  check("responsive: Figma's edits are changes on Mobile only", responsive.map((change) => `${change.kind}${change.conflict ? "!" : ""}: ${change.label}`), [
    "prop: Stack (2 layers) · gap on Mobile: “sm” → “xs”",
    "prop: Stack (2 layers) · padding on Mobile: “md” → default",
  ]);
  const merged = printPage(mergeFigma(current, incoming, responsive).doc);
  ok("responsive: merged, the mobile keys take Figma's values (a reset its default) and the desktop keys, direction and hideOn stay",
    ['direction={{ desktop: "row", mobile: "column" }}', 'gap={{ desktop: "lg", mobile: "xs" }}', 'padding={{ desktop: "xl", mobile: "none" }}', 'hideOn={["mobile"]}'].every((part) => merged.includes(part)));
  // Writing one key: the others stay; a value equal on every breakpoint collapses to a plain one; no key left, no prop.
  const literal = (value) => ({ kind: "literal", value });
  const object = (fields) => ({ kind: "object", fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, literal(value)])) });
  check("withBreakpointValue: one key written, the others kept, in desktop → mobile order", withBreakpointValue(object({ mobile: "column", desktop: "row" }), literal("row"), "tablet"), object({ desktop: "row", tablet: "row", mobile: "column" }));
  check("withBreakpointValue: the same value on every breakpoint is a plain value", withBreakpointValue(object({ desktop: "row", mobile: "column" }), literal("row"), "mobile"), literal("row"));
  check("withBreakpointValue: a reset without a default drops the key (the breakpoint takes the next wider one's)", withBreakpointValue(object({ desktop: "center", mobile: "end" }), undefined, "mobile"), literal("center"));
  check("withBreakpointValue: a reset with a default writes it", withBreakpointValue(object({ desktop: "xl", mobile: "md" }), undefined, "mobile", "none"), object({ desktop: "xl", mobile: "none" }));
}

if (failures.length) {
  console.error(`✗ figma-diff selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}\n--- changes ---\n${changes.map((change) => `${change.key}${change.conflict ? " (conflict)" : ""}: ${change.label}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ figma-diff selftest: ${passed} checks pass.`);
