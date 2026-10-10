// Zen Studio: where a written value comes from, and the edit of that value at its source (WP-C of
// docs/research/studio-builder-plan-2026-10-05.md). Pure: the dev server hands it the effective text of any file it
// needs to read (`read(rel)`: the draft, else the disk; null when there is no such file).
//
//   originOf(code, file, loc, { prop } | { child })      what feeds the prop (or the expression child) of the element at loc
//                                                        ({ tableRows: true }: whether a Table's rows can be edited)
//   dataFieldEdit(code, file, loc, name, op, { read })   op setDataField { prop? | child? | field?, row, rowKey?, rowFields?,
//                                                        table?, value }: the edit at the source, { file, code, state }
//                                                        (possibly another file), or { error, code }
//
// Sources it can follow (a value is edited only where it is written as a literal):
//   - a .map row: `{crew.map((one) => <ListItem title={one.name} />)}` → crew[row].name, where crew is an array literal
//     inline, a const of the file, a useState initializer (the starting data) or an import (examples/data.ts…);
//     `.slice(n)` shifts the row; `[people.ava, people.bao].map(…)` resolves each item on its own;
//   - an object const or import read by path: `title={studio.name}`;
//   - a factory call `person("ava", "Ava Chen", "UX Researcher", …)` whose function returns `{ id, name, role, … }`:
//     the field maps to its parameter's argument;
//   - a Table cell (user, 2026-10-10: "Tôi vẫn chưa sửa được table cell từ template lẫn example"): a column's
//     `cell: (row) => <TableText>{row.role}</TableText>` reads the row the Table draws from its `rows`. The client names
//     the row by its key (getRowId: `id` by default) and place; the item with that key is found in the lists the rows
//     expression reads (a sort, filter, slice, spread, local const or useMemo in between), else the row at that place of
//     a list read as is. A column without `cell` draws its `field` from the row: op setDataField { field } on the Table;
//   - a lookup keyed by the row: `people[member.id].name` (a .map row or a Table cell) reads the row's `id` where it is
//     written, then edits people.<id>.name; a const of the row function (`const team = teams[row.team]`) is read through.
// Refused, with the reason the Inspector shows: .filter / .sort / other calls before the .map, computed keys, spreads,
// state that the component changes (useState read directly: that is setStateInit's, keep-behaviour rule), values that
// are not literals at their source.
import { findElement, jsxName, parseLoc, parseSource, walk } from "./jsx-source.mjs";
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
    for (const property of [...node.properties].reverse()) {
      // Shorthand `{ name }` inside a factory's return: the caller resolves the parameter (follow never gets here then).
      if (property.type === "ObjectProperty" && !property.computed && keyName(property.key) === first) return follow(mod, property.value, rest, read, seen);
      if (property.type !== "SpreadElement") continue;
      // `{ ...member("Alex Duong", "Member", …), photo }`: a factory call (or an object written in place) is this item's
      // own; a const spread into several items is shared, so an edit there would change the others too.
      const spread = unwrap(property.argument);
      if (spread?.type !== "CallExpression" && spread?.type !== "ObjectExpression") refuse(`"${first}" comes from a spread in the data; edit it where it is written`);
      try {
        return follow(mod, spread, path, read, seen);
      } catch (error) {
        if (!(error instanceof Refusal) || error.code !== "not-found") throw error;
      }
    }
    refuse(`The data has no "${first}" field`, "not-found");
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

/* ── rows: a .map callback's item, a Table cell's row, and lookups keyed by the row ──────────────────────────────── */

const WRAPPERS = new Set(["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression", "ParenthesizedExpression", "TSTypeAssertion"]);

/** The index in `path` of the nearest node above path[index] that is not a TS wrapper or parentheses (-1: none). */
function above(path, index) {
  let at = index - 1;
  while (at >= 0 && WRAPPERS.has(path[at].type)) at -= 1;
  return at;
}

/** A literal's value as text (a row key compares as text: getRowId returns a string), or null. */
function literalText(node) {
  if (node?.type === "StringLiteral" || node?.type === "NumericLiteral") return String(node.value);
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) return node.quasis[0]?.value.cooked ?? null;
  if (node?.type === "UnaryExpression" && node.operator === "-" && node.argument.type === "NumericLiteral") return String(-node.argument.value);
  return null;
}

/**
 * A member chain whose keys may come from data (`people[member.id].name`): { root, segments }, each segment a field
 * name or { node } (a computed key's expression). Null for anything else.
 */
