// Zen Studio: where a written value comes from, and the edit of that value at its source (WP-C of
// docs/research/studio-builder-plan-2026-10-05.md). Pure: the dev server hands it the effective text of any file it
// needs to read (`read(rel)`: the draft, else the disk; null when there is no such file).
//
//   originOf(code, file, loc, { prop } | { child })      what feeds the prop (or the expression child) of the element at loc
//   dataFieldEdit(code, file, loc, name, op, { read })   op setDataField { prop? | child?, row, value }: the edit at the
//                                                        source, { file, code } (possibly another file), or { error, code }
//
// Sources it can follow (a value is edited only where it is written as a literal):
//   - a .map row: `{crew.map((one) => <ListItem title={one.name} />)}` → crew[row].name, where crew is an array literal
//     inline, a const of the file, a useState initializer (the starting data) or an import (examples/data.ts…);
//     `.slice(n)` shifts the row; `[people.ava, people.bao].map(…)` resolves each item on its own;
//   - an object const or import read by path: `title={studio.name}`;
//   - a factory call `person("ava", "Ava Chen", "UX Researcher", …)` whose function returns `{ id, name, role, … }`:
//     the field maps to its parameter's argument.
// Refused, with the reason the Inspector shows: .filter / .sort / other calls before the .map, computed keys, spreads,
// state that the component changes (useState read directly: that is setStateInit's, keep-behaviour rule), values that
// are not literals at their source.
import { findElement, jsxName, parseLoc, parseSource } from "./jsx-source.mjs";
import { pathTo } from "./source-helpers.mjs";

const FUNCTION_TYPES = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression", "ObjectMethod", "ClassMethod"]);
const MAP_METHODS = new Set(["map", "flatMap"]);
/** Files whose data the Studio may edit at the source (the plugin checks the real path again). */
export const isDataFile = (rel) => typeof rel === "string" && ((/^src\/(platform|templates)\/.+\.(ts|tsx)$/.test(rel) && !rel.startsWith("src/platform/studio/") && !rel.includes("?")) || /^local:[a-z0-9][a-z0-9-]*\.zen\.tsx$/.test(rel));

class Refusal extends Error {
  constructor(message, code = "forbidden") { super(message); this.code = code; }
}
const refuse = (message, code) => { throw new Refusal(message, code); };

const unwrap = (node) => {
  let current = node;
  while (current && (current.type === "TSAsExpression" || current.type === "TSSatisfiesExpression" || current.type === "TSNonNullExpression" || current.type === "ParenthesizedExpression" || current.type === "TSTypeAssertion")) current = current.expression;
  return current;
};
const keyName = (key) => (key?.type === "Identifier" ? key.name : key?.type === "StringLiteral" ? key.value : key?.type === "NumericLiteral" ? String(key.value) : null);
const isLiteralNode = (node) => node && (node.type === "StringLiteral" || node.type === "NumericLiteral" || node.type === "BooleanLiteral" || node.type === "NullLiteral"
  || (node.type === "TemplateLiteral" && node.expressions.length === 0)
  || (node.type === "UnaryExpression" && node.operator === "-" && node.argument.type === "NumericLiteral"));

/* ── module context: one parsed file, and the files it imports ───────────────────────────────────────────────────── */

function moduleOf(file, code) {
  const ast = parseSource(code.startsWith("﻿") ? code.slice(1) : code);
  if (!ast) refuse(`${file} does not parse`, "invalid");
  return { file, code: code.startsWith("﻿") ? code.slice(1) : code, ast };
}

const dirOf = (rel) => rel.slice(0, rel.lastIndexOf("/"));
function joinPosix(base, relative) {
  const parts = base.split("/");
  for (const piece of relative.split("/")) {
    if (piece === "" || piece === ".") continue;
    if (piece === "..") parts.pop();
    else parts.push(piece);
  }
  return parts.join("/");
}

/** The module an import specifier names (relative imports only: data lives next to the examples). */
function importedModule(from, source, read) {
  if (!source.startsWith(".")) return null;
  const base = joinPosix(dirOf(from.file), source);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (!/\.(ts|tsx)$/.test(candidate)) continue;
    const text = read(candidate);
    if (typeof text === "string") return moduleOf(candidate, text);
  }
  return null;
}

