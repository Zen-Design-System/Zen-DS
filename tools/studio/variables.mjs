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
//        { op: "rename", name, to }                 refused while code reads its Figma name (context.nameReaders); a
//                                                   name code reads by its CSS name or another variable aliases stays as
//                                                   `formerNames` (v2: the build keeps --zen-old: var(--zen-new))
//        { op: "duplicate", name, to? }             "<name> copy", numbered when taken
//        { op: "delete", name }                     refused while something reads it
//        { op: "addMode", name, from? }              a column: every variable takes `from`'s value (default the first
//                                                   mode, as Figma); Duplicate mode is addMode with `from`
//        { op: "renameMode", mode, to }  { op: "deleteMode", mode }   refused while code uses the mode
//                                                   (context.modeReaders); only a ZenProvider axis's collection
//                                                   (MODE_COLLECTIONS) edits its modes
//        { op: "meta", name, description?, scopes?, hiddenFromPublishing? }   Figma's Edit variable (Studio Variables v2,
//                                                   docs/research/studio-variables-v2-spec-2026-10-23.md): an empty
//                                                   description, ALL_SCOPES (or no scopes key) and false are dropped
//        { op: "createCollection", name, layer, purpose? }   first, on an empty text (a file that does not exist yet):
//                                                   Figma's Create collection, one mode "Mode 1" (:root; user 2026-10-23,
//                                                   docs/research/studio-variables-collections-spec-2026-10-23.md);
//                                                   the file is collectionFileOf(name); `layer` (COLLECTION_LAYERS) and
//                                                   `purpose` are the docs' group for it (the token build writes its
//                                                   tokens/source/figma.collections.json entry)
//        { op: "renameCollection", to }             a collection made in Zen Studio (its file stays); refused for the
//                                                   11 Figma exports (context.fixed), which code reads by name
//   context: { variables: Map(name → { type, collection, valuesByMode }) of every collection (this one included, as
//             saved or drafted), readers(name) → [description] (other variables' aliases and code reading its CSS name),
//             collections: [{ name, file }] (createCollection and renameCollection check names against them),
//             fixed: true for one of the 11 Figma exports }
//
//   variablesPackage(base, now) → the Zen plugin's `zen-studio-variables` v1 package: what changed from the `base`
//   texts to the `now` texts (Map file → text), by collection, variable name and mode; renames, creates, sets, deletes.
//   A base of null (the file did not exist) is a createCollection first; a file gone since is a deleteCollection; a
//   collection renamed in its file is a renameCollection first.

export const TOKEN_SOURCE = /^tokens\/source\/figma\/[a-z0-9-]+\.json$/;
/** A new collection's one mode, as Figma names it. */
export const NEW_COLLECTION_MODE = "Mode 1";
/** The docs' groups of a collection (tokens/source/figma.collections.json `layer`, the Design Tokens page's badges). */
export const COLLECTION_LAYERS = ["primitive", "semantic", "component", "layout"];
/** The file a collection made in Zen Studio is written to: its name in kebab case (the build's slug). */
export const collectionFileOf = (name) => `tokens/source/figma/${cssNameOf(name)}.json`;
export const VARIABLE_TYPES = ["COLOR", "FLOAT", "STRING", "BOOLEAN"];
/** Figma's variable scopes by type (Plugin API VariableScope): where a picker offers the variable. None written = all. */
export const VARIABLE_SCOPES = {
  COLOR: ["ALL_FILLS", "FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR", "EFFECT_COLOR"],
  FLOAT: ["CORNER_RADIUS", "WIDTH_HEIGHT", "GAP", "STROKE_FLOAT", "OPACITY", "EFFECT_FLOAT", "FONT_WEIGHT", "FONT_SIZE", "LINE_HEIGHT", "LETTER_SPACING", "PARAGRAPH_SPACING", "PARAGRAPH_INDENT"],
  STRING: ["FONT_FAMILY", "FONT_STYLE", "TEXT_CONTENT"],
  BOOLEAN: [],
};
/** The collections whose modes are a ZenProvider axis (scripts/token-outputs.mjs MODE_AXES; v2, user 2026-10-23: modes
 *  are edited in every collection that has them as an axis). Global Colors' second mode is the derived high contrast. */
export const MODE_COLLECTIONS = new Set(["Base Colors (Project)", "Mode Colors (Semantic)", "Component Theme", "Component Size", "Corner Radius", "Emphasis Level", "Breakpoint & Grids", "Typography Configuration"]);