function lookupChain(expr) {
  const segments = [];
  let node = unwrap(expr);
  while (node?.type === "MemberExpression" || node?.type === "OptionalMemberExpression") {
    const property = unwrap(node.property);
    if (!node.computed) segments.unshift(keyName(node.property));
    else segments.unshift(literalText(property) ?? { node: property });
    node = unwrap(node.object);
  }
  return node?.type === "Identifier" ? { root: node, segments } : null;
}

const isModuleLevel = (mod, declarator) => mod.ast.program.body.some((statement) => {
  const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
  return declaration?.type === "VariableDeclaration" && declaration.declarations.includes(declarator);
});

/**
 * How a value reads a row (the first parameter of a function): { fn, read } with read { path } (`row.a.b`: the item's
 * field) or { root, segments, keys } (a lookup `X[row.k].f`: keys[i] is the item's field path for a computed segment).
 * A const of the row function (`const team = teams[row.team]`) is read through. Null when no row parameter is read.
 */
function rowReadOf(mod, chain, depth = 0) {
  if (!chain || depth > 4) return null;
  const binding = bindingOf(mod, chain.root.name, chain.root);
  if (binding?.kind === "param") {
    if (binding.position !== 0 || chain.segments.some((segment) => typeof segment !== "string")) return null;
    return { fn: binding.fn, read: { path: [...binding.path, ...chain.segments] } };
  }
  if (binding?.kind === "const" && binding.init && !isModuleLevel(mod, binding.declarator)) {
    const inner = lookupChain(binding.init);
    const found = inner ? rowReadOf(mod, { root: inner.root, segments: [...inner.segments, ...chain.segments] }, depth + 1) : null;
    if (found) return found;
  }
  if (binding?.kind !== "const" && binding?.kind !== "import") return null;
  let fn = null;
  const keys = [];
  for (const segment of chain.segments) {
    if (typeof segment === "string") {
      keys.push(null);
      continue;
    }
    const key = memberPath(segment.node);
    const keyBinding = key ? bindingOf(mod, key.root.name, key.root) : null;
    if (keyBinding?.kind !== "param" || keyBinding.position !== 0 || (fn && keyBinding.fn !== fn)) return null;
    fn = keyBinding.fn;
    keys.push([...keyBinding.path, ...key.path]);
  }
  return fn ? { fn, read: { root: chain.root, segments: chain.segments, keys } } : null;
}

/** The node a row read reaches from the row's item: the item's field, or the lookup keyed by the item's fields. */
function readFromItem(itemMod, item, rowRead, mod, read) {
  if (!rowRead.root) return follow(itemMod, item, rowRead.path, read);
  const path = rowRead.segments.map((segment, index) => {
    if (typeof segment === "string") return segment;
    const text = literalText(follow(itemMod, item, rowRead.keys[index], read).node);
    if (text === null) refuse(`The row's ${rowRead.keys[index].join(".") || "value"} is computed in the code, so the Studio cannot tell which entry it reads`);
    return text;
  });
  return follow(mod, rowRead.root, path, read);
}

/** Every JSX element and array literal of a module (read once per module). */
function nodesOf(mod) {
  if (!mod.nodes) {
    mod.nodes = { elements: [], arrays: [] };
    walk(mod.ast.program, (node) => {
      if (node.type === "JSXElement") mod.nodes.elements.push(node);
      else if (node.type === "ArrayExpression") mod.nodes.arrays.push(node);
      return true;
    });
  }
  return mod.nodes;
}

const attrOf = (element, name) => element.openingElement.attributes.find((attr) => attr.type === "JSXAttribute" && jsxName(attr.name) === name) ?? null;
const attrExpression = (attr) => (attr?.value?.type === "JSXExpressionContainer" ? unwrap(attr.value.expression) : null);
const HOOKS_WITH_RESULT = /^use(Memo|Callback)$/;

/** The const that holds `node` as its value (through TS wrappers, conditions and `useMemo(() => …)`), or null. */
function declaratorOf(mod, node) {
  const path = pathTo(mod.ast.program, node) ?? [];
  let at = above(path, path.length - 1);
  // `const columns = compact ? [ … ] : [ … ]`: either list is the const's.
  while (path[at]?.type === "ConditionalExpression" || path[at]?.type === "LogicalExpression") at = above(path, at);
  // `useMemo(() => { …; return [...]; }, deps)`: the return → its block → the function.
  if (path[at]?.type === "ReturnStatement") at = above(path, above(path, at));
  if (path[at] && FUNCTION_TYPES.has(path[at].type)) {
    const call = path[above(path, at)];
    const callee = call?.type === "CallExpression" ? (call.callee.type === "MemberExpression" ? keyName(call.callee.property) : keyName(call.callee)) : null;
    if (!callee || !HOOKS_WITH_RESULT.test(callee)) return null;
    at = above(path, above(path, at));
  }
  const declarator = path[at];
  return declarator?.type === "VariableDeclarator" && declarator.id.type === "Identifier" ? declarator : null;
}