/** The declaration `name` refers to at `node` in `mod`: { kind: "const" | "state" | "param" | "import" | "function", … }. */
function bindingOf(mod, name, node) {
  const path = pathTo(mod.ast.program, node) ?? [];
  // Innermost first: the enclosing functions' params and declarations, then the module.
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const scope = path[index];
    if (FUNCTION_TYPES.has(scope.type)) {
      for (const [position, param] of scope.params.entries()) {
        const found = patternBinding(param, name);
        if (found) return { kind: "param", fn: scope, position, path: found.path, call: path[index - 1] };
      }
    }
    const body = scope.type === "Program" ? scope.body : scope.type === "BlockStatement" ? scope.body : null;
    if (!body) continue;
    for (const statement of body) {
      const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
      if (declaration?.type === "VariableDeclaration") {
        for (const declarator of declaration.declarations) {
          if (declarator.id.type === "Identifier" && declarator.id.name === name) {
            const init = unwrap(declarator.init);
            if (init?.type === "CallExpression" && init.callee.type === "Identifier" && init.callee.name === "useState") return { kind: "state-value", declarator, init };
            return { kind: "const", declarator, init, constant: declaration.kind === "const" };
          }
          if (declarator.id.type === "ArrayPattern" && declarator.id.elements[0]?.type === "Identifier" && declarator.id.elements[0].name === name) {
            const init = unwrap(declarator.init);
            if (init?.type === "CallExpression" && (keyName(init.callee) === "useState" || keyName(init.callee?.property) === "useState")) return { kind: "state", declarator, init };
          }
        }
      }
      if (declaration?.type === "FunctionDeclaration" && declaration.id?.name === name) return { kind: "function", fn: declaration };
      if (statement.type === "ImportDeclaration") {
        const spec = statement.specifiers.find((s) => s.local.name === name);
        if (spec) return { kind: "import", source: statement.source.value, imported: spec.type === "ImportSpecifier" ? keyName(spec.imported) : spec.type === "ImportDefaultSpecifier" ? "default" : "*" };
      }
    }
  }
  return null;
}

/** Where `name` sits inside a parameter pattern: { path } (field names from the argument), or null. */
function patternBinding(pattern, name, path = []) {
  if (!pattern) return null;
  if (pattern.type === "Identifier") return pattern.name === name ? { path } : null;
  if (pattern.type === "AssignmentPattern") return patternBinding(pattern.left, name, path);
  if (pattern.type === "ObjectPattern") {
    for (const property of pattern.properties) {
      if (property.type === "RestElement") continue;
      const key = property.computed ? null : keyName(property.key);
      if (key === null) continue;
      const found = patternBinding(property.value, name, [...path, key]);
      if (found) return found;
    }
  }
  return null;
}

/** An exported const (or function) of `mod`: its value node, or null. */
function exportedValue(mod, name) {
  for (const statement of mod.ast.program.body) {
    const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : null;
    if (declaration?.type === "VariableDeclaration") {
      for (const declarator of declaration.declarations) if (declarator.id.type === "Identifier" && declarator.id.name === name) return { mod, node: unwrap(declarator.init), declarator };
    }
    if (statement.type === "ExportNamedDeclaration" && !statement.declaration) {
      const spec = statement.specifiers.find((s) => keyName(s.exported) === name);
      if (spec) {
        const local = keyName(spec.local);
        const found = bindingOf(mod, local, mod.ast.program);
        if (found?.kind === "const") return { mod, node: found.init, declarator: found.declarator };
      }
    }
  }
  return null;
}

/* ── following a value to the literal that writes it ─────────────────────────────────────────────────────────────── */

/**
 * The node that holds the value of `expr` in `mod`, followed through consts, imports, member paths and factory calls,
 * then `path` (field names) into it: { mod, node } where node is what to replace, or a Refusal.
 */
