#!/usr/bin/env node
// Zen Studio content slots: ./registry.ts and ./palette.ts (imported directly: Node strips the types) against the
// component source and CSS, the generated API, and the usage harness.
//   node src/platform/studio/slots/palette.selftest.mjs                         registry + palette checks (~1 s)
//   node src/platform/studio/slots/palette.selftest.mjs --deep [--out=<dir>]    also writes every palette item in every
//        host slot that offers it to <dir>/palette-check.tsx (default: a new folder in the OS temp dir) and runs tsc,
//        the usage harness and the style guard on it: 0 errors, 0 findings
// exit 1 on any failure
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseExpression } from "@babel/parser";
import {
  CONTENT_SLOTS, activeSlotsOf, contentSummaryOf, headingLevelFor, hostPropsOf, hostTitleLevel, inactiveCondition, insertTargetFor,
  isClickableHost, isLayoutPrimitive, isSlotActive, slotFlowOf, slotIsClickTarget, slotOf, slotsOf,
} from "./registry.ts";
import { DATA_SLOTS, dataSlotOf, itemTitle } from "./dataSlots.ts";
import { COMPONENT_FOLDERS, NOT_RECOMMENDED, PALETTE, PALETTE_GROUPS, isMobileChain, paletteFor, paletteItem, paletteSections, preferredFor, searchPalette } from "./palette.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const components = path.join(root, "src/components");
const read = (file) => fs.readFileSync(path.join(components, file), "utf8");

const failures = [];
let passed = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

/* ───────────── 1. Registry against the component source and CSS ───────────── */

