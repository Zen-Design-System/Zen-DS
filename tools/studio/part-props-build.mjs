#!/usr/bin/env node
// Zen Studio: which props a component passes on, unchanged, to the components its JSX renders. A deep-selected part
// (ModalActions inside a ModalForm) is then edited through its owner, like Figma's exposed nested instances: the
// Inspector shows the part's `direction` and writes the owner's `actionsDirection`. Read from the component sources
// (src/components/**/*.tsx, stories left out): `<ModalActions direction={actionsDirection} />` in ModalForm gives
// PART_PROPS.ModalForm.ModalActions.direction = "actionsDirection".
//
// Passed on unchanged: the attribute's value is one of the owner's props, through its destructured name
// (`{ actionsDirection }`, `{ size: sizeProp = "md" }`) or `props.x`, also behind `??` / `||` (a fallback) or a type
// assertion. Anything computed (a ternary, a call, a template) is not: the part cannot be edited through it.
//
//   node tools/studio/part-props-build.mjs           write src/platform/studio/inspector/partProps.generated.ts
//   node tools/studio/part-props-build.mjs --check   exit 1 when that file is out of date
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = "src/platform/studio/inspector/partProps.generated.ts";
const check = process.argv.includes("--check");

/** Every component source: .tsx under src/components, stories left out. */
function sources(dir = path.join(root, "src/components")) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return entry.name.endsWith(".tsx") && !entry.name.endsWith(".stories.tsx") ? [full] : [];
  }).sort();
}

const isComponentName = (name) => typeof name === "string" && /^[A-Z]/.test(name);
const FUNCTIONS = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

/** A component's function in a declaration: `function X()`, `const X = (…) => …`, `forwardRef(function X(…))`, `memo(…)`. */
function componentFunctions(ast) {
  const out = [];
  const fromInit = (name, init) => {
    if (!init) return;
    if (FUNCTIONS.has(init.type)) { out.push({ name, fn: init }); return; }
    // forwardRef(fn) / memo(fn) / forwardRef<…>(fn), also nested (memo(forwardRef(fn))).
    if (init.type === "CallExpression" && init.arguments.length) fromInit(name, init.arguments[0]);
  };
  const visit = (node) => {
    if (!node) return;
    if (node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration") { visit(node.declaration); return; }
    if (node.type === "FunctionDeclaration" && isComponentName(node.id?.name)) out.push({ name: node.id.name, fn: node });
    if (node.type === "VariableDeclaration") {
      for (const declarator of node.declarations) if (declarator.id.type === "Identifier" && isComponentName(declarator.id.name)) fromInit(declarator.id.name, declarator.init);
    }
  };
  for (const statement of ast.program.body) visit(statement);
  return out;
}

/** The owner's props by their local names: `{ size: sizeProp = "md", ...rest }` → sizeProp → size. */
function propLocals(fn) {
  const locals = new Map();
  const param = fn.params[0];
  let propsObject = null;
  const fromPattern = (pattern) => {
    for (const property of pattern.properties) {
      if (property.type !== "ObjectProperty" || property.computed) continue;
      const key = property.key.type === "Identifier" ? property.key.name : property.key.type === "StringLiteral" ? property.key.value : null;
      if (!key) continue;
      const value = property.value.type === "AssignmentPattern" ? property.value.left : property.value;
      if (value.type === "Identifier") locals.set(value.name, key);
    }
  };
  const target = param?.type === "AssignmentPattern" ? param.left : param;
  if (target?.type === "ObjectPattern") fromPattern(target);
  if (target?.type === "Identifier") propsObject = target.name;
  // `const { a, b: c } = props;` in the body.
  if (propsObject && fn.body.type === "BlockStatement") {
    for (const statement of fn.body.body) {
      if (statement.type !== "VariableDeclaration") continue;
      for (const declarator of statement.declarations) {
        if (declarator.id.type === "ObjectPattern" && declarator.init?.type === "Identifier" && declarator.init.name === propsObject) fromPattern(declarator.id);
      }
    }
  }
  return { locals, propsObject };
}

/** Names a function's parameters bind (they shadow an owner prop of the same name inside it). */
function paramNames(fn) {
  const names = new Set();
  const add = (pattern) => {
    if (!pattern) return;
    if (pattern.type === "Identifier") names.add(pattern.name);
    else if (pattern.type === "AssignmentPattern") add(pattern.left);
    else if (pattern.type === "RestElement") add(pattern.argument);
    else if (pattern.type === "ArrayPattern") pattern.elements.forEach(add);
    else if (pattern.type === "ObjectPattern") pattern.properties.forEach((property) => add(property.type === "RestElement" ? property.argument : property.value));
  };
  fn.params.forEach(add);
  return names;
}

/** The owner prop an attribute value passes on unchanged, or null. */
function passedProp(expression, owner, shadowed) {
  if (!expression) return null;
  if (expression.type === "Identifier") return !shadowed.has(expression.name) && owner.locals.has(expression.name) ? owner.locals.get(expression.name) : null;
  if (expression.type === "MemberExpression" && !expression.computed && expression.object.type === "Identifier" && expression.object.name === owner.propsObject
    && !shadowed.has(owner.propsObject) && expression.property.type === "Identifier") return expression.property.name;
  // A fallback (`size ?? "md"`, `level || "primary"`) still passes the prop on when it is set.
  if (expression.type === "LogicalExpression" && (expression.operator === "??" || expression.operator === "||")) return passedProp(expression.left, owner, shadowed);
  if (expression.type === "TSAsExpression" || expression.type === "TSNonNullExpression" || expression.type === "TSSatisfiesExpression" || expression.type === "ParenthesizedExpression") return passedProp(expression.expression, owner, shadowed);
  return null;
}

const SKIP_KEYS = new Set(["loc", "start", "end", "extra", "leadingComments", "trailingComments", "innerComments", "range"]);
/** Attributes the Inspector never edits as a field: DOM plumbing and handlers. */
const PLUMBING = /^(?:data-|aria-|on[A-Z])|^(?:className|style|ref|key|id|children)$/;

/** Capitalised names the function declares itself (`const Tag = onClick ? "button" : "div"`): elements, not parts. */
function localTags(fn) {
  const names = new Set();
  const walk = (node) => {
    if (!node || typeof node.type !== "string") return;
    if (node.type === "VariableDeclarator" && node.id.type === "Identifier" && isComponentName(node.id.name)) names.add(node.id.name);
    for (const [key, value] of Object.entries(node)) {
      if (SKIP_KEYS.has(key)) continue;
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value.type === "string") walk(value);
    }
  };
  walk(fn.body);
  return names;
}