function follow(mod, expr, path, read, seen = new Set()) {
  const node = unwrap(expr);
  if (!node) refuse("The value is empty");
  if (seen.size > 24) refuse("The data goes through too many steps to follow");
  if (!path.length) return { mod, node };
  if (node.type === "ObjectExpression") {
    const [first, ...rest] = path;
    // Last property wins (a later key overrides a spread or an earlier key).
    const property = [...node.properties].reverse().find((p) => p.type === "ObjectProperty" && !p.computed && keyName(p.key) === first);
    if (!property) {
      if (node.properties.some((p) => p.type === "SpreadElement")) refuse(`"${first}" comes from a spread in the data; edit it where it is written`);
      refuse(`The data has no "${first}" field`, "not-found");
    }
    // Shorthand `{ name }` inside a factory's return: the caller resolves the parameter (follow never gets here then).
    return follow(mod, property.value, rest, read, seen);
  }
  if (node.type === "ArrayExpression") {
    const index = Number(path[0]);
    if (!Number.isInteger(index) || index < 0) refuse(`"${path[0]}" is not a row of the list`);
    const item = node.elements[index];
    if (!item) refuse(`The list has no row ${index + 1}`, "not-found");
    if (item.type === "SpreadElement") refuse("The row comes from a spread; edit it where it is written");
    return follow(mod, item, path.slice(1), read, seen);
  }
  if (node.type === "Identifier") {
    const key = `${mod.file}:${node.name}:${node.start}`;
    if (seen.has(key)) refuse("The data refers to itself");
    seen.add(key);
    const binding = bindingOf(mod, node.name, node);
    if (!binding) refuse(`${node.name} is not declared in ${fileName(mod.file)}`, "not-found");
    if (binding.kind === "const") return follow(mod, binding.init, path, read, seen);
    if (binding.kind === "state-value" || binding.kind === "state") refuse(`${node.name} is state the example changes; its starting value is edited as the initial state`);
    if (binding.kind === "import") {
      const target = importedModule(mod, binding.source, read);
      if (!target) refuse(`${node.name} comes from ${binding.source}, which the Studio cannot read`);
      const value = exportedValue(target, binding.imported);
      if (!value) refuse(`${binding.source} does not export ${binding.imported} as data`, "not-found");
      return follow(target, value.node, path, read, seen);
    }
    refuse(`${node.name} is computed in the code, not data the Studio can edit`);
  }
  if (node.type === "MemberExpression" && !node.computed) return follow(mod, node.object, [keyName(node.property), ...path], read, seen);
  if (node.type === "MemberExpression" && node.computed && (node.property.type === "StringLiteral" || node.property.type === "NumericLiteral")) return follow(mod, node.object, [String(node.property.value), ...path], read, seen);
  if (node.type === "CallExpression" && node.callee.type === "Identifier") {
    // A factory: `person(id, name, role, …)` with `const person = (id, name, role) => ({ id, name, role, … })`.
    const factory = resolveFactory(mod, node.callee.name, node, read);
    const [first, ...rest] = path;
    const param = factory.fields.get(first);
    if (param === undefined) refuse(`${node.callee.name}(…) builds "${first}" in its own code; edit ${node.callee.name} or the data passed to it`);
    const argument = node.arguments[param.index];
    if (!argument) refuse(`${node.callee.name}(…) gets no argument for "${first}" here`);
    if (argument.type === "SpreadElement") refuse(`${node.callee.name}(…) gets its arguments from a spread here`);
    return follow(mod, argument, [...param.path, ...rest], read, seen);
  }
  if (node.type === "CallExpression") refuse("The data is computed by a call; edit it in the code");
  refuse("The value is computed in the code, not written as data");
  return null;
}

/** A local or imported factory function's field → parameter map (fields written as a param, shorthand or not). */
function resolveFactory(mod, name, at, read) {
  let binding = bindingOf(mod, name, at);
  let owner = mod;
  if (binding?.kind === "import") {
    const target = importedModule(mod, binding.source, read);
    const value = target ? exportedValue(target, binding.imported) : null;
    if (!value) refuse(`${name}(…) comes from ${binding.source}, which the Studio cannot read`);
    owner = target;
    binding = { kind: "const", init: value.node };
  }
  const fn = binding?.kind === "function" ? binding.fn : binding?.kind === "const" ? unwrap(binding.init) : null;
  if (!fn || !FUNCTION_TYPES.has(fn.type)) refuse(`${name}(…) is not a function the Studio can read`);
  let body = fn.body.type === "BlockStatement" ? fn.body.body.find((statement) => statement.type === "ReturnStatement")?.argument : fn.body;
  body = unwrap(body);
  if (body?.type !== "ObjectExpression") refuse(`${name}(…) does not return an object literal`);
  const params = new Map(fn.params.map((param, index) => [param.type === "AssignmentPattern" ? param.left.name : param.name, index]).filter(([key]) => typeof key === "string"));
  const fields = new Map();
  for (const property of body.properties) {
    if (property.type !== "ObjectProperty" || property.computed) continue;
    const key = keyName(property.key);
    const value = unwrap(property.value);
    if (key && value?.type === "Identifier" && params.has(value.name)) fields.set(key, { index: params.get(value.name), path: [] });
  }
  return { owner, fields };
}