/** Where each slot component renders: its TSX (classes, conditional mounts, title levels) and CSS (flow, gap). */
const SOURCES = {
  Card: { tsx: ["Card/Card.tsx"], css: ["Card/card.css"] },
  Dialog: { tsx: ["Dialog/Dialog.tsx"], css: ["Dialog/dialog.css"] },
  ModalForm: { tsx: ["Dialog/Dialog.tsx"], css: ["Dialog/dialog.css"] },
  SidePanel: { tsx: ["SidePanel/SidePanel.tsx"], css: ["SidePanel/side-panel.css"] },
  BottomSheet: { tsx: ["BottomSheet/BottomSheet.tsx"], css: ["BottomSheet/bottom-sheet.css"] },
  Accordion: { tsx: ["Accordion/Accordion.tsx"], css: ["Accordion/accordion.css"] },
  TabPanel: { tsx: ["Tabs/Tabs.tsx"], css: ["Tabs/tabs.css"] },
  ChartCard: { tsx: ["Chart/Chart.tsx", "Card/Card.tsx", "Segmented/Segmented.tsx"], css: ["Chart/chart.css"] },
  ListItem: { tsx: ["ListItem/ListItem.tsx"], css: ["ListItem/list-item.css"] },
  ListBox: { tsx: ["ListItem/ListItem.tsx"], css: ["ListItem/list-item.css"] },
  TopNavigation: { tsx: ["TopNavigation/TopNavigation.tsx"], css: ["TopNavigation/top-navigation.css"] },
  Metric: { tsx: ["MetricWidget/MetricWidget.tsx"], css: ["MetricWidget/metric-widget.css"] },
  EmptyState: { tsx: ["EmptyState/EmptyState.tsx"], css: ["EmptyState/empty-state.css"] },
  Stack: { tsx: ["Layout/Layout.tsx"], css: ["Layout/layout.css"] },
  Grid: { tsx: ["Layout/Layout.tsx"], css: ["Layout/layout.css"] },
  Box: { tsx: ["Layout/Layout.tsx"], css: ["Layout/layout.css"] },
};
const classesIn = (selector) => [...(selector ?? "").matchAll(/\.(zen-[\w-]+)/g)].map((m) => m[1]);
const lastClass = (selector) => classesIn(selector).at(-1);
/** Declarations of the rules whose selector list holds exactly `.cls` (not compound selectors). */
function declarations(css, cls) {
  const out = [];
  for (const [, selectors, body] of css.replace(/\/\*[^]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (selectors.split(",").some((s) => s.trim() === `.${cls}`)) out.push(body);
  }
  return out.join(";");
}
const api = JSON.parse(fs.readFileSync(path.join(root, "src/platform/api.generated.json"), "utf8"));
const apiOf = (name) => Object.values(api).flat().find((entry) => entry.name === name);

check("every slot component has a source entry", Object.keys(CONTENT_SLOTS).filter((name) => !SOURCES[name]), []);
for (const [name, def] of Object.entries(CONTENT_SLOTS)) {
  const source = SOURCES[name];
  if (!source) continue;
  const tsx = source.tsx.map(read).join("\n");
  const css = source.css.map(read).join("\n");
  for (const cls of classesIn(def.root)) check(`${name} root .${cls} is in the source`, tsx.includes(cls), true);
  // Title level: the default the source gives headingLevel (or BottomSheet's fixed h2).
  if (def.titleLevel && typeof def.titleLevel === "object") check(`${name} headingLevel default`, new RegExp(`function ${name}\\([^)]*headingLevel = ${def.titleLevel.default}\\b`).test(tsx), true);
  if (typeof def.titleLevel === "number") check(`${name} title is an h${def.titleLevel}`, tsx.includes(`<h${def.titleLevel} `), true);
  for (const slot of def.slots) {
    const id = `${name}.${slot.prop}`;
    check(`${id}: owner`, slot.component, name);
    check(`${id}: the prop is in api.generated.json`, Boolean(apiOf(name)?.props.some((prop) => prop.name === slot.prop)), true);
    for (const selector of [slot.container, slot.ghostAnchor?.selector, slot.parts]) {
      for (const cls of classesIn(selector)) check(`${id}: .${cls} is in the source`, tsx.includes(cls), true);
    }
    const cls = lastClass(slot.container ?? def.root);
    const decls = declarations(css, cls);
    if (slot.container !== null) {
      // Conditional mount: `{x ? <div className="zen-…__body">` in the TSX.
      const conditional = new RegExp(`\\?\\s*<\\w+ className=\\{?["\`]${cls}[\\s"\`$]`).test(tsx);
      check(`${id}: mountsWhenEmpty matches the source`, !conditional, slot.mountsWhenEmpty);
    }
    if (slot.gap === "md") check(`${id}: .${cls} has gap Medium`, /(^|;)\s*gap:\s*var\(--zen-spacing-gap-medium\b/.test(decls), true);
    if (slot.gap === "none") check(`${id}: .${cls} has no gap`, /(^|;)\s*gap:/.test(decls), false);
    if (slot.gap === "own" && slot.kind !== "layout") check(`${id}: .${cls} has its own gap`, /(^|;)\s*gap:/.test(decls), true);
    if (slot.flow === "column") check(`${id}: .${cls} is a flex column`, /flex-direction:\s*column/.test(decls), true);
    if (slot.flow === "block") check(`${id}: .${cls} is a block`, /display:\s*(inline-)?(flex|grid)/.test(decls), false);
    if (slot.flow === "row") check(`${id}: .${cls} lays out in a row`, /display:\s*(inline-flex|flex|grid)/.test(decls) && !/flex-direction:\s*column/.test(decls), true);
    check(`${id}: Figma property names its slot`, !slot.figma?.property || slot.figma.property.startsWith(`${slot.name}#`), true);
  }
}
// ModalForm side: the layouts with a side column are modalFormLayouts minus basic and big (hasSide in Dialog.tsx).
const layouts = JSON.parse(`[${/modalFormLayouts = \[([^\]]*)\]/.exec(read("Dialog/Dialog.tsx"))?.[1] ?? ""}]`);
check("ModalForm side layouts", slotOf("ModalForm", "side")?.activeWhen?.[0]?.is, layouts.filter((layout) => layout !== "basic" && layout !== "big"));
check("BottomSheet type=action renders items instead of children", read("BottomSheet/BottomSheet.tsx").includes(`{type === "action" ? (`), true);

// Data slots (dataSlots.ts): the prop is documented, the source passes each item object itself to the part that draws
// it (the Studio finds an item on the canvas by identity), draws `max` of them, and a new item is valid code.
for (const [name, slots] of Object.entries(DATA_SLOTS)) {
  const tsx = read(`${name}/${name}.tsx`);
  for (const slot of slots) {
    const id = `data ${name}.${slot.prop}`;
    check(`${id}: owner`, slot.component, name);
    check(`${id}: the prop is in api.generated.json`, Boolean(apiOf(name)?.props.some((prop) => prop.name === slot.prop)), true);
    const item = slot.newItem(0);
    let parsed = null;
    try { parsed = parseExpression(item.code, { plugins: ["jsx", "typescript"] }); } catch { parsed = null; }
    check(`${id}: a new item is an object literal`, parsed?.type, "ObjectExpression");
    // An item with a handler calls toast (and says so); items the owner answers for (onValueChange…) need none.
    check(`${id}: a new item's handler calls toast`, /\bon[A-Z]\w*:/.test(item.code) ? /toast\(\{ title: /.test(item.code) && Boolean(item.requires?.includes("toast")) : !item.requires?.length, true);
  }
}
// Figma's Trailing-Slot takes 3 (Top-Trailing and Header-Trailing): the component's MAX_ACTIONS and both data slots agree.
check("TopNavigation draws MAX_ACTIONS = 3 trailing actions", /const MAX_ACTIONS = 3;/.test(read("TopNavigation/TopNavigation.tsx")) && /trailingItems\([^)]*search\.mounted && searchButton \? MAX_ACTIONS - 1 : MAX_ACTIONS\)/.test(read("TopNavigation/TopNavigation.tsx")), true);
check("TopNavigation passes each action object itself", read("TopNavigation/TopNavigation.tsx").includes("titleActions.slice(0, MAX_ACTIONS).map((action, index) => <TopNavigationActionButton key={index} action={action}") && read("TopNavigation/TopNavigation.tsx").includes("<TopNavigationActionButton key={index} action={action}"), true);
check("dataSlotOf", [dataSlotOf("TopNavigation", "trailing")?.max, dataSlotOf("TopNavigation", "largeTitleAction")?.form, dataSlotOf("TopNavigation", "largeTitleAction")?.max, dataSlotOf("Card", "x")], [3, "list", 3, null]);
check("itemTitle", [itemTitle(dataSlotOf("TopNavigation", "trailing"), [{ key: "label", kind: "string", value: " Bell " }], 0), itemTitle(dataSlotOf("TopNavigation", "trailing"), [{ key: "label", kind: "expression", value: "x" }], 1)], ["Bell", "Action 2"]);

/* ───────────── 2. Registry helpers ───────────── */

check("slotsOf(Card)", slotsOf("Card").map((slot) => slot.name), ["Content"]);
check("slotsOf(ModalForm)", slotsOf("ModalForm").map((slot) => `${slot.prop}:${slot.name}`), ["children:Main-Contents", "side:Side-Content", "top:Top-Custom-Slot"]);
check("slotsOf(unknown)", slotsOf("Avatar"), []);
check("slotOf(ListItem, trailing)", slotOf("ListItem", "trailing")?.name, "Actions");
check("isLayoutPrimitive", ["Stack", "Grid", "Box", "Text", "Heading", "Card", "Container"].map(isLayoutPrimitive), [true, true, true, false, false, false, false]);
check("hostTitleLevel", [hostTitleLevel("Dialog"), hostTitleLevel("Dialog", { headingLevel: 3 }), hostTitleLevel("ModalForm"), hostTitleLevel("SidePanel"), hostTitleLevel("BottomSheet"), hostTitleLevel("Accordion"), hostTitleLevel("Accordion", { headingLevel: 4 }), hostTitleLevel("ChartCard"), hostTitleLevel("Card"), hostTitleLevel("Stack")], [2, 3, 2, 2, 2, 3, 4, 3, null, null]);
check("headingLevelFor", [
  headingLevelFor("Dialog"), headingLevelFor("Accordion"), headingLevelFor("Accordion", { headingLevel: 6 }), headingLevelFor("Card"),
  headingLevelFor("Card", {}, { nearestHeading: 3 }), headingLevelFor("Stack", {}, { ancestors: [{ name: "Card" }, { name: "SidePanel" }] }), headingLevelFor("Stack"),
  headingLevelFor("Dialog", { headingLevel: 1 }),
], [3, 4, 6, 3, 4, 3, 3, 2]);
check("isSlotActive: ModalForm side", [{}, { layout: "1-3" }, { layout: "half-half" }, { layout: "big" }, { layout: { bound: "layout" } }].map((props) => isSlotActive(slotOf("ModalForm", "side"), props)), [false, true, true, false, true]);
check("isSlotActive: BottomSheet", [{}, { type: "modal" }, { type: "action" }].map((props) => isSlotActive(slotOf("BottomSheet", "children"), props)), [true, true, false]);
check("activeSlotsOf(ModalForm, basic)", activeSlotsOf("ModalForm", { layout: "basic" }).map((slot) => slot.prop), ["children", "top"]);
check("slotFlowOf", [slotFlowOf(slotOf("Stack", "children")), slotFlowOf(slotOf("Stack", "children"), { direction: "row" }), slotFlowOf(slotOf("Card", "children"), { direction: "row" })], ["column", "row", "column"]);
check("inactiveCondition", inactiveCondition(slotOf("ModalForm", "side"), { layout: "big" })?.prop, "layout");
check("isClickableHost", [isClickableHost("Card", { onClick: { bound: "open" } }), isClickableHost("Card", {}), isClickableHost("Card", { onClick: false }), isClickableHost("ListItem", { href: "/projects" }), isClickableHost("Stack", { onClick: { bound: "go" } })], [true, false, false, true, false]);
check("slotIsClickTarget: ListItem trailing sits outside the row button", [slotIsClickTarget(slotOf("ListItem", "leading"), { onClick: { bound: "go" } }), slotIsClickTarget(slotOf("ListItem", "trailing"), { onClick: { bound: "go" } })], [true, false]);
check("hostPropsOf", hostPropsOf([
  { name: "theme", kind: "string", value: "border", raw: 'theme="border"', line: 1 },
  { name: "selected", kind: "true", raw: "selected", line: 1 },
  { name: "headingLevel", kind: "expression", value: "3", raw: "headingLevel={3}", line: 1 },
  { name: "dismissible", kind: "expression", value: "false", raw: "dismissible={false}", line: 1 },
  { name: "layout", kind: "expression", value: '"1-3"', raw: 'layout={"1-3"}', line: 1 },
  { name: "onClick", kind: "expression", value: "() => open(project)", raw: "onClick={() => open(project)}", line: 1 },
  { name: "…", kind: "spread", raw: "{...rest}", line: 1 },
]), { theme: "border", selected: true, headingLevel: 3, dismissible: false, layout: "1-3", onClick: { bound: "() => open(project)" }, "…": { bound: "{...rest}" } });
check("contentSummaryOf", [
  contentSummaryOf([]),
  contentSummaryOf([{ kind: "text", index: 0, value: "\n  " }, { kind: "element", name: "Stack", loc: "4:6" }, { kind: "text", index: 2, value: "\n" }]),
  contentSummaryOf([{ kind: "text", index: 0, value: "Invoices are due 30 days after they are sent." }]),
  contentSummaryOf([{ kind: "element", name: "Heading", loc: "4:6" }, { kind: "expression", raw: "{rows.map(row)}" }]),
], [{ count: 0 }, { count: 1, only: { name: "Stack" } }, { count: 1 }, { count: 2 }]);
const card = slotOf("Card", "children");
const WRAP = { mode: "wrap", wrap: { tag: "Stack", props: { gap: "md" } } };
check("insertTargetFor", [
  insertTargetFor(card, { count: 0 }),
  insertTargetFor(card, { count: 1, only: { name: "Text" } }),
  insertTargetFor(card, { count: 1, only: { name: "Stack", props: {} } }),
  insertTargetFor(card, { count: 1, only: { name: "Stack", props: { direction: "row" } } }),
  insertTargetFor(card, { count: 1, only: { name: "Stack" } }),
  insertTargetFor(card, { count: 1, only: { name: "Grid" } }),
  insertTargetFor(card, { count: 2 }),
  insertTargetFor(slotOf("Accordion", "children"), { count: 1 }),
  insertTargetFor(slotOf("Dialog", "children"), { count: 0 }),
  insertTargetFor(slotOf("SidePanel", "children"), { count: 3 }),
  insertTargetFor(slotOf("ModalForm", "side"), { count: 1, only: { name: "Text" } }),
  insertTargetFor(slotOf("ListItem", "trailing"), { count: 2 }),
  insertTargetFor(slotOf("ListItem", "leading"), { count: 1, only: { name: "Avatar" } }),
  insertTargetFor(slotOf("Stack", "children"), { count: 4 }),
  insertTargetFor(slotOf("Box", "children"), { count: 1, only: { name: "Text" } }),
], [
  { mode: "direct" }, WRAP, { mode: "into", name: "Stack" }, WRAP, WRAP, { mode: "into", name: "Grid" }, WRAP, WRAP, { mode: "direct" },
  { mode: "direct" }, { mode: "direct" }, { mode: "direct" }, { mode: "direct", warning: "Leading holds one layer in the component; this adds one more" },
  { mode: "direct" }, WRAP,
]);

/* ───────────── 3. Palette items ───────────── */

const ctxFor = (host, prop = "children", extra = {}) => {
  const slot = slotOf(host, prop);
  const ancestors = extra.ancestors ?? [];
  return {
    host, slot, hostProps: {}, ancestors, uid: "k3f9", mobile: isMobileChain(host, ancestors),
    headingLevel: headingLevelFor(host, extra.hostProps ?? {}, { ancestors: ancestors.map((name) => ({ name })) }), ...extra,
  };
};
check("palette ids are unique", new Set(PALETTE.map((item) => item.id)).size, PALETTE.length);
check("palette groups", [...new Set(PALETTE.map((item) => item.group))], [...PALETTE_GROUPS]);
check("Image reads platformMedia (requires media)", PALETTE.filter((item) => item.components.includes("Image")).map((item) => [item.id, item.requires]), [["image", ["media"]]]);
check("every library component folder is offered (but infrastructure and Toast)", fs.readdirSync(components).filter((folder) => !folder.startsWith("_") && fs.existsSync(path.join(components, folder, "index.ts")))
  .filter((folder) => !["Motion", "Portal", "Provider", "VisuallyHidden", "Toast"].includes(folder) && !PALETTE.some((item) => item.components.some((name) => COMPONENT_FOLDERS[name] === folder))), []);
const setterOf = (name) => `set${name[0].toUpperCase()}${name.slice(1)}`;
const anyCtx = ctxFor("Card");
for (const item of PALETTE) {
  const code = item.build(anyCtx);
  let ast = null;
  try { ast = parseExpression(code, { plugins: ["jsx", "typescript"] }); } catch (error) { failures.push(`${item.id}: does not parse (${error.message})\n${code}`); continue; }
  check(`${item.id}: one JSX element`, ast.type, "JSXElement");
  const names = new Set();
  const free = new Set();
  const params = new Set();
  const walk = (node, parent) => {
    if (!node || typeof node.type !== "string") return;
    if (node.type === "JSXIdentifier" && /^[A-Z]/.test(node.name) && parent?.type !== "JSXAttribute") names.add(node.name);
    if (node.type === "ArrowFunctionExpression") for (const param of node.params) if (param.type === "Identifier") params.add(param.name);
    const isKey = parent?.type === "ObjectProperty" && parent.key === node && !parent.computed;
    const isProperty = (parent?.type === "MemberExpression" || parent?.type === "OptionalMemberExpression") && parent.property === node && !parent.computed;
    if (node.type === "Identifier" && !isKey && !isProperty) free.add(node.name);
    if (node.type === "ArrowFunctionExpression" && node.body.type === "BlockStatement" && !node.body.body.length) failures.push(`${item.id}: a no-op handler`);
    for (const [key, value] of Object.entries(node)) {
      if (key === "loc" || key === "start" || key === "end") continue;
      if (Array.isArray(value)) value.forEach((child) => walk(child, node));
      else if (value && typeof value.type === "string") walk(value, node);
    }
  };
  walk(ast, null);
  check(`${item.id}: root`, ast.openingElement.name.name, item.root);
  check(`${item.id}: components = the JSX names`, [...names].sort(), [...item.components].sort());
  check(`${item.id}: components start with the root`, item.components[0], item.root);
  const expectedFree = [
    ...(item.requires?.includes("toast") ? ["toast"] : []),
    ...(item.requires?.includes("media") ? ["platformMedia"] : []),
    ...(item.state ?? []).flatMap((entry) => (entry.ref ? [entry.name] : [entry.name, setterOf(entry.name)])),
  ];
  check(`${item.id}: free identifiers`, [...free].filter((name) => !params.has(name) && !["Date", "Math"].includes(name)).sort(), expectedFree.sort());
  for (const entry of item.state ?? []) {
    check(`${item.id}: state ${entry.name} is read`, free.has(entry.name), true);
    check(`${item.id}: state ${entry.name} initial parses`, (() => { try { parseExpression(entry.initial); return true; } catch { return false; } })(), true);
  }
  check(`${item.id}: never an h1`, /level=\{1\}|headingLevel=\{1\}/.test(code), false);
  check(`${item.id}: no guide copy`, /\b(click|tap|try|lorem|placeholder text)\b/i.test(code), false);
  check(`${item.id}: Actions and Inputs are controls`, item.group === "Actions" || item.group === "Inputs" ? item.interactive : true, true);
  check(`${item.id}: Inputs are inputs`, item.input, item.group === "Inputs");
  for (const name of item.components) {
    const folder = COMPONENT_FOLDERS[name];
    check(`${item.id}: ${name} has a folder`, Boolean(folder), true);
    if (folder) check(`${item.id}: ${folder}/index.ts exports ${name}`, new RegExp(`\\b${name}\\b`).test(read(`${folder}/index.ts`)), true);
  }
}
const packageIndex = fs.readFileSync(path.join(root, "src/index.ts"), "utf8");
for (const folder of new Set(Object.values(COMPONENT_FOLDERS))) check(`@zen/design-system re-exports ${folder} (templates import from it)`, packageIndex.includes(`export * from "./components/${folder}";`), true);
check("useToast is exported by Toast", /\buseToast\b/.test(read(`${COMPONENT_FOLDERS.useToast}/index.ts`)), true);
check("radio group name takes the uid", (paletteItem("radio-group").build({ ...anyCtx, uid: "AB-1" }).match(/billing-cycle-ab1/g) ?? []).length, 2);
check("heading level comes from the host", [paletteItem("heading").build(ctxFor("Dialog")), paletteItem("heading").build(ctxFor("Accordion"))].map((code) => /level=\{(\d)\}/.exec(code)?.[1]), ["3", "4"]);
check("accordion writes headingLevel only when it is not 3", [paletteItem("accordion").build(ctxFor("Card")).includes("headingLevel"), paletteItem("accordion").build(ctxFor("Dialog", "children", { headingLevel: 4 })).includes("headingLevel={4}")], [false, true]);
check("toggle size on a phone", [paletteItem("toggle").build({ ...anyCtx, mobile: true }), paletteItem("toggle").build(anyCtx)], ['<Toggle size="lg" label="Email notifications" />', '<Toggle label="Email notifications" />']);

/* ───────────── 4. Host rules: warnings, never hidden (user, 2026-10-04) ───────────── */

const ids = (result) => result.items.map((item) => item.id);
/** The ids that fit (no warning). */
const fitting = (result) => result.items.filter((item) => !result.warnings[item.id]).map((item) => item.id);
/** "Group: reason (labels)" per warning reason, in palette order. */
const reasons = (result) => {
  const rows = [];
  for (const item of result.items) {
    const warning = result.warnings[item.id];
    if (!warning) continue;
    const row = rows.find((entry) => entry.group === item.group && entry.reason === warning.reason);
    if (row) row.items.push(item.label);
    else rows.push({ group: item.group, reason: warning.reason, items: [item.label] });
  }
  return rows.map((row) => `${row.group}: ${row.reason} (${row.items.join(", ")})`);
};
const everyId = PALETTE.filter((item) => item.id !== "metric").map((item) => item.id);
const everyIdInCard = PALETTE.filter((item) => item.id !== "metric-card").map((item) => item.id);
const cardStatic = paletteFor(ctxFor("Card"));
check("Card: every item listed (Metric, not MetricCard)", ids(cardStatic), everyIdInCard);
check("Card: cards warned", reasons(cardStatic), ["Data display: A card never goes inside a card (Card)", "Charts: A card never goes inside a card (Chart card)"]);
check("Card: nothing hidden", cardStatic.hidden, []);
check("Card: warnings carry a short caption", cardStatic.warnings.card?.short, "Card inside a card");
const cardClickable = paletteFor(ctxFor("Card", "children", { hostProps: { onClick: { bound: "open" } } }));
check("clickable Card: every item listed", ids(cardClickable), everyIdInCard);
check("clickable Card: controls and fields warned", cardClickable.items.filter((item) => (item.interactive || item.input) && !cardClickable.warnings[item.id]).map((item) => item.id), []);
check("clickable Card: warnings", reasons(cardClickable), [
  "Actions: The card is one click target, so it holds no controls or fields (Button, Primary button, Button row, Icon button, Link, Menu)",
  "Navigation: The card is one click target, so it holds no controls or fields (Tabs, Segmented, Breadcrumbs, Pagination)",
  "Data display: A card never goes inside a card (Card)",
  "Charts: A card never goes inside a card (Chart card)",
  "Inputs: The card is one click target, so it holds no controls or fields (Text field, Text area, Select, Checkbox, Toggle, Radio group, Search, Chip row, Date field, Calendar, Number field, Autocomplete, Rich text, Slider, Rating input, NPS scale, Colour selector, File upload)",
  "Overlays: The card is one click target, so it holds no controls or fields (Dialog, Modal form, Side panel, Bottom sheet, Popover, Tooltip)",
  "Layout: The card is one click target, so it holds no controls or fields (Accordion)",
  "Page: The card is one click target, so it holds no controls or fields (Page header, Top navigation, Bottom navigation, Sidebar, App shell, Action bar)",
  "Chat: The card is one click target, so it holds no controls or fields (Chat thread, Chat composer, AI chat)",
]);
check("Stack in a clickable Card: controls warned", fitting(paletteFor(ctxFor("Stack", "children", { ancestors: ["Card"], clickableAncestor: "Card" }))).filter((id) => paletteItem(id).interactive || paletteItem(id).input).length, 0);
for (const host of ["Dialog", "SidePanel", "BottomSheet"]) {
  const result = paletteFor(ctxFor(host));
  check(`${host}: every item listed`, ids(result), everyId);
  check(`${host}: actions are props`, ["button", "button-primary", "button-row", "metric-card", "card"].map((id) => fitting(result).includes(id)), [true, false, false, true, true]);
}
const modalForm = paletteFor(ctxFor("ModalForm"));
check("ModalForm: Checkbox fits, Toggle warned", ["checkbox", "toggle"].map((id) => fitting(modalForm).includes(id)), [true, false]);
check("Stack in a ModalForm: Toggle warned", fitting(paletteFor(ctxFor("Stack", "children", { ancestors: ["ModalForm"] }))).includes("toggle"), false);
check("Stack in a Form: Toggle warned", fitting(paletteFor(ctxFor("Stack", "children", { ancestors: ["Form", "Card"] }))).includes("toggle"), false);
const sheet = paletteFor({ ...ctxFor("Stack", "children", { ancestors: ["BottomSheet"] }), mobile: false });
check("BottomSheet chain: context.mobile and a large Toggle", [sheet.context.mobile, paletteItem("toggle").build(sheet.context)], [true, '<Toggle size="lg" label="Email notifications" />']);
check("Accordion: Accordion warned", reasons(paletteFor(ctxFor("Accordion"))).filter((row) => row.includes("Accordion")), ["Layout: Accordions are one level deep (Accordion)"]);
check("Stack in an Accordion: Accordion warned", fitting(paletteFor(ctxFor("Stack", "children", { ancestors: ["Accordion"] }))).includes("accordion"), false);
check("ListItem leading: fitting", fitting(paletteFor(ctxFor("ListItem", "leading"))), ["avatar", "dock-icon"]);
check("ListItem leading: every item listed", ids(paletteFor(ctxFor("ListItem", "leading"))), everyId);
check("ListItem trailing: fitting", fitting(paletteFor(ctxFor("ListItem", "trailing"))), ["button", "button-primary", "icon-button", "badge"]);
check("ListItem leading: warning reasons name the slot", [...new Set(Object.values(paletteFor(ctxFor("ListItem", "leading")).warnings).map((row) => row.reason))], ["Leading takes Avatar or DockIcon"]);
check("Divider next to a Divider", [fitting(paletteFor({ ...ctxFor("Card"), previousSibling: "Divider" })).includes("divider"), fitting(paletteFor({ ...ctxFor("Card"), nextSibling: "Divider" })).includes("divider"), fitting(paletteFor({ ...ctxFor("Card"), previousSibling: "Text" })).includes("divider")], [false, false, true]);
const outside = paletteFor({ ...ctxFor("Card"), canUseToast: false });
check("outside a component: toast and state items cannot be written (hidden)", outside.items.filter((item) => item.requires?.includes("toast") || item.state?.length).length, 0);
check("a template: Image cannot be written (hidden)", paletteFor({ ...ctxFor("Card"), canUseMedia: false }).hidden.map((row) => `${row.group}: ${row.reason} (${row.items.join(", ")})`), ["Data display: Images read platformMedia, which only the example pages import (Image)"]);
check("outside a component: said once per group", [...new Set(outside.hidden.map((row) => row.reason))], ["Actions and stateful items need a component to hold their hooks; this code sits outside one"]);
check("ChartCard is a card surface", ["metric", "card"].map((id) => fitting(paletteFor(ctxFor("ChartCard"))).includes(id)), [true, false]);
check("preferredFor", [preferredFor(slotOf("Card", "children")), preferredFor(slotOf("Dialog", "children")), preferredFor(slotOf("ListItem", "trailing")), preferredFor(slotOf("Stack", "children"))], [
  ["heading", "paragraph", "list", "metric", "stack"], ["paragraph", "input-field", "checkbox"], ["badge", "icon-button", "button"], [],
]);
for (const def of Object.values(CONTENT_SLOTS)) for (const slot of def.slots) {
  for (const id of preferredFor(slot)) check(`${slot.component}.${slot.prop}: preferred ${id} exists`, Boolean(paletteItem(id)), true);
}
const sections = paletteSections(cardStatic, slotOf("Card", "children"));
check("paletteSections: preferred first", [sections[0].title, sections[0].items.map((item) => item.id)], ["Preferred for Content", ["heading", "paragraph", "list", "metric", "stack"]]);
check("paletteSections: no item twice, none missing", sections.flatMap((section) => section.items).length, cardStatic.items.length);
check("paletteSections: warned items last", [sections.at(-1).title, sections.at(-1).items.map((item) => item.id)], [NOT_RECOMMENDED, ["card", "chart-card"]]);
const leadingSections = paletteSections(paletteFor(ctxFor("ListItem", "leading")), slotOf("ListItem", "leading"));
check("paletteSections: a preferred item with a warning goes last", [leadingSections[0].title, leadingSections[0].items.map((item) => item.id), leadingSections.length], ["Preferred for Leading", ["avatar", "dock-icon"], 2]);
check("paletteSections: sidePanel's preferred metric is MetricCard", paletteSections(paletteFor(ctxFor("SidePanel")), slotOf("SidePanel", "children"))[0].items.map((item) => item.id), ["input-field", "select-field", "paragraph", "list"]);
check("searchPalette", searchPalette(PALETTE, "text").map((item) => item.id), ["heading", "paragraph", "caption", "tabs", "card", "progress", "table", "skeleton", "input-field", "textarea-field", "rich-text-field", "stack", "grid", "app-shell", "action-bar"]);
check("searchPalette: every word", searchPalette(PALETTE, "data list").map((item) => item.id), ["list", "list-box", "description-list"]);

/* ───────────── 5. --deep: every item in every host that offers it, through tsc + usage + style guards ───────────── */

/** Host slots as the examples write them; `%` is where the slot content goes. */
const SCENARIOS = [
  { host: "Card", jsx: '<Card theme="border">%</Card>' },
  { host: "Card", name: "CardFilled", existing: '<Text tone="base">Phin & Co signed off the rewards flow.</Text>', only: { name: "Text" }, jsx: '<Card theme="border">%</Card>' },
  { host: "Card", name: "CardStack", existing: '<Stack gap="md"><Text tone="base">Phin & Co signed off the rewards flow.</Text></Stack>', only: { name: "Stack", props: {} }, jsx: '<Card theme="border">%</Card>' },
  { host: "Card", name: "CardClickable", hostProps: { onClick: { bound: "open" } }, jsx: '<Card theme="border" onClick={() => toast({ title: "Loyalty app opened" })}>%</Card>' },
  { host: "Dialog", jsx: '<Dialog open={open} onOpenChange={setOpen} title="Share project">%</Dialog>' },
  { host: "ModalForm", jsx: '<ModalForm open={open} onOpenChange={setOpen} title="New project">%</ModalForm>' },
  { host: "ModalForm", prop: "side", hostProps: { layout: "1-3" }, jsx: '<ModalForm open={open} onOpenChange={setOpen} title="New project" layout="1-3" side={%}><InputField label="Client" /></ModalForm>' },
  { host: "ModalForm", prop: "top", jsx: '<ModalForm open={open} onOpenChange={setOpen} title="New project" top={%}><InputField label="Client" /></ModalForm>' },
  { host: "SidePanel", jsx: '<SidePanel open={open} onOpenChange={setOpen} title="Loyalty app">%</SidePanel>' },
  { host: "BottomSheet", jsx: '<BottomSheet open={open} onOpenChange={setOpen} title="Notifications">%</BottomSheet>' },
  { host: "Accordion", jsx: '<Accordion title="Payment terms">%</Accordion>' },
  { host: "Accordion", name: "AccordionText", existing: "Invoices are due 30 days after they are sent.", count: 1, jsx: '<Accordion title="Payment terms">%</Accordion>' },
  { host: "TabPanel", jsx: '<TabPanel idPrefix="project" id="overview">%</TabPanel>' },
  { host: "ChartCard", jsx: '<ChartCard title="Revenue">%</ChartCard>' },
  { host: "ListItem", prop: "leading", jsx: '<List><ListItem title="Bao Nguyen" caption="Frontend Engineer" leading={%} /></List>' },
  { host: "ListItem", prop: "leading", name: "LeadingClickable", hostProps: { onClick: { bound: "open" } }, jsx: '<List><ListItem title="Bao Nguyen" caption="Frontend Engineer" onClick={() => toast({ title: "Bao Nguyen opened" })} leading={%} /></List>' },
  { host: "ListItem", prop: "trailing", jsx: '<List><ListItem title="Loyalty app" caption="Phin & Co" trailing={%} /></List>' },
  { host: "ListItem", prop: "trailing", name: "TrailingFilled", existing: '<Badge theme="green" background="subtle">Active</Badge>', only: { name: "Badge" }, jsx: '<List><ListItem title="Loyalty app" caption="Phin & Co" trailing={%} /></List>' },
  { host: "ListItem", prop: "trailing", name: "TrailingClickable", hostProps: { onClick: { bound: "open" } }, jsx: '<List><ListItem title="Loyalty app" caption="Phin & Co" onClick={() => toast({ title: "Loyalty app opened" })} trailing={%} /></List>' },
  { host: "Stack", name: "StackInCard", ancestors: ["Card"], jsx: '<Card theme="border"><Stack gap="md">%</Stack></Card>' },
  { host: "Stack", name: "StackInClickableCard", ancestors: ["Card"], clickableAncestor: "Card", jsx: '<Card theme="border" onClick={() => toast({ title: "Loyalty app opened" })}><Stack gap="md">%</Stack></Card>' },
  { host: "Stack", name: "StackInSheet", ancestors: ["BottomSheet"], jsx: '<BottomSheet open={open} onOpenChange={setOpen} title="Notifications"><Stack gap="md">%</Stack></BottomSheet>' },
  { host: "Stack", name: "StackInModalForm", ancestors: ["ModalForm"], jsx: '<ModalForm open={open} onOpenChange={setOpen} title="New project"><Stack gap="md">%</Stack></ModalForm>' },
  { host: "Stack", name: "StackInAccordion", ancestors: ["Accordion"], jsx: '<Accordion title="Payment terms"><Stack gap="md">%</Stack></Accordion>' },
  { host: "Grid", jsx: '<Grid columns={{ mobile: 1, desktop: 2 }} gap="md">%</Grid>' },
  { host: "Box", jsx: "<Box>%</Box>" },
];
const HOST_IMPORTS = { Card: "Card", Dialog: "Dialog", ModalForm: "Dialog", SidePanel: "SidePanel", BottomSheet: "BottomSheet", Accordion: "Accordion", TabPanel: "Tabs", ChartCard: "Chart", List: "ListItem", ListItem: "ListItem", ListBox: "ListItem", Stack: "Layout", Grid: "Layout", Box: "Layout", Text: "Text", Badge: "Badge", InputField: "Input", useToast: "Toast" };

function placed(scenario, slot, code) {
  const existing = scenario.existing ?? "";
  const target = insertTargetFor(slot, { count: scenario.count ?? (existing ? 1 : 0), ...(scenario.only ? { only: scenario.only } : {}) });
  if (target.mode === "wrap") return `<Stack gap="md">${existing}${code}</Stack>`;
  if (target.mode === "into") return existing.replace(/<\/Stack>$/, `${code}</Stack>`);
  const both = `${existing}${code}`;
  return slot.prop !== "children" && existing ? `<>${both}</>` : both;
}

/** `code` with the identifiers in `renames` renamed (not keys or member properties), as the server's stateFor does. */
function renamed(code, renames) {
  const ast = parseExpression(`<>${code}</>`, { plugins: ["jsx", "typescript"] });
  const hits = [];
  const visit = (node, parent) => {
    if (!node || typeof node.type !== "string") return;
    const isKey = parent?.type === "ObjectProperty" && parent.key === node && !parent.computed;
    const isProperty = (parent?.type === "MemberExpression" || parent?.type === "OptionalMemberExpression") && parent.property === node && !parent.computed;
    if (node.type === "Identifier" && !isKey && !isProperty && renames.has(node.name)) hits.push(node);
    for (const [key, value] of Object.entries(node)) {
      if (key === "loc" || key === "start" || key === "end") continue;
      if (Array.isArray(value)) value.forEach((child) => visit(child, node));
      else if (value && typeof value.type === "string") visit(value, node);
    }
  };
  visit(ast, null);
  let out = code;
  for (const hit of hits.sort((a, b) => b.start - a.start)) out = `${out.slice(0, hit.start - 2)}${renames.get(hit.name)}${out.slice(hit.end - 2)}`;
  return out;
}

function deepFile() {
  const used = new Map(Object.entries(HOST_IMPORTS));
  const blocks = [];
  let rendered = 0;
  let media = false;
  for (const scenario of SCENARIOS) {
    const prop = scenario.prop ?? "children";
    const slot = slotOf(scenario.host, prop);
    const ancestors = scenario.ancestors ?? [];
    const hostProps = scenario.hostProps ?? {};
    const result = paletteFor({
      host: scenario.host, slot, hostProps, ancestors, clickableAncestor: scenario.clickableAncestor, uid: "",
      headingLevel: headingLevelFor(scenario.host, hostProps, { ancestors: ancestors.map((name) => ({ name })) }), mobile: false,
    });
    // The fitting items: a warned one is expected to draw the harness finding its warning names.
    // Each item's state as the server declares it: its own names (`tab3`, `setTab3`) at the top of the component.
    const hooks = [];
    const instances = result.items.filter((item) => !result.warnings[item.id]).map((item, index) => {
      for (const name of item.components) used.set(name, COMPONENT_FOLDERS[name]);
      if (item.requires?.includes("media")) media = true;
      rendered += 1;
      let code = item.build({ ...result.context, uid: `${scenario.name ?? scenario.host}${prop}${index}`.toLowerCase() });
      if (item.state?.length) {
        const renames = new Map();
        for (const entry of item.state) {
          renames.set(entry.name, `${entry.name}${index}`);
          // A ref (Popover's anchor) as the server declares it: useRef, no setter.
          if (entry.ref) { hooks.push(`  const ${entry.name}${index} = useRef<${entry.type}>(null);`); continue; }
          renames.set(setterOf(entry.name), `${setterOf(entry.name)}${index}`);
          hooks.push(`  const [${entry.name}${index}, ${setterOf(entry.name)}${index}] = useState${entry.type ? `<${entry.type}>` : ""}(${entry.initial});`);
        }
        code = renamed(code, renames);
      }
      return `      {/* ${item.id} */}\n      ${scenario.jsx.replace("%", placed(scenario, slot, code))}`;
    });
    blocks.push([
      `export function Scenario${scenario.name ?? `${scenario.host}${prop === "children" ? "" : prop[0].toUpperCase() + prop.slice(1)}`}() {`,
      "  const { toast } = useToast();",
      "  const [open, setOpen] = useState(false);",
      ...hooks,
      "  return (",
      "    <>",
      ...instances,
      "    </>",
      "  );",
      "}",
    ].join("\n"));
  }
  const folders = new Map();
  for (const [name, folder] of used) folders.set(folder, [...(folders.get(folder) ?? []), name]);
  const imports = [...folders].sort(([a], [b]) => a.localeCompare(b))
    .map(([folder, names]) => `import { ${[...new Set(names)].sort().join(", ")} } from "${path.join(components, folder)}";`);
  if (media) imports.push(`import { platformMedia } from "${path.join(root, "src/platform/PlatformMedia")}";`);
  return { text: [`import { useRef, useState } from "react";`, ...imports, "", ...blocks, ""].join("\n"), rendered };
}

function run(label, command, args) {
  const out = spawnSync(command, args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { label, status: out.status, stdout: out.stdout ?? "", stderr: out.stderr ?? "" };
}

if (process.argv.includes("--deep")) {
  const outArg = process.argv.find((arg) => arg.startsWith("--out="));
  const dir = outArg ? path.resolve(outArg.slice("--out=".length)) : fs.mkdtempSync(path.join(os.tmpdir(), "zen-palette-"));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "palette-check.tsx");
  const { text, rendered } = deepFile();
  fs.writeFileSync(file, text);
  const types = path.join(root, "node_modules/@types");
  fs.writeFileSync(path.join(dir, "tsconfig.json"), `${JSON.stringify({
    extends: path.join(root, "tsconfig.json"),
    compilerOptions: {
      typeRoots: [types], types: ["react", "react-dom"],
      paths: {
        "@zen/design-system": [path.join(root, "src/index.ts")], react: [path.join(types, "react")], "react/*": [path.join(types, "react/*")],
        "react-dom": [path.join(types, "react-dom")], "react-dom/*": [path.join(types, "react-dom/*")],
      },
    },
    include: [], files: ["palette-check.tsx", path.join(root, "src/vite-env.d.ts")],
  }, null, 2)}\n`);
  const tsc = run("tsc", "npx", ["tsc", "-p", path.join(dir, "tsconfig.json")]);
  check(`deep: tsc (${rendered} items in ${SCENARIOS.length} hosts)`, tsc.status === 0 ? "0 errors" : `${tsc.stdout}${tsc.stderr}`.trim(), "0 errors");
  const usage = run("usage", process.execPath, [path.join(root, "tools/usage-guard/check-usage.mjs"), "--json", file]);
  let usageFindings;
  try { usageFindings = JSON.parse(usage.stdout).map((f) => `${f.rule} ${f.line ?? ""}: ${f.message ?? ""}`); } catch { usageFindings = [`unreadable output: ${usage.stdout}${usage.stderr}`]; }
  check("deep: usage harness findings", usageFindings, []);
  const style = run("style", process.execPath, [path.join(root, "tools/style-guard/check-styles.mjs"), "--json", file]);
  let styleFindings;
  try { styleFindings = JSON.parse(style.stdout).map((f) => `${f.rule ?? f.id} ${f.line ?? ""}: ${f.message ?? ""}`); } catch { styleFindings = [`unreadable output: ${style.stdout}${style.stderr}`]; }
  check("deep: style guard findings", styleFindings, []);
  console.log(`deep: ${file} (${rendered} items in ${SCENARIOS.length} host slots)`);
}

if (failures.length) {
  console.error(`✗ ${failures.length} failed, ${passed} passed\n\n${failures.join("\n\n")}`);
  process.exit(1);
}
console.log(`✓ Content slots and insert palette: ${passed} checks pass.`);
