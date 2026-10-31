import type { PageNode, PageTree, PageValue } from "../render/renderPage";
import { isOperand, operandCode, protoValueCode, varType, type VarRef, type VarType } from "../../../../../tools/studio/proto-vars.mjs";

/*
 * A builder page's prototype variables as the Studio reads them (W-52 phase B2, docs/research/studio-prototype-variables-
 * 2026-10-31.md §3): what the page declares, where its layers read or set each one, the words a variable or an
 * expression shows in, and what a person types turned into code. Pure (protoVarsModel.selftest.mjs runs it in Node);
 * the edits are protoVars.ts.
 */

export type PageVar = { name: string; type: VarType; value: string | number | boolean };

/** The page's variables, as declared. */
export const pageVarsOf = (tree: PageTree | null): PageVar[] => Object.entries(tree?.vars ?? {}).flatMap(([name, value]) => {
  const type = varType(value);
  return type ? [{ name, type, value: value as string | number | boolean }] : [];
});

/** What a new variable of each kind starts as, and its icon. */
export const VAR_START: Readonly<Record<VarType, string | number | boolean>> = { text: "", number: 0, boolean: false };
export const VAR_ICON: Readonly<Record<VarType, "icon-type-01-line" | "icon-hash-01-line" | "icon-toggle-right-line">> = { text: "icon-type-01-line", number: "icon-hash-01-line", boolean: "icon-toggle-right-line" };
export const VAR_WORDS: Readonly<Record<VarType, string>> = { text: "Text", number: "Number", boolean: "Boolean" };
/** The mark of a layer, a field or an action that reads a variable ({x}). */
export const VAR_MARK = "icon-brackets-line";

/** A new variable's name: the kind's word and the first free number ("text1"). */
export function freeVarName(type: VarType, taken: readonly string[]): string {
  const used = new Set(taken);
  for (let n = 1; ; n += 1) if (!used.has(`${type}${n}`)) return `${type}${n}`;
}

/** Where each variable is used: the layers that read or set it, by name. */
export function varUsesOf(tree: Pick<PageTree, "board"> | null): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const note = (name: string, loc: string) => { if (!out.has(name)) out.set(name, new Set()); out.get(name)!.add(loc); };
  const inOperand = (operand: unknown, loc: string) => {
    if (!operand || typeof operand !== "object") return;
    const value = operand as { kind?: string; root?: string; path?: string[]; args?: unknown[]; action?: string };
    if (value.kind === "ref" && value.root === "vars" && value.path?.[0]) note(value.path[0], loc);
    if (value.kind === "proto" && value.action === "set" && typeof value.args?.[0] === "string") note(value.args[0], loc);
    if (value.kind === "expr" || value.kind === "proto") value.args?.forEach((arg) => inOperand(arg, loc));
  };
  const visitValue = (value: PageValue, loc: string) => {
    if (value.kind === "element") visitNode(value.node);
    else if (value.kind === "fragment") value.children.forEach((child) => visitChild(child, loc));
    else if (value.kind === "array") value.items.forEach((item) => visitValue(item, loc));
    else if (value.kind === "object") Object.values(value.fields).forEach((field) => visitValue(field, loc));
    else inOperand(value, loc);
  };
  const visitChild = (child: PageNode["children"][number], loc: string) => {
    if (child.kind === "element") visitNode(child);
    else if (child.kind === "map") visitNode(child.node);
    else if (child.kind === "ref") inOperand(child, loc);
  };
  const visitNode = (node: PageNode) => {
    Object.values(node.props).forEach((value) => visitValue(value, node.loc));
    node.children.forEach((child) => visitChild(child, node.loc));
  };
  if (tree?.board) visitNode(tree.board);
  return out;
}

/** An operand in design words: the variable's name for `vars.x`, `count + 1` for an expression. */
export const operandWords = (operand: unknown): string => operandCode(operand).replace(/\bvars\./g, "");
/** An action as code (`proto.set("x", vars.x + 1)`), nested actions too. */
export const actionCode = (value: { action: string; args: unknown[] }) => protoValueCode({ kind: "proto", action: value.action, args: value.args }, literalCode);

