#!/usr/bin/env node
// Writes the Zen descriptions into the live Figma library (file 9nZv4uW2LT21yuHabMTCh1) through the Figma MCP
// `use_figma` tool: this CLI prints the exact code of each call; send it as `code`, one call per command.
//
//   node tools/figma-docs/build.mjs pages                 the component pages and how many sets each call writes
//   node tools/figma-docs/build.mjs batch <n>             component set descriptions of a group of pages (see `pages`)
//   node tools/figma-docs/build.mjs sets "<name;name>"    only these sets, on whichever pages hold them
//   node tools/figma-docs/build.mjs components <pageId>   component set descriptions of one page (descriptionMarkdown)
//   node tools/figma-docs/build.mjs variables             every local variable (describeVariable)
//   node tools/figma-docs/build.mjs styles                text, effect and paint styles (describeStyle)
//   node tools/figma-docs/build.mjs preview <set|variable|style name>   print one description
//
// Restore: every call first copies the descriptions it replaces, as JSON, into a text layer of the frame
// "Description backup <date>" on the 🔒 ARCHIVED page (use_figma cannot save a named version); delete the frame once
// the new descriptions are reviewed. Sources: component-descriptions.mjs, variable-descriptions.mjs, style-descriptions.mjs. Old descriptions that look
// generated (component-descriptions GENERIC) are replaced; a specific one is kept unless its set is in FORCE. Each
// call answers in ASCII with what it wrote, kept and could not match, so drift in the file shows up at once.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { componentDescriptions, FORCE, GENERIC } from "./component-descriptions.mjs";
import { describeStyle } from "./style-descriptions.mjs";
import { describeVariable } from "./variable-descriptions.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contract = JSON.parse(fs.readFileSync(path.join(root, "docs/figma-contracts/component-properties.json"), "utf8"));
const [cmd, arg] = process.argv.slice(2);

/** Component pages of the library (id → name) and the sets each holds; pages newer than the contract are added here. */
const PAGES = {
  "211:19487": "❖ Avatar", "4215:6877": "❖ AI-Chat", "234:33035": "❖ Accordion", "234:32702": "❖ Alert Banner", "119:183941": "❖ Button",
  "239:18960": "❖ Badge", "291:43327": "❖ Breadcrumbs", "308:46219": "❖ Bottom Sheet (Mobile)", "6097:38910": "❖ Chat", "6643:49849": "❖ Card",
  "6143:31287": "❖ Chart", "320:79626": "❖ Chip/Pill", "308:46604": "❖ Checkbox", "373:97188": "❖ Color Selector", "460:38357": "❖ Divider",
  "298:45468": "❖ Dock Icon", "453:32817": "❖ Date Picker", "14857:3": "❖ Description List", "6062:27870": "❖ Empty State", "373:97258": "❖ Input",
  "595:54502": "❖ Inline Message", "4080:4632": "❖ List-Item", "694:9166": "❖ Modal & Dialog", "595:54968": "❖ Metric Widget (Dashboard)",
  "815:6432": "❖ Popover", "1531:13314": "❖ Progress", "774:15997": "❖ Pagination", "1536:355": "❖ Rating", "373:96221": "❖ Radio Button",
  "846:37480": "❖ Search", "1556:17601": "❖ Slider", "1536:27287": "❖ Sidebar", "1625:3394": "❖ Stepper", "1556:17503": "❖ Skeleton",
  "1070:17807": "❖ Segmented", "1573:2884": "❖ Side Panel / Side Sheet", "1573:3394": "❖ Tab", "260:5187": "❖ Tag", "1595:2631": "❖ Table ",
  "1307:27442": "❖ Toggle", "1595:2169": "❖ Tooltip", "1579:6872": "❖ Toast-Message (Snack)", "1581:17515": "❖ Uploader", "15081:1294": "❖ Voice",
  "510:39633": "❖ Top-Navigations (Mobile)", "4060:20144": "❖ Bottom-Navigations (Mobile)", "1128:29541": "◇ Master-Layout",
};
const EXTRA = {
  "❖ Bottom Sheet (Mobile)": ["Bottom-Sheet/Modal"],
  "❖ Chat": ["Chat/Section/Time", "Chat/Reaction-Bar", "Chat/Conversation-List/List-Item/Default", "Chat/Bubble/Voice", "Chat/Conversation/Reply", "Chat/Reply/Quote", "Chat/Composer-Reply"],
  "❖ Popover": ["Scroll-Bar", "Popover/Manual-Add-New"],
  "❖ Input": [".Primitives/Input/Color-Swatch"],
  "❖ Table ": ["Primitives/Table/Cell/Group-Avatar-Cell", "Table/Sheet/Cell", ".Primitives/Table/Sheet/Code", ".Primitives/Table/Sheet/Key"],
  "❖ Voice": ["Voice Recorder", "AI Voice Conversation"],
  "❖ Chart": ["Chart/Chart-Card", "Chart/Line-Chart", "Chart/Stack-Bar-Chart", "Chart/Area-Chart", "Chart/Grouped-Bar-Chart", "Chart/Combo-Chart", "Chart/Bar-List", "Chart/Gauge-Chart", "Chart/Funnel-Chart", "Chart/Bullet-Chart"],
  "◇ Master-Layout": ["Patterns/Pages/Density-Medium", "Patterns/Sidebar/Density-Medium", "Header/Dashboard", "Primitives/Notification-Dot"],
};
const setsOf = (pageName) => [...new Set([...(contract.pages.find((page) => page.page === pageName)?.sets.map((set) => set.name) ?? []), ...(EXTRA[pageName] ?? [])])];

