// A builder page's prototype variables (W-52 phase B, docs/research/studio-prototype-variables-2026-10-31.md §2):
// `export const vars = { dateRange: "Any time" }` beside the mock data, Set variable (`proto.set`), Conditional
// (`proto.if`), several actions in a row (`proto.run`), and props that read a variable. Isomorphic and pure (browser and
// Node): dialect.mjs reads the code into these shapes, Play runs them, doc.mjs / compile.mjs print them.
//
//   Operand = string | number | boolean                       a literal
//           | { kind: "ref", root, path }                     `vars.x` (root "vars"), or a .map item's field
//           | { kind: "expr", op, args: Operand[] }           Figma's expressions, written in JS
//   VAR_TYPES, varType(value), OPS, PROP_OPS, isOperand(value), isProtoValue(value)
//   evaluate(operand, read) → value                         read(ref) gives a ref's value
//   operandCode(operand) → JS code                          `vars.cartCount + 1`
//   varsIn(operand) → names                                 the variables an operand reads
//   protoValueCode(value, literalCode) → `proto.…(…)`       a proto value (nested ones too) as code
//   protoVarsIn(value) → names                              the variables a proto value reads or sets
//   resolveItems(args, read) → args                         a .map row's item refs as their values (vars refs kept)
//   withStartValues(node, vars) → node                      a dialect element with its variable reads as start values

/** A variable's kind by its start value (Figma's String, Number, Boolean): text, number or boolean; null when it is none. */
export const VAR_TYPES = ["text", "number", "boolean"];
export const varType = (value) => (typeof value === "string" ? "text" : typeof value === "number" && Number.isFinite(value) ? "number" : typeof value === "boolean" ? "boolean" : null);

/** The operators an expression may use (Figma's: arithmetic, comparison, and / or / not), by JS precedence. */
const PRECEDENCE = { "||": 3, "&&": 4, "===": 8, "!==": 8, "<": 9, "<=": 9, ">": 9, ">=": 9, "+": 11, "-": 11, "*": 12, "/": 12, "!": 14 };
export const OPS = Object.keys(PRECEDENCE);
/** The forms a prop may read a variable in (docs §2.3): `!vars.x`, `vars.x === …`, `vars.x !== …` (and `vars.x` itself). */
export const PROP_OPS = ["!", "===", "!=="];

export const isOperand = (value) => value !== null && typeof value === "object" && (value.kind === "ref" || value.kind === "expr");
export const isProtoValue = (value) => value !== null && typeof value === "object" && !Array.isArray(value) && value.kind === "proto" && typeof value.action === "string" && Array.isArray(value.args);

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const refCode = ({ root, path }) => path.reduce((out, step) => (IDENTIFIER.test(step) ? `${out}.${step}` : `${out}[${JSON.stringify(step)}]`), root);

/** An operand's value; `read(ref)` gives what a ref reads (a variable's value, a row's field). */
export function evaluate(operand, read) {
  if (!isOperand(operand)) return operand;
  if (operand.kind === "ref") return read(operand);
  const [a, b] = operand.args;
  const at = (value) => evaluate(value, read);
  switch (operand.op) {
    case "!": return !at(a);
    // Both sides are read first only where JS would: && and || stop early.
    case "&&": return at(a) && at(b);
    case "||": return at(a) || at(b);
    case "===": return at(a) === at(b);
    case "!==": return at(a) !== at(b);
    case "<": return at(a) < at(b);
    case "<=": return at(a) <= at(b);
    case ">": return at(a) > at(b);
    case ">=": return at(a) >= at(b);
    case "+": { const left = at(a); const right = at(b); return typeof left === "number" && typeof right === "number" ? left + right : `${left ?? ""}${right ?? ""}`; }
    case "-": return Number(at(a)) - Number(at(b));
    case "*": return Number(at(a)) * Number(at(b));
    // A division by zero gives 0: a number a layer shows never reads "Infinity".
    case "/": { const right = Number(at(b)); return right === 0 ? 0 : Number(at(a)) / right; }
    default: return undefined;
  }
}

