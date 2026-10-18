#!/usr/bin/env node
// Self-test of ./words.ts (imported directly: Node strips the types): design words on Studio pages (plan criterion 7).
// 1. Fixed rewrites of the messages a designer meets most. 2. Every message the engine and the Studio write (refuse,
// fail, inspectorStatus.set, message / reason / hint / note / short fields), read from the source with Babel, comes out
// of designWords with no code words left. Run: node src/platform/studio/words.selftest.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import { codeWordsIn, designWords } from "./words.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  if (actual === expected) passed += 1;
  else failures.push(`${label}\n    expected ${JSON.stringify(expected)}\n    actual   ${JSON.stringify(actual)}`);
};

// 1. The messages of the usability walks and the plan's examples.
const cases = [
  ["Saved in this browser · local:untitled-page.zen.tsx:26", "Saved in this browser"],
  ["Saved · local:untitled-page.zen.tsx:25 · ⌘Z to undo", "Saved · ⌘Z to undo"],
  ["Saved · button.tsx:84 · ⌘Z to undo", "Saved · button.tsx · ⌘Z to undo"],
  ["Set by AppShellAccount at src/platform/examples/pages/app-shell.tsx:140:6", "Set by AppShellAccount at app-shell.tsx"],
  ["<Menu> has no children to drop into; drop beside it instead.", "Menu can't hold layers; drop beside it instead."],
  ["MetricCard has a key; a copy would repeat it — edit it in the code", "MetricCard is drawn once per row of a list; a copy would repeat that row — edit it in the code"],
  ["Bound to {me.photo}. An edit sets a fixed value; Restore brings the binding back", "From data: me › photo. An edit sets a fixed value; Restore brings the data link back"],
  ["Bound to {person.theme}: change it in the code", "From data: person › theme: change it in the code"],
  ["Bound to {rows.filter((row) => row.open).length}", "Set in code"],
  ["Bound to the on/off state {open}: one line when on", "Bound to the on/off state data: open: one line when on"],
  ["It spreads {...rest}: detach needs every prop written out.", "It takes shared properties: detach needs every property written out."],
  ["A builder page has no hooks: an action is proto.toast(…), proto.navigate(…) or proto.open(…)", "A builder page has no app logic: an action is Show toast, Go to page or Open overlay"],
  ["<PersonAvatar> has no children to drop into", "PersonAvatar can't hold layers"],
  ["a <div> would break the List", "a frame would break the List"],
  ["The Table's rows come from a .map; edit them in the code", "The Table's rows come from a list; edit them in the code"],
  ["labelIcon is not written in place; edit it in the code.", "label icon is not written in place; edit it in the code."],
  ["Example code not updated: a paste is not copied into the example snippet", "The example's code is not updated: a paste is not copied into the example code"],
  ["No element starts at 12:4; select the layer again", "No layer starts here; select the layer again"],
  ["Card is no longer at untitled-page.zen.tsx:26 — select it again", "Card is no longer there — select it again"],
  ["The row comes from a spread; edit it where it is written", "The row comes from a shared set of properties; edit it where it is written"],
  ["Not imported: broken.zen.tsx is not a page", "Not imported: broken.zen.tsx is not a page"],
  ['Not imported: broken.zen.tsx (line 1: Line 1 must be the page header: // @zen-page {"format":1,"title":"…"})', "Not imported: broken.zen.tsx (line 1: Line 1 must be the page header)"],
  ["Dropped photo.webp on Avatar", "Dropped photo.webp on Avatar"],
  ["Changes save at once", "Changes save at once"],
  ["Duplicated · ⌘Z to undo", "Duplicated · ⌘Z to undo"],
  ["Several rows of the data have the key \"alex\"; edit it in the code", "Several rows of the data have the id \"alex\"; edit it in the code"],
  // F0 (plan docs/research/studio-figma-design-parity-2026-10-18.md): the gate's missing words, a / an, identifiers.
  ["An expression sets it", "A value sets it"],
  ["Wrapped Card in a Stack", "Wrapped Card in an auto layout frame"],
  ["Card floats in a Box around it", "Card floats in a frame around it"],
  ["The attribute data-zen-src stays", "The property data-zen-src stays"],
  ["List-Box renders its rows", "List-Box shows its rows"],
  ["Restart the dev server to detach components", "Restart the Studio server to detach components"],
  ["The Zen Studio dev server did not answer", "The Studio server did not answer"],
  ["An element of the HTML markup", "A layer of the code layers"],
  ["Column A is an object literal", "Column A is a group of values"],
];
for (const [input, expected] of cases) check(`designWords(${JSON.stringify(input)})`, designWords(input), expected);
check("codeWordsIn: a clean line", codeWordsIn("Saved · ⌘Z to undo").join(), "");
check("codeWordsIn: file:line", codeWordsIn("Saved · button.tsx:84").join(), "file:line");

