// Edits a builder page's prototype variables in its text (W-52 phase B2, docs/research/studio-prototype-variables-2026-10-31.md
// §3.1): the engine's op "pageVars" (jsx-source.mjs applyOps, sent on the page's <Board>). One change per op, one undo step.
// Isomorphic and pure (browser and Node).
//
//   editPageVars(text, change) → text        throws PageVarsError { code, message } when the change cannot be made
//     { add: { name, value } }               a new variable (its kind is its start value's)
//     { set: { name, value } }               a new start value, of the same kind
//     { rename: { from, to } }               the declaration, every `vars.from` and every proto.set("from", …)
//     { retype: { name, type } }             text | number | boolean: the start value and every literal proto.set value
//                                            turned into that kind
//     { remove: name }                       the declaration; a layer reading it takes its start value (a condition on
//                                            a row's field goes), a proto.set of it goes (a Conditional's branch refuses)
//   freeVarName(base, taken) → name          "text1", "text2"… as Add names a new variable
//   varUsesIn(text) → { name: count }        how many places read or set each variable (Delete's question)
import { parse } from "@babel/parser";
import { evaluate, varType } from "./proto-vars.mjs";

export class PageVarsError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const refuse = (message) => { throw new PageVarsError("invalid", message); };

const NAME = /^[A-Za-z_$][\w$]*$/;
const RESERVED = new Set(["break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do", "else", "export", "extends", "false", "finally", "for", "function", "if", "import", "in", "instanceof", "new", "null", "return", "super", "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while", "with", "yield", "let", "static", "enum", "await", "implements", "package", "protected", "interface", "private", "public"]);
const SKIP = new Set(["loc", "start", "end", "extra", "range", "leadingComments", "trailingComments", "innerComments", "comments", "tokens", "errors"]);
const START = { text: "", number: 0, boolean: false };

const parseText = (text) => {
  try {
    return parse(text, { sourceType: "module", plugins: ["jsx", "typescript"] });
  } catch {
    return refuse("The page does not parse");
  }
};

/** Every node with its parent chain (nearest first), depth first. */
function walk(root, visit) {
  const stack = [[root, []]];
  while (stack.length) {
    const [node, parents] = stack.pop();
    visit(node, parents);
    const below = [node, ...parents];
    for (const [key, value] of Object.entries(node)) {
      if (SKIP.has(key) || !value || typeof value !== "object") continue;
      if (Array.isArray(value)) { for (let i = value.length - 1; i >= 0; i -= 1) if (value[i] && typeof value[i].type === "string") stack.push([value[i], below]); }
      else if (typeof value.type === "string") stack.push([value, below]);
    }
  }
}

/** The page's `export const vars` statement and its object, or nulls. */
function declarationOf(ast) {
  for (const statement of ast.program.body) {
    const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : null;
    if (declaration?.type !== "VariableDeclaration" || declaration.declarations.length !== 1 || declaration.declarations[0].id.name !== "vars") continue;
    return { statement, object: declaration.declarations[0].init };
  }
  return { statement: null, object: null };
}

/** The page's variables as written (a malformed declaration reads as none). */
function varsOf(object) {
  const out = {};
  for (const property of object?.type === "ObjectExpression" ? object.properties : []) {
    const key = property.key?.type === "Identifier" ? property.key.name : property.key?.type === "StringLiteral" ? property.key.value : null;
    const value = property.value;
    const start = value?.type === "StringLiteral" || value?.type === "NumericLiteral" || value?.type === "BooleanLiteral" ? value.value
      : value?.type === "UnaryExpression" && value.operator === "-" && value.argument.type === "NumericLiteral" ? -value.argument.value : undefined;
    if (key !== null && start !== undefined) out[key] = start;
  }
  return out;
}

const literalCode = (value) => (typeof value === "string" ? JSON.stringify(value) : String(value));
const declarationCode = (vars) => `export const vars = { ${Object.entries(vars).map(([name, value]) => `${name}: ${literalCode(value)}`).join(", ")} };`;

/** `vars.<name>` (also `vars["name"]`): the name it reads, else null. */
const readName = (node) => {
  if (node?.type !== "MemberExpression" || node.object.type !== "Identifier" || node.object.name !== "vars") return null;
  if (!node.computed && node.property.type === "Identifier") return node.property.name;
  return node.computed && node.property.type === "StringLiteral" ? node.property.value : null;
};
/** `proto.<action>(…)`: the action, else null. */
const protoAction = (node) => (node?.type === "CallExpression" && node.callee.type === "MemberExpression" && node.callee.object.type === "Identifier" && node.callee.object.name === "proto" && node.callee.property.type === "Identifier" ? node.callee.property.name : null);
/** A proto.set call's variable name, else null. */
const setName = (node) => (protoAction(node) === "set" && node.arguments[0]?.type === "StringLiteral" ? node.arguments[0].value : null);