/** A token's fields in the order the files (and the Zen plugin's Push to GitHub) write them. */
const TOKEN_FIELDS = ["name", "type", "valuesByMode", "scopes", "description", "hiddenFromPublishing", "codeSyntax", "formerNames"];

export class VariableEditError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const refuse = (message, code = "invalid") => { throw new VariableEditError(code, message); };

/** The build's CSS name of a variable (scripts/token-outputs.mjs `cssName`, without `--zen-`). */
export const cssNameOf = (name) => String(name).replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
/** A mode's id in code: its CSS data-* value (scripts/token-outputs.mjs toKebab). */
export const modeIdOf = (mode) => cssNameOf(mode);
/** Figma's Code syntax (Web) of a variable: the CSS custom property code reads, from its name (not stored). */
export const codeSyntaxOf = (name) => `var(--zen-${cssNameOf(name)})`;

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
  return { name, modes: body.modes, tokens: body.tokens, body };
}

/** The file again: the collection's own fields where they were (hiddenFromPublishing …), its modes and tokens. */
const writeCollection = (collection) => `${JSON.stringify({ [collection.name]: { ...(collection.body ?? {}), modes: collection.modes, tokens: collection.tokens } }, null, 2)}\n`;

/** A token's fields in the files' order (a field added by an edit lands where the plugin's push writes it). */
const ordered = (token) => Object.fromEntries([...TOKEN_FIELDS.filter((field) => field in token), ...Object.keys(token).filter((field) => !TOKEN_FIELDS.includes(field))].map((field) => [field, token[field]]));

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
    // A variable's own old names are free for it (renaming back).
    if (other === except || (except !== undefined && variable.renamedTo === except)) continue;
    if (other === clean && variable.renamedTo) refuse(`${clean} is the old name of ${variable.renamedTo}, kept for the code that reads it`, "conflict");
    if (other === clean) refuse(`${clean} already exists${variable.collection ? ` in ${variable.collection}` : ""}`, "conflict");
    if (cssNameOf(other) === cssNameOf(clean)) refuse(`${clean} would be --zen-${cssNameOf(clean)} in code, as ${other} is already`, "conflict");
  }
  return clean;
}

function readersSentence(name, readers) {
  const shown = readers.slice(0, 3).join(", ");
  return `${name} is read by ${shown}${readers.length > 3 ? ` and ${readers.length - 3} more` : ""}`;
}

/** A new collection's name checked: text with a letter or a digit, not another collection's name or file (`self`: the
 *  collection being renamed, whose own file it keeps). */
function checkedCollectionName(collections, name, self = null) {
  const clean = String(name ?? "").trim().replace(/\s+/g, " ");
  if (!/[a-z0-9]/i.test(clean)) refuse("A collection name needs a letter or a digit");
  for (const other of collections) {
    if (self && other.file === self) continue;
    if (other.name.toLowerCase() === clean.toLowerCase()) refuse(`${other.name} already exists`, "conflict");
    if (other.file === collectionFileOf(clean)) refuse(`${clean} would be ${other.file}, the file of ${other.name}`, "conflict");
  }
  return clean;
}