const ARCHIVED_PAGE = "15:814";
const BACKUP = `Description backup ${new Date().toLocaleDateString("sv-SE")}`; // local YYYY-MM-DD
/** use_figma helper: appends `label` + the replaced descriptions as JSON to the backup frame on the ARCHIVED page. */
const BACKUP_CODE = `async function backup(label, data) {
  if (!Object.keys(data).length) return;
  const page = await figma.getNodeByIdAsync(${JSON.stringify(ARCHIVED_PAGE)});
  await page.loadAsync();
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  let frame = page.children.find((n) => n.name === ${JSON.stringify(BACKUP)});
  if (!frame) {
    frame = figma.createAutoLayout("VERTICAL", { name: ${JSON.stringify(BACKUP)}, itemSpacing: 24 });
    page.appendChild(frame);
    frame.x = Math.max(0, ...page.children.filter((n) => n !== frame).map((n) => n.x + n.width)) + 400;
  }
  const text = figma.createText();
  text.characters = label + "\\n" + JSON.stringify(data, null, 1);
  frame.appendChild(text);
  text.resize(1200, text.height);
  text.textAutoResize = "HEIGHT";
}`;
const ASCII = "JSON.stringify(result).replace(/[\\u0080-\\uffff]/g, (c) => \"\\\\u\" + c.charCodeAt(0).toString(16).padStart(4, \"0\"))";

