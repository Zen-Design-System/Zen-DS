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
import { parseExpression } from "@babel/parser";
import { isPictureValue, pictureExpression } from "./picture.mjs";
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
/** A refusal at a call `follow` does not read (a `.map`, a helper): the walk (reach) reads it instead. */
const refuseCall = (message) => { const error = new Refusal(message); error.call = true; throw error; };

const unwrap = (node) => {
  let current = node;
  while (current && (current.type === "TSAsExpression" || current.type === "TSSatisfiesExpression" || current.type === "TSNonNullExpression" || current.type === "ParenthesizedExpression" || current.type === "TSTypeAssertion")) current = current.expression;
  return current;
};
const keyName = (key) => (key?.type === "Identifier" ? key.name : key?.type === "StringLiteral" ? key.value : key?.type === "NumericLiteral" ? String(key.value) : null);
const isLiteralNode = (node) => node && (node.type === "StringLiteral" || node.type === "NumericLiteral" || node.type === "BooleanLiteral" || node.type === "NullLiteral"
  || (node.type === "TemplateLiteral" && node.expressions.length === 0)
  || (node.type === "UnaryExpression" && node.operator === "-" && node.argument.type === "NumericLiteral"));

/**
 * `new URL("<file>", import.meta.url).href`: a picture written in example or template code (the Studio's Picture control
 * and a photo dropped on an Avatar write it: builder/library/media.ts pictureCode). A value like a literal: the Studio
 * shows it as the picture and replaces it with another.
 */
const isPictureNode = (node) => Boolean(node) && node.type === "MemberExpression" && !node.computed && node.property?.name === "href"
  && node.object?.type === "NewExpression" && node.object.callee?.type === "Identifier" && node.object.callee.name === "URL"
  && node.object.arguments.length === 2 && node.object.arguments[0].type === "StringLiteral"
  && node.object.arguments[1].type === "MemberExpression" && node.object.arguments[1].object?.type === "MetaProperty" && node.object.arguments[1].property?.name === "url";
/** A picture imported as a module (`import photoAva from "…/avatar-ava.webp"`, read as `photoAva`): a value the Studio replaces with another picture. */
function isPictureImport(mod, node) {
  if (node?.type !== "Identifier") return false;
  const binding = bindingOf(mod, node.name, node);
  return Boolean(binding && binding.kind === "import" && /\.(?:webp|png|jpe?g|gif|svg|avif)$/i.test(binding.source ?? ""));
}
/** A literal, or a picture written as code (isPictureNode / isPictureImport): what describe calls editable and setDataField replaces. */
const isValueNode = (mod, node) => isLiteralNode(node) || isPictureNode(node) || isPictureImport(mod, node);

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
    // A field name into a list: the item is itself a list (a tuple row such as ["chi", "Annual leave", …] that a map turns
    // into objects), so the field is built in the code.
    if (!Number.isInteger(index) || index < 0) refuse(`The row is written as a list, not an object with a "${path[0]}" field: it is built in the code; edit the data there`);
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
    if (param === undefined && factory.spread && !factory.computed.has(first)) {
      // Not a named parameter: the field is in the spread object argument, when the call gives one.
      const extra = node.arguments[factory.spread.index];
      if (!extra) refuse(`${node.callee.name}(…) is given no "${first}" here`, "not-found");
      if (extra.type === "SpreadElement") refuse(`${node.callee.name}(…) gets its arguments from a spread here`);
      if (unwrap(extra)?.type !== "ObjectExpression") refuse(`${node.callee.name}(…)'s ${factory.spread.name} is computed in the code; edit it there`);
      return follow(mod, extra, path, read, seen);
    }
    if (param === undefined) refuse(`${node.callee.name}(…) builds "${first}" in its own code; edit ${node.callee.name} or the data passed to it`);
    const argument = node.arguments[param.index];
    if (!argument) refuse(`${node.callee.name}(…) gets no argument for "${first}" here`);
    if (argument.type === "SpreadElement") refuse(`${node.callee.name}(…) gets its arguments from a spread here`);
    return follow(mod, argument, [...param.path, ...rest], read, seen);
  }
  if (node.type === "CallExpression") refuseCall("The data is computed by a call; edit it in the code");
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
  if (body?.type !== "ObjectExpression") refuseCall(`${name}(…) does not return an object literal`);
  const params = new Map(fn.params.map((param, index) => [param.type === "AssignmentPattern" ? param.left.name : param.name, index]).filter(([key]) => typeof key === "string"));
  const fields = new Map();
  // `({ id, name, …, ...extra })`: the fields the caller's `extra` object holds (person(…, { photo, online })) live in
  // that argument, written per row; a field it lacks is added there (2026-10-10, pictures from the Studio).
  let spread = null;
  // Fields the factory builds itself (`email: \`${name}@…\``): computed, never read from the spread object.
  const computed = new Set();
  for (const property of body.properties) {
    if (property.type === "SpreadElement") {
      const target = unwrap(property.argument);
      if (target?.type === "Identifier" && params.has(target.name)) spread = { index: params.get(target.name), name: target.name };
      continue;
    }
    if (property.type !== "ObjectProperty" || property.computed) continue;
    const key = keyName(property.key);
    const value = unwrap(property.value);
    if (key && value?.type === "Identifier" && params.has(value.name)) fields.set(key, { index: params.get(value.name), path: [] });
    else if (key) computed.add(key);
  }
  return { owner, fields, spread, computed };
}