export function applyVariableOps(text, ops, context) {
  if (!Array.isArray(ops) || !ops.length) refuse("Expected ops");
  // Create collection: the file starts as the empty collection, then the other ops (if any) apply to it.
  let made = null;
  if (ops[0]?.op === "createCollection") {
    if (text) refuse("Create collection makes a new file; this one exists");
    made = checkedCollectionName(context.collections ?? [], ops[0].name);
    const layer = ops[0].layer ?? "semantic";
    if (!COLLECTION_LAYERS.includes(layer)) refuse(`A collection's group is ${COLLECTION_LAYERS.join(", ")}, not ${layer}`);
    const purpose = String(ops[0].purpose ?? "").trim().replace(/\s+/g, " ");
    text = writeCollection({ name: made, modes: [NEW_COLLECTION_MODE], tokens: [], body: { layer, ...(purpose ? { purpose } : {}) } });
    ops = ops.slice(1);
    if (!ops.length) return { text, changed: [], label: `Create collection ${made}` };
  }
  if (ops.some((op) => op?.op === "createCollection")) refuse("Create collection comes first, on a new file");
  const collection = readCollection(text);
  // Rename collection (Figma's collection menu): only one made in Zen Studio, as code reads the 11 by name.
  if (ops[0]?.op === "renameCollection") {
    if (ops.length > 1) refuse("Rename collection is an edit of its own");
    if (context.fixed) refuse(`${collection.name} is one of the 11 Figma exports: code reads it by name`);
    const to = checkedCollectionName(context.collections ?? [], ops[0].to, context.file ?? null);
    if (to === collection.name) return { text, changed: [], label: "" };
    return { text: writeCollection({ ...collection, name: to }), changed: [], label: `Rename collection ${collection.name} → ${to}` };
  }
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
    const entry = { type: token.type, collection: collection.name, valuesByMode: token.valuesByMode };
    variables.set(token.name, entry);
    for (const former of token.formerNames ?? []) variables.set(former, { ...entry, renamedTo: token.name });
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
      const at = indexOf(op.name);
      const token = { ...collection.tokens[at] };
      const to = checkedName(variables, op.to, op.name);
      if (to === token.name) continue;
      // Code that looks the variable up by its Figma name ("Spacing/Gap/Small") would break: refused. Code reading its
      // CSS name and variables aliasing it keep the old name (v2, user 2026-10-23: rename and keep an alias).
      const byName = (context.nameReaders ?? (() => []))(op.name);
      if (byName.length) refuse(`${readersSentence(op.name, byName)} by its name: renaming it would break them. Point them at another variable first`, "conflict");
      const from = token.name;
      const formers = (token.formerNames ?? []).filter((name) => name !== to);
      if (readers(op.name).length) formers.push(from);
      token.name = to;
      if (formers.length) token.formerNames = [...new Set(formers)];
      else delete token.formerNames;
      collection.tokens[at] = ordered(token);
      sync(token, from);
      changed.push(to);
      label ||= `Rename ${from} → ${to}`;
    } else if (op?.op === "duplicate") {
      const index = indexOf(op.name);
      const source = collection.tokens[index];
      let to = op.to ? String(op.to) : `${source.name} copy`;
      if (!op.to) for (let n = 2; variables.has(to) || [...variables.keys()].some((other) => cssNameOf(other) === cssNameOf(to)); n += 1) to = `${source.name} copy ${n}`;
      const name = checkedName(variables, to);
      // Figma's Duplicate keeps the description and scopes.
      const token = ordered({ name, type: source.type, valuesByMode: { ...source.valuesByMode }, ...metaOf(source) });
      collection.tokens.splice(index + 1, 0, token);
      sync(token);
      changed.push(name);
      label ||= `Duplicate ${source.name}`;
    } else if (op?.op === "addMode" || op?.op === "renameMode" || op?.op === "deleteMode") {
      if (!MODE_COLLECTIONS.has(collection.name)) refuse(`${collection.name}'s modes are not a ZenProvider mode: they stay as Figma has them`);
      const modeName = (text) => {
        const clean = String(text ?? "").trim();
        if (!/[a-z0-9]/i.test(clean)) refuse("A mode name needs a letter or a digit");
        const taken = collection.modes.find((mode) => mode !== op.mode && modeIdOf(mode) === modeIdOf(clean));
        if (taken) refuse(`${clean} would be ${modeIdOf(clean)} in code, as ${taken} is already`, "conflict");
        return clean;
      };
      const used = (mode) => {
        const reading = (context.modeReaders ?? (() => []))(collection.name, mode);
        if (reading.length) refuse(`${mode} is used by ${reading.slice(0, 3).join(", ")}${reading.length > 3 ? ` and ${reading.length - 3} more` : ""}: ${op.op === "deleteMode" ? "deleting" : "renaming"} it would break them`, "conflict");
      };
      if (op.op === "addMode") {
        const from = op.from ?? collection.modes[0];
        if (!collection.modes.includes(from)) refuse(`${collection.name} has no mode ${from}`);
        // Unnamed: Figma's "Mode N", or "<mode> copy" for a duplicate, numbered when taken.
        let name = op.name ? String(op.name) : null;
        if (!name) {
          const base = op.from ? `${from} copy` : `Mode ${collection.modes.length + 1}`;
          name = base;
          for (let n = 2; collection.modes.some((mode) => modeIdOf(mode) === modeIdOf(name)); n += 1) name = `${base} ${n}`;
        }
        const mode = modeName(name);
        const at = collection.modes.indexOf(from);
        collection.modes = op.from ? [...collection.modes.slice(0, at + 1), mode, ...collection.modes.slice(at + 1)] : [...collection.modes, mode];
        collection.tokens = collection.tokens.map((token) => ordered({ ...token, valuesByMode: Object.fromEntries(collection.modes.map((each) => [each, each === mode ? token.valuesByMode[from] : token.valuesByMode[each]])) }));
        label ||= op.from ? `Duplicate mode ${from}` : `Add mode ${mode}`;
      } else if (op.op === "renameMode") {
        if (!collection.modes.includes(op.mode)) refuse(`${collection.name} has no mode ${op.mode}`, "not-found");
        const to = modeName(op.to);
        if (to === op.mode) continue;
        if (modeIdOf(to) !== modeIdOf(op.mode)) used(op.mode);
        collection.modes = collection.modes.map((mode) => (mode === op.mode ? to : mode));
        collection.tokens = collection.tokens.map((token) => ordered({ ...token, valuesByMode: Object.fromEntries(Object.entries(token.valuesByMode).map(([mode, value]) => [mode === op.mode ? to : mode, value])) }));
        label ||= `Rename mode ${op.mode} → ${to}`;
      } else {
        if (!collection.modes.includes(op.mode)) refuse(`${collection.name} has no mode ${op.mode}`, "not-found");
        if (collection.modes.length === 1) refuse(`${collection.name} needs a mode`);
        used(op.mode);
        collection.modes = collection.modes.filter((mode) => mode !== op.mode);
        collection.tokens = collection.tokens.map((token) => ordered({ ...token, valuesByMode: Object.fromEntries(Object.entries(token.valuesByMode).filter(([mode]) => mode !== op.mode)) }));
        label ||= `Delete mode ${op.mode}`;
      }
      for (const token of collection.tokens) sync(token);
    } else if (op?.op === "meta") {
      const index = indexOf(op.name);
      const token = { ...collection.tokens[index] };
      if ("description" in op) {
        const text = String(op.description ?? "").trim();
        if (text) token.description = text;
        else delete token.description;
      }
      if ("scopes" in op) {
        const allowed = VARIABLE_SCOPES[token.type] ?? [];
        const scopes = Array.isArray(op.scopes) ? [...new Set(op.scopes.map(String))] : null;
        // ALL_SCOPES is Figma's default: the file writes no scopes then. An empty list hides it from every picker.
        if (!scopes || scopes.includes("ALL_SCOPES")) delete token.scopes;
        else {
          const wrong = scopes.filter((scope) => !allowed.includes(scope));
          if (wrong.length) refuse(`${token.name} is a ${typeWord(token.type)}: it has no scope ${wrong.join(", ")}`);
          token.scopes = allowed.filter((scope) => scopes.includes(scope));
        }
      }
      if ("hiddenFromPublishing" in op) {
        if (op.hiddenFromPublishing === true) token.hiddenFromPublishing = true;
        else delete token.hiddenFromPublishing;
      }
      collection.tokens[index] = ordered(token);
      changed.push(token.name);
      label ||= `Edit variable ${token.name}`;
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
  return { text: writeCollection(collection), changed, label: made ? `Create collection ${made}` : label };
}