/** Whether `expr` holds `target` (the node, or an identifier bound to `declarator`): through conditions, spreads, list items and calls on it. */
function refersTo(mod, expr, target, declarator, depth = 0) {
  const node = unwrap(expr);
  if (!node || depth > 6) return false;
  if (node === target) return true;
  switch (node.type) {
    case "Identifier": {
      const binding = bindingOf(mod, node.name, node);
      if (declarator && binding?.declarator === declarator) return true;
      // `const columns = narrow ? allColumns.filter(…) : allColumns`: the const another one is made of.
      return binding?.kind === "const" && Boolean(binding.init) && refersTo(mod, binding.init, target, declarator, depth + 1);
    }
    case "ConditionalExpression":
      return refersTo(mod, node.consequent, target, declarator, depth + 1) || refersTo(mod, node.alternate, target, declarator, depth + 1);
    case "LogicalExpression":
      return refersTo(mod, node.left, target, declarator, depth + 1) || refersTo(mod, node.right, target, declarator, depth + 1);
    case "ArrayExpression":
      return node.elements.some((element) => element && refersTo(mod, element.type === "SpreadElement" ? element.argument : element, target, declarator, depth + 1));
    case "CallExpression":
      // `columns.filter(…)`: the same columns.
      return node.callee.type === "MemberExpression" && refersTo(mod, node.callee.object, target, declarator, depth + 1);
    default:
      return false;
  }
}

/**
 * The Table column whose `cell` is `fn`: { column, tables }, `tables` the elements of the file whose `columns` hold it
 * (written in place, or through the consts that hold the column or its list) and that have `rows` (or `data`). Null
 * when `fn` is not a column's cell.
 */
function cellColumnOf(mod, fn) {
  const path = pathTo(mod.ast.program, fn) ?? [];
  const p = above(path, path.length - 1);
  const property = path[p];
  if (property?.type !== "ObjectProperty" || property.computed || keyName(property.key) !== "cell") return null;
  const c = above(path, p);
  const column = path[c];
  if (column?.type !== "ObjectExpression") return null;
  const holder = path[above(path, c)];
  const lists = [];
  // The array it is written in, and the arrays that one is spread into (`...(narrow ? [] : [{ … }])`).
  if (holder?.type === "ArrayExpression") {
    lists.push(holder);
    let at = path.indexOf(holder);
    for (let up = above(path, at); up >= 0; up = above(path, at)) {
      const node = path[up];
      if (node.type === "ConditionalExpression" || node.type === "LogicalExpression" || node.type === "SpreadElement") at = up;
      else if (node.type === "ArrayExpression" && path[at].type === "SpreadElement") { lists.push(node); at = up; }
      else break;
    }
  }
  const columnConst = declaratorOf(mod, column);
  if (columnConst) for (const node of nodesOf(mod).arrays) if (node !== holder && refersTo(mod, node, null, columnConst)) lists.push(node);
  if (!lists.length) return null;
  const tables = nodesOf(mod).elements.filter((element) => {
    const columns = attrExpression(attrOf(element, "columns"));
    return columns && (attrOf(element, "rows") || attrOf(element, "data")) && lists.some((list) => refersTo(mod, columns, list, declaratorOf(mod, list)));
  });
  return { column, tables };
}

/** The Table the client names (`loc`, its opening tag), else the only one; refused when it cannot tell. */
function pickTable(cell, loc) {
  const at = parseLoc(loc);
  const named = at ? cell.tables.find((element) => element.openingElement.loc.start.line === at.line && element.openingElement.loc.start.column === at.column) : null;
  if (named) return named;
  if (cell.tables.length === 1) return cell.tables[0];
  if (!cell.tables.length) refuse("No Table in this file draws this column; edit the data in the code");
  refuse(`${cell.tables.length} Tables draw this column; name the Table (\`table\`)`, "invalid");
  return null;
}

/** The Table's `rows` (or `data`) expression. */
function rowsExpression(table) {
  const expr = attrExpression(attrOf(table, "rows")) ?? attrExpression(attrOf(table, "data"));
  if (!expr) refuse("The Table's rows are not written as data here");
  return expr;
}