// 2. Every message in the source.
const MESSAGE_KEYS = new Set(["message", "reason", "hint", "note", "short"]);
const CALLS = new Set(["refuse", "fail"]);
const sample = (expression, code) => {
  const text = code.slice(expression.start, expression.end);
  if (/\bline\b|\.from\b|\bloc\b/.test(text)) return "84";
  if (/file/i.test(text)) return "button.tsx";
  return "Card";
};
const textOf = (node, code) => {
  if (!node) return null;
  if (node.type === "StringLiteral") return node.value;
  if (node.type === "TemplateLiteral") return node.quasis.map((quasi, index) => quasi.value.cooked + (node.expressions[index] ? sample(node.expressions[index], code) : "")).join("");
  return null;
};
const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!["e2e", "fixtures", "node_modules"].includes(entry.name)) walk(full); }
    else if (/\.(?:ts|tsx|mjs)$/.test(entry.name) && !/selftest|\.d\.ts$|generated/.test(entry.name)) files.push(full);
  }
};
walk(path.join(root, "tools/studio"));
walk(path.join(root, "src/platform/studio"));
const messages = new Map();
for (const file of files) {
  const code = fs.readFileSync(file, "utf8");
  let ast;
  try { ast = parse(code, { sourceType: "module", plugins: file.endsWith(".mjs") ? [] : ["typescript", "jsx"], errorRecovery: true }); }
  catch { continue; }
  const visit = (node) => {
    if (!node || typeof node.type !== "string") return;
    if (node.type === "CallExpression") {
      const callee = node.callee;
      const name = callee.type === "Identifier" ? callee.name : callee.type === "MemberExpression" && callee.property.type === "Identifier" ? callee.property.name : null;
      const isStatus = callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "inspectorStatus" && name === "set";
      const text = CALLS.has(name) ? textOf(node.arguments[0], code) : isStatus ? textOf(node.arguments[1], code) : null;
      if (text) messages.set(text, `${path.relative(root, file)}:${node.loc.start.line}`);
    }
    if (node.type === "ObjectProperty" && !node.computed && MESSAGE_KEYS.has(node.key.name ?? node.key.value)) {
      const text = textOf(node.value, code);
      if (text && /\s/.test(text)) messages.set(text, `${path.relative(root, file)}:${node.loc.start.line}`);
    }
    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "start" || key === "end") continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value.type === "string") visit(value);
    }
  };
  visit(ast.program);
}
let checked = 0;
for (const [text, where] of messages) {
  checked += 1;
  const said = designWords(text);
  const left = codeWordsIn(said);
  if (left.length) failures.push(`${where}: ${left.join(", ")} left\n    message ${JSON.stringify(text)}\n    said    ${JSON.stringify(said)}`);
  else passed += 1;
}
if (checked < 300) failures.push(`only ${checked} messages found in the source (the scan is broken?)`);