const fileName = (rel) => rel.split("/").pop();

/* ── the element and its value ───────────────────────────────────────────────────────────────────────────────────── */

function locate(mod, loc, name) {
  const target = parseLoc(loc);
  if (!target) refuse(`Bad loc "${loc}"`, "invalid");
  const element = findElement(mod.ast, target);
  if (!element) refuse(`No JSX element starts at ${loc}`, "not-found");
  const actual = jsxName(element.openingElement.name);
  if (name && actual !== name) refuse(`Expected <${name}> at ${loc}, found <${actual}>`, "stale");
  return element;
}

/** The expression a prop or an expression child holds, or null for a literal / missing value. */
function valueExpression(element, target) {
  if (typeof target.prop === "string") {
    const attr = element.openingElement.attributes.find((a) => a.type === "JSXAttribute" && jsxName(a.name) === target.prop);
    if (!attr) refuse(`<${jsxName(element.openingElement.name)}> has no ${target.prop}`, "not-found");
    if (!attr.value || attr.value.type === "StringLiteral") return null;
    if (attr.value.type !== "JSXExpressionContainer") return null;
    return unwrap(attr.value.expression);
  }
  if (Number.isInteger(target.child)) {
    const children = element.children.filter((child) => !(child.type === "JSXText" && !child.value.trim()));
    const child = children[target.child];
    if (!child || child.type !== "JSXExpressionContainer") refuse("That child is not an expression", "not-found");
    return unwrap(child.expression);
  }
  refuse("Name the prop or the child", "invalid");
  return null;
}

/** The .map row that renders `node`: { call, fn, array, offset } or null. Refuses filters, sorts and nested functions. */
function mapRowOf(mod, node) {
  const path = pathTo(mod.ast.program, node) ?? [];
  for (let index = path.length - 1; index >= 1; index -= 1) {
    const fn = path[index];
    if (!FUNCTION_TYPES.has(fn.type)) continue;
    const call = path[index - 1];
    const isMap = (call?.type === "CallExpression" || call?.type === "OptionalCallExpression") && call.arguments[0] === fn
      && call.callee.type === "MemberExpression" && !call.callee.computed && MAP_METHODS.has(keyName(call.callee.property));
    if (!isMap) return null;
    let array = unwrap(call.callee.object);
    let offset = 0;
    // `list.slice(n)` / `list.slice(n, m)`: rows start at n.
    if (array?.type === "CallExpression" && array.callee.type === "MemberExpression" && keyName(array.callee.property) === "slice") {
      const start = array.arguments[0];
      offset = start?.type === "NumericLiteral" ? start.value : start ? NaN : 0;
      if (!Number.isInteger(offset)) refuse("The list is sliced from a computed place; edit the data in the code");
      array = unwrap(array.callee.object);
    }
    if (array?.type === "CallExpression") {
      const method = array.callee.type === "MemberExpression" ? keyName(array.callee.property) : keyName(array.callee);
      refuse(`The rows go through ${method ?? "a call"}(…) before .map, so a row on the canvas is not the same row in the data; edit the data in the code`);
    }
    return { call, fn, array, offset };
  }
  return null;
}

/** Field path of a member chain rooted at `root` (`one.address.city` → ["address", "city"]), or null. */
function memberPath(expr) {
  const path = [];
  let node = unwrap(expr);
  while (node?.type === "MemberExpression") {
    if (node.computed && node.property.type !== "StringLiteral" && node.property.type !== "NumericLiteral") return null;
    path.unshift(node.computed ? String(node.property.value) : keyName(node.property));
    node = unwrap(node.object);
  }
  return node?.type === "Identifier" ? { root: node, path } : null;
}

/**
 * What feeds the value: a describe-only answer for the Inspector.
 * { kind: "literal" } · { kind: "state", name } · { kind: "row", source, path, offset } · { kind: "data", source, path }
 * · { kind: "conditional" | "expression", reason } — `source` names the list or object ("crew", "people.ava").
 */