/** The fields a row's key reads, to try in turn: getRowId's (`(row) => row.person` → ["person"], `String` → the row itself), by default `id` then `key`. */
function rowKeyPaths(table) {
  const attr = attrOf(table, "getRowId");
  if (!attr) return [["id"], ["key"]];
  const fn = attrExpression(attr);
  if (fn?.type === "Identifier" && fn.name === "String") return [[]];
  if (!fn || !FUNCTION_TYPES.has(fn.type) || fn.params[0]?.type !== "Identifier") return [];
  let body = unwrap(fn.body.type === "BlockStatement" ? fn.body.body.find((statement) => statement.type === "ReturnStatement")?.argument : fn.body);
  if (body?.type === "CallExpression" && body.callee.type === "Identifier" && body.callee.name === "String") body = unwrap(body.arguments[0]);
  const key = memberPath(body);
  return key && key.root.name === fn.params[0].name ? [key.path] : [];
}

/** The rows as a list written as is (only a `.slice(n)` before it): { list, offset }, or null. */
function directRows(mod, expr, read) {
  let node = unwrap(expr);
  let offset = 0;
  if (node?.type === "CallExpression" && node.callee.type === "MemberExpression" && keyName(node.callee.property) === "slice") {
    const start = node.arguments[0];
    offset = start?.type === "NumericLiteral" ? start.value : start ? NaN : 0;
    if (!Number.isInteger(offset)) return null;
    node = unwrap(node.callee.object);
  }
  try {
    return { list: listOf(mod, node, read), offset };
  } catch (error) {
    if (error instanceof Refusal) return null;
    throw error;
  }
}

/** The values a function returns (its expression body, or each `return`'s argument). */
function returnedValues(fn) {
  if (fn.body.type !== "BlockStatement") return [fn.body];
  const out = [];
  walk(fn.body, (node) => {
    if (node !== fn.body && FUNCTION_TYPES.has(node.type)) return false;
    if (node.type === "ReturnStatement" && node.argument) out.push(node.argument);
    return true;
  });
  return out;
}

/** The object literal an expression is (through consts, imports, member paths and a useState initializer): { mod, node, state } or null. */
function objectOf(mod, expr, read, depth = 0) {
  const node = unwrap(expr);
  if (!node || depth > 8) return null;
  if (node.type === "ObjectExpression") return { mod, node, state: false };
  if (node.type === "Identifier") {
    const binding = bindingOf(mod, node.name, node);
    if (binding?.kind === "const") return objectOf(mod, binding.init, read, depth + 1);
    if (binding?.kind === "state") {
      const initial = unwrap(binding.init.arguments[0]);
      const found = initial && !FUNCTION_TYPES.has(initial.type) ? objectOf(mod, initial, read, depth + 1) : null;
      return found ? { ...found, state: true } : null;
    }
    if (binding?.kind === "import") {
      const target = importedModule(mod, binding.source, read);
      const value = target ? exportedValue(target, binding.imported) : null;
      return value ? objectOf(target, value.node, read, depth + 1) : null;
    }
    return null;
  }
  if (node.type === "MemberExpression" && !node.computed) {
    const owner = objectOf(mod, node.object, read, depth + 1);
    const property = owner ? [...owner.node.properties].reverse().find((candidate) => candidate.type === "ObjectProperty" && !candidate.computed && keyName(candidate.key) === keyName(node.property)) : null;
    const found = property ? objectOf(owner.mod, property.value, read, depth + 1) : null;
    return found && owner.state ? { ...found, state: true } : found;
  }
  return null;
}

/** The values of an object literal's own fields (spreads left out). */
const objectValues = (object) => object.node.properties.filter((property) => property.type === "ObjectProperty").map((property) => property.value);

/**
 * The array literals rows are read from, in order: the list itself, or the lists a call (a sort, a filter, a page of
 * it), a spread, a condition, a local const or a useMemo reads. Each is { mod, node, state } (listOf).
 */