// 3. Figma's words on the UI (plan docs/research/studio-figma-design-parity-2026-10-18.md §3a, F0): every label,
// tooltip, title, placeholder and JSX text of the Studio's own UI, with the words the glossary retired. A new string
// that brings one back fails here; the right-hand side is the word to write instead.
const RETIRED = [
  [/\bQuick actions\b/i, "Actions"],
  [/\bQuick insert\b/i, "Assets"],
  [/\bZoom to frame\b/, "Zoom to selection"],
  [/\bPresent (?:full screen|the frame)\b/, "Present"],
  [/\b(?:Hide|Show) side panels\b|\bHide or show UI\b/, "Show/Hide UI"],
  [/\bSelect first child\b/, "Select children"],
  [/\bReset all overrides\b/, "Reset all changes"],
  [/\bMove (?:up|down|earlier|later)\b/, "Bring forward / Send backward"],
  [/\bReset to auto\b/, "Hug contents"],
  [/\bChild (?:elements|size)\b|^Children$/, "Layers"],
  [/\b(?:colour|centre|centred|cancelled|behaviour)/i, "US spelling (color, center, canceled, behavior)"],
  [/\bunsaved drafts?\b|\bDraft ·|\bDiscard (?:the )?drafts?\b/i, "Unsaved changes"],
  [/^(?:Admin|Viewer)$/, "Can edit / Can view"],
];
const UI_ATTRS = new Set(["label", "aria-label", "tooltip", "title", "placeholder", "description", "caption", "aria-description"]);
const UI_KEYS = new Set(["label", "title", "tooltip", "caption", "description", "placeholder"]);
// Labels a person reads as they are (JSX attributes and text) also carry no code words: Figma's own command names and
// the Code tab / export / setup surfaces (where code is the subject) excepted.
const FIGMA_TERMS = /\bSelect children\b/g;
const CODE_SURFACES = /(?:^|\/)(?:code\/|CodePanel|CodeProperties|propSchema|ExportDialog|gate\.ts)/;
let uiChecked = 0;
const uiText = (node, code) => {
  if (!node) return null;
  if (node.type === "JSXExpressionContainer") return uiText(node.expression, code);
  if (node.type === "ConditionalExpression") return [uiText(node.consequent, code), uiText(node.alternate, code)].filter(Boolean).join(" | ") || null;
  // An interpolation reads as a plain value here (textOf's samples would glue into camelCase words).
  if (node.type === "TemplateLiteral") return node.quasis.map((quasi, index) => quasi.value.cooked + (node.expressions[index] ? " 1 " : "")).join("");
  return textOf(node, code);
};
const lint = (text, where) => {
  if (!text || !/[A-Za-z]/.test(text)) return;
  uiChecked += 1;
  for (const [pattern, word] of RETIRED) {
    for (const part of text.split(" | ")) {
      if (pattern.test(part.trim())) failures.push(`${where}: "${part.trim()}" → write ${word}`);
    }
  }
};
const words = (text, where) => {
  if (!text || CODE_SURFACES.test(where)) return;
  const left = codeWordsIn(text.replace(FIGMA_TERMS, ""));
  if (left.length) failures.push(`${where}: code words (${left.join(", ")}) in "${text}"`);
};
for (const file of files.filter((name) => name.includes(`${path.sep}src${path.sep}platform${path.sep}studio${path.sep}`))) {
  const code = fs.readFileSync(file, "utf8");
  let ast;
  try { ast = parse(code, { sourceType: "module", plugins: file.endsWith(".mjs") ? [] : ["typescript", "jsx"], errorRecovery: true }); }
  catch { continue; }
  const where = (node) => `${path.relative(root, file)}:${node.loc.start.line}`;
  const visit = (node) => {
    if (!node || typeof node.type !== "string") return;
    if (node.type === "JSXAttribute" && UI_ATTRS.has(node.name.name)) { const text = uiText(node.value, code); lint(text, where(node)); words(text, where(node)); }
    if (node.type === "JSXText") { lint(node.value.trim(), where(node)); words(node.value.trim(), where(node)); }
    if (node.type === "ObjectProperty" && !node.computed && UI_KEYS.has(node.key.name ?? node.key.value)) lint(uiText(node.value, code), where(node));
    if (node.type === "CallExpression" && node.callee.type === "Identifier" && ["tip", "sayNotYet", "say"].includes(node.callee.name)) lint(uiText(node.arguments.at(-1), code), where(node));
    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "start" || key === "end") continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value.type === "string") visit(value);
    }
  };
  visit(ast.program);
}
if (uiChecked < 1000) failures.push(`only ${uiChecked} UI strings found in the Studio (the scan is broken?)`);

if (failures.length) {
  console.error(`✗ words: ${failures.length} failure(s), ${passed} passed\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`✓ words: ${passed} checks (${cases.length} rewrites, ${checked} source messages in design words, ${uiChecked} UI strings in Figma's words)`);