/** owner → part → { part prop: owner prop }, from one component function. */
function forwardsOf(fn, out, ownerName) {
  const owner = propLocals(fn);
  if (!owner.locals.size && !owner.propsObject) return;
  const locals = localTags(fn);
  const walk = (node, shadowed) => {
    if (!node || typeof node.type !== "string") return;
    let scope = shadowed;
    if (FUNCTIONS.has(node.type) && node !== fn) {
      const params = paramNames(node);
      if (params.size) scope = new Set([...shadowed, ...params]);
    }
    if (node.type === "JSXOpeningElement" && node.name.type === "JSXIdentifier" && isComponentName(node.name.name) && !locals.has(node.name.name)) {
      const part = node.name.name;
      for (const attribute of node.attributes) {
        if (attribute.type !== "JSXAttribute" || attribute.name.type !== "JSXIdentifier" || attribute.value?.type !== "JSXExpressionContainer") continue;
        if (PLUMBING.test(attribute.name.name)) continue;
        const prop = passedProp(attribute.value.expression, owner, scope);
        if (!prop) continue;
        const parts = (out[ownerName] ??= {});
        const props = (parts[part] ??= {});
        // The first place a part is rendered wins (the same part rendered twice usually gets the same props).
        props[attribute.name.name] ??= prop;
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (SKIP_KEYS.has(key)) continue;
      if (Array.isArray(value)) value.forEach((child) => walk(child, scope));
      else if (value && typeof value.type === "string") walk(value, scope);
    }
  };
  walk(fn.body, new Set());
}

const map = {};
for (const file of sources()) {
  const text = fs.readFileSync(file, "utf8");
  let ast;
  try {
    ast = parse(text, { sourceType: "module", plugins: ["jsx", "typescript"] });
  } catch (error) {
    console.error(`✗ ${path.relative(root, file)} does not parse: ${error.message}`);
    process.exit(1);
  }
  for (const { name, fn } of componentFunctions(ast)) forwardsOf(fn, map, name);
}

const sorted = (object) => Object.fromEntries(Object.keys(object).sort().map((key) => [key, typeof object[key] === "object" ? sorted(object[key]) : object[key]]));
const body = JSON.stringify(sorted(map), null, 2);
const output = [
  "// Generated by tools/studio/part-props-build.mjs from src/components/**/*.tsx: do not edit by hand.",
  "/** Owner component → the components its JSX renders → their props it passes on unchanged → the owner prop. */",
  `export const PART_PROPS: Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, string>>>>>> = ${body};`,
  "",
].join("\n");

const target = path.join(root, OUT);
const owners = Object.keys(map).length;
const pairs = Object.values(map).reduce((sum, parts) => sum + Object.keys(parts).length, 0);
if (check) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (current !== output) {
    console.error(`✗ ${OUT} is out of date: run node tools/studio/part-props-build.mjs`);
    process.exit(1);
  }
  console.log(`✓ part props up to date (${owners} owners, ${pairs} parts)`);
} else {
  fs.writeFileSync(target, output);
  console.log(`✓ wrote ${OUT} (${owners} owners, ${pairs} parts)`);
}