function listsRead(mod, expr, read, seen = new Set(), depth = 0) {
  const node = unwrap(expr);
  if (!node || depth > 10 || seen.has(node) || seen.size > 96) return [];
  seen.add(node);
  const out = [];
  const add = (child, owner = mod, state = false) => {
    if (child) for (const list of listsRead(owner, child, read, seen, depth + 1)) out.push(state ? { ...list, state } : list);
  };
  try {
    const list = listOf(mod, node, read);
    out.push(list);
    // `[...files, { … }]`: the rows of the lists it spreads too.
    for (const element of list.node.elements) if (element?.type === "SpreadElement") add(element.argument, list.mod, list.state);
    return out;
  } catch (error) {
    if (!(error instanceof Refusal)) throw error;
  }
  switch (node.type) {
    case "CallExpression":
    case "OptionalCallExpression": {
      const callee = unwrap(node.callee);
      const name = callee?.type === "MemberExpression" ? keyName(callee.property) : keyName(callee);
      // useMemo(() => …, deps): what the function returns (its deps are not rows).
      if (name && HOOKS_WITH_RESULT.test(name)) {
        const fn = unwrap(node.arguments[0]);
        if (fn && FUNCTION_TYPES.has(fn.type)) for (const result of returnedValues(fn)) add(result);
        break;
      }
      if (callee?.type === "MemberExpression" || callee?.type === "OptionalMemberExpression") add(callee.object);
      // Object.values(people): the object's values are the rows.
      if (callee?.type === "MemberExpression" && keyName(callee.object) === "Object" && name === "values") {
        const object = objectOf(mod, node.arguments[0], read);
        if (object) out.push({ mod: object.mod, node: { type: "ArrayExpression", elements: objectValues(object) }, state: object.state });
        break;
      }
      // A function of the file (`byStatus(status)`): what it returns.
      if (callee?.type === "Identifier") {
        const binding = bindingOf(mod, callee.name, callee);
        const fn = binding?.kind === "function" ? binding.fn : binding?.kind === "const" ? unwrap(binding.init) : null;
        if (fn && FUNCTION_TYPES.has(fn.type)) for (const result of returnedValues(fn)) add(result);
      }
      for (const argument of node.arguments) {
        const value = unwrap(argument.type === "SpreadElement" ? argument.argument : argument);
        if (value && !FUNCTION_TYPES.has(value.type)) add(value);
      }
      break;
    }
    case "ArrayExpression":
      for (const element of node.elements) if (element?.type === "SpreadElement") add(element.argument);
      break;
    case "ConditionalExpression":
      add(node.consequent);
      add(node.alternate);
      break;
    case "LogicalExpression":
      add(node.left);
      add(node.right);
      break;
    case "Identifier": {
      const binding = bindingOf(mod, node.name, node);
      if (binding?.kind === "const") add(binding.init);
      // useState(list): the list the frame starts with (the client starts the frame again after an edit).
      if (binding?.kind === "state") {
        const initial = unwrap(binding.init.arguments[0]);
        // useState(() => tasks.filter(…)): what the initializer returns.
        for (const start of initial && FUNCTION_TYPES.has(initial.type) ? returnedValues(initial) : [initial]) add(start, mod, true);
      }
      if (binding?.kind === "import") {
        const target = importedModule(mod, binding.source, read);
        const value = target ? exportedValue(target, binding.imported) : null;
        if (value) add(value.node, target);
      }
      break;
    }
    case "MemberExpression": {
      // `projects[workspace]`: any of the object's lists; `data.rows` read from an object of data.
      const object = node.computed ? objectOf(mod, node.object, read) : null;
      if (object) for (const value of objectValues(object)) add(value, object.mod, object.state);
      else if (!node.computed) add(node.object);
      break;
    }
    default:
  }
  return out;
}

/** The text of a row's key where its item is written (null when it is not a literal there). */
function itemKey(list, item, path, read) {
  try {
    return literalText(unwrap(follow(list.mod, item, path, read).node));
  } catch (error) {
    if (error instanceof Refusal) return null;
    throw error;
  }
}

/**
 * The one item whose fields written as literals equal the rendered row's plain fields (`rowFields`, read on the canvas),
 * at least two of them, none different; null when no item, or more than one, fits.
 */
function itemByFields(lists, fields, read) {
  const entries = Object.entries(fields).filter(([key, value]) => /^[\w$]+$/.test(key) && ["string", "number", "boolean"].includes(typeof value)).slice(0, 16);
  if (entries.length < 2) return null;
  let best = null;
  let tie = false;
  for (const list of lists) {
    for (const item of list.node.elements) {
      if (!item || item.type === "SpreadElement") continue;
      let same = 0;
      let differs = false;
      for (const [key, value] of entries) {
        let node;
        try {
          node = unwrap(follow(list.mod, item, [key], read).node);
        } catch (error) {
          if (error instanceof Refusal) continue;
          throw error;
        }
        if (!isLiteralNode(node)) continue;
        const written = node.type === "BooleanLiteral" ? node.value : node.type === "NullLiteral" ? null : literalText(node);
        if (written === (typeof value === "boolean" ? value : String(value))) same += 1;
        else { differs = true; break; }
      }
      if (differs || same < 2) continue;
      if (!best || same > best.same) { best = { list, item, same }; tie = false; } else if (same === best.same) tie = true;
    }
  }
  return best && !tie ? { list: best.list, item: best.item } : null;
}

