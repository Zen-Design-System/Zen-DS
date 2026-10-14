#!/usr/bin/env node
// Zen Studio slot audit (2026-10-09, user: "kiểm tra lại hết các slot … mọi thao tác bên Studio phải thoải mái tự do như
// Figma"): for every content slot (src/platform/studio/slots/registry.ts) of every Zen instance in the files the Studio
// annotates (examples, playgrounds, showcases, templates), what its content is written as, and so whether the Studio's
// slot editing (add, remove, move, swap) reaches it. Static: it reads the source as the slot ops do.
//
//   node tools/studio/slot-audit.mjs                 summary by class, by component, samples
//   node tools/studio/slot-audit.mjs --json          every slot as JSON
//   node tools/studio/slot-audit.mjs --class=const-jsx   list one class in full
//
// Classes (one per piece of content; a slot can hold several):
//   jsx        elements, fragments or text written in place: every slot op reaches them
//   const-jsx  `{name}` / prop={name} where `const name = <JSX>` in the same file: the content is JSX, written elsewhere
//   map        `{items.map(…)}`: one element written once, rendered per row
//   condition  `{a && <X/>}` / `{a ? <X/> : <Y/>}`
//   forwarded  `{children}` / prop={props.x}: content the enclosing component receives from where it is used
//   call       `{renderX()}`, `{helper(…)}`
//   value      a string, number or other value written as code
//   other      anything else

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import { createHash } from "node:crypto";
import { isAnnotatedFile } from "./jsx-source.mjs";
import { applySlotOp, isSharedFile, isSlotFile } from "./slots.mjs";
import { dataRowEdit } from "./data-source.mjs";
import { componentModulesFrom } from "./component-modules.mjs";
import { CONTENT_SLOTS } from "../../src/platform/studio/slots/registry.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const onlyClass = args.find((arg) => arg.startsWith("--class="))?.slice(8) ?? null;
// --ops: run every slot op the Studio offers (insert, clear, remove, duplicate, move) in memory on every slot of the
// files where slot content is edited, with the Studio's own engine (slots.mjs), and count what is refused and why.
const runOps = args.includes("--ops") || args.some((arg) => arg.startsWith("--op="));
// --op=move (or insert, clear, remove, duplicate): only that op.
const onlyOp = args.find((arg) => arg.startsWith("--op="))?.slice(5) ?? null;
const wants = (op) => !onlyOp || onlyOp === op;

function annotatedFiles() {
  const out = [];
  const visit = (dir) => {
    for (const name of readdirSync(path.join(root, dir))) {
      const rel = `${dir}/${name}`;
      if (statSync(path.join(root, rel)).isDirectory()) visit(rel);
      else if (isAnnotatedFile(rel)) out.push(rel);
    }
  };
  visit("src");
  return out.sort();
}

const TS = new Set(["TSAsExpression", "TSNonNullExpression", "TSSatisfiesExpression", "ParenthesizedExpression", "TSTypeAssertion"]);
const unwrap = (node) => { let current = node; while (current && TS.has(current.type)) current = current.expression; return current; };
const jsxName = (name) => (name.type === "JSXIdentifier" ? name.name : name.type === "JSXMemberExpression" ? `${jsxName(name.object)}.${name.property.name}` : "");
const SKIP = new Set(["loc", "start", "end", "extra", "leadingComments", "trailingComments", "innerComments", "range"]);

