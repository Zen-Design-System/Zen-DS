// Figma's Local variables on the Zen token sources (Zen Studio P5, 2026-10-17; spec
// docs/research/studio-figma-native-parity-2026-10-17.md §10). A collection is one tokens/source/figma/<file>.json
// (`{ "<Collection>": { modes, tokens: [{ name, type, valuesByMode }] } }`, aliases written "{Other/Name}", the file
// JSON.stringify'd with 2 spaces and a final newline). The Variables window changes one collection per edit; the dev
// server writes the result as a draft of that file (undo, history and Save as any Studio edit).
// Isomorphic (browser and Node); variables.selftest.mjs runs it.
//
//   applyVariableOps(text, ops, context) → { text, changed: [name], label }
//   ops: { op: "setValue", name, mode, value }     value: "#RRGGBB[AA]" | number | string | boolean | { alias: name }
//        { op: "create", name, type, after? }       type COLOR | FLOAT | STRING | BOOLEAN; every mode gets a default
//        { op: "rename", name, to }                 refused while something reads it (context.readers)
//        { op: "duplicate", name, to? }             "<name> copy", numbered when taken
//        { op: "delete", name }                     refused while something reads it
//   context: { variables: Map(name → { type, collection, valuesByMode }) of every collection (this one included, as
//             saved or drafted), readers(name) → [description] (other variables' aliases and code reading its CSS name) }
//
//   variablesPackage(base, now) → the Zen plugin's `zen-studio-variables` v1 package: what changed from the `base`
//   texts to the `now` texts (Map file → text), by collection, variable name and mode; renames, creates, sets, deletes.

export const TOKEN_SOURCE = /^tokens\/source\/figma\/[a-z0-9-]+\.json$/;
export const VARIABLE_TYPES = ["COLOR", "FLOAT", "STRING", "BOOLEAN"];

export class VariableEditError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const refuse = (message, code = "invalid") => { throw new VariableEditError(code, message); };

/** The build's CSS name of a variable (scripts/token-outputs.mjs `cssName`, without `--zen-`). */
export const cssNameOf = (name) => String(name).replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

const ALIAS = /^\{(.+)\}$/;
/** The variable a value aliases, or null. */
export const aliasOf = (value) => (typeof value === "string" ? ALIAS.exec(value)?.[1] ?? null : null);

/** A collection file's text → { name (the collection), modes, tokens }. */
export function readCollection(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    refuse("The collection file is not JSON");
  }
  const name = Object.keys(json ?? {})[0];
  const body = name ? json[name] : null;
  if (!body || !Array.isArray(body.modes) || !Array.isArray(body.tokens)) refuse("The collection file has no modes and tokens");
  return { name, modes: body.modes, tokens: body.tokens };
}

const writeCollection = (collection) => `${JSON.stringify({ [collection.name]: { modes: collection.modes, tokens: collection.tokens } }, null, 2)}\n`;

/** "#abc" / "#AABBCC" / "#AABBCC80" → "#AABBCC" or "#AABBCC80" (opaque colours keep 6 digits, as the exports do). */
export function normalizeColor(value) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(String(value).trim());
  if (!match) return null;
  let hex = match[1].toUpperCase();
  if (hex.length === 3) hex = hex.split("").map((digit) => digit + digit).join("");
  if (hex.length === 8 && hex.endsWith("FF")) hex = hex.slice(0, 6);
  return `#${hex}`;
}

/** The value a variable shows in `mode`, aliases followed (null when a chain breaks or loops). */
export function resolveValue(variables, name, mode, seen = new Set()) {
  const variable = variables.get(name);
  if (!variable || seen.has(name)) return null;
  seen.add(name);
  const value = variable.valuesByMode?.[mode] ?? Object.values(variable.valuesByMode ?? {})[0];
  const target = aliasOf(value);
  if (!target) return value ?? null;
  const next = variables.get(target);
  if (!next) return null;
  // An alias into another collection reads that collection's mode of the same name, else its first (Figma's default).
  const nextMode = next.valuesByMode && mode in next.valuesByMode ? mode : Object.keys(next.valuesByMode ?? {})[0];
  return resolveValue(variables, target, nextMode, seen);
}

const DEFAULTS = { COLOR: "#FFFFFF", FLOAT: 0, STRING: "", BOOLEAN: false };