/**
 * The item of the Table's rows that renders row `op.row` with key `op.rowKey` (the client reads both on the canvas):
 * { list, item }, list being { mod, node, state } (the array literal). The key finds it in the lists the rows read,
 * whatever sorts or filters them; without a key the place does, in a list the Table reads as is.
 */
function tableRowItem(mod, table, op, read) {
  const expr = rowsExpression(table);
  const direct = directRows(mod, expr, read);
  const keyPaths = rowKeyPaths(table);
  const lists = (typeof op.rowKey === "string" && keyPaths.length) || op.rowFields ? (direct ? [direct.list] : listsRead(mod, expr, read)) : [];
  if (typeof op.rowKey === "string" && keyPaths.length) {
    for (const path of keyPaths) {
      const found = [];
      for (const list of lists) {
        for (const item of list.node.elements) if (item && item.type !== "SpreadElement" && itemKey(list, item, path, read) === op.rowKey) found.push({ list, item });
      }
      if (found.length === 1) return found[0];
      if (found.length > 1) refuse(`Several rows of the data have the key "${op.rowKey}"; edit it in the code`);
    }
  }
  // A key the code computes (`member("Linh Hoang", …)` → id: emailOf(name)): the item whose written fields are the row's.
  const byFields = op.rowFields && typeof op.rowFields === "object" ? itemByFields(lists, op.rowFields, read) : null;
  if (byFields) return byFields;
  if (!direct) {
    const text = mod.code.slice(expr.start, expr.end).replace(/\s+/g, " ");
    refuse(`The Table's rows come from ${text.length > 40 ? `${text.slice(0, 39)}…` : text}, which does not write this row as data; edit it in the code`);
  }
  if (!Number.isInteger(op.row) || op.row < 0) refuse("A Table row needs its place (`row`)", "invalid");
  const item = direct.list.node.elements[op.row + direct.offset];
  if (!item) refuse(`The Table's data has no row ${op.row + direct.offset + 1}`, "not-found");
  if (item.type === "SpreadElement") refuse("The row comes from a spread; edit it where it is written");
  return { list: direct.list, item };
}

/** The first row's item a Table reads (to tell whether its rows can be edited): the direct list's, else the first list read. */
function firstRowItem(mod, table, read) {
  const expr = rowsExpression(table);
  const direct = directRows(mod, expr, read);
  const lists = direct ? [direct.list] : listsRead(mod, expr, read);
  for (const list of lists) {
    const item = list.node.elements.slice(direct?.offset ?? 0).find((element) => element && element.type !== "SpreadElement");
    if (item) return { list, item };
  }
  const text = mod.code.slice(expr.start, expr.end).replace(/\s+/g, " ");
  if (lists.length && lists.every((list) => !list.node.elements.length)) refuse(`The Table's rows (${text.length > 40 ? `${text.slice(0, 39)}…` : text}) start empty: the example adds them while it runs`);
  refuse(`The Table's rows come from ${text.length > 40 ? `${text.slice(0, 39)}…` : text}, which does not write them as data; edit them in the code`);
  return null;
}

/** The name a function component is declared with (`function PersonAvatar(…)`, `const Row = (…) =>`), or null. */
function componentName(mod, fn) {
  if (fn.type === "FunctionDeclaration") return fn.id && /^[A-Z]/.test(fn.id.name) ? fn.id.name : null;
  const path = pathTo(mod.ast.program, fn) ?? [];
  const holder = path[above(path, path.length - 1)];
  return holder?.type === "VariableDeclarator" && holder.id.type === "Identifier" && /^[A-Z]/.test(holder.id.name) ? holder.id.name : null;
}