/** Every variable of the collections (Map file → text): name → { type, collection, file, valuesByMode }. */
export function variablesOf(texts) {
  const variables = new Map();
  const formers = [];
  for (const [file, text] of texts) {
    const collection = readCollection(text);
    for (const token of collection.tokens) {
      const entry = { type: token.type, collection: collection.name, file, valuesByMode: token.valuesByMode, ...metaOf(token), ...(token.formerNames?.length ? { formerNames: token.formerNames } : {}) };
      variables.set(token.name, entry);
      for (const former of token.formerNames ?? []) formers.push([former, { ...entry, renamedTo: token.name }]);
    }
  }
  // A renamed variable answers to its old names too (an alias "{Old/Name}" resolves), unless a variable has that name.
  for (const [former, entry] of formers) if (!variables.has(former)) variables.set(former, entry);
  return variables;
}

/** The variables whose values alias `name` (by name), as "Collection › Variable". */
export function aliasReaders(variables, name) {
  const names = new Set([name, ...(variables.get(name)?.formerNames ?? [])]);
  const out = [];
  for (const [other, variable] of variables) {
    if (variable.renamedTo) continue;
    if (Object.values(variable.valuesByMode ?? {}).some((value) => names.has(aliasOf(value)))) out.push(other);
  }
  return out;
}