/** `value` checked for a `type` variable: the text the file keeps. */
function checkedValue(variables, self, type, value) {
  if (value && typeof value === "object" && typeof value.alias === "string") {
    const target = variables.get(value.alias);
    if (!target) refuse(`There is no variable ${value.alias}`);
    if (target.type !== type) refuse(`${value.alias} is a ${typeWord(target.type)} variable; ${self} takes a ${typeWord(type)}`);
    if (value.alias === self) refuse("A variable cannot alias itself");
    // No loop: following the target's aliases never comes back to this variable.
    const loops = (name, seen) => {
      if (name === self) return true;
      if (seen.has(name)) return false;
      seen.add(name);
      const variable = variables.get(name);
      return Object.values(variable?.valuesByMode ?? {}).some((each) => { const next = aliasOf(each); return next ? loops(next, seen) : false; });
    };
    if (loops(value.alias, new Set())) refuse(`${value.alias} already reads ${self}: the alias would loop`);
    return `{${value.alias}}`;
  }
  if (type === "COLOR") return normalizeColor(value) ?? refuse(`${JSON.stringify(value)} is not a colour (#RRGGBB or #RRGGBBAA)`);
  if (type === "FLOAT") {
    const number = typeof value === "number" ? value : Number(String(value).trim());
    if (!Number.isFinite(number) || String(value).trim() === "") refuse(`${JSON.stringify(value)} is not a number`);
    return Math.round(number * 1000) / 1000;
  }
  if (type === "STRING") return typeof value === "string" ? value : refuse("Expected text");
  if (type === "BOOLEAN") return typeof value === "boolean" ? value : refuse("Expected true or false");
  return refuse(`Unknown type ${type}`);
}

export const typeWord = (type) => ({ COLOR: "colour", FLOAT: "number", STRING: "string", BOOLEAN: "boolean" })[type] ?? String(type).toLowerCase();

/** A new name checked: "/"-separated parts, unique across every collection, its CSS name too. */
function checkedName(variables, name, except) {
  const parts = String(name ?? "").split("/").map((part) => part.trim());
  if (parts.some((part) => !part)) refuse("A name needs text between its “/” (groups)");
  const clean = parts.join("/");
  if (!/[a-z0-9]/i.test(clean)) refuse("A name needs a letter or a digit");
  for (const [other, variable] of variables) {
    if (other === except) continue;
    if (other === clean) refuse(`${clean} already exists${variable.collection ? ` in ${variable.collection}` : ""}`, "conflict");
    if (cssNameOf(other) === cssNameOf(clean)) refuse(`${clean} would be --zen-${cssNameOf(clean)} in code, as ${other} is already`, "conflict");
  }
  return clean;
}

function readersSentence(name, readers) {
  const shown = readers.slice(0, 3).join(", ");
  return `${name} is read by ${shown}${readers.length > 3 ? ` and ${readers.length - 3} more` : ""}`;
}

export function applyVariableOps(text, ops, context) {
  if (!Array.isArray(ops) || !ops.length) refuse("Expected ops");
  const collection = readCollection(text);
  const variables = new Map(context.variables);
  const readers = context.readers ?? (() => []);
  const changed = [];
  const indexOf = (name) => {
    const index = collection.tokens.findIndex((token) => token.name === name);
    if (index < 0) refuse(`${name} is not in ${collection.name}`, "not-found");
    return index;
  };
  const sync = (token, from) => {
    if (from !== undefined) variables.delete(from);
    variables.set(token.name, { type: token.type, collection: collection.name, valuesByMode: token.valuesByMode });
  };
  let label = "";
  for (const op of ops) {
    if (op?.op === "setValue") {
      const token = collection.tokens[indexOf(op.name)];
      if (!collection.modes.includes(op.mode)) refuse(`${collection.name} has no mode ${op.mode}`);
      const value = checkedValue(variables, token.name, token.type, op.value);
      token.valuesByMode = { ...token.valuesByMode, [op.mode]: value };
      sync(token);
      changed.push(token.name);
      label ||= `${token.name} (${op.mode}) → ${typeof value === "string" && aliasOf(value) ? aliasOf(value) : value}`;
    } else if (op?.op === "create") {
      if (!VARIABLE_TYPES.includes(op.type)) refuse(`Unknown type ${op.type}`);
      const name = checkedName(variables, op.name);
      const token = { name, type: op.type, valuesByMode: Object.fromEntries(collection.modes.map((mode) => [mode, DEFAULTS[op.type]])) };
      const after = op.after ? collection.tokens.findIndex((each) => each.name === op.after) : -1;
      // Beside the variable it was made from, else after the last one of its group, else at the end.
      const group = name.includes("/") ? name.slice(0, name.lastIndexOf("/") + 1) : null;
      const lastOfGroup = group ? collection.tokens.findLastIndex((each) => each.name.startsWith(group)) : -1;
      const at = after >= 0 ? after + 1 : lastOfGroup >= 0 ? lastOfGroup + 1 : collection.tokens.length;
      collection.tokens.splice(at, 0, token);
      sync(token);
      changed.push(name);
      label ||= `Create variable ${name}`;
    } else if (op?.op === "rename") {
      const token = collection.tokens[indexOf(op.name)];
      const to = checkedName(variables, op.to, op.name);
      if (to === token.name) continue;
      const reading = readers(op.name);
      if (reading.length) refuse(`${readersSentence(op.name, reading)}: renaming it would break them. Point them at another variable first`, "conflict");
      const from = token.name;
      token.name = to;
      sync(token, from);
      changed.push(to);
      label ||= `Rename ${from} → ${to}`;
    } else if (op?.op === "duplicate") {
      const index = indexOf(op.name);
      const source = collection.tokens[index];
      let to = op.to ? String(op.to) : `${source.name} copy`;
      if (!op.to) for (let n = 2; variables.has(to) || [...variables.keys()].some((other) => cssNameOf(other) === cssNameOf(to)); n += 1) to = `${source.name} copy ${n}`;
      const name = checkedName(variables, to);
      const token = { name, type: source.type, valuesByMode: { ...source.valuesByMode } };
      collection.tokens.splice(index + 1, 0, token);
      sync(token);
      changed.push(name);
      label ||= `Duplicate ${source.name}`;
    } else if (op?.op === "delete") {
      const index = indexOf(op.name);
      const reading = readers(op.name);
      if (reading.length) refuse(`${readersSentence(op.name, reading)}: deleting it would break them`, "conflict");
      collection.tokens.splice(index, 1);
      variables.delete(op.name);
      changed.push(op.name);
      label ||= `Delete variable ${op.name}`;
    } else {
      refuse(`Unknown op ${op?.op}`);
    }
  }
  if (ops.length > 1) label = `${label} (+${ops.length - 1})`;
  return { text: writeCollection(collection), changed, label };
}