/** A literal as the page writes it: strings quoted, objects `{ title: "Done" }`. */
export function literalCode(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(literalCode).join(", ")}]`;
  if (typeof value === "object") {
    const fields = Object.entries(value as Record<string, unknown>).filter((entry) => entry[1] !== undefined).map(([key, field]) => `${/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)}: ${literalCode(field)}`);
    return fields.length ? `{ ${fields.join(", ")} }` : "{}";
  }
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

/**
 * What a person types for an expression (Figma's: `count + 1`, `dateRange === "Any time"`, no `vars.`) as page code:
 * each variable name outside quotes becomes `vars.<name>`. Null when it names something that is no variable. The page's
 * dialect checks the rest when it is written.
 */
export function expressionCode(words: string, names: readonly string[]): string | null {
  const known = new Set(names);
  let out = "";
  let unknown = false;
  const pattern = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([A-Za-z_$][\w$]*)/g;
  let last = 0;
  for (const match of words.matchAll(pattern)) {
    out += words.slice(last, match.index);
    last = (match.index ?? 0) + match[0].length;
    if (match[1]) { out += match[1].startsWith("'") ? JSON.stringify(match[1].slice(1, -1)) : match[1]; continue; }
    const word = match[2];
    if (word === "true" || word === "false") out += word;
    else if (word === "and") out += "&&";
    else if (word === "or") out += "||";
    else if (word === "not") out += "!";
    else if (known.has(word)) out += `vars.${word}`;
    else if (word === "vars") out += word;
    else { unknown = true; out += word; }
  }
  out += words.slice(last);
  return unknown || !out.trim() ? null : out.trim().replace(/(?<![=!<>])==(?!=)/g, "===").replace(/!=(?!=)/g, "!==");
}

/** A Conditional's test as the Prototype tab shows it: a variable, a comparison (an operator of the code, or "empty" /
 *  "notEmpty", a text compared with "") and a value. */
export type VarTest = { name: string; op: string; value: unknown };

const refName = (operand: unknown) => (isOperand(operand) && (operand as VarRef).kind === "ref" && (operand as VarRef).root === "vars" ? (operand as VarRef).path[0] : null);

/** A Conditional's test as a variable, a comparison and a value (`vars.x`, `!vars.x`, `vars.x <op> <literal>`); null when
 *  it is more than that (an expression). */
export function varTestOf(condition: unknown): VarTest | null {
  const own = refName(condition);
  if (own) return { name: own, op: "===", value: true };
  const expr = condition as { kind?: string; op?: string; args?: unknown[] };
  if (expr?.kind !== "expr" || !expr.args) return null;
  if (expr.op === "!" && refName(expr.args[0])) return { name: refName(expr.args[0])!, op: "===", value: false };
  const name = refName(expr.args[0]);
  if (name && !isOperand(expr.args[1]) && ["===", "!==", "<", "<=", ">", ">="].includes(expr.op ?? "")) return { name, op: expr.op!, value: expr.args[1] };
  return null;
}

/** The comparisons a text has besides is / is not (walk W-58, a required field): `vars.x === ""` and `vars.x !== ""`. */
const EMPTY_OPS: Readonly<Record<string, "===" | "!==">> = { empty: "===", notEmpty: "!==" };

/** The comparison a test shows in: "empty" / "notEmpty" for a text compared with "", else its operator. */
export const varTestOp = (test: VarTest, type: VarType | undefined): string =>
  type === "text" && test.value === "" && (test.op === "===" || test.op === "!==") ? (test.op === "===" ? "empty" : "notEmpty") : test.op;

/** A test as code: `vars.x` / `!vars.x` for a boolean on or off, `vars.x === ""` for "empty" ("notEmpty": `!==`), else
 *  `vars.x <op> <value>`. */
export function varTestCode(name: string, op: string, value: unknown, type: VarType): string {
  if (EMPTY_OPS[op]) return `vars.${name} ${EMPTY_OPS[op]} ""`;
  if (type === "boolean" && (op === "===" || op === "!==")) return (value === true) === (op === "===") ? `vars.${name}` : `!vars.${name}`;
  return `vars.${name} ${op} ${literalCode(value)}`;
}

/** A prop that reads a variable (`vars.x`, `!vars.x`, `vars.x === …`): its variable and the words it shows in. */
export function varReadOf(code: string): { name: string; words: string } | null {
  const match = /^\s*(!)?\s*vars\.([A-Za-z_$][\w$]*)\s*(?:(===|!==)\s*(.+?))?\s*$/.exec(code);
  if (!match) return null;
  const [, not, name, op, other] = match;
  if (not && op) return null;
  if (op) return { name, words: `${name} ${op === "===" ? "is" : "is not"} ${other}` };
  return { name, words: not ? `not ${name}` : name };
}