/** Splices: [start, end, code], applied from the end. Overlapping ones keep the outer (the first by start, longest). */
function splice(text, edits) {
  const sorted = [...edits].sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const kept = [];
  for (const edit of sorted) if (!kept.length || edit[0] >= kept.at(-1)[1]) kept.push(edit);
  let out = text;
  for (const [start, end, code] of kept.reverse()) out = out.slice(0, start) + code + out.slice(end);
  return out;
}

/** Where a new declaration goes: after `export const mock`, else after the imports. */
function insertAt(ast) {
  const body = ast.program.body;
  const mock = body.find((statement) => statement.type === "ExportNamedDeclaration" && statement.declaration?.type === "VariableDeclaration" && statement.declaration.declarations[0]?.id.name === "mock");
  if (mock) return { at: mock.end, code: (decl) => `\n${decl}` };
  const imports = body.filter((statement) => statement.type === "ImportDeclaration");
  const last = imports.at(-1);
  return last ? { at: last.end, code: (decl) => `\n\n${decl}` } : { at: 0, code: (decl) => `${decl}\n\n` };
}

/** `value` as a variable of kind `type` (a typed number from text, a switch from a word). */
function asKind(value, type) {
  if (type === "number") { const number = typeof value === "number" ? value : Number(value); return Number.isFinite(number) ? number : 0; }
  if (type === "boolean") return value === true || value === "true" || (typeof value === "number" && value !== 0);
  return typeof value === "boolean" || typeof value === "number" ? String(value) : String(value ?? "");
}

/** Where the attribute or child an expression container sits in (to remove the attribute), and the container. */
const containerOf = (parents) => {
  const at = parents.findIndex((node) => node.type === "JSXExpressionContainer");
  return at < 0 ? null : { container: parents[at], attribute: parents[at + 1]?.type === "JSXAttribute" ? parents[at + 1] : null };
};

/** The edits that take a proto.set call away: the attribute it alone fills, or its place among proto.run's actions. */
function removeCall(text, call, parents) {
  const parent = parents[0];
  if (protoAction(parent) === "run") {
    const args = parent.arguments;
    if (args.length > 1) {
      const at = args.indexOf(call);
      return at < args.length - 1 ? [[call.start, args[at + 1].start, ""]] : [[args[at - 1].end, call.end, ""]];
    }
    return removeCall(text, parent, parents.slice(1));
  }
  if (protoAction(parent) === "if") refuse("A Conditional sets this variable: change that action first");
  const holder = containerOf(parents);
  if (holder?.attribute && holder.container.expression === call) return [[holder.attribute.start - (text[holder.attribute.start - 1] === " " ? 1 : 0), holder.attribute.end, ""]];
  return refuse("This variable is set in a way the Studio cannot remove: change it in the code");
}

