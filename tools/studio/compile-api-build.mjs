#!/usr/bin/env node
// What a builder page cannot write but a component requires (Studio builder GĐ5 M1, spec
// docs/research/studio-builder-handoff-spec-2026-10-07.md §3a), from the generated API docs (docs/api/*.json, too big for
// the compile chunk): per Zen component, its required function props (AiChatField `onSubmit`) and the required function
// fields of the objects its props take (Table `columns[].cell`, TopNavigation `searchAction.onClick`). A page holds
// literals only, so the exported React (compile.mjs) writes a stand-in for each, and the page renderer one for a cell.
//   node tools/studio/compile-api-build.mjs           write tools/studio/compile-api.generated.mjs
//   node tools/studio/compile-api-build.mjs --check   exit 1 when that file is out of date
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = path.join(root, "docs/api");
const OUT = path.join(root, "tools/studio/compile-api.generated.mjs");

/** Splits `text` at its top-level `separator` (brackets, generics and strings nest; an arrow's `>` closes nothing). */
function splitTop(text, separator) {
  const parts = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quote) {
      if (char === quote && text[index - 1] !== "\\") quote = "";
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") quote = char;
    else if ("(<[{".includes(char)) depth++;
    else if (")]}".includes(char) || (char === ">" && text[index - 1] !== "=")) depth--;
    else if (depth === 0 && text.startsWith(separator, index)) {
      parts.push(text.slice(start, index));
      start = index + separator.length;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** `(a: A) => R` (the whole type an arrow, possibly in parentheses); null otherwise. */
function arrowOf(type) {
  let text = type.trim();
  // `((row: T) => ReactNode)`: parentheses around the whole arrow.
  if (text.startsWith("((") && text.endsWith(")") && splitTop(text.slice(1, -1), "=>").length === 2) text = text.slice(1, -1).trim();
  if (!text.startsWith("(")) return null;
  return splitTop(text, "=>").length === 2 && splitTop(text, "|").length === 1 ? text : null;
}

/** The object body `{ … }` a type names: inline, an interface, or a type alias to one (generics dropped). */
function objectBody(type, types, seen = new Set()) {
  const text = type.trim();
  if (text.startsWith("{") && text.endsWith("}")) return text.slice(1, -1);
  const name = /^([A-Z]\w*)(?:<.*>)?$/.exec(text)?.[1];
  if (!name || seen.has(name) || !types[name]) return null;
  seen.add(name);
  const declaration = types[name];
  const iface = /^(?:export\s+)?interface\s+\w+(?:<[^{]*>)?\s*(?:extends\s+[^{]+)?\{([\s\S]*)\}\s*$/.exec(declaration);
  if (iface) return iface[1];
  const alias = /^(?:export\s+)?type\s+\w+(?:<[^=]*>)?\s*=\s*([\s\S]+)$/.exec(declaration);
  if (!alias) return null;
  const alternatives = splitTop(alias[1].replace(/^\|/, ""), "|");
  if (alternatives.length !== 1) return null;
  const parts = splitTop(alternatives[0], "&");
  const bodies = parts.map((part) => objectBody(part, types, seen)).filter((body) => body !== null);
  return bodies.length ? bodies.join(";") : null;
}

/** The required function fields of an object body: { name: signature }. */
function requiredFunctions(body) {
  const out = {};
  for (const member of splitTop(body, ";").flatMap((part) => splitTop(part, ","))) {
    const field = /^(?:readonly\s+)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+)$/.exec(member.replace(/\/\*[\s\S]*?\*\//g, "").trim());
    if (!field || field[2]) continue;
    const arrow = arrowOf(field[3]);
    if (arrow) out[field[1]] = arrow;
  }
  return out;
}

/** The objects a prop's type admits (`X`, `X[]`, `Array<X>`, `X | ReactNode`), as their required function fields. */
function fieldsOf(type, types) {
  const alternatives = splitTop(type.replace(/^\|/, ""), "|").map((alternative) => {
    const list = /^(.*)\[\]$/.exec(alternative)?.[1] ?? /^(?:ReadonlyArray|Array)<(.*)>$/.exec(alternative)?.[1];
    return (list ?? alternative).replace(/^\((.*)\)$/, "$1");
  }).flatMap((alternative) => splitTop(alternative, "|"));
  const bodies = alternatives.map((alternative) => objectBody(alternative, types)).filter((body) => body !== null);
  if (!bodies.length) return null;
  // Several object shapes (a union of variants): only what every one of them requires.
  const [first, ...rest] = bodies.map(requiredFunctions);
  const common = Object.fromEntries(Object.entries(first).filter(([name]) => rest.every((other) => name in other)));
  return Object.keys(common).length ? common : null;
}

/** Every field name of a closed object body (no index signature, every member read); null otherwise. */
function fieldNames(body) {
  const names = [];
  for (const member of splitTop(body, ";").flatMap((part) => splitTop(part, ","))) {
    const field = /^(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*[:(]/.exec(member.replace(/\/\*[\s\S]*?\*\//g, "").trim());
    if (!field) return null;
    names.push(field[1]);
  }
  return names;
}

/** The fields a prop's objects may have, when its type is objects only (`X`, `X[]`) of closed shapes; null otherwise. */
function knownFields(type, types) {
  const alternatives = splitTop(type.replace(/^\|/, ""), "|").filter((alternative) => !/^(null|undefined)$/.test(alternative)).map((alternative) => {
    const list = /^(.*)\[\]$/.exec(alternative)?.[1] ?? /^(?:ReadonlyArray|Array)<(.*)>$/.exec(alternative)?.[1];
    return (list ?? alternative).replace(/^\((.*)\)$/, "$1");
  }).flatMap((alternative) => splitTop(alternative, "|"));
  if (!alternatives.length) return null;
  const names = new Set();
  for (const alternative of alternatives) {
    // An interface that extends another has fields this file does not list.
    const name = /^([A-Z]\w*)(?:<.*>)?$/.exec(alternative)?.[1];
    if (name && /^(?:export\s+)?interface\s+\w+(?:<[^{]*>)?\s*extends\b/.test(types[name] ?? "")) return null;
    const body = objectBody(alternative, types);
    const fields = body === null ? null : fieldNames(body);
    if (!fields) return null;
    for (const field of fields) names.add(field);
  }
  return [...names];
}

const result = {};
const known = {};
for (const file of fs.readdirSync(SOURCE).filter((name) => name.endsWith(".json")).sort()) {
  const doc = JSON.parse(fs.readFileSync(path.join(SOURCE, file), "utf8"));
  const types = doc.types ?? {};
  for (const component of doc.components ?? []) {
    const props = {};
    const fields = {};
    for (const prop of component.props ?? []) {
      if (prop.deprecated || prop.name === "ref" || prop.name === "children") continue;
      const arrow = prop.required ? arrowOf(prop.type) : null;
      if (arrow) props[prop.name] = arrow;
      const inside = fieldsOf(prop.type, types);
      if (inside) fields[prop.name] = inside;
      const names = knownFields(prop.type, types);
      if (names) (known[component.name] ??= {})[prop.name] = names;
    }
    if (Object.keys(props).length || Object.keys(fields).length) result[component.name] = { ...(Object.keys(props).length ? { props } : {}), ...(Object.keys(fields).length ? { fields } : {}) };
  }
}

const text = `/* Generated by tools/studio/compile-api-build.mjs from docs/api/*.json. Do not edit directly. */

/**
 * Per Zen component: its required function props (\`props\`) and, per prop, the required function fields of the objects
 * it takes (\`fields\`), with their signatures. A builder page cannot write a function: compile.mjs writes a stand-in.
 */
export const REQUIRED_FUNCTIONS = ${JSON.stringify(result, null, 2)};

/**
 * Per Zen component: the fields of the objects a prop takes, when its type is closed objects (SelectField \`options\`:
 * label, value, disabled). A design's own data on such an object (an option's \`at\`) is left out of the export, as
 * TypeScript refuses unknown fields in a literal.
 */
export const OBJECT_FIELDS = ${JSON.stringify(known)};
`;

if (process.argv.includes("--check")) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== text) {
    console.error("✗ compile API requirements out of date: run node tools/studio/compile-api-build.mjs");
    process.exit(1);
  }
  console.log(`✓ compile API requirements up to date (${Object.keys(result).length} components).`);
} else {
  fs.writeFileSync(OUT, text);
  console.log(`wrote ${path.relative(root, OUT)} (${Object.keys(result).length} components with required functions, ${Object.keys(known).length} with closed object props, ${text.length} bytes)`);
}