/** An operand as JS code (parentheses only where precedence needs them). */
export function operandCode(operand, parent = 0) {
  if (!isOperand(operand)) return JSON.stringify(operand);
  if (operand.kind === "ref") return refCode(operand);
  const own = PRECEDENCE[operand.op] ?? 0;
  const [a, b] = operand.args;
  const code = operand.op === "!" ? `!${operandCode(a, own)}` : `${operandCode(a, own)} ${operand.op} ${operandCode(b, own + 1)}`;
  return own < parent ? `(${code})` : code;
}

/** The variables `operand` reads (`vars.x`), each once. */
export function varsIn(operand) {
  const out = new Set();
  const visit = (value) => {
    if (!isOperand(value)) return;
    if (value.kind === "ref") { if (value.root === "vars" && value.path.length) out.add(value.path[0]); return; }
    value.args.forEach(visit);
  };
  visit(operand);
  return [...out];
}

/** A proto value as code: its args as `literalCode` writes literals, operands and nested proto values as code. */
export function protoValueCode(value, literalCode = JSON.stringify) {
  const arg = (entry) => (isProtoValue(entry) ? protoValueCode(entry, literalCode) : isOperand(entry) ? operandCode(entry) : literalCode(entry));
  return `proto.${value.action}(${value.args.map(arg).join(", ")})`;
}

/** The variables a proto value sets or reads, nested actions included. */
export function protoVarsIn(value) {
  const out = new Set();
  const visit = (entry) => {
    if (isProtoValue(entry)) {
      if (entry.action === "set" && typeof entry.args[0] === "string") out.add(entry.args[0]);
      entry.args.forEach(visit);
    } else if (isOperand(entry)) varsIn(entry).forEach((name) => out.add(name));
  };
  visit(value);
  return [...out];
}

/** A proto value's args with the refs to a .map row's item read now (`read`), so the row's handler carries its own
 *  values; `vars.x` stays, read when the action runs. */
export function resolveItems(args, read) {
  const resolve = (entry) => {
    if (isProtoValue(entry)) return { ...entry, args: entry.args.map(resolve) };
    if (!isOperand(entry)) return entry;
    if (entry.kind === "ref") return entry.root === "vars" ? entry : read(entry);
    return { ...entry, args: entry.args.map(resolve) };
  };
  return args.map(resolve);
}

/** Whether an operand reads only variables and literals (no .map row's field). */
const onlyVars = (operand) => !isOperand(operand) || (operand.kind === "ref" ? operand.root === "vars" : operand.args.every(onlyVars));

/** A dialect element (parsePage or a document) with its variable reads as the start values `vars`: a prop reading
 *  `vars.x` (or a condition on variables only) becomes a literal, `{vars.x}` its words; a condition on a .map row's field
 *  stays. Figma push draws this until it binds Figma variables (docs §4, phase B3). */
export function withStartValues(node, vars) {
  const read = (ref) => (ref.root === "vars" ? vars?.[ref.path[0]] : undefined);
  const value = (entry) => {
    if (isOperand(entry) && onlyVars(entry)) return { kind: "literal", value: evaluate(entry, read) };
    if (entry.kind === "element") return { ...entry, node: withStartValues(entry.node, vars) };
    if (entry.kind === "fragment") return { ...entry, children: entry.children.map(child) };
    if (entry.kind === "array") return { ...entry, items: entry.items.map(value) };
    if (entry.kind === "object") return { ...entry, fields: Object.fromEntries(Object.entries(entry.fields).map(([key, field]) => [key, value(field)])) };
    return entry;
  };
  const child = (entry) => {
    if (entry.kind === "ref" && entry.root === "vars") return { kind: "text", value: String(read(entry) ?? "") };
    if (entry.kind === "element") return withStartValues(entry, vars);
    if (entry.kind === "map") return { ...entry, node: withStartValues(entry.node, vars) };
    return entry;
  };
  return { ...node, props: Object.fromEntries(Object.entries(node.props).map(([name, entry]) => [name, value(entry)])), children: node.children.map(child) };
}