/** A row read with more fields after it (op setDataField `path`: `person={people[row.id]}` then `.theme`). */
function readWith(read, extra) {
  if (!extra.length) return read;
  return read.root ? { ...read, segments: [...read.segments, ...extra], keys: [...read.keys, ...extra.map(() => null)] } : { ...read, path: [...read.path, ...extra] };
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
  // A row's value: a .map callback's item, a Table column cell's row, or a lookup keyed by it (`people[row.id].name`).
  const rowRead = rowReadOf(mod, lookupChain(expr));
  if (rowRead) {
    const row = mapRowOf(mod, expr);
    if (row && row.fn === rowRead.fn) {
      const source = mod.code.slice(row.array.start, row.array.end);
      return { kind: "row", source: source.length > 40 ? `${source.slice(0, 37)}…` : source, path: rowRead.read.path ?? [], read: rowRead.read, offset: row.offset, array: row.array };
    }
    const cell = cellColumnOf(mod, rowRead.fn);
    if (cell) {
      const text = mod.code.slice(expr.start, expr.end).replace(/\s+/g, " ");
      return { kind: "cell", source: text.length > 40 ? `${text.slice(0, 37)}…` : text, path: rowRead.read.path ?? [], read: rowRead.read, cell };
    }
  }
  const chain = memberPath(expr);
  if (!chain) return { kind: "expression", reason: "The value is computed in the code" };
  const binding = bindingOf(mod, chain.root.name, chain.root);
  if (binding?.kind === "state" || binding?.kind === "state-value") return { kind: "state", name: chain.root.name };
  if (binding?.kind === "param") {
    const row = mapRowOf(mod, expr);
    if (!row || row.fn !== binding.fn) {
      // A prop of a component of this file (`function PersonAvatar({ person, size })`): the value comes from where it is
      // used — the client writes it there (that element's prop, or the data it reads, plus `path`).
      const component = binding.position === 0 ? componentName(mod, binding.fn) : null;
      const path = [...binding.path, ...chain.path];
      if (component && path.length) return { kind: "param", component, prop: path[0], path: path.slice(1), source: `${component} ${path.join(".")}` };
      return { kind: "expression", reason: `${chain.root.name} is a parameter; its value comes from where the component is used` };
    }
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
 * originOf for several targets of one element, parsing the file once (GET /element: every expression prop and child,
 * and `{ tableRows: true }` on a Table). Returns the origins in the order of `targets`; literal values are left out by
 * the caller.
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
  if (target.tableRows) {
    // The rows a Table draws (its columns without `cell` draw their fields): editable where its first row is written.
    const { list } = firstRowItem(mod, element, read);
    const editable = isDataFile(list.mod.file);
    return { kind: "rows", editable, state: list.state, file: list.mod.file, reason: editable ? undefined : `${list.mod.file} is not a file the Studio edits` };
  }
  const origin = classify(mod, element, target);
  if (origin.kind === "row") {
    // Editable when row 0's field resolves to a literal (every row is checked when it is edited).
    try {
      const item = follow(mod, origin.array, [String(origin.offset)], read);
      const found = readFromItem(item.mod, item.node, origin.read, mod, read);
      return { kind: "row", editable: isLiteralNode(found.node), source: origin.source, path: origin.path, file: found.mod.file, reason: isLiteralNode(found.node) ? undefined : "The row's value is computed in the code" };
    } catch (error) {
      if (error instanceof Refusal) return { kind: "row", editable: false, source: origin.source, path: origin.path, reason: error.message };
      throw error;
    }
  }
  if (origin.kind === "cell") {
    // A Table cell: editable when the first row the Table reads gives a literal (each row is found again when edited).
    try {
      if (!origin.cell.tables.length) refuse("No Table in this file draws this column; edit the data in the code");
      const { list, item } = firstRowItem(mod, origin.cell.tables[0], read);
      const found = readFromItem(list.mod, item, origin.read, mod, read);
      const editable = isLiteralNode(found.node) && isDataFile(found.mod.file);
      return { kind: "cell", editable, source: origin.source, path: origin.path, file: found.mod.file, reason: editable ? undefined : isLiteralNode(found.node) ? `${found.mod.file} is not a file the Studio edits` : "The row's value is computed in the code" };
    } catch (error) {
      if (error instanceof Refusal) return { kind: "cell", editable: false, source: origin.source, path: origin.path, reason: error.message };
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
  // A prop of a component of this file: edited where that component is used (the client finds the use on the canvas).
  if (origin.kind === "param") return { kind: "param", editable: true, source: origin.source, component: origin.component, prop: origin.prop, path: origin.path };
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
 * Text typed on the canvas for a number or a boolean in the data (a Table cell's hours, a `.map` row's count) keeps the
 * data's kind, so its type stays what the code declares: "40" → 40, "true" → true; other text is refused.
 */
function sameKind(node, value, source) {
  if (value?.kind !== "string" || typeof value.value !== "string") return value;
  const typed = value.value.trim();
  if (node.type === "NumericLiteral" || (node.type === "UnaryExpression" && node.operator === "-")) {
    const number = typed ? Number(typed.replace(/[\s_]/g, "")) : NaN;
    if (!Number.isFinite(number)) refuse(`${source} is a number in the data; type a number`, "invalid");
    return { kind: "number", value: number };
  }
  if (node.type === "BooleanLiteral") {
    if (!/^(true|false)$/i.test(typed)) refuse(`${source} is true or false in the data`, "invalid");
    return { kind: "boolean", value: typed.toLowerCase() === "true" };
  }
  return value;
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
    let found;
    let source;
    // A list the frame starts with (useState(list)): the client starts the frame again to show the edit.
    let state = false;
    const rowName = () => (typeof op.rowKey === "string" ? `row "${op.rowKey}"` : `row ${op.row + 1}`);
    if (Array.isArray(op.field)) {
      // A Table column without `cell` draws the row's `field` itself: the item of the Table's rows, by its key or place.
      if (!op.field.length || op.field.some((key) => typeof key !== "string" || !key)) refuse("`field` names the row's field", "invalid");
      if (!Number.isInteger(op.row) || op.row < 0) refuse("setDataField on a Table row needs its place (`row`)", "invalid");
      const row = tableRowItem(mod, element, op, read);
      found = follow(row.list.mod, row.item, op.field, read);
      source = `${rowName()}.${op.field.join(".")}`;
      state = row.list.state;
    } else {
      const target = typeof op.prop === "string" ? { prop: op.prop } : { child: op.child };
      const origin = classify(mod, element, target);
      // `path`: fields after the value (the use of a component whose prop is read further: `person` then `.theme`).
      const extra = Array.isArray(op.path) ? op.path : [];
      if (extra.some((key) => typeof key !== "string" || !key)) refuse("`path` names fields", "invalid");
      if (origin.read) origin.read = readWith(origin.read, extra);
      if (origin.path && origin.kind !== "row" && origin.kind !== "cell") origin.path = [...origin.path, ...extra];
      if (origin.kind === "row") {
        if (!Number.isInteger(op.row) || op.row < 0) refuse("setDataField on a .map row needs the row index (`row`)", "invalid");
        const item = follow(mod, origin.array, [String(op.row + origin.offset)], read);
        found = readFromItem(item.mod, item.node, origin.read, mod, read);
        source = origin.read.root ? `${origin.source}[${op.row + origin.offset}] → ${[origin.read.root.name, ...origin.read.segments.map((segment) => (typeof segment === "string" ? segment : "[…]"))].join(".").replaceAll(".[", "[")}`
          : `${origin.source}[${op.row + origin.offset}]${origin.path.map((key) => `.${key}`).join("")}`;
      } else if (origin.kind === "cell") {
        if (!Number.isInteger(op.row) || op.row < 0) refuse("setDataField on a Table cell needs its row (`row`, and its key `rowKey`)", "invalid");
        const row = tableRowItem(mod, pickTable(origin.cell, op.table), op, read);
        found = readFromItem(row.list.mod, row.item, origin.read, mod, read);
        source = `${origin.source} (${rowName()})`;
        state = row.list.state;
      } else if (origin.kind === "data") {
        found = follow(mod, origin.root, origin.path, read);
        source = origin.source;
      } else if (origin.kind === "param") {
        refuse(`${origin.component}'s ${origin.prop} comes from where <${origin.component}> is used; edit it there`);
      } else if (origin.kind === "state") {
        refuse(`${origin.name} is state: edit its initial value (the useState initializer) instead`);
      } else if (origin.kind === "literal") {
        refuse("The value is written right here; edit the prop itself", "invalid");
      } else {
        refuse(origin.reason ?? "The value is computed in the code");
      }
    }
    if (!isLiteralNode(found.node)) refuse(`${source} is computed in the code, not written as data`);
    if (!isDataFile(found.mod.file)) refuse(`${found.mod.file} is not a file the Studio edits`);
    const text = found.mod.code;
    const replacement = literalCode(sameKind(found.node, op.value, source), found.node, text);
    const next = `${text.slice(0, found.node.start)}${replacement}${text.slice(found.node.end)}`;
    return { file: found.mod.file, code: next, source, changed: next !== text, state };
  } catch (error) {
    if (error instanceof Refusal) return { error: error.message, code: error.code };
    throw error;
  }
}