function componentsCode(pageId) {
  const pageName = PAGES[pageId];
  if (!pageName) throw new Error(`Unknown page ${pageId}: run \`pages\``);
  const payload = Object.fromEntries(setsOf(pageName).filter((name) => componentDescriptions[name]).map((name) => [name, componentDescriptions[name]]));
  return `// Zen descriptions: component sets of ${pageName} (tools/figma-docs/build.mjs components ${pageId})
const D = ${JSON.stringify(payload, null, 1)};
const GENERIC = [${GENERIC.map(String).join(", ")}];
const FORCE = new Set(${JSON.stringify([...FORCE])});
const page = await figma.getNodeByIdAsync(${JSON.stringify(pageId)});
await figma.setCurrentPageAsync(page);
const nodes = page.findAllWithCriteria({ types: ["COMPONENT_SET", "COMPONENT"] }).filter((n) => n.type === "COMPONENT_SET" || n.parent.type !== "COMPONENT_SET");
${BACKUP_CODE}
const result = { page: page.name, written: [], kept: [], noText: [], notFound: [] };
const plan = [];
for (const node of nodes) {
  const text = D[node.name];
  if (text === undefined) { result.noText.push(node.name + (node.description ? " (has: " + node.description.slice(0, 60) + ")" : " (empty)")); continue; }
  const old = node.description || "";
  if (old && !FORCE.has(node.name) && !GENERIC.some((re) => re.test(old)) && old.length > 150) { result.kept.push(node.name + ": " + old.slice(0, 80)); continue; }
  plan.push([node, text]);
}
await backup("components " + page.name, Object.fromEntries(plan.map(([node]) => [node.id + " " + node.name, node.description])));
for (const [node, text] of plan) { node.descriptionMarkdown = text; result.written.push(node.name); }
for (const name of Object.keys(D)) if (!nodes.some((n) => n.name === name)) result.notFound.push(name);
result.check = nodes.length ? nodes[0].name + " :: " + (nodes[0].description || "").slice(0, 100) : "";
return ${ASCII};`;
}

/** Several pages per call (each loaded with page.loadAsync, no page switch), split to stay under use_figma's 50,000 characters. */
function batches(limit = 36000) {
  const groups = [[]];
  let size = 0;
  for (const id of Object.keys(PAGES)) {
    const payload = JSON.stringify(Object.fromEntries(setsOf(PAGES[id]).filter((name) => componentDescriptions[name]).map((name) => [name, componentDescriptions[name]])));
    if (size + payload.length > limit && groups[groups.length - 1].length) { groups.push([]); size = 0; }
    groups[groups.length - 1].push(id);
    size += payload.length;
  }
  return groups;
}

function batchCode(index, only = null) {
  const ids = only ? Object.keys(PAGES).filter((id) => setsOf(PAGES[id]).some((name) => only.includes(name))) : batches()[index];
  if (!ids) throw new Error(`No batch ${index}: run \`pages\``);
  const keep = (name) => componentDescriptions[name] && (!only || only.includes(name));
  const payload = Object.fromEntries(ids.map((id) => [id, Object.fromEntries(setsOf(PAGES[id]).filter(keep).map((name) => [name, componentDescriptions[name]]))]));
  return `// Zen descriptions: component sets of ${ids.length} pages (tools/figma-docs/build.mjs ${only ? `sets "${only.join(";")}"` : `batch ${index}`})
const PAGES = ${JSON.stringify(payload)};
const GENERIC = [${GENERIC.map(String).join(", ")}];
const FORCE = new Set(${JSON.stringify([...FORCE])});
${BACKUP_CODE}
const result = {};
const plan = [];
for (const [pageId, D] of Object.entries(PAGES)) {
  const page = await figma.getNodeByIdAsync(pageId);
  await page.loadAsync();
  const nodes = page.findAllWithCriteria({ types: ["COMPONENT_SET", "COMPONENT"] }).filter((n) => n.type === "COMPONENT_SET" || n.parent.type !== "COMPONENT_SET");
  const r = result[page.name] = { written: 0, kept: [], noText: [], notFound: [] };
  for (const node of nodes) {
    const text = D[node.name];
    if (text === undefined) { r.noText.push(node.name + (node.description ? " (has text)" : " (empty)")); continue; }
    const old = node.description || "";
    if (old && !FORCE.has(node.name) && !GENERIC.some((re) => re.test(old)) && old.length > 150) { r.kept.push(node.name + ": " + old.slice(0, 70)); continue; }
    plan.push([node, text, r]);
  }
  for (const name of Object.keys(D)) if (!nodes.some((n) => n.name === name)) r.notFound.push(name);
}
await backup("components " + Object.keys(result).join(", "), Object.fromEntries(plan.map(([node]) => [node.id + " " + node.name, node.description])));
for (const [node, text, r] of plan) { node.descriptionMarkdown = text; r.written += 1; }
for (const r of Object.values(result)) for (const key of ["kept", "noText", "notFound"]) if (!r[key].length) delete r[key];
return ${ASCII};`;
}