function classify(mod, element, target) {
  const expr = valueExpression(element, target);
  if (!expr || isLiteralNode(expr)) return { kind: "literal" };
  if (expr.type === "ConditionalExpression" || expr.type === "LogicalExpression") return { kind: "conditional", reason: "The value is chosen by a condition in the code" };
  const chain = memberPath(expr);
  if (!chain) return { kind: "expression", reason: "The value is computed in the code" };
  const binding = bindingOf(mod, chain.root.name, chain.root);
  if (binding?.kind === "state" || binding?.kind === "state-value") return { kind: "state", name: chain.root.name };
  if (binding?.kind === "param") {
    const row = mapRowOf(mod, expr);
    if (!row || row.fn !== binding.fn) return { kind: "expression", reason: `${chain.root.name} is a parameter; its value comes from where the component is used` };
    if (binding.position !== 0) return { kind: "expression", reason: `${chain.root.name} is the row's index, not data` };
    const source = mod.code.slice(row.array.start, row.array.end);
    return { kind: "row", source: source.length > 40 ? `${source.slice(0, 37)}…` : source, path: [...binding.path, ...chain.path], offset: row.offset, array: row.array };
  }
  if (binding?.kind === "const" || binding?.kind === "import") return { kind: "data", source: [chain.root.name, ...chain.path].join("."), path: chain.path, root: chain.root };
  return { kind: "expression", reason: "The value is computed in the code" };
}

/** Describe where the value of `target` ({ prop } or { child }) comes from, and whether its source can be edited. */
export function originOf(code, file, loc, target, { read = () => null } = {}) {
  try {
    const mod = moduleOf(file, code);
    return describeOrigin(mod, locate(mod, loc), target, read);
  } catch (error) {
    if (error instanceof Refusal) return { kind: "unknown", editable: false, reason: error.message };
    throw error;
  }
}

/**
 * originOf for several targets of one element, parsing the file once (GET /element: every expression prop and child).
 * Returns the origins in the order of `targets`; literal values are left out by the caller.
 */
export function originsOf(code, file, loc, targets, { read = () => null } = {}) {
  let mod;
  let element;
  try {
    mod = moduleOf(file, code);
    element = locate(mod, loc);
  } catch (error) {
    if (error instanceof Refusal) return targets.map(() => ({ kind: "unknown", editable: false, reason: error.message }));
    throw error;
  }
  return targets.map((target) => {
    try {
      return describeOrigin(mod, element, target, read);
    } catch (error) {
      if (error instanceof Refusal) return { kind: "unknown", editable: false, reason: error.message };
      throw error;
    }
  });
}

/** classify, then follow a row or data path to tell whether its source is a literal the Studio can edit. */
function describeOrigin(mod, element, target, read) {
  const origin = classify(mod, element, target);
  if (origin.kind === "row") {
    // Editable when row 0's field resolves to a literal (every row is checked when it is edited).
    try {
      const found = follow(mod, origin.array, [String(origin.offset), ...origin.path], read);
      return { kind: "row", editable: isLiteralNode(found.node), source: origin.source, path: origin.path, file: found.mod.file, reason: isLiteralNode(found.node) ? undefined : "The row's value is computed in the code" };
    } catch (error) {
      if (error instanceof Refusal) return { kind: "row", editable: false, source: origin.source, path: origin.path, reason: error.message };
      throw error;
    }
  }
  if (origin.kind === "data") {
    try {
      const found = follow(mod, origin.root, origin.path, read);
      return { kind: "data", editable: isLiteralNode(found.node), source: origin.source, file: found.mod.file, reason: isLiteralNode(found.node) ? undefined : "The value is computed in the code" };
    } catch (error) {
      if (error instanceof Refusal) return { kind: "data", editable: false, source: origin.source, reason: error.message };
      throw error;
    }
  }
  return { ...origin, editable: origin.kind === "literal" };
}

