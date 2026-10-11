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

/** A layer of the frame JSON by its Figma id (frames, instance slots and their layers). */
function layer(frame, id) {
  const stack = [frame];
  while (stack.length) {
    const node = stack.pop();
    if (node.id === id) return node;
    stack.push(...(node.children ?? []), ...(node.slots ?? []));
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

if (failures.length) {
  console.error(`✗ figma-diff selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}\n--- changes ---\n${changes.map((change) => `${change.key}${change.conflict ? " (conflict)" : ""}: ${change.label}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ figma-diff selftest: ${passed} checks pass.`);