const sameValues = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** A token's Edit variable fields, as written (none when unset). */
const metaOf = (token) => Object.fromEntries(["description", "scopes", "hiddenFromPublishing"].filter((field) => token[field] !== undefined).map((field) => [field, token[field]]));
/** The plugin's meta fields of a change: the three as they are now (null clears one), and the Web code syntax. */
const metaChange = (token) => ({ description: token.description ?? "", scopes: token.scopes ?? ["ALL_SCOPES"], hiddenFromPublishing: token.hiddenFromPublishing === true });

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
    let before = base.has(file) && base.get(file) !== null ? readCollection(base.get(file)) : null;
    const after = now.has(file) ? readCollection(now.get(file)) : null;
    // A collection made in Zen Studio (its base is "no file"): Figma creates it, then its variables.
    if (!before && after && base.has(file)) {
      changes.push({ op: "createCollection", collection: after.name, modes: after.modes });
      before = { name: after.name, modes: after.modes, tokens: [] };
    }
    // A collection deleted in Zen Studio (its file gone): Figma deletes it, its variables with it.
    if (before && !after && base.has(file)) { changes.push({ op: "deleteCollection", collection: before.name }); continue; }
    if (!before || !after) continue;
    // Renamed in its file: Figma's collection is renamed first, then the rest find it by its new name.
    if (before.name !== after.name) changes.push({ op: "renameCollection", collection: after.name, from: before.name });
    const old = new Map(before.tokens.map((token) => [token.name, token]));
    const next = new Map(after.tokens.map((token) => [token.name, token]));
    // Modes (v2): a mode gone and a new one with the same values in every variable is a rename.
    const addedModes = after.modes.filter((mode) => !before.modes.includes(mode));
    const removedModes = before.modes.filter((mode) => !after.modes.includes(mode));
    const renamedFrom = new Map();
    for (const mode of addedModes) {
      const was = removedModes.find((gone) => ![...renamedFrom.values()].includes(gone)
        && after.tokens.every((token) => !old.has(token.name) || sameValues(token.valuesByMode[mode], old.get(token.name).valuesByMode[gone])));
      if (was) renamedFrom.set(mode, was);
    }
    const renamedModes = new Set(renamedFrom.values());
    for (const [mode, from] of renamedFrom) changes.push({ op: "renameMode", collection: after.name, mode, from });
    for (const mode of addedModes) if (!renamedFrom.has(mode)) changes.push({ op: "addMode", collection: after.name, mode });
    for (const mode of removedModes) if (!renamedModes.has(mode)) changes.push({ op: "deleteMode", collection: after.name, mode });
    const created = after.tokens.filter((token) => !old.has(token.name));
    const deleted = before.tokens.filter((token) => !next.has(token.name));
    for (const token of after.tokens) {
      const was = old.get(token.name);
      if (!was) continue;
      const modes = Object.keys(token.valuesByMode).filter((mode) => !sameValues(token.valuesByMode[mode], was.valuesByMode[renamedFrom.get(mode) ?? mode]));
      if (!sameValues(metaOf(token), metaOf(was))) changes.push({ op: "meta", collection: after.name, name: token.name, type: token.type, ...metaChange(token) });
      if (modes.length) changes.push({ op: "set", collection: after.name, name: token.name, type: token.type, values: Object.fromEntries(modes.map((mode) => [mode, valueOf(token.valuesByMode[mode])])) });
    }
    for (const token of created) {
      const twin = deleted.findIndex((gone) => gone.type === token.type && sameValues(gone.valuesByMode, token.valuesByMode));
      if (twin >= 0) {
        changes.push({ op: "rename", collection: after.name, name: token.name, from: deleted[twin].name, type: token.type, codeSyntax: { WEB: codeSyntaxOf(token.name) } });
        if (!sameValues(metaOf(token), metaOf(deleted[twin]))) changes.push({ op: "meta", collection: after.name, name: token.name, type: token.type, ...metaChange(token) });
        deleted.splice(twin, 1);
      } else {
        changes.push({ op: "create", collection: after.name, name: token.name, type: token.type, values: valuesOf(token.valuesByMode), codeSyntax: { WEB: codeSyntaxOf(token.name) }, ...metaChange(token) });
      }
    }
    for (const token of deleted) changes.push({ op: "delete", collection: after.name, name: token.name, type: token.type });
  }
  // In the order the plugin applies them: renames free their old names, creates exist before a value aliases them,
  // deletes go last (nothing reads them by then).
  // Modes first (a value may be for a new mode), a mode's delete last.
  const ORDER = { createCollection: -1, renameCollection: -1, renameMode: 0, addMode: 0, rename: 0, create: 1, set: 2, meta: 2, delete: 3, deleteMode: 4, deleteCollection: 5 };
  changes.sort((a, b) => ORDER[a.op] - ORDER[b.op]);
  return { format: "zen-studio-variables", version: 1, changes };
}