function variablesCode() {
  return `// Zen descriptions: every local variable (tools/figma-docs/build.mjs variables)
${describeVariable.toString()}
${BACKUP_CODE}
const result = { collections: {}, samples: [] };
const plan = [];
for (const collection of await figma.variables.getLocalVariableCollectionsAsync()) {
  const count = { total: collection.variableIds.length, written: 0, kept: 0 };
  for (const id of collection.variableIds) {
    const variable = await figma.variables.getVariableByIdAsync(id);
    const next = describeVariable(variable.name, collection.name, variable.description);
    if (next === null || next === undefined || next === variable.description) { count.kept += 1; continue; }
    plan.push([variable, next]);
    count.written += 1;
    if (count.written === 1 && result.samples.length < 8) result.samples.push(variable.name + " :: " + next.slice(0, 120));
  }
  result.collections[collection.name] = count;
}
await backup("variables", Object.fromEntries(plan.map(([variable]) => [variable.id + " " + variable.name, variable.description])));
for (const [variable, next] of plan) variable.description = next;
return ${ASCII};`;
}

function stylesCode() {
  return `// Zen descriptions: text, effect and paint styles (tools/figma-docs/build.mjs styles)
${describeStyle.toString()}
${BACKUP_CODE}
const result = { written: {}, noRule: [] };
const plan = [];
for (const [kind, styles] of [["TEXT", await figma.getLocalTextStylesAsync()], ["EFFECT", await figma.getLocalEffectStylesAsync()], ["PAINT", await figma.getLocalPaintStylesAsync()]]) {
  result.written[kind] = 0;
  for (const style of styles) {
    const next = describeStyle(kind, style.name);
    if (!next) { result.noRule.push(kind + " " + style.name + (style.description ? " (has text)" : "")); continue; }
    if (style.description !== next) { plan.push([style, next]); result.written[kind] += 1; }
  }
}
await backup("styles", Object.fromEntries(plan.map(([style]) => [style.id + " " + style.name, style.description])));
for (const [style, next] of plan) style.description = next;
return ${ASCII};`;
}

if (cmd === "pages") {
  for (const [id, name] of Object.entries(PAGES)) {
    const sets = setsOf(name);
    const described = sets.filter((set) => componentDescriptions[set]).length;
    console.log(`${id.padEnd(11)} ${name.padEnd(34)} ${described}/${sets.length} described · ${componentsCode(id).length} chars`);
  }
  console.log(`\nBatches: ${batches().map((ids, index) => `${index}: ${ids.length} pages, ${batchCode(index).length} chars`).join(" · ")}`);
  const placed = new Set(Object.values(PAGES).flatMap(setsOf));
  const orphans = Object.keys(componentDescriptions).filter((name) => !placed.has(name));
  if (orphans.length) console.log(`\nDescriptions on no page: ${orphans.join(", ")}`);
} else if (cmd === "sets") {
  console.log(batchCode(0, arg.split(";")));
} else if (cmd === "batch") {
  console.log(batchCode(Number(arg)));
} else if (cmd === "components") {
  console.log(componentsCode(arg));
} else if (cmd === "variables") {
  console.log(variablesCode());
} else if (cmd === "styles") {
  console.log(stylesCode());
} else if (cmd === "preview") {
  console.log(componentDescriptions[arg] ?? describeStyle("TEXT", arg) ?? describeStyle("EFFECT", arg) ?? describeStyle("PAINT", arg) ?? describeVariable(arg, process.argv[4] ?? "Mode Colors (Semantic)", ""));
} else {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 13).join("\n"));
}
