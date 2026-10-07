#!/usr/bin/env node
// Zen Studio editability audit (B1, 2026-10-04): which written props of Zen components the inspector cannot edit, by
// failure class, over every file Studio annotates (examples, playgrounds, showcases, templates). Static: it reads the
// source the way the inspector does (a literal is editable, anything else reads "Bound to …").
//
//   node tools/studio/editability-audit.mjs            summary by class, top props, samples
//   node tools/studio/editability-audit.mjs --json     every finding as JSON
//   node tools/studio/editability-audit.mjs --class=object-literal   list one class in full

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import { isAnnotatedFile } from "./jsx-source.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const onlyClass = args.find((arg) => arg.startsWith("--class="))?.slice(8) ?? null;

/* ── API: component props and the object types they take ─────────────────────────────────────────────────────────── */

const api = JSON.parse(readFileSync(path.join(root, "src/platform/api.generated.json"), "utf8"));
const props = new Map(); // component → Map(prop → type)
for (const entries of Object.values(api)) {
  for (const entry of entries) if (!props.has(entry.name)) props.set(entry.name, new Map(entry.props.map((prop) => [prop.name, prop.type])));
}
const objectTypes = new Set();
for (const file of readdirSync(path.join(root, "docs/api"))) {
  if (!file.endsWith(".json")) continue;
  const types = JSON.parse(readFileSync(path.join(root, "docs/api", file), "utf8")).types ?? {};
  for (const [name, declaration] of Object.entries(types)) if (/^(interface \w+|type \w+ = \{)/.test(declaration)) objectTypes.add(name);
}

const skipped = (name) => name === "children" || name === "className" || name === "style" || name === "ref" || name === "key" || /^data-/.test(name) || /^on[A-Z]/.test(name) || /^aria-/.test(name);

/** The inspector editor a prop type gets (a light port of propSchema.editorFor). */
function editorKind(type) {
  if (!type) return "unknown";
  if (/\bIconName\b/.test(type)) return "icon";
  if (/^\(.*\) => /.test(type)) return "function";
  const members = type.split("|").map((member) => member.trim());
  if (members.every((member) => /^["']/.test(member) || /^ZenScale(Input)?$|^Exclude<ZenScale/.test(member))) return "enum";
  if (members.includes("boolean")) return "boolean";
  if (members.every((member) => member === "string" || /^["']/.test(member))) return "string";
  if (members.every((member) => member === "number" || /^-?\d/.test(member))) return "number";
  if (members.includes("ReactNode")) return "node";
  if (members.some((member) => objectTypes.has(member.replace(/\[\]$|^Array<|>$|<.*$/g, "")))) return /\[\]|Array</.test(type) ? "object-array" : "object";
  return "other";
}

/* ── walk ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */

function annotatedFiles() {
  const out = [];
  const visit = (dir) => {
    for (const name of readdirSync(path.join(root, dir))) {
      const rel = `${dir}/${name}`;
      if (statSync(path.join(root, rel)).isDirectory()) visit(rel);
      else if (isAnnotatedFile(rel)) out.push(rel);
    }
  };
  visit("src/platform");
  visit("src/templates");
  return out.sort();
}

const jsxName = (node) => (node?.type === "JSXIdentifier" ? node.name : node?.type === "JSXMemberExpression" ? `${jsxName(node.object)}.${jsxName(node.property)}` : "");
const isLiteral = (node) => node.type === "StringLiteral" || node.type === "NumericLiteral" || node.type === "BooleanLiteral" || node.type === "NullLiteral"
  || (node.type === "TemplateLiteral" && node.expressions.length === 0)
  || (node.type === "UnaryExpression" && node.operator === "-" && node.argument.type === "NumericLiteral");

/** Names a function's params bind (map callbacks: `(item, index)`, `({ id, label })`). */
function paramNames(fn) {
  const out = new Set();
  const add = (node) => {
    if (!node) return;
    if (node.type === "Identifier") out.add(node.name);
    else if (node.type === "ObjectPattern") for (const prop of node.properties) add(prop.type === "RestElement" ? prop.argument : prop.value);
    else if (node.type === "ArrayPattern") for (const element of node.elements) add(element);
    else if (node.type === "AssignmentPattern") add(node.left);
    else if (node.type === "RestElement") add(node.argument);
  };
  for (const param of fn.params ?? []) add(param);
  return out;
}

/** The identifiers an expression reads (its roots: `one.online` → one). */
function rootsOf(node, out = new Set()) {
  if (!node || typeof node !== "object") return out;
  if (node.type === "Identifier") out.add(node.name);
  else if (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") rootsOf(node.object, out);
  else for (const key of ["test", "consequent", "alternate", "left", "right", "argument", "expressions", "callee", "arguments", "elements", "properties", "value"]) {
    const value = node[key];
    if (Array.isArray(value)) value.forEach((item) => rootsOf(item, out));
    else if (value && typeof value === "object") rootsOf(value, out);
  }
  return out;
}

const findings = [];
const stats = { files: 0, elements: 0, attributes: 0, editable: 0 };

for (const file of annotatedFiles()) {
  const code = readFileSync(path.join(root, file), "utf8");
  let ast;
  try {
    ast = parse(code, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true });
  } catch {
    continue;
  }
  stats.files += 1;
  // Top-level consts initialised with an object or array: data a prop may reference (`items={NAV}`).
  const dataConsts = new Set();
  for (const statement of ast.program.body) {
    const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
    if (declaration?.type !== "VariableDeclaration") continue;
    for (const declarator of declaration.declarations) {
      const init = declarator.init?.type === "TSAsExpression" || declarator.init?.type === "TSSatisfiesExpression" ? declarator.init.expression : declarator.init;
      if (declarator.id.type === "Identifier" && (init?.type === "ArrayExpression" || init?.type === "ObjectExpression")) dataConsts.add(declarator.id.name);
    }
  }

  const add = (finding) => findings.push({ file, ...finding });
  // ancestors: { node, key } frames, so an element knows whether it sits in a map callback or in another element's prop.
  const visit = (node, ancestors) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach((item) => visit(item, ancestors)); return; }
    if (typeof node.type !== "string") return;
    if (node.type === "JSXElement") inspect(node, ancestors);
    const next = [...ancestors, node];
    for (const key in node) {
      if (key === "loc" || key === "start" || key === "end" || key === "extra" || key === "leadingComments" || key === "trailingComments" || key === "innerComments") continue;
      const value = node[key];
      if (value && typeof value === "object") visit(value, next);
    }
  };

  const inspect = (element, ancestors) => {
    const name = jsxName(element.openingElement.name);
    const own = props.get(name);
    if (!own) return;
    stats.elements += 1;
    const line = element.openingElement.loc.start.line;
    // Loop data: params of every enclosing .map/.flatMap/.filter callback.
    const loopParams = new Set();
    let inMap = false;
    for (let index = 0; index < ancestors.length - 1; index++) {
      const node = ancestors[index];
      if ((node.type === "CallExpression" || node.type === "OptionalCallExpression") && /^(map|flatMap)$/.test(node.callee?.property?.name ?? "")) {
        const fn = node.arguments[0];
        if (fn && ancestors.includes(fn)) { inMap = true; for (const param of paramNames(fn)) loopParams.add(param); }
      }
    }
    // Written inside another Zen component's prop (a nested instance): the owner's Nested section lists its booleans only.
    let ownerProp = null;
    for (let index = ancestors.length - 1; index >= 1; index--) {
      const node = ancestors[index];
      if (node.type === "JSXAttribute") {
        const owner = ancestors[index - 2];
        if (owner?.type === "JSXElement" && props.has(jsxName(owner.openingElement.name))) ownerProp = `${jsxName(owner.openingElement.name)}.${jsxName(node.name)}`;
        break;
      }
      if (node.type === "JSXElement" && props.has(jsxName(node.openingElement.name)) && index < ancestors.length - 1) break;
    }

    for (const attr of element.openingElement.attributes) {
      if (attr.type === "JSXSpreadAttribute") {
        add({ class: "spread", component: name, prop: "{…}", line, code: code.slice(attr.start, attr.end), inMap });
        continue;
      }
      const prop = jsxName(attr.name);
      if (skipped(prop)) continue;
      stats.attributes += 1;
      const type = own.get(prop);
      const editor = editorKind(type);
      const value = attr.value;
      const report = (klass, extra = {}) => add({ class: klass, component: name, prop, editor, line, code: code.slice(attr.start, attr.end).replace(/\s+/g, " ").slice(0, 140), inMap, ownerProp, ...extra });
      if (!value || value.type === "StringLiteral") { stats.editable += 1; continue; }
      if (value.type !== "JSXExpressionContainer") continue; // JSX element value: a slot
      const expression = value.expression.type === "TSAsExpression" || value.expression.type === "TSSatisfiesExpression" ? value.expression.expression : value.expression;
      if (isLiteral(expression)) { stats.editable += 1; continue; }
      if (expression.type === "JSXElement" || expression.type === "JSXFragment") continue; // slot content: its elements are visited on their own
      if (expression.type === "ObjectExpression") { report("object-literal"); continue; }
      if (expression.type === "ArrayExpression") {
        const objects = expression.elements.some((item) => item?.type === "ObjectExpression");
        report(objects ? "array-of-objects" : "array-literal");
        continue;
      }
      if (expression.type === "ArrowFunctionExpression" || expression.type === "FunctionExpression") { report("render-function"); continue; }
      const roots = rootsOf(expression);
      if (expression.type === "Identifier" && dataConsts.has(expression.name)) { report("data-const"); continue; }
      if (editor === "object" || editor === "object-array" || editor === "other" || editor === "function" || editor === "unknown") { report("data-expression"); continue; }
      const loopBound = [...roots].some((root) => loopParams.has(root));
      report(loopBound ? "loop-bound" : expression.type === "ConditionalExpression" || expression.type === "LogicalExpression" ? "conditional" : "bound-value");
    }
  };

  visit(ast.program, []);
}

/* ── report ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

const classes = {
  "object-literal": { fix: "B2 ✓ setField", what: "prop={{ … }}: an object written in place (TopNavigation leading/searchAction, Card subAction, EmptyState action…)" },
  "array-of-objects": { fix: "B2 ✓ setField (per item)", what: "prop={[{ … }, …]}: a list of objects written in place (TopNavigation trailing, Tabs/Segmented options, ActionBar actions…)" },
  "array-literal": { fix: "— (plain values)", what: "prop={[…]} of plain values" },
  "data-const": { fix: "B2+ (edit the const)", what: "prop={NAME}: data a top-level const of the same file holds" },
  "data-expression": { fix: "— (inherent)", what: "object/array/other-typed prop computed or imported (state, props, helpers)" },
  "loop-bound": { fix: "B4 (per-item data)", what: "scalar prop fed by a .map() item (`status={one.online}`): one element renders every row" },
  "bound-value": { fix: "B4 (override)", what: "scalar prop bound to a variable/state (`checked={on}`, `size={size}`)" },
  conditional: { fix: "B4 (override)", what: "scalar prop written as `a ? b : c` / `a && b`" },
  "render-function": { fix: "— (inherent)", what: "a function-valued prop that is not a handler (cell, render…)" },
  spread: { fix: "— (read-only by design)", what: "{...rest}: props a spread feeds stay read-only" },
};

if (asJson) {
  process.stdout.write(JSON.stringify({ stats, findings }, null, 2) + "\n");
  process.exit(0);
}

const byClass = new Map();
for (const finding of findings) {
  if (!byClass.has(finding.class)) byClass.set(finding.class, []);
  byClass.get(finding.class).push(finding);
}

if (onlyClass) {
  for (const finding of byClass.get(onlyClass) ?? []) console.log(`${finding.file}:${finding.line}  <${finding.component}> ${finding.code}`);
  process.exit(0);
}

const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : "0%");
console.log(`Zen Studio editability audit — ${stats.files} files, ${stats.elements} Zen elements, ${stats.attributes} written props (${stats.editable} literal = editable, ${pct(stats.editable, stats.attributes)})\n`);
console.log("| Class | Fix | Props | Files | What |");
console.log("| --- | --- | ---: | ---: | --- |");
for (const [klass, meta] of Object.entries(classes)) {
  const list = byClass.get(klass) ?? [];
  console.log(`| ${klass} | ${meta.fix} | ${list.length} | ${new Set(list.map((item) => item.file)).size} | ${meta.what} |`);
}
for (const klass of ["object-literal", "array-of-objects", "array-literal", "data-const", "loop-bound", "bound-value", "conditional"]) {
  const list = byClass.get(klass) ?? [];
  if (!list.length) continue;
  const counts = new Map();
  for (const item of list) counts.set(`${item.component}.${item.prop}`, (counts.get(`${item.component}.${item.prop}`) ?? 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([key, count]) => `${key} ×${count}`).join(", ");
  console.log(`\n${klass} — top: ${top}`);
  for (const sample of list.slice(0, 3)) console.log(`  ${sample.file}:${sample.line}  ${sample.code}`);
}
const nested = findings.filter((item) => item.ownerProp && ["loop-bound", "bound-value", "conditional"].includes(item.class));
console.log(`\nNested instances with a bound prop (owner's Nested section shows it locked): ${nested.length}`);