/** Every variable of the collections (Map file → text): name → { type, collection, file, valuesByMode }. */
export function variablesOf(texts) {
  const variables = new Map();
  for (const [file, text] of texts) {
    const collection = readCollection(text);
    for (const token of collection.tokens) variables.set(token.name, { type: token.type, collection: collection.name, file, valuesByMode: token.valuesByMode });
  }
  return variables;
}

/** The variables whose values alias `name` (by name), as "Collection › Variable". */
export function aliasReaders(variables, name) {
  const out = [];
  for (const [other, variable] of variables) {
    if (Object.values(variable.valuesByMode ?? {}).some((value) => aliasOf(value) === name)) out.push(other);
  }
  return out;
}

const sameValues = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The Zen plugin's package of what changed between two states of the token sources (Map file → text each): per
 * collection, `set` (the modes whose value changed), `create`, `delete`, `rename` (a deleted and a created variable of
 * one collection with the same type and values). Values are the file's: hex colours, numbers, strings, booleans, or
 * { alias: name }.
 */
export function variablesPackage(base, now) {
  const changes = [];
  const files = [...new Set([...base.keys(), ...now.keys()])].sort();
  const valueOf = (value) => (aliasOf(value) ? { alias: aliasOf(value) } : value);
  const valuesOf = (valuesByMode) => Object.fromEntries(Object.entries(valuesByMode).map(([mode, value]) => [mode, valueOf(value)]));
  for (const file of files) {
    const before = base.has(file) ? readCollection(base.get(file)) : null;
    const after = now.has(file) ? readCollection(now.get(file)) : null;
    if (!before || !after) continue;
    const old = new Map(before.tokens.map((token) => [token.name, token]));
    const next = new Map(after.tokens.map((token) => [token.name, token]));
    const created = after.tokens.filter((token) => !old.has(token.name));
    const deleted = before.tokens.filter((token) => !next.has(token.name));
    for (const token of after.tokens) {
      const was = old.get(token.name);
      if (!was) continue;
      const modes = Object.keys(token.valuesByMode).filter((mode) => !sameValues(token.valuesByMode[mode], was.valuesByMode[mode]));
      if (modes.length) changes.push({ op: "set", collection: after.name, name: token.name, type: token.type, values: Object.fromEntries(modes.map((mode) => [mode, valueOf(token.valuesByMode[mode])])) });
    }
    for (const token of created) {
      const twin = deleted.findIndex((gone) => gone.type === token.type && sameValues(gone.valuesByMode, token.valuesByMode));
      if (twin >= 0) {
        changes.push({ op: "rename", collection: after.name, name: token.name, from: deleted[twin].name, type: token.type });
        deleted.splice(twin, 1);
      } else {
        changes.push({ op: "create", collection: after.name, name: token.name, type: token.type, values: valuesOf(token.valuesByMode) });
      }
    }
    for (const token of deleted) changes.push({ op: "delete", collection: after.name, name: token.name, type: token.type });
  }
  // In the order the plugin applies them: renames free their old names, creates exist before a value aliases them,
  // deletes go last (nothing reads them by then).
  const ORDER = { rename: 0, create: 1, set: 2, delete: 3 };
  changes.sort((a, b) => ORDER[a.op] - ORDER[b.op]);
  return { format: "zen-studio-variables", version: 1, changes };
}