/* ── the edit ────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A literal in the source's own quote style. */
function literalCode(value, previous, text) {
  switch (value?.kind) {
    case "string": {
      if (typeof value.value !== "string") break;
      const quote = previous?.type === "StringLiteral" ? text[previous.start] : previous?.type === "TemplateLiteral" ? "`" : '"';
      const escaped = [...value.value].map((char) => {
        if (char === "\\") return "\\\\";
        if (char === quote) return `\\${quote}`;
        if (char === "\n") return quote === "`" ? "\n" : "\\n";
        if (char === "\r") return "\\r";
        if (char === " " || char === " ") return `\\u${char.charCodeAt(0).toString(16)}`;
        if (quote === "`" && char === "$") return "\\$";
        if (char < " " || char === "\u007f") return `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
        return char;
      }).join("");
      return `${quote}${escaped}${quote}`;
    }
    case "number":
      if (typeof value.value === "number" && Number.isFinite(value.value)) return String(Object.is(value.value, -0) ? 0 : value.value);
      break;
    case "boolean":
      if (typeof value.value === "boolean") return String(value.value);
      break;
    default:
  }
  refuse("setDataField takes a string, number or boolean value", "invalid");
  return "";
}

/**
 * Op setDataField { prop? | child?, row?, value }: writes `value` where the value of the element's prop (or expression
 * child) is written as data. For a .map row, `row` is the index of the rendered row (the client counts it on the
 * canvas). Returns { file, code, source } — `file` may be another file (examples/data.ts) — or { error, code }.
 */
/** Whether `fn` (a .map callback) returns `element` itself: the row's root, not something inside it. */
function returnsElement(fn, element) {
  const body = unwrap(fn.body);
  if (body === element) return true;
  if (body?.type !== "BlockStatement") return false;
  return body.body.some((statement) => statement.type === "ReturnStatement" && unwrap(statement.argument) === element);
}

/**
 * The array literal a .map reads ({ mod, node, state }), followed through consts, imports and member paths (follow
 * stops at once with no path); a useState initializer is the list the frame starts with (`state`: the client starts
 * the frame again, Fast Refresh would keep the old rows).
 */
function listOf(mod, expr, read, seen = new Set()) {
  const node = unwrap(expr);
  if (node?.type === "ArrayExpression") return { mod, node, state: false };
  if (seen.size > 24) refuse("The data goes through too many steps to follow");
  if (node?.type === "Identifier") {
    const key = `${mod.file}:${node.name}:${node.start}`;
    if (seen.has(key)) refuse("The data refers to itself");
    seen.add(key);
    const binding = bindingOf(mod, node.name, node);
    if (!binding) refuse(`${node.name} is not declared in ${fileName(mod.file)}`, "not-found");
    if (binding.kind === "const" && binding.constant) return listOf(mod, binding.init, read, seen);
    if (binding.kind === "state") {
      const initial = unwrap(binding.init.arguments[0]);
      if (!initial || FUNCTION_TYPES.has(initial.type)) refuse(`${node.name} starts from code, not a list the Studio can edit`);
      return { ...listOf(mod, initial, read, seen), state: true };
    }
    if (binding.kind === "import") {
      const target = importedModule(mod, binding.source, read);
      if (!target) refuse(`${node.name} comes from ${binding.source}, which the Studio cannot read`);
      const value = exportedValue(target, binding.imported);
      if (!value) refuse(`${binding.source} does not export ${binding.imported} as data`, "not-found");
      return listOf(target, value.node, read, seen);
    }
    refuse(`${node.name} is computed in the code, not a list the Studio can edit`);
  }
  const chain = node?.type === "MemberExpression" ? memberPath(node) : null;
  if (chain) {
    const found = follow(mod, chain.root, chain.path, read);
    return listOf(found.mod, found.node, read, seen);
  }
  refuse("The rows are computed in the code, not written as a list; edit them in the code");
  return null;
}

/**
 * What a row's `key` reads: { path } (field names of the item: `key={item.id}` → ["id"], `key={item}` → []), { path:
 * null } when a copy cannot repeat it (no key, the index), or a refusal (a key built in the code).
 */
function keyOf(fn, element) {
  const key = element.openingElement.attributes.find((attr) => attr.type === "JSXAttribute" && jsxName(attr.name) === "key");
  if (!key) return { path: null };
  const [item, index] = fn.params;
  let node = key.value?.type === "JSXExpressionContainer" ? unwrap(key.value.expression) : null;
  if (node?.type === "Identifier" && index?.type === "Identifier" && node.name === index.name) return { path: null };
  const path = [];
  while (node?.type === "MemberExpression" && !node.computed) { path.unshift(keyName(node.property)); node = unwrap(node.object); }
  if (node?.type === "Identifier" && item?.type === "Identifier" && node.name === item.name) return { path };
  // A destructured field: `({ id }) => <Row key={id} />`.
  if (node?.type === "Identifier" && !path.length && item?.type === "ObjectPattern") {
    const found = patternBinding(item, node.name);
    if (found) return { path: found.path };
  }
  refuse("The row's key is built in the code, so a copy would repeat it; add the row in its data");
  return null;
}

/** The literal at `path` in an item (an object literal's fields, or the item itself), or null. */
function literalAt(item, path) {
  let node = unwrap(item);
  for (const key of path) {
    if (node?.type !== "ObjectExpression") return null;
    const property = [...node.properties].reverse().find((p) => p.type === "ObjectProperty" && !p.computed && keyName(p.key) === key);
    node = property ? unwrap(property.value) : null;
  }
  return node?.type === "StringLiteral" || node?.type === "NumericLiteral" ? node : null;
}

/** The text with the list's item at `index` removed, with its comma (and its lines, when it stands on lines of its own). */
function withoutItem(text, list, index) {
  const items = list.elements;
  const item = items[index];
  if (items.length === 1) return `${text.slice(0, list.start)}[]${text.slice(list.end)}`;
  const lineStart = text.lastIndexOf("\n", item.start - 1) + 1;
  const comma = /^[ \t]*,/.exec(text.slice(item.end));
  const end = item.end + (comma ? comma[0].length : 0);
  const lineEnd = text.indexOf("\n", end);
  if (!text.slice(lineStart, item.start).trim() && lineEnd >= 0 && !text.slice(end, lineEnd).trim()) return `${text.slice(0, lineStart)}${text.slice(lineEnd + 1)}`;
  if (index < items.length - 1) return `${text.slice(0, item.start)}${text.slice(items[index + 1].start)}`;
  return `${text.slice(0, items[index - 1].end)}${text.slice(item.end)}`;
}

/** A key value no other row of the list has: an id "invoices" → "invoices-copy" (…-copy-2), text "Ava Chen" → "Ava Chen copy", 3 → 1 + the largest. */
function freshKey(node, others) {
  if (node.type === "NumericLiteral") return Math.max(...others.filter((value) => typeof value === "number"), node.value) + 1;
  const taken = new Set(others);
  const suffix = /^[a-z0-9]+(?:[-_.:/][a-z0-9]+)*$/.test(node.value) ? "-copy" : " copy";
  let value = `${node.value}${suffix}`;
  for (let n = 2; taken.has(value); n += 1) value = `${node.value}${suffix}-${n}`;
  return value;
}

/** The text with a copy of the list's item at `index` right after it; the key it holds gets a value no other row has. */
function withCopy(text, list, index, path) {
  const items = list.elements;
  const item = items[index];
  let copy = text.slice(item.start, item.end);
  if (path) {
    const node = literalAt(item, path);
    if (!node) refuse(`The row's key (${["item", ...path].join(".")}) is not written as text or a number, so a copy would repeat it; add the row in its data`);
    const value = freshKey(node, items.map((other) => literalAt(other, path)?.value));
    const quote = text[node.start] === "'" ? "'" : "\"";
    const written = typeof value === "number" ? String(value) : `${quote}${value.replaceAll("\\", "\\\\").replaceAll(quote, `\\${quote}`)}${quote}`;
    copy = `${copy.slice(0, node.start - item.start)}${written}${copy.slice(node.end - item.start)}`;
  }
  // The copy follows the item the way the next item does (", " or ",\n  "); the last item takes the previous gap, an
  // only item a new line when it stands on its own.
  const indent = text.slice(text.lastIndexOf("\n", item.start - 1) + 1, item.start);
  const gap = index < items.length - 1 ? text.slice(item.end, items[index + 1].start)
    : index > 0 ? text.slice(items[index - 1].end, item.start)
    : !indent.trim() && text.lastIndexOf("\n", item.start - 1) > list.start ? `,\n${indent}` : ", ";
  return `${text.slice(0, item.end)}${gap}${copy}${text.slice(item.end)}`;
}

/** The text with two items of a list swapped (each keeps the other's place, the separators stay). */
function withSwap(text, a, b) {
  const [first, second] = a.start < b.start ? [a, b] : [b, a];
  return `${text.slice(0, first.start)}${text.slice(second.start, second.end)}${text.slice(first.end, second.start)}${text.slice(first.start, first.end)}${text.slice(second.end)}`;
}

/**
 * Ops removeElement / duplicateElement / moveElement with `row` on the element a .map callback returns (user,
 * 2026-10-09: "mọi thao tác … tự do như Figma"): the row goes from, is copied in, or swaps with the row before or after
 * it (`to` "prev" | "next") in the list the .map reads, where that list is written (an array literal inline, a const,
 * an import such as examples/data.ts; a useState initializer is the starting data). A copy's key (`key={item.x}`) gets a
 * value no other row has ("…-copy", or the next number). { file, code, source, changed, index, state, loc } (`loc`: the
 * element's own loc after the edit, in `file` given to it) or { error, code }; { notRow: true } when the element is not
 * a row's root (the op then edits the code as usual).
 */
export function dataRowEdit(code, file, loc, name, op, { read = () => null } = {}) {
  try {
    const mod = moduleOf(file, code);
    const element = locate(mod, loc, name);
    // Only the element its function returns is a row (mapRowOf's refusals are for those: a filter before the .map).
    const fn = [...(pathTo(mod.ast.program, element) ?? [])].reverse().find((node) => FUNCTION_TYPES.has(node.type));
    const row = fn && returnsElement(fn, element) ? mapRowOf(mod, element) : null;
    if (!row) return { notRow: true };
    if (!Number.isInteger(op.row) || op.row < 0) refuse("A .map row needs its row index (`row`)", "invalid");
    const list = listOf(mod, row.array, read);
    const index = op.row + row.offset;
    const items = list.node.elements;
    if (items.some((item) => !item || item.type === "SpreadElement")) refuse("The list has a spread or a hole; edit it in the code");
    if (!items[index]) refuse(`The list has no row ${index + 1}`, "not-found");
    if (!isDataFile(list.mod.file)) refuse(`${list.mod.file} is not a file the Studio edits`);
    const text = list.mod.code;
    let next;
    if (op.op === "moveElement") {
      const step = op.to === "prev" ? -1 : op.to === "next" ? 1 : 0;
      if (!step) refuse('Move a row "prev" or "next"', "invalid");
      // Rows before a .slice(n) start are not on the canvas: the first row shown is the first one.
      if (index + step < row.offset || index + step >= items.length) refuse(`${name ?? "The row"} is already the ${step < 0 ? "first" : "last"} row`, "invalid");
      next = withSwap(text, items[index], items[index + step]);
    } else {
      next = op.op === "removeElement" ? withoutItem(text, list.node, index) : withCopy(text, list.node, index, keyOf(row.fn, element).path);
    }
    // The element moves only when its list is written above it in the same file.
    let at = element.start;
    if (list.mod.file === mod.file && list.node.start < element.start) at += next.length - text.length;
    const before = next.slice(0, at);
    const where = `${before.split("\n").length}:${at - (before.lastIndexOf("\n") + 1)}`;
    const source = mod.code.slice(row.array.start, row.array.end);
    return { file: list.mod.file, code: next, source: `${source.length > 40 ? `${source.slice(0, 37)}…` : source}[${index}]`, changed: next !== text, index, state: list.state, loc: where };
  } catch (error) {
    if (error instanceof Refusal) return { error: error.message, code: error.code };
    throw error;
  }
}

export function dataFieldEdit(code, file, loc, name, op, { read = () => null } = {}) {
  try {
    const mod = moduleOf(file, code);
    const element = locate(mod, loc, name);
    const target = typeof op.prop === "string" ? { prop: op.prop } : { child: op.child };
    const origin = classify(mod, element, target);
    let found;
    let source;
    if (origin.kind === "row") {
      if (!Number.isInteger(op.row) || op.row < 0) refuse("setDataField on a .map row needs the row index (`row`)", "invalid");
      found = follow(mod, origin.array, [String(op.row + origin.offset), ...origin.path], read);
      source = `${origin.source}[${op.row + origin.offset}]${origin.path.map((key) => `.${key}`).join("")}`;
    } else if (origin.kind === "data") {
      found = follow(mod, origin.root, origin.path, read);
      source = origin.source;
    } else if (origin.kind === "state") {
      refuse(`${origin.name} is state: edit its initial value (the useState initializer) instead`);
    } else if (origin.kind === "literal") {
      refuse("The value is written right here; edit the prop itself", "invalid");
    } else {
      refuse(origin.reason ?? "The value is computed in the code");
    }
    if (!isLiteralNode(found.node)) refuse(`${source} is computed in the code, not written as data`);
    if (!isDataFile(found.mod.file)) refuse(`${found.mod.file} is not a file the Studio edits`);
    const text = found.mod.code;
    const replacement = literalCode(op.value, found.node, text);
    const next = `${text.slice(0, found.node.start)}${replacement}${text.slice(found.node.end)}`;
    return { file: found.mod.file, code: next, source, changed: next !== text };
  } catch (error) {
    if (error instanceof Refusal) return { error: error.message, code: error.code };
    throw error;
  }
}