/** The page's text with one change to its variables. */
export function editPageVars(text, change) {
  const ast = parseText(text);
  const { statement, object } = declarationOf(ast);
  const vars = varsOf(object);
  const edits = [];
  const declare = (next) => {
    const code = declarationCode(next);
    if (statement && !Object.keys(next).length) {
      // The last variable gone: the declaration goes with the blank line before it.
      const from = text.lastIndexOf("\n", statement.start - 1);
      edits.push([from < 0 ? statement.start : from, statement.end, ""]);
    } else if (statement) edits.push([statement.start, statement.end, code]);
    else { const place = insertAt(ast); edits.push([place.at, place.at, place.code(code)]); }
  };

  if (change.add) {
    const { name, value } = change.add;
    if (!NAME.test(name) || RESERVED.has(name)) refuse(`${name} is not a name a variable can have (letters, digits, _ and $)`);
    if (Object.hasOwn(vars, name)) refuse(`There is a variable named ${name} already`);
    if (!varType(value)) refuse("A variable holds text, a number or a boolean");
    declare({ ...vars, [name]: value });
    return splice(text, edits);
  }
  if (change.set) {
    const { name, value } = change.set;
    if (!Object.hasOwn(vars, name)) refuse(`No variable named ${name}`);
    declare({ ...vars, [name]: asKind(value, varType(vars[name])) });
    return splice(text, edits);
  }
  if (change.rename) {
    const { from, to } = change.rename;
    if (!Object.hasOwn(vars, from)) refuse(`No variable named ${from}`);
    if (from === to) return text;
    if (!NAME.test(to) || RESERVED.has(to)) refuse(`${to} is not a name a variable can have (letters, digits, _ and $)`);
    if (Object.hasOwn(vars, to)) refuse(`There is a variable named ${to} already`);
    declare(Object.fromEntries(Object.entries(vars).map(([name, value]) => [name === from ? to : name, value])));
    walk(ast.program, (node, parents) => {
      if (parents.includes(statement)) return;
      if (readName(node) === from) edits.push([node.property.start, node.property.end, node.computed ? JSON.stringify(to) : to]);
      if (setName(node) === from) edits.push([node.arguments[0].start, node.arguments[0].end, JSON.stringify(to)]);
    });
    return splice(text, edits);
  }
  if (change.retype) {
    const { name, type } = change.retype;
    if (!Object.hasOwn(vars, name)) refuse(`No variable named ${name}`);
    if (!Object.hasOwn(START, type)) refuse("A variable is text, a number or a boolean");
    if (varType(vars[name]) === type) return text;
    declare({ ...vars, [name]: asKind(vars[name], type) });
    walk(ast.program, (node) => {
      const value = setName(node) === name ? node.arguments[1] : null;
      if (value && (value.type === "StringLiteral" || value.type === "NumericLiteral" || value.type === "BooleanLiteral")) edits.push([value.start, value.end, literalCode(asKind(value.value, type))]);
    });
    return splice(text, edits);
  }
  if (change.remove !== undefined) {
    const name = change.remove;
    if (!Object.hasOwn(vars, name)) refuse(`No variable named ${name}`);
    const rest = Object.fromEntries(Object.entries(vars).filter(([key]) => key !== name));
    declare(rest);
    walk(ast.program, (node, parents) => {
      if (parents.includes(statement) || node === statement) return;
      if (setName(node) === name) { edits.push(...removeCall(text, node, parents)); return; }
      if (readName(node) !== name) return;
      // Inside an action (a Conditional, a Set variable's expression): the start value in its place.
      if (parents.some((parent) => protoAction(parent))) { edits.push([node.start, node.end, literalCode(vars[name])]); return; }
      // A layer's prop or words: the whole read becomes the value it gives at the start; a condition on a row's field,
      // which has no one value, goes.
      const holder = containerOf(parents);
      if (!holder) { edits.push([node.start, node.end, literalCode(vars[name])]); return; }
      const read = holder.container.expression;
      let value;
      let fixed = true;
      try {
        value = evaluate(operandOf(read), (ref) => (ref.root === "vars" ? (ref.path[0] === name ? vars[name] : vars[ref.path[0]]) : (fixed = false, undefined)));
      } catch { fixed = false; }
      if (fixed && varType(value)) edits.push([holder.container.start, holder.container.end, holder.attribute && typeof value === "string" ? JSON.stringify(value) : `{${literalCode(value)}}`]);
      else if (holder.attribute) edits.push([holder.attribute.start - (text[holder.attribute.start - 1] === " " ? 1 : 0), holder.attribute.end, ""]);
      else edits.push([holder.container.start, holder.container.end, ""]);
    });
    return splice(text, edits);
  }
  return refuse("pageVars takes add, set, rename, retype or remove");
}

/** A Babel expression as an operand (proto-vars.mjs) for evaluating a prop's read; throws on anything else. */
function operandOf(node) {
  if (node.type === "StringLiteral" || node.type === "NumericLiteral" || node.type === "BooleanLiteral") return node.value;
  const name = readName(node);
  if (name !== null) return { kind: "ref", root: "vars", path: [name] };
  if (node.type === "Identifier" || node.type === "MemberExpression") return { kind: "ref", root: "row", path: [] };
  if (node.type === "UnaryExpression" && node.operator === "!") return { kind: "expr", op: "!", args: [operandOf(node.argument)] };
  if (node.type === "BinaryExpression" || node.type === "LogicalExpression") return { kind: "expr", op: node.operator, args: [operandOf(node.left), operandOf(node.right)] };
  if (node.type === "ParenthesizedExpression") return operandOf(node.expression);
  throw new Error("not an operand");
}

/** A name for a new variable: `base` with the first free number ("text1"). */
export function freeVarName(base, taken) {
  const used = new Set(taken);
  for (let n = 1; ; n += 1) if (!used.has(`${base}${n}`)) return `${base}${n}`;
}

/** How many places read or set each variable of the page (`vars.x`, proto.set("x", …)). */
export function varUsesIn(text) {
  let ast;
  try { ast = parse(text, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true }); } catch { return {}; }
  const { statement } = declarationOf(ast);
  const out = {};
  walk(ast.program, (node, parents) => {
    if (statement && parents.includes(statement)) return;
    const name = readName(node) ?? setName(node);
    if (name !== null) out[name] = (out[name] ?? 0) + 1;
  });
  return out;
}