/** The object argument a factory call spreads into its rows (`person(…, { photo })`), or null; `missing` when the call stops short of it. */
function spreadArgumentOf(mod, call, read) {
  if (call.type !== "CallExpression" || call.callee.type !== "Identifier") return null;
  const factory = resolveFactory(mod, call.callee.name, call, read);
  if (!factory.spread) return null;
  const argument = call.arguments[factory.spread.index];
  if (!argument) return { call, missing: factory.spread.index === call.arguments.length, name: call.callee.name };
  const object = unwrap(argument);
  return object?.type === "ObjectExpression" ? { call, object, name: call.callee.name } : { call, name: call.callee.name, other: true };
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

/**
 * The same prop of the element a condition draws in this one's place (`p.photo ? <Avatar src={p.photo} /> : <Avatar>…`):
 * an initials Avatar's picture is the data the photo branch reads (a dropped photo makes the condition draw it). Null
 * when there is none.
 */
function siblingExpression(mod, element, prop) {
  const path = pathTo(mod.ast.program, element) ?? [];
  const up = path[above(path, path.length - 1)];
  if (up?.type !== "ConditionalExpression") return null;
  const other = unwrap(unwrap(up.consequent) === element ? up.alternate : up.consequent);
  if (other?.type !== "JSXElement" || jsxName(other.openingElement.name) !== jsxName(element.openingElement.name)) return null;
  const attr = other.openingElement.attributes.find((a) => a.type === "JSXAttribute" && jsxName(a.name) === prop);
  return attr?.value?.type === "JSXExpressionContainer" ? unwrap(attr.value.expression) : null;
}

/** The expression a prop or an expression child holds, or null for a literal / missing value; `mod`: a missing prop the other branch of a condition reads. */
function valueExpression(element, target, mod = null) {
  if (typeof target.prop === "string") {
    const attr = element.openingElement.attributes.find((a) => a.type === "JSXAttribute" && jsxName(a.name) === target.prop);
    const sibling = !attr && mod ? siblingExpression(mod, element, target.prop) : null;
    if (sibling) return sibling;
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

/**
 * follow, or — when the last field is missing from an object written in place (a row `{ id, name }` given a `photo`) —
 * where to add it: { found } or { add: { mod, object, key } }. A factory's object or a spread is never added to.
 */
function followAdding(mod, node, path, read) {
  try {
    return { found: follow(mod, node, path, read) };
  } catch (error) {
    if (!(error instanceof Refusal) || error.code !== "not-found" || !path.length) throw error;
    // An item named by a const or a path (`seenBy={[gia, emi]}`, `[people.alex, people.bao]`): where it is written.
    const parent = writtenAt(follow(mod, node, path.slice(0, -1), read), read);
    const object = unwrap(parent.node);
    const key = path[path.length - 1];
    if (object?.type === "CallExpression") {
      // A factory row: the field goes in its spread object argument (`person(…, { photo })`), added when the call stops
      // short of that argument; a row the factory builds entirely is refused as before.
      const spread = spreadArgumentOf(parent.mod, object, read);
      if (spread?.object && spread.object.properties.every((property) => property.type === "ObjectProperty")) return { add: { mod: parent.mod, object: spread.object, key } };
      if (spread?.missing) return { add: { mod: parent.mod, call: spread.call, key } };
      throw error;
    }
    if (object?.type !== "ObjectExpression" || object.properties.some((property) => property.type !== "ObjectProperty")) throw error;
    return { add: { mod: parent.mod, object, key } };
  }
}

/** Where a value named by a const, an import or a member path is written ({ mod, node }), else the value itself. */
function writtenAt(at, read) {
  let current = at;
  for (let guard = 0; guard < 8; guard++) {
    const node = unwrap(current.node);
    const chain = node?.type === "MemberExpression" ? memberPath(node) : null;
    if (chain?.path.length) { current = follow(current.mod, chain.root, chain.path, read); continue; }
    if (node?.type !== "Identifier") return current;
    const binding = bindingOf(current.mod, node.name, node);
    if (binding?.kind === "const" && binding.init) { current = { mod: current.mod, node: binding.init }; continue; }
    if (binding?.kind !== "import") return current;
    const target = importedModule(current.mod, binding.source, read);
    const value = target ? exportedValue(target, binding.imported) : null;
    if (!value) return current;
    current = { mod: target, node: value.node };
  }
  return current;
}

/** The text with `{ key: value }` as the call's new last argument (the factory's spread object). */
function withArgument(text, call, key, value) {
  const name = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
  const last = call.arguments[call.arguments.length - 1];
  const at = last ? last.end : call.end - 1;
  return `${text.slice(0, at)}${last ? ", " : ""}{ ${name}: ${value} }${text.slice(at)}`;
}

/** The text with `key: value` added as the object literal's last field, in its own style (one line, or a line per field). */
function withField(text, object, key, value) {
  const name = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
  const last = object.properties[object.properties.length - 1];
  if (!last) return `${text.slice(0, object.start)}{ ${name}: ${value} }${text.slice(object.end)}`;
  const tail = text.slice(last.end, object.end - 1);
  if (tail.includes("\n")) {
    const indent = text.slice(text.lastIndexOf("\n", last.start - 1) + 1, last.start);
    const comma = tail.indexOf(",");
    const at = comma >= 0 ? last.end + comma + 1 : last.end;
    return `${text.slice(0, at)}${comma >= 0 ? "" : ","}\n${indent}${name}: ${value}${comma >= 0 ? "," : ""}${text.slice(at)}`;
  }
  return `${text.slice(0, last.end)}, ${name}: ${value}${text.slice(last.end)}`;
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

/** classify's answer for a value a helper reads from its parameters: kind "param" with `helper`, `prop` / `child` the element's own. */
function helperOrigin(mod, expr, helper, target) {
  const text = mod.code.slice(expr.start, expr.end).replace(/\s+/g, " ");
  return { kind: "param", helper, ...(typeof target.prop === "string" ? { prop: target.prop } : { child: target.child }), source: `${helper}(…): ${text.length > 32 ? `${text.slice(0, 31)}…` : text}` };
}

/** The name a helper of the file is called by (`const personAvatar = (p) => …`, `function taskRow(t)`), or null (a component, an inline callback). */
function helperName(mod, fn) {
  if (fn.type === "FunctionDeclaration") return fn.id && !/^[A-Z]/.test(fn.id.name) ? fn.id.name : null;
  const path = pathTo(mod.ast.program, fn) ?? [];
  const holder = path[above(path, path.length - 1)];
  return holder?.type === "VariableDeclarator" && holder.id.type === "Identifier" && !/^[A-Z]/.test(holder.id.name) ? holder.id.name : null;
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
  const expr = valueExpression(element, target, mod);
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
    // A helper's argument, read through a lookup (`const person = people[id]` then `person.photo`): the call's data.
    const helper = helperName(mod, rowRead.fn);
    if (helper && !componentName(mod, rowRead.fn)) return helperOrigin(mod, expr, helper, target);
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
      // A helper's parameter (`const personAvatar = (p) => <Avatar src={p.photo} />`): the call's argument, which the
      // client names by the call that drew this instance (op setDataField `via`).
      const helper = componentName(mod, binding.fn) ? null : helperName(mod, binding.fn);
      if (helper) return helperOrigin(mod, expr, helper, target);
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
      return { kind: "row", editable: isValueNode(found.mod, found.node), source: origin.source, path: origin.path, file: found.mod.file, reason: isValueNode(found.mod, found.node) ? undefined : "The row's value is computed in the code" };
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
      const target = origin.read.root ? { found: readFromItem(list.mod, item, origin.read, mod, read) } : followAdding(list.mod, item, origin.read.path, read);
      // A field the row lacks but can take (a row written in place): editable, the edit adds it.
      if (target.add) return { kind: "cell", editable: isDataFile(target.add.mod.file), source: origin.source, path: origin.path, file: target.add.mod.file };
      const found = target.found;
      const editable = isValueNode(found.mod, found.node) && isDataFile(found.mod.file);
      return { kind: "cell", editable, source: origin.source, path: origin.path, file: found.mod.file, reason: editable ? undefined : isValueNode(found.mod, found.node) ? `${found.mod.file} is not a file the Studio edits` : "The row's value is computed in the code" };
    } catch (error) {
      if (error instanceof Refusal) return { kind: "cell", editable: false, source: origin.source, path: origin.path, reason: error.message };
      throw error;
    }
  }
  if (origin.kind === "data") {
    try {
      // A field the data lacks (`people.bao.photo` with no photo yet) is added where it is written (an object literal, a
      // factory's spread object): editable, the edit adds it.
      const target = followAdding(mod, origin.root, origin.path, read);
      if (target.add) return { kind: "data", editable: isDataFile(target.add.mod.file), source: origin.source, file: target.add.mod.file, reason: isDataFile(target.add.mod.file) ? undefined : `${target.add.mod.file} is not a file the Studio edits` };
      const found = target.found;
      return { kind: "data", editable: isValueNode(found.mod, found.node), source: origin.source, file: found.mod.file, reason: isValueNode(found.mod, found.node) ? undefined : "The value is computed in the code" };
    } catch (error) {
      if (error instanceof Refusal) return { kind: "data", editable: false, source: origin.source, reason: error.message };
      throw error;
    }
  }
  // A prop of a component of this file: edited where that component is used (the client finds the use on the canvas).
  // A helper's parameter: edited in the data of the call that drew the instance (the client names it: `via`).
  if (origin.kind === "param" && origin.helper) return { kind: "param", editable: true, source: origin.source, helper: origin.helper, ...(typeof origin.prop === "string" ? { prop: origin.prop } : { child: origin.child }) };
  if (origin.kind === "param") return { kind: "param", editable: true, source: origin.source, component: origin.component, prop: origin.prop, path: origin.path };
  return { ...origin, editable: origin.kind === "literal" };
}

/* ── through helpers, and inside a prop's value (op setDataField `via` and `path`) ──────────────────────────────── */

/*
 * A row's picture through a helper (BACKLOG P1 2026-10-10, docs/research/studio-usability-eval-2026-10-10.md §5): the
 * sidebar example draws each row's avatar with `personAvatar(people[t.assignee])`, a plain function, inside rows that
 * `taskRow(t)` builds and a RowCard draws. A value inside a helper is its call's argument's, and only the canvas knows
 * which call drew the instance: the client names it by the annotated elements above the instance that hold it in their
 * props (`via`, nearest first: `{ loc, prop: "rows", path: [{ index: 3, fields }, "leading"] }` — RowCard's rows[3].leading
 * is this Avatar), with the plain fields of each object on the way (a row's `id`, `title`), and its own row and fields
 * when the holder is a .map row. The walk follows that place through the code — props, spreads, lists, `.map` rows,
 * helper calls — binding each function's parameters to the call's arguments (a `.map` callback's to its row), until it
 * reaches the element; the value (`p.photo`) is then read with those bindings down to where it is written
 * (examples/data.ts `people.alex.photo`). A row of a list a filter or sort moved is found by the fields its object passes
 * on (`id: t.id`). The same walk writes a field inside a prop's value written in place (`items={[{ src }, …]}`,
 * `items={team.map((p) => ({ src: p.photo }))}`): op setDataField `path` (pictures inside list props, 2026-10-10).
 *
 * A place is `{ mod, node, env }`: env maps a function node to its parameters' values — { args } (the call's arguments,
 * places themselves), { row } (a .map row: { list, index, fields, fn, … }) or { symbol } (the row whose fields are
 * being matched).
 */

const NO_ENV = new Map();
const place = (mod, node, env = NO_ENV) => ({ mod, node, env });
const isIndexStep = (step) => typeof step === "object" ? Number.isInteger(step?.index) : typeof step === "string" && /^\d+$/.test(step);
const stepKey = (step) => (typeof step === "object" ? String(step.index) : String(step));

/** Whether `node` reads no parameter, directly or through a local const (its value is the module's data, as `follow` reads it). */
function envFree(mod, node, env, depth = 0) {
  if (depth > 6) return false;
  let free = true;
  walk(node, (child) => {
    if (!free) return false;
    if (child.type === "Identifier") {
      const binding = bindingOf(mod, child.name, child);
      // A parameter (bound or not) is never the module's data: the walk binds it, or says it comes from the call.
      if (binding?.kind === "param") free = false;
      else if (binding?.kind === "const" && binding.init && !isModuleLevel(mod, binding.declarator) && !envFree(mod, binding.init, env, depth + 1)) free = false;
    }
    return true;
  });
  return free;
}

/** The function a callee or a .map callback names: { mod, fn } (inline, a const or function of the file, an import), or null. */
function functionOf(at, read) {
  const node = unwrap(at.node);
  if (node && FUNCTION_TYPES.has(node.type)) return { mod: at.mod, fn: node };
  if (node?.type !== "Identifier") return null;
  const binding = bindingOf(at.mod, node.name, node);
  if (binding?.kind === "function") return { mod: at.mod, fn: binding.fn };
  if (binding?.kind === "const" && binding.init && FUNCTION_TYPES.has(unwrap(binding.init).type)) return { mod: at.mod, fn: unwrap(binding.init) };
  if (binding?.kind === "import") {
    const target = importedModule(at.mod, binding.source, read);
    const value = target ? exportedValue(target, binding.imported) : null;
    if (value?.node && FUNCTION_TYPES.has(value.node.type)) return { mod: target, fn: value.node };
  }
  return null;
}

/** The places a call of a function of the file returns, its parameters bound to the call's arguments; null for other calls. */
function callResults(at, call, read) {
  const target = functionOf(place(at.mod, call.callee, at.env), read);
  if (!target) return null;
  const env = new Map(at.env);
  env.set(target.fn, { args: call.arguments.map((argument) => (argument.type === "SpreadElement" ? null : place(at.mod, argument, at.env))) });
  return returnedValues(target.fn).map((value) => place(target.mod, value, env));
}

/** A JSX element's children as React gets them (whitespace lines dropped, comments out): one child, or a list. */
function childrenNode(element) {
  const kids = element.children
    .filter((child) => !(child.type === "JSXText" && !child.value.trim() && child.value.includes("\n")) && !(child.type === "JSXExpressionContainer" && child.expression.type === "JSXEmptyExpression"))
    .map((child) => (child.type === "JSXExpressionContainer" ? child.expression : child));
  if (!kids.length) refuse(`<${jsxName(element.openingElement.name)}> has no children here`, "not-found");
  return kids.length === 1 ? kids[0] : { type: "ArrayExpression", elements: kids, start: element.start, end: element.end };
}

/** Two answers of reach that name the same thing (two parses of one file give different nodes: compared by place). */
function sameResult(a, b) {
  const at = (mod, node) => (mod && node ? `${mod.file}:${node.start}:${node.end}` : null);
  if (a.add || b.add) return Boolean(a.add && b.add && at(a.add.mod, a.add.object ?? a.add.call) === at(b.add.mod, b.add.object ?? b.add.call) && a.add.key === b.add.key);
  if (a.symbol || b.symbol) return a.symbol === b.symbol && a.path?.join("\u0000") === b.path?.join("\u0000");
  if (a.node || b.node) return at(a.mod, a.node) === at(b.mod, b.node);
  return a.env === b.env;
}

/** Tries each place (a condition's branches, a function's returns): the one that resolves, else a refusal (none, or two that differ). */
function oneOf(places, path, ctx) {
  const results = [];
  let reason = null;
  for (const option of places) {
    try {
      results.push(reach(option, path, ctx));
    } catch (error) {
      if (!(error instanceof Refusal)) throw error;
      reason ??= error;
    }
  }
  if (!results.length) throw reason ?? new Refusal("The value is computed in the code, not written as data", "not-found");
  if (results.every((result) => sameResult(result, results[0]))) return results[0];
  refuse("The value is chosen by a condition in the code; edit it there");
  return null;
}

/**
 * The value at `path` from place `at` (steps: field names, or list places — a number, or { index, fields } from the
 * canvas). Returns a place, or — in the walk (`ctx.target`, the element looked for) — { env } once the element is
 * reached; with `ctx.adding`, { add } where a missing last field is added; { symbol, path } for a read of the row being
 * matched (rowConstraints). Refusals say why; code "not-found" lets a caller try another way.
 */
function reach(at, path, ctx) {
  if ((ctx.steps = (ctx.steps ?? 0) + 1) > 600) refuse("The data goes through too many steps to follow");
  const node = unwrap(at.node);
  if (!node) refuse("The value is empty");
  // Data the module writes (a const, an import, a literal list): read where it is written, as setDataField always has;
  // a call there (`team.map(…)`, a helper) is read by the walk below.
  if (!ctx.target && envFree(at.mod, node, at.env)) {
    try {
      return dataAt(at, node, path, ctx);
    } catch (error) {
      if (!(error instanceof Refusal) || !error.call) throw error;
    }
  }
  if (!path.length && ctx.target) return { env: produce(at, ctx.target, ctx) };
  const [step, ...rest] = path;
  switch (node.type) {
    case "Identifier": {
      const binding = bindingOf(at.mod, node.name, node);
      if (binding?.kind === "param") {
        const bound = at.env.get(binding.fn);
        if (!bound) refuse(`${node.name} is a parameter; its value comes from where the function is called`, "not-found");
        if (bound.symbol) return { symbol: bound.symbol, path: [...binding.path, ...path.map(stepKey)] };
        if (bound.row) {
          if (binding.position !== 0) refuse(`${node.name} is the row's index, not data`);
          return reach(rowItem(bound.row, ctx), [...binding.path, ...path], ctx);
        }
        const argument = bound.args[binding.position];
        if (argument === null) refuse(`${helperName(at.mod, binding.fn) ?? "The function"}(…) gets its arguments from a spread here`);
        if (!argument) refuse(`${helperName(at.mod, binding.fn) ?? "The function"}(…) is not given ${node.name} here: its default is the function's own code; edit it there`);
        return reach(argument, [...binding.path, ...path], ctx);
      }
      if (binding?.kind === "const" && binding.init) return reach(place(at.mod, binding.init, isModuleLevel(at.mod, binding.declarator) ? NO_ENV : at.env), path, ctx);
      if (binding?.kind === "state") {
        const initial = unwrap(binding.init.arguments[0]);
        if (!initial || FUNCTION_TYPES.has(initial.type)) refuse(`${node.name} starts from code, not data the Studio can edit`);
        (ctx.states ??= []).push(initial);
        return reach(place(at.mod, initial, at.env), path, ctx);
      }
      if (binding?.kind === "import") {
        const target = importedModule(at.mod, binding.source, ctx.read);
        const value = target ? exportedValue(target, binding.imported) : null;
        if (!value) refuse(`${node.name} comes from ${binding.source}, which the Studio cannot read`);
        return reach(place(target, value.node), path, ctx);
      }
      refuse(`${node.name} is computed in the code, not data the Studio can edit`);
      break;
    }
    case "MemberExpression":
    case "OptionalMemberExpression": {
      const key = node.computed ? keyText(place(at.mod, node.property, at.env), ctx) : keyName(node.property);
      return reach(place(at.mod, node.object, at.env), [key, ...path], ctx);
    }
    case "ObjectExpression": {
      if (!path.length) break;
      const key = stepKey(step);
      for (const property of [...node.properties].reverse()) {
        if (property.type === "ObjectProperty" && !property.computed && keyName(property.key) === key) return reach(place(at.mod, property.value, at.env), rest, ctx);
        if (property.type === "ObjectMethod" && !property.computed && keyName(property.key) === key) refuse(`"${key}" is a function`);
        if (property.type !== "SpreadElement") continue;
        try {
          return reach(place(at.mod, property.argument, at.env), path, ctx);
        } catch (error) {
          if (!(error instanceof Refusal) || error.code !== "not-found") throw error;
        }
      }
      refuse(`The value has no "${key}" field`, "not-found");
      break;
    }
    case "ArrayExpression": {
      if (!path.length) break;
      if (!isIndexStep(step)) refuse(`A list has no "${stepKey(step)}" field`, "not-found");
      const index = Number(stepKey(step));
      const items = node.elements;
      if (items.slice(0, index + 1).some((item) => item?.type === "SpreadElement")) refuse("The list has a spread before this item; edit it in the code");
      if (!items[index]) refuse(`The list has no item ${index + 1}`, "not-found");
      return reach(place(at.mod, items[index], at.env), rest, ctx);
    }
    case "JSXElement": {
      if (!path.length) break;
      const key = stepKey(step);
      if (key === "children") return reach(place(at.mod, childrenNode(node), at.env), rest, ctx);
      for (const attr of [...node.openingElement.attributes].reverse()) {
        if (attr.type === "JSXAttribute" && jsxName(attr.name) === key) {
          if (!attr.value) refuse(`${key} is written as a fixed value`, "not-found");
          return reach(place(at.mod, attr.value.type === "JSXExpressionContainer" ? attr.value.expression : attr.value, at.env), rest, ctx);
        }
        if (attr.type !== "JSXSpreadAttribute") continue;
        try {
          return reach(place(at.mod, attr.argument, at.env), path, ctx);
        } catch (error) {
          if (!(error instanceof Refusal) || error.code !== "not-found") throw error;
        }
      }
      refuse(`<${jsxName(node.openingElement.name)}> has no ${key} here`, "not-found");
      break;
    }
    case "CallExpression":
    case "OptionalCallExpression": {
      const callee = unwrap(node.callee);
      // A .map row: the callback's result for that place, its parameter bound to the row.
      if (path.length && isIndexStep(step) && (callee?.type === "MemberExpression" || callee?.type === "OptionalMemberExpression") && !callee.computed && MAP_METHODS.has(keyName(callee.property))) {
        const callback = functionOf(place(at.mod, node.arguments[0], at.env), ctx.read);
        if (!callback) refuse("The list's rows are drawn by code the Studio cannot read");
        const row = { list: place(at.mod, callee.object, at.env), index: Number(stepKey(step)), fields: typeof step === "object" ? step.fields ?? null : null, fn: callback.fn, mod: callback.mod, env: at.env };
        const env = new Map(at.env);
        env.set(callback.fn, { row });
        return oneOf(returnedValues(callback.fn).map((value) => place(callback.mod, value, env)), rest, ctx);
      }
      const results = callResults(at, node, ctx.read);
      if (results) return oneOf(results, path, ctx);
      refuse("The value is computed by a call in the code; edit it there");
      break;
    }
    case "ConditionalExpression":
      return oneOf([node.consequent, node.alternate].map((branch) => place(at.mod, branch, at.env)), path, ctx);
    case "LogicalExpression":
      return oneOf([node.right, node.left].map((branch) => place(at.mod, branch, at.env)), path, ctx);
    default:
  }
  if (!path.length) return at;
  refuse("The value is computed in the code, not written as data");
  return null;
}

/** Data written in the module, read (or, with `ctx.adding`, given its missing last field) by `follow`: a place or { add }. */
function dataAt(at, node, path, ctx) {
  // A member path (`src: people.ava.photo` in an item) is read from its root, as a prop bound to it is.
  const chain = node.type === "MemberExpression" ? memberPath(node) : null;
  const root = chain ? chain.root : node;
  const keys = [...(chain?.path ?? []), ...path.map(stepKey)];
  const target = ctx.adding ? followAdding(at.mod, root, keys, ctx.read) : { found: follow(at.mod, root, keys, ctx.read) };
  ctx.source = root.type === "Identifier" ? [root.name, ...keys].join(".") : keys.join(".");
  if (target.add) return { add: target.add };
  return place(target.found.mod, target.found.node);
}

/** The text of a computed key (`people[t.assignee]`: the row's assignee), followed through bindings and consts. */
function keyText(at, ctx) {
  const end = reach(at, [], { read: ctx.read, steps: ctx.steps });
  if (end.symbol) refuse("The key is the row's own field", "not-found");
  let node = unwrap(end.node);
  let mod = end.mod;
  for (let guard = 0; node?.type === "Identifier" && guard < 6; guard++) {
    const binding = bindingOf(mod, node.name, node);
    if (binding?.kind !== "const" || !binding.init) break;
    node = unwrap(binding.init);
  }
  const text = literalText(node);
  if (text === null) refuse("The Studio cannot tell which entry the data reads: its key is computed in the code");
  return text;
}

/** Whether `inner` sits inside `outer` with no function between them (the same call draws both). */
function drawnWithin(mod, outer, inner) {
  if (inner.start < outer.start || inner.end > outer.end) return false;
  const path = pathTo(mod.ast.program, inner) ?? [];
  const from = path.indexOf(outer);
  return from >= 0 && !path.slice(from + 1).some((node) => FUNCTION_TYPES.has(node.type));
}

/** The bindings the element `target` is drawn with when the place is it, holds it (no function between) or returns it. */
function produce(at, target, ctx, depth = 0) {
  if (depth > 16) refuse("The element is drawn through too many steps to follow");
  const node = unwrap(at.node);
  if (!node || at.mod.file !== ctx.targetFile) refuse("The element is not drawn here", "not-found");
  if (node === target || ((node.type === "JSXElement" || node.type === "JSXFragment") && drawnWithin(at.mod, node, target))) return at.env;
  // The one place that draws it: a condition whose branches both draw it (`wide ? personAvatar(a) : personAvatar(b)`)
  // cannot tell which data this instance shows.
  const first = (places) => {
    let reason = null;
    const found = [];
    for (const option of places) {
      try {
        found.push(produce(option, target, ctx, depth + 1));
      } catch (error) {
        if (!(error instanceof Refusal)) throw error;
        reason ??= error;
      }
    }
    if (found.length > 1) refuse("The layer is drawn by either side of a condition in the code, so the Studio cannot tell which data it shows; edit it in the code");
    if (found.length) return found[0];
    throw reason ?? new Refusal("The element is not drawn here", "not-found");
  };
  switch (node.type) {
    case "ConditionalExpression":
      return first([place(at.mod, node.consequent, at.env), place(at.mod, node.alternate, at.env)]);
    case "LogicalExpression":
      return first([place(at.mod, node.right, at.env), place(at.mod, node.left, at.env)]);
    case "Identifier": {
      const binding = bindingOf(at.mod, node.name, node);
      if (binding?.kind === "param" && at.env.get(binding.fn)?.args && !binding.path.length) {
        const argument = at.env.get(binding.fn).args[binding.position];
        if (argument) return produce(argument, target, ctx, depth + 1);
      }
      if (binding?.kind === "const" && binding.init) return produce(place(at.mod, binding.init, isModuleLevel(at.mod, binding.declarator) ? NO_ENV : at.env), target, ctx, depth + 1);
      break;
    }
    case "CallExpression": {
      const results = callResults(at, node, ctx.read);
      if (results) return first(results);
      break;
    }
    default:
  }
  refuse("The element is not drawn here", "not-found");
  return null;
}

/**
 * The item of a `.map` row: by its place when the list is written as is (a const, an import, `.slice(n)`), else — a
 * filter or sort moved it — the one item whose written fields equal what the row's object passes on (rowConstraints).
 */
function rowItem(row, ctx) {
  if (row.item) return row.item;
  let list = row.list;
  let offset = 0;
  const node = unwrap(list.node);
  if (node?.type === "CallExpression" && node.callee.type === "MemberExpression" && keyName(node.callee.property) === "slice" && (!node.arguments[0] || node.arguments[0].type === "NumericLiteral")) {
    offset = node.arguments[0]?.value ?? 0;
    list = place(list.mod, node.callee.object, list.env);
  }
  let reason = null;
  if (Number.isInteger(row.index)) {
    try {
      const item = reach(list, [String(row.index + offset)], { read: ctx.read, steps: ctx.steps, states: ctx.states });
      if (item.node) return (row.item = place(item.mod, item.node, item.env));
    } catch (error) {
      if (!(error instanceof Refusal)) throw error;
      reason = error;
    }
  }
  const constraints = rowConstraints(row, ctx);
  const lists = listsRead(row.list.mod, row.list.node, ctx.read);
  const found = constraints.length ? itemByPaths(lists, constraints, ctx.read) : null;
  if (found) return (row.item = place(found.list.mod, found.item));
  const call = listCall(row.list);
  refuse(call
    ? `The rows go through ${call}(…), and the Studio cannot tell which row of the data this is; edit the data in the code`
    : (reason?.message ?? "The Studio cannot tell which row of the data this is; edit the data in the code"));
  return null;
}

/** The call a list is computed by (`tasks.filter(…)`, through the consts that hold it), or null. */
function listCall(list) {
  let node = unwrap(list.node);
  for (let guard = 0; node?.type === "Identifier" && guard < 6; guard++) {
    const binding = bindingOf(list.mod, node.name, node);
    if (binding?.kind !== "const" || !binding.init) return null;
    node = unwrap(binding.init);
  }
  if (node?.type !== "CallExpression" && node?.type !== "OptionalCallExpression") return null;
  const callee = unwrap(node.callee);
  return callee?.type === "MemberExpression" ? keyName(callee.property) : keyName(callee);
}

/**
 * What the canvas read of a row (`fields`: the plain fields of the object it became, `key`) says about the row's item:
 * [{ path, value }] for each field the row's object copies from it (`id: t.id`, `title={row.title}`, `key={row.id}`).
 */
function rowConstraints(row, ctx) {
  if (!row.fields || typeof row.fields !== "object") return [];
  const env = new Map(row.env);
  env.set(row.fn, { symbol: row });
  const shapes = row.shape ? [place(row.shape.mod, row.shape.node, env)] : returnedValues(row.fn).map((value) => place(row.mod, value, env));
  const out = [];
  for (const [key, value] of Object.entries(row.fields).slice(0, 24)) {
    if (!["string", "number", "boolean"].includes(typeof value) || !/^[\w$-]+$/.test(key)) continue;
    for (const shape of shapes) {
      try {
        const read = reach(shape, [key], { read: ctx.read, steps: ctx.steps });
        if (read.symbol === row) { out.push({ path: read.path, value, key }); break; }
      } catch (error) {
        if (!(error instanceof Refusal)) throw error;
      }
    }
  }
  return out;
}

/**
 * The one item of `lists` whose fields written as literals equal the constraints: a key (`id`, `key`) that matches, or two
 * fields, and none that differ. Null when no item, or more than one, fits.
 */
function itemByPaths(lists, constraints, read) {
  let best = null;
  let tie = false;
  for (const list of lists) {
    for (const item of list.node.elements) {
      if (!item || item.type === "SpreadElement") continue;
      let same = 0;
      let keyed = false;
      let differs = false;
      for (const { path, value } of constraints) {
        let node;
        try {
          node = unwrap(follow(list.mod, item, path, read).node);
        } catch (error) {
          if (error instanceof Refusal) continue;
          throw error;
        }
        if (!isLiteralNode(node)) continue;
        const written = node.type === "BooleanLiteral" ? node.value : literalText(node);
        if (written !== (typeof value === "boolean" ? value : String(value))) { differs = true; break; }
        same += 1;
        if (["id", "key"].includes(path[path.length - 1])) keyed = true;
      }
      if (differs || !(keyed || same >= 2)) continue;
      const score = same + (keyed ? 10 : 0);
      if (!best || score > best.score) { best = { list, item, score }; tie = false; } else if (score === best.score && item !== best.item) tie = true;
    }
  }
  if (tie) refuse("Several rows of the data match this row; edit it in the code");
  return best ? { list: best.list, item: best.item } : null;
}

/** The bindings an element is drawn with when a `.map` callback draws it (its row by place `row`, or by `fields`). */
function rowEnv(mod, element, row, fields, base = NO_ENV) {
  const path = pathTo(mod.ast.program, element) ?? [];
  for (let index = path.length - 1; index >= 1; index -= 1) {
    const fn = path[index];
    if (!FUNCTION_TYPES.has(fn.type)) continue;
    const call = path[index - 1];
    const callee = call?.type === "CallExpression" || call?.type === "OptionalCallExpression" ? unwrap(call.callee) : null;
    if (call.arguments?.[0] !== fn || callee?.type !== "MemberExpression" || callee.computed || !MAP_METHODS.has(keyName(callee.property))) return base;
    const env = new Map(base);
    env.set(fn, { row: { list: place(mod, callee.object, base), index: Number.isInteger(row) ? row : null, fields: fields && typeof fields === "object" ? fields : null, fn, mod, env: base, shape: place(mod, element) } });
    return env;
  }
  return base;
}

/**
 * Op setDataField `via` (a value a helper builds from its argument): the first holder whose place leads to the element,
 * then the value read with the bindings the walk made. { found } or { add }, `source`, `state`; a refusal when no holder
 * leads there (the nearest reason).
 */
function throughHolders(mod, element, expr, extra, op, read) {
  if (!Array.isArray(op.via) || !op.via.length) refuse("This value is drawn by a helper for each place it is used; select the layer on the canvas so the Studio knows which one", "invalid");
  const via = op.via.slice(0, 12).map((holder) => (holder && typeof holder.loc === "string" && typeof holder.prop === "string" && Array.isArray(holder.path ?? []) ? holder : null));
  // The bindings holder k's own element is drawn with: its .map row, and — when it sits in a helper (`taskList(label,
  // list)` returns `<PhoneList rows={list.map(…)} />`) — the call a farther holder draws it from (`holds: k`).
  const envOf = (k, depth) => {
    const holder = via[k];
    const at = locate(mod, holder.loc);
    let base = NO_ENV;
    if (depth < 6) {
      for (let m = k + 1; m < via.length; m += 1) {
        if (via[m]?.holds !== k) continue;
        try {
          base = walkFrom(m, at, depth + 1);
          break;
        } catch (error) {
          if (!(error instanceof Refusal)) throw error;
        }
      }
    }
    return { at, env: rowEnv(mod, at, holder.row, holder.fields, base) };
  };
  const walkFrom = (k, target, depth) => {
    const { at, env } = envOf(k, depth);
    const steps = [via[k].prop, ...(via[k].path ?? [])].map((step) => (typeof step === "object" && step ? { index: Number(step.index), fields: step.fields } : String(step)));
    return reach(place(mod, at, env), steps, { read, target, targetFile: mod.file }).env;
  };
  let reason = null;
  for (let k = 0; k < via.length; k += 1) {
    if (!via[k] || (Number.isInteger(via[k].holds) && via[k].holds >= 0)) continue;
    try {
      return valueAt(place(mod, expr, walkFrom(k, element, 0)), extra, read);
    } catch (error) {
      if (!(error instanceof Refusal)) throw error;
      // The nearest holder's reason, unless a farther one reached the element (its reason is about the value).
      if (!reason || error.code !== "not-found") reason = error;
    }
  }
  throw reason ?? new Refusal("The Studio cannot tell which call drew this layer; select it on the canvas", "not-found");
}

/** The value at `path` from a place, where it is written: { found, source, state } or { add, source, state }. */
function valueAt(at, path, read) {
  const ctx = { read, adding: true, states: [] };
  const end = reach(at, path, ctx);
  if (end.symbol || (!end.add && !end.node)) refuse("The value is computed in the code, not written as data");
  const inState = (node, mod) => ctx.states.some((list) => mod.file === at.mod.file && node.start >= list.start && node.end <= list.end);
  if (end.add) return { add: end.add, source: ctx.source ?? "the data", state: inState(end.add.object ?? end.add.call, end.add.mod) };
  return { found: { mod: end.mod, node: end.node }, source: ctx.source ?? "the data", state: inState(end.node, end.mod) };
}

/* ── the edit ────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A literal in the source's own quote style. */
function literalCode(value, previous, text, file) {
  switch (value?.kind) {
    case "picture":
      // A picture by its repo file: written relative to the data file it lands in.
      if (!isPictureValue(value)) refuse("A picture value names an image file under src/", "invalid");
      return pictureExpression(file, value.file);
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
    case "expression": {
      // A picture as code (isPictureNode): the one expression a data edit writes.
      const code = typeof value.code === "string" ? value.code.trim() : "";
      let node = null;
      try { node = parseExpression(code, { plugins: ["jsx", "typescript"], sourceType: "module" }); } catch { node = null; }
      if (!isPictureNode(node)) refuse("setDataField takes a string, number or boolean value, or a picture (new URL(…, import.meta.url).href)", "invalid");
      return code;
    }
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

/**
 * "This row only" for a fixed prop of an element a `.map` draws (core rebuild M4, plan criterion 3: one row of a list is
 * edited on its own, as one instance in Figma): the prop becomes a field of the rows — every row keeps the value the
 * prop had (none when it had none: the component's default), row `op.row` takes `op.value` — and the element reads it
 * (`size={person.size}`). One text edit, so one undo step. Only rows written as { … } objects in the same file (a page
 * you made keeps its mock data there); a prop already read from the row is that row's field (setDataField).
 */
function rowPropEdit(code, file, loc, name, op, read) {
  const mod = moduleOf(file, code);
  const element = locate(mod, loc, name);
  if (typeof op.name !== "string" || !/^[A-Za-z_$][\w$-]*$/.test(op.name)) refuse("setRowProp names the prop (`name`)", "invalid");
  if (!Number.isInteger(op.row) || op.row < 0) refuse("setRowProp needs the row (`row`)", "invalid");
  const row = mapRowOf(mod, element);
  if (!row) refuse(`<${name}> is not drawn by a list (.map), so it has no rows of its own`, "invalid");
  const param = row.fn.params[0];
  if (param?.type !== "Identifier") refuse("The list's rows are taken apart ({ … }) in the code; name the row to edit one row");
  const list = listOf(mod, row.array, read);
  if (list.mod.file !== mod.file) refuse("The rows are written in another file; edit them there");
  const items = list.node.elements.map((item) => unwrap(item));
  const index = op.row + row.offset;
  if (!items[index]) refuse(`The list has no row ${op.row + 1}`, "not-found");
  if (items.some((item) => item?.type !== "ObjectExpression" || item.properties.some((prop) => prop.type !== "ObjectProperty"))) refuse("The rows are not all written as { … } objects; edit the data in the code");
  const attr = element.openingElement.attributes.find((a) => a.type === "JSXAttribute" && jsxName(a.name) === op.name);
  // What the other rows keep: the value written now, or nothing (the prop unset draws the component's default).
  let kept = null;
  if (attr) {
    const expression = attr.value?.type === "JSXExpressionContainer" ? unwrap(attr.value.expression) : null;
    if (!attr.value) kept = "true";
    else if (attr.value.type === "StringLiteral") kept = JSON.stringify(attr.value.value);
    else if (expression && isLiteralNode(expression)) kept = mod.code.slice(expression.start, expression.end);
    else refuse(`${op.name} is not a fixed value here (it is computed, or read from the data); edit it as it is`, "invalid");
  }
  // The field takes the prop's name, unless a row already has a field by that name.
  const taken = new Set(items.flatMap((item) => item.properties.map((prop) => keyName(prop.key))));
  const base = op.name.replace(/-(\w)/g, (_, char) => char.toUpperCase());
  let field = base;
  for (let count = 2; taken.has(field); count += 1) field = `${base}${count}`;
  const edits = [];
  items.forEach((item, at) => {
    const value = at === index ? literalCode(op.value, null, mod.code, file) : kept;
    if (value !== null) edits.push({ at: item.start, apply: (text) => withField(text, item, field, value) });
  });
  const binding = `${op.name}={${param.name}.${field}}`;
  if (attr) edits.push({ at: attr.start, apply: (text) => `${text.slice(0, attr.start)}${binding}${text.slice(attr.end)}` });
  else {
    const at = element.openingElement.name.end;
    edits.push({ at, apply: (text) => `${text.slice(0, at)} ${binding}${text.slice(at)}` });
  }
  // From the end of the file back: each edit leaves the places before it where they were.
  let next = mod.code;
  for (const edit of edits.sort((a, b) => b.at - a.at)) next = edit.apply(next);
  return { file, code: next, source: `row ${op.row + 1}: ${field}`, changed: next !== mod.code, field };
}

export function dataFieldEdit(code, file, loc, name, op, { read = () => null } = {}) {
  if (op?.op === "setRowProp") {
    try {
      return rowPropEdit(code, file, loc, name, op, read);
    } catch (error) {
      if (error instanceof Refusal) return { error: error.message, code: error.code };
      throw error;
    }
  }
  try {
    const mod = moduleOf(file, code);
    const element = locate(mod, loc, name);
    let found;
    let adding = null;
    let source;
    // A list the frame starts with (useState(list)): the client starts the frame again to show the edit.
    let state = false;
    const rowName = () => (typeof op.rowKey === "string" ? `row "${op.rowKey}"` : `row ${op.row + 1}`);
    if (Array.isArray(op.field)) {
      // A Table column without `cell` draws the row's `field` itself: the item of the Table's rows, by its key or place.
      if (!op.field.length || op.field.some((key) => typeof key !== "string" || !key)) refuse("`field` names the row's field", "invalid");
      if (!Number.isInteger(op.row) || op.row < 0) refuse("setDataField on a Table row needs its place (`row`)", "invalid");
      const row = tableRowItem(mod, element, op, read);
      const target = followAdding(row.list.mod, row.item, op.field, read);
      if (target.add) adding = target.add;
      else found = target.found;
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
      // A field further inside a list the data builds with a call (`seenBy: crew.map(…)`): the walk reads the call.
      const inside = (error) => {
        if (!(error instanceof Refusal) || !error.call || !extra.length) throw error;
        const result = valueAt(place(mod, valueExpression(element, target), rowEnv(mod, element, op.row, op.rowFields)), extra, read);
        return result;
      };
      if (origin.kind === "row") {
        if (!Number.isInteger(op.row) || op.row < 0) refuse("setDataField on a .map row needs the row index (`row`)", "invalid");
        const item = follow(mod, origin.array, [String(op.row + origin.offset)], read);
        try {
          found = readFromItem(item.mod, item.node, origin.read, mod, read);
        } catch (error) {
          const result = inside(error);
          if (result.add) adding = result.add;
          else found = result.found;
        }
        source = origin.read.root ? `${origin.source}[${op.row + origin.offset}] → ${[origin.read.root.name, ...origin.read.segments.map((segment) => (typeof segment === "string" ? segment : "[…]"))].join(".").replaceAll(".[", "[")}`
          : `${origin.source}[${op.row + origin.offset}]${origin.path.map((key) => `.${key}`).join("")}`;
      } else if (origin.kind === "cell") {
        if (!Number.isInteger(op.row) || op.row < 0) refuse("setDataField on a Table cell needs its row (`row`, and its key `rowKey`)", "invalid");
        const row = tableRowItem(mod, pickTable(origin.cell, op.table), op, read);
        // A field the row lacks (`src={row.photo}` on a row with no photo) is added where the row is written in place.
        const target = origin.read.root ? { found: readFromItem(row.list.mod, row.item, origin.read, mod, read) } : followAdding(row.list.mod, row.item, origin.read.path, read);
        if (target.add) adding = target.add;
        else found = target.found;
        source = `${origin.source} (${rowName()})`;
        state = row.list.state;
      } else if (origin.kind === "data") {
        let target;
        try {
          target = followAdding(mod, origin.root, origin.path, read);
        } catch (error) {
          target = inside(error);
        }
        if (target.add) adding = target.add;
        else found = target.found;
        source = origin.source;
      } else if (origin.kind === "param" && origin.helper) {
        // A helper's argument: through the call that drew this instance (`via`, read on the canvas).
        const result = throughHolders(mod, element, valueExpression(element, target, mod), extra, op, read);
        if (result.add) adding = result.add;
        else found = result.found;
        source = `${origin.helper}(…) → ${result.source}`;
        state = result.state;
      } else if (origin.kind === "param") {
        refuse(`${origin.component}'s ${origin.prop} comes from where <${origin.component}> is used; edit it there`);
      } else if (origin.kind === "state") {
        refuse(`${origin.name} is state: edit its initial value (the useState initializer) instead`);
      } else if (origin.kind === "literal") {
        refuse("The value is written right here; edit the prop itself", "invalid");
      } else if (extra.length && (origin.kind === "expression" || origin.kind === "conditional")) {
        // A field inside the prop's value (an AvatarStack's items[2].src): written in place (`items={[{ src }, …]}`), or
        // where the list's rows read it (`items={team.map((p) => ({ src: p.photo }))}` → team[2].photo).
        const result = valueAt(place(mod, valueExpression(element, target), rowEnv(mod, element, op.row, op.rowFields)), extra, read);
        if (result.add) adding = result.add;
        else found = result.found;
        source = `${typeof op.prop === "string" ? op.prop : "children"}${extra.map((key) => (/^\d+$/.test(key) ? `[${key}]` : `.${key}`)).join("")} → ${result.source}`;
        state = result.state;
      } else {
        refuse(origin.reason ?? "The value is computed in the code");
      }
    }
    if (adding) {
      if (!isDataFile(adding.mod.file)) refuse(`${adding.mod.file} is not a file the Studio edits`);
      const text = adding.mod.code;
      const next = adding.call ? withArgument(text, adding.call, adding.key, literalCode(op.value, null, text, adding.mod.file)) : withField(text, adding.object, adding.key, literalCode(op.value, null, text, adding.mod.file));
      return { file: adding.mod.file, code: next, source: `${source} (new field)`, changed: next !== text, state };
    }
    if (!isValueNode(found.mod, found.node)) refuse(`${source} is computed in the code, not written as data`);
    if (!isDataFile(found.mod.file)) refuse(`${found.mod.file} is not a file the Studio edits`);
    const text = found.mod.code;
    const replacement = literalCode(sameKind(found.node, op.value, source), found.node, text, found.mod.file);
    const next = `${text.slice(0, found.node.start)}${replacement}${text.slice(found.node.end)}`;
    return { file: found.mod.file, code: next, source, changed: next !== text, state };
  } catch (error) {
    if (error instanceof Refusal) return { error: error.message, code: error.code };
    throw error;
  }
}