/** `const name = …` visible from the node at the end of `ancestors` (blocks and the program, innermost first). */
function declarationOf(ancestors, name) {
  for (let index = ancestors.length - 1; index >= 0; index--) {
    const node = ancestors[index];
    const statements = node.type === "Program" || node.type === "BlockStatement" ? node.body : null;
    if (!statements) {
      // A parameter binds the name for its function's body.
      if ((node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") && node.params.some((param) => bindsName(param, name))) return { kind: "param" };
      continue;
    }
    for (const statement of statements) {
      const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
      if (declaration?.type !== "VariableDeclaration") continue;
      for (const declarator of declaration.declarations) {
        if (declarator.id.type === "Identifier" && declarator.id.name === name) return { kind: declaration.kind, init: unwrap(declarator.init) };
        if (bindsName(declarator.id, name)) return { kind: "pattern" };
      }
    }
  }
  return null;
}

function bindsName(pattern, name) {
  if (!pattern) return false;
  if (pattern.type === "Identifier") return pattern.name === name;
  if (pattern.type === "AssignmentPattern") return bindsName(pattern.left, name);
  if (pattern.type === "RestElement") return bindsName(pattern.argument, name);
  if (pattern.type === "ArrayPattern") return pattern.elements.some((element) => bindsName(element, name));
  if (pattern.type === "ObjectPattern") return pattern.properties.some((property) => bindsName(property.type === "RestElement" ? property.argument : property.value, name));
  return false;
}

/** The class of one piece of slot content (an expression, or a JSX child). */
function classify(node, ancestors) {
  const value = unwrap(node);
  if (!value) return "other";
  if (value.type === "JSXElement" || value.type === "JSXFragment" || value.type === "JSXText") return "jsx";
  if (value.type === "StringLiteral" || value.type === "NumericLiteral" || value.type === "TemplateLiteral") return "value";
  if (value.type === "Identifier") {
    if (value.name === "children") return "forwarded";
    const declaration = declarationOf(ancestors, value.name);
    if (!declaration) return "other";
    if (declaration.kind === "param" || declaration.kind === "pattern") return "forwarded";
    if (declaration.init?.type === "JSXElement" || declaration.init?.type === "JSXFragment") return declaration.kind === "const" ? "const-jsx" : "other";
    return "other";
  }
  if (value.type === "MemberExpression" && value.object.type === "Identifier" && /^props$/.test(value.object.name)) return "forwarded";
  if (value.type === "CallExpression") {
    const callee = value.callee;
    if (callee.type === "MemberExpression" && callee.property.type === "Identifier" && (callee.property.name === "map" || callee.property.name === "flatMap")) return "map";
    return "call";
  }
  if (value.type === "LogicalExpression" || value.type === "ConditionalExpression") return "condition";
  return "other";
}

/** The JSX elements a piece of content holds at its top level: itself, a condition's branches, a .map's row, a const's JSX. */
function elementsIn(node, ancestors) {
  const raw = node.type === "JSXAttribute" ? node.value : node;
  const value = unwrap(raw?.type === "JSXExpressionContainer" ? raw.expression : raw);
  if (!value) return [];
  if (value.type === "JSXElement") return [value];
  if (value.type === "JSXFragment") return value.children.flatMap((child) => (child.type === "JSXElement" ? [child] : child.type === "JSXExpressionContainer" ? elementsIn(child, ancestors) : []));
  if (value.type === "LogicalExpression") return elementsIn(value.right, ancestors);
  if (value.type === "ConditionalExpression") return [...elementsIn(value.consequent, ancestors), ...elementsIn(value.alternate, ancestors)];
  if (value.type === "CallExpression" && value.callee.type === "MemberExpression" && value.callee.property.name === "map") {
    const fn = value.arguments[0];
    if (!fn || !("body" in fn)) return [];
    if (fn.body.type !== "BlockStatement") return elementsIn(fn.body, ancestors);
    return fn.body.body.flatMap((statement) => (statement.type === "ReturnStatement" && statement.argument ? elementsIn(statement.argument, ancestors) : []));
  }
  if (value.type === "Identifier") {
    const declaration = declarationOf(ancestors, value.name);
    if (declaration?.init && (declaration.init.type === "JSXElement" || declaration.init.type === "JSXFragment")) return elementsIn(declaration.init, ancestors);
  }
  return [];
}

const slotsOf = (name) => CONTENT_SLOTS[name]?.slots ?? [];

/** One slot's pieces of content: [] when empty. */
function piecesOf(element, slot, ancestors) {
  if (slot.prop === "children") {
    const pieces = [];
    for (const child of element.children) {
      if (child.type === "JSXText" && !child.value.trim()) continue;
      if (child.type === "JSXExpressionContainer") {
        if (child.expression.type === "JSXEmptyExpression") continue; // a comment
        pieces.push({ cls: classify(child.expression, ancestors), node: child });
      } else pieces.push({ cls: child.type === "JSXText" ? "jsx" : classify(child, ancestors), node: child });
    }
    return pieces;
  }
  const attr = element.openingElement.attributes.findLast((item) => item.type === "JSXAttribute" && item.name.name === slot.prop);
  if (!attr) return [];
  if (!attr.value) return [{ cls: "value", node: attr }];
  if (attr.value.type !== "JSXExpressionContainer") return [{ cls: attr.value.type === "StringLiteral" ? "value" : classify(attr.value, ancestors), node: attr }];
  const expression = unwrap(attr.value.expression);
  if (expression.type === "JSXEmptyExpression" || (expression.type === "Identifier" && expression.name === "undefined") || expression.type === "NullLiteral") return [];
  // A fragment's pieces are its children.
  if (expression.type === "JSXFragment") return piecesOf({ children: expression.children, openingElement: { attributes: [] } }, { prop: "children" }, ancestors);
  return [{ cls: classify(expression, ancestors), node: attr }];
}

const findings = [];
for (const file of annotatedFiles()) {
  const text = readFileSync(path.join(root, file), "utf8");
  let ast;
  try { ast = parse(text, { sourceType: "module", plugins: ["jsx", "typescript"] }); } catch { continue; }
  const ancestors = [];
  const visit = (node) => {
    if (!node || typeof node.type !== "string") return;
    if (node.type === "JSXElement") {
      const name = jsxName(node.openingElement.name);
      for (const slot of slotsOf(name)) {
        const pieces = piecesOf(node, slot, [...ancestors, node]);
        const finding = { file, line: node.loc.start.line, component: name, slot: slot.prop, name: slot.name, classes: pieces.map((piece) => piece.cls), code: pieces.filter((piece) => piece.cls !== "jsx").map((piece) => text.slice(piece.node.start, piece.node.end).replace(/\s+/g, " ").slice(0, 90)) };
        if (runOps) {
          const scope = [...ancestors, node];
          finding.host = { loc: `${node.loc.start.line}:${node.loc.start.column}`, name };
          finding.targets = pieces.flatMap((piece) => elementsIn(piece.node, scope).map((element) => ({ cls: piece.cls, loc: `${element.loc.start.line}:${element.loc.start.column}`, name: jsxName(element.openingElement.name), direct: element === piece.node })));
          finding.text = text;
        }
        findings.push(finding);
      }
    }
    ancestors.push(node);
    for (const [key, value] of Object.entries(node)) {
      if (SKIP.has(key)) continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value.type === "string") visit(value);
    }
    ancestors.pop();
  };
  visit(ast.program);
}

if (runOps) {
  const componentModules = componentModulesFrom(root);
  const sha1 = (value) => createHash("sha1").update(value).digest("hex");
  const hashes = new Map();
  const results = new Map(); // "op · class" → { ok, refused: Map(reason → count), samples }
  const note = (key, response, where) => {
    const entry = results.get(key) ?? { ok: 0, refused: new Map(), samples: new Map() };
    if (response.error === undefined) entry.ok += 1;
    else {
      const reason = `${response.code}: ${String(response.error).replace(/<[^>]+>/g, "<X>").replace(/\b\d+(:\d+)?\b/g, "N").replace(/"[^"]*"/g, '"…"').replace(/`[^`]*`/g, "`…`").slice(0, 150)}`;
      entry.refused.set(reason, (entry.refused.get(reason) ?? 0) + 1);
      if (!entry.samples.has(reason)) entry.samples.set(reason, where);
    }
    results.set(key, entry);
  };
  const CODE = '<Text tone="base">Note</Text>';
  const readRepo = (rel) => { try { return readFileSync(path.join(root, rel), "utf8"); } catch { return null; } };
  let count = 0;
  for (const finding of findings) {
    if (!isSlotFile(finding.file) && !isSharedFile(finding.file)) continue;
    const text = finding.text;
    if (!hashes.has(finding.file)) hashes.set(finding.file, sha1(text));
    const options = { file: finding.file, componentModules, requiredChildren: new Set(), requiredProps: new Map(), hash: hashes.get(finding.file), shared: true, snippets: false };
    const prop = finding.slot === "children" ? {} : { prop: finding.slot };
    const where = `${finding.file}:${finding.line} ${finding.component}.${finding.slot}`;
    const slotClass = !finding.classes.length ? "empty" : finding.classes.every((cls) => cls === "jsx") ? "jsx" : finding.classes.find((cls) => cls !== "jsx");
    if (wants("insert")) { note(`insert · ${slotClass}`, applySlotOp(text, finding.host.loc, finding.host.name, { op: "insertChild", ...prop, code: CODE }, options), where); count += 1; }
    if (finding.classes.length && wants("clear")) { note(`clear · ${slotClass}`, applySlotOp(text, finding.host.loc, finding.host.name, { op: "clearSlot", ...prop }, options), where); count += 1; }
    for (const target of finding.targets) {
      const at = `${finding.file}:${target.loc} <${target.name}> in ${finding.component}.${finding.slot}`;
      // A .map row's root goes to its list's data (the plugin's route for ops with `row`), anything else to the code.
      const rowOrCode = (op) => {
        const data = dataRowEdit(text, finding.file, target.loc, target.name, { op, row: 0 }, { read: readRepo });
        return data.notRow ? applySlotOp(text, target.loc, target.name, { op }, options) : data;
      };
      if (wants("remove")) { note(`remove · ${target.cls}`, rowOrCode("removeElement"), at); count += 1; }
      if (wants("duplicate")) { note(`duplicate · ${target.cls}`, rowOrCode("duplicateElement"), at); count += 1; }
      // A row selected on the canvas moves in its data (the first row, down; a one-row list has nowhere to go).
      if (target.cls === "map" && wants("move")) {
        const data = dataRowEdit(text, finding.file, target.loc, target.name, { op: "moveElement", to: "next", row: 0 }, { read: readRepo });
        if (!data.notRow && !/is already the last row/.test(String(data.error ?? ""))) { note("move row · map", data, at); count += 1; }
      }
      if (finding.slot === "children" && finding.targets.length > 1 && wants("move")) {
        for (const to of ["prev", "next"]) {
          // A const shown in several places moves where this slot shows it (the Studio sends that holder as `parent`).
          const holder = target.cls === "const-jsx" ? { parent: finding.host.loc } : {};
          const response = applySlotOp(text, target.loc, target.name, { op: "moveElement", to, ...holder }, options);
          // First and last items have nowhere to go one way: not a refusal of the item.
          if (!/is already the (first|last) item/.test(String(response.error ?? ""))) { note(`move · ${target.cls}`, response, at); count += 1; }
        }
      }
    }
  }
  console.log(`Slot ops run in memory: ${count} ops on the slots of example pages, templates and shared demo code (insert <Text>, clear, remove, duplicate, move)`);
  console.log("");
  console.log("| Op · content | OK | Refused | Top refusal |");
  console.log("| --- | ---: | ---: | --- |");
  for (const [key, entry] of [...results].sort((a, b) => a[0].localeCompare(b[0]))) {
    const refused = [...entry.refused.values()].reduce((sum, value) => sum + value, 0);
    const top = [...entry.refused].sort((a, b) => b[1] - a[1])[0];
    console.log(`| ${key} | ${entry.ok} | ${refused} | ${top ? `${top[1]}× ${top[0]}` : ""} |`);
  }
  console.log("");
  console.log("Refusals with a sample each:");
  for (const [key, entry] of results) {
    // Every reason for one op (--op=…), the top four otherwise.
    for (const [reason, times] of [...entry.refused].sort((a, b) => b[1] - a[1]).slice(0, onlyOp ? undefined : 4)) console.log(`  ${key}  ${times}×  ${reason}\n      e.g. ${entry.samples.get(reason)}`);
  }
  process.exit(0);
}

if (asJson) {
  console.log(JSON.stringify(findings, null, 2));
  process.exit(0);
}

const CLASSES = ["jsx", "const-jsx", "map", "condition", "forwarded", "call", "value", "other"];
const pieces = findings.flatMap((finding) => finding.classes.map((cls) => ({ ...finding, cls })));
const slots = findings.length;
const empty = findings.filter((finding) => !finding.classes.length).length;
const free = findings.filter((finding) => finding.classes.length && finding.classes.every((cls) => cls === "jsx")).length;
const blocked = findings.filter((finding) => finding.classes.some((cls) => cls !== "jsx"));
if (onlyClass) {
  for (const finding of blocked.filter((item) => item.classes.includes(onlyClass))) console.log(`${finding.file}:${finding.line}  ${finding.component}.${finding.slot}  ${finding.code.join(" | ")}`);
  process.exit(0);
}
console.log(`Zen Studio slot audit — ${slots} slots of ${new Set(findings.map((finding) => `${finding.file}:${finding.line}`)).size} instances: ${empty} empty, ${free} all JSX in place (every slot op), ${blocked.length} with content written as code`);
console.log("");
console.log("| Class | Pieces | Slots | Files |");
console.log("| --- | ---: | ---: | ---: |");
for (const cls of CLASSES) {
  const hits = pieces.filter((piece) => piece.cls === cls);
  if (!hits.length) continue;
  console.log(`| ${cls} | ${hits.length} | ${new Set(hits.map((hit) => `${hit.file}:${hit.line}:${hit.slot}`)).size} | ${new Set(hits.map((hit) => hit.file)).size} |`);
}
console.log("");
const byComponent = new Map();
for (const finding of blocked) {
  const key = `${finding.component}.${finding.slot}`;
  const entry = byComponent.get(key) ?? { count: 0, classes: new Map() };
  entry.count += 1;
  for (const cls of finding.classes) if (cls !== "jsx") entry.classes.set(cls, (entry.classes.get(cls) ?? 0) + 1);
  byComponent.set(key, entry);
}
console.log("Slots with code content, by component slot:");
for (const [key, entry] of [...byComponent].sort((a, b) => b[1].count - a[1].count).slice(0, 25)) {
  console.log(`  ${String(entry.count).padStart(4)}  ${key}  (${[...entry.classes].map(([cls, count]) => `${cls} ${count}`).join(", ")})`);
}
console.log("");
for (const cls of CLASSES.filter((cls) => cls !== "jsx")) {
  const samples = blocked.filter((finding) => finding.classes.includes(cls)).slice(0, 3);
  if (!samples.length) continue;
  console.log(`${cls}:`);
  for (const sample of samples) console.log(`  ${sample.file}:${sample.line}  ${sample.component}.${sample.slot}  ${sample.code[0] ?? ""}`);
}
