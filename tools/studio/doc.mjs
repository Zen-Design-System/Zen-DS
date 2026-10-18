// The Studio builder's page document (core rebuild M2, docs/research/studio-doc-engine-plan-2026-10-10.md §4.2 and §5).
// A page is a JSON document: the dialect's neutral tree (dialect.mjs parsePage) with a stable `id` on every element and
// no source positions, kept beside the page's text (the text keeps the person's formatting; a page made from a document
// alone is printed with printPage). Edits keep their exact meaning because they still run through the engine
// (jsx-source.mjs); the same edit on a print that carries each element's id as `data-zen-id` keeps every element's id
// across moves, wraps and copies (a repeated id is the copy: it gets a new one; a new element gets one).
// Isomorphic (browser and Node, no Node imports).
//
//   printPage(doc, { ids }) → text                       the page as TSX; `ids`: with data-zen-id on every element
//   elementText(node, { ids }) → text                    one element as JSX (a Figma update replaces the Board with it)
//   docFromText(text, { components, newId }) → { doc, errors }
//   locsOf(doc, text, { components }) → { idAt, locOf }  where each element of `doc` sits in `text` (any text of that page)
//   editDoc(doc, text, request, { applyOps, dataFieldEdit, sha1, options }) → { doc, text, answer, ids } | { error, code }
//   newDocId() → "n…"
import { parsePage } from "./dialect.mjs";

export const ID_PROP = "data-zen-id";
const ID_ATTRIBUTE = / data-zen-id="[^"]*"/g;
const PACKAGE = "@zen-ds/react";
const BUILDER_PACKAGE = "@zen-ds/react/builder";
const BUILDER_NAMES = new Set(["Board", "Screen", "Overlay"]);
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

let counter = 0;
/** A new element id: unique within a page and across its copies in this browser. */
export function newDocId() {
  counter = (counter + 1) % 1_679_616;
  return `n${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/* ── print ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

const quote = (text) => JSON.stringify(String(text));
const key = (name) => (IDENTIFIER.test(name) ? name : quote(name));
const refCode = ({ root, path }) => path.reduce((out, step) => (IDENTIFIER.test(step) ? `${out}.${step}` : `${out}[${quote(step)}]`), root);

/** A literal JS value (mock data, a literal prop's array/object) on one line. */
function literalCode(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(literalCode).join(", ")}]`;
  if (typeof value === "object") {
    const fields = Object.entries(value).map(([name, field]) => `${key(name)}: ${literalCode(field)}`);
    return fields.length ? `{ ${fields.join(", ")} }` : "{}";
  }
  if (typeof value === "string") return quote(value);
  return String(value);
}

/** The mock data, one entry per line, nested lists and objects as their own lines when they are long. */
function mockCode(value, indent) {
  const flat = literalCode(value);
  if (flat.length + indent.length <= 100 || value === null || typeof value !== "object") return flat;
  const inner = `${indent}  `;
  if (Array.isArray(value)) return `[\n${value.map((item) => `${inner}${mockCode(item, inner)},`).join("\n")}\n${indent}]`;
  return `{\n${Object.entries(value).map(([name, field]) => `${inner}${key(name)}: ${mockCode(field, inner)},`).join("\n")}\n${indent}}`;
}

/** A prop value as the code inside `{…}` (strings in props print as name="…" where they can, see attributeCode). */
function valueCode(value, ctx) {
  switch (value.kind) {
    case "literal": return literalCode(value.value);
    case "array": return `[${value.items.map((item) => valueCode(item, ctx)).join(", ")}]`;
    case "object": {
      const fields = Object.entries(value.fields).map(([name, field]) => `${key(name)}: ${valueCode(field, ctx)}`);
      return fields.length ? `{ ${fields.join(", ")} }` : "{}";
    }
    case "element": return elementCode(value.node, "", ctx, true);
    case "fragment": return `<>${value.children.map((child) => childCode(child, "", ctx, true)).join("")}</>`;
    case "proto": return `proto.${value.action}(${value.args.map(literalCode).join(", ")})`;
    case "ref": return refCode(value);
    default: throw new Error(`Unknown value kind ${value.kind}`);
  }
}

function attributeCode(name, value, ctx) {
  if (value.kind === "literal" && value.value === true) return name;
  if (value.kind === "literal" && typeof value.value === "string" && !/["\\\n\r{}]/.test(value.value)) return `${name}="${value.value}"`;
  return `${name}={${valueCode(value, ctx)}}`;
}

/** JSX text that reads back as `value` (dialect jsxText); otherwise a string expression. */
function textCode(value) {
  return /^[^\s{}<>&]([^{}<>&\n\r]*[^\s{}<>&])?$/.test(value) && !/\s{2,}/.test(value) ? value : `{${quote(value)}}`;
}

/** An element; `inline`: one line (a prop's element value). */
function elementCode(node, indent, ctx, inline = false) {
  const attributes = Object.entries(node.props).map(([name, value]) => attributeCode(name, value, ctx));
  if (ctx.ids) attributes.push(`${ID_PROP}="${node.id}"`);
  const open = `<${node.name}${attributes.length ? ` ${attributes.join(" ")}` : ""}`;
  if (!node.children.length) return `${open} />`;
  if (inline || (node.children.length === 1 && node.children[0].kind === "text")) {
    return `${open}>${node.children.map((child) => childCode(child, "", ctx, true)).join("")}</${node.name}>`;
  }
  const inner = `${indent}  `;
  return `${open}>\n${node.children.map((child) => `${inner}${childCode(child, inner, ctx)}`).join("\n")}\n${indent}</${node.name}>`;
}

function childCode(child, indent, ctx, inline = false) {
  switch (child.kind) {
    case "text": return textCode(child.value);
    case "ref": return `{${refCode(child)}}`;
    case "map": {
      const template = elementCode(child.node, `${indent}  `, ctx, inline);
      if (inline || !template.includes("\n")) return `{${refCode(child.source)}.map((${child.item}) => ${template})}`;
      return `{${refCode(child.source)}.map((${child.item}) => (\n${indent}  ${template}\n${indent}))}`;
    }
    case "element": return elementCode(child, indent, ctx, inline);
    default: throw new Error(`Unknown child kind ${child.kind}`);
  }
}

/** Every component name the document draws (the part before a dot: Card.Header → Card). */
function namesOf(doc) {
  const names = new Set();
  const visitValue = (value) => {
    if (value.kind === "element") visitNode(value.node);
    else if (value.kind === "fragment") value.children.forEach(visitChild);
    else if (value.kind === "array") value.items.forEach(visitValue);
    else if (value.kind === "object") Object.values(value.fields).forEach(visitValue);
  };
  const visitNode = (node) => {
    names.add(node.name.split(".")[0]);
    Object.values(node.props).forEach(visitValue);
    node.children.forEach(visitChild);
  };
  const visitChild = (child) => {
    if (child.kind === "element") visitNode(child);
    else if (child.kind === "map") visitNode(child.node);
  };
  if (doc.board) visitNode(doc.board);
  return names;
}

/** The page as TSX in the dialect (format 1). `ids`: every element carries its id as data-zen-id (the engine's view). */
export function printPage(doc, { ids = false } = {}) {
  const ctx = { ids };
  const names = namesOf(doc);
  const builder = ["Board", ...(names.has("Overlay") ? ["Overlay"] : []), "Screen", "proto"];
  const zen = [...names].filter((name) => !BUILDER_NAMES.has(name)).sort();
  const lines = [
    `// @zen-page ${JSON.stringify(doc.header ?? { format: 1 })}`,
    `import { ${builder.join(", ")} } from "${BUILDER_PACKAGE}";`,
    ...(zen.length ? [`import { ${zen.join(", ")} } from "${PACKAGE}";`] : []),
    "",
    `export const mock = ${mockCode(doc.mock ?? {}, "")};`,
    "",
    "export default function Page() {",
    "  return (",
    `    ${doc.board ? elementCode(doc.board, "    ", ctx) : "<Board />"}`,
    "  );",
    "}",
    "",
  ];
  return lines.join("\n");
}

/* ── read ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Every element node of a tree in document order (props' element values before children, as printed). */
function elementsOf(root) {
  const out = [];
  const visitValue = (value) => {
    if (value.kind === "element") visitNode(value.node);
    else if (value.kind === "fragment") value.children.forEach(visitChild);
    else if (value.kind === "array") value.items.forEach(visitValue);
    else if (value.kind === "object") Object.values(value.fields).forEach(visitValue);
  };
  const visitNode = (node) => {
    out.push(node);
    for (const [name, value] of Object.entries(node.props)) if (name !== ID_PROP) visitValue(value);
    node.children.forEach(visitChild);
  };
  const visitChild = (child) => {
    if (child.kind === "element") visitNode(child);
    else if (child.kind === "map") visitNode(child.node);
  };
  if (root) visitNode(root);
  return out;
}

/** One element of a document as JSX, at no indent (`ids`: with data-zen-id on every element, so an edit keeps them). */
export function elementText(node, { ids = false } = {}) {
  return elementCode(node, "", { ids });
}

/** The parse tree as a document: every element takes its data-zen-id (once; a repeat is a copy) or a new id; no locs. */
export function docFromText(text, { components, newId = newDocId } = {}) {
  const tree = parsePage(text, { components });
  if (!tree.board) return { doc: null, errors: tree.errors };
  const seen = new Set();
  const convertValue = (value) => {
    if (value.kind === "element") return { kind: "element", node: convertNode(value.node) };
    if (value.kind === "fragment") return { kind: "fragment", children: value.children.map(convertChild) };
    if (value.kind === "array") return { kind: "array", items: value.items.map(convertValue) };
    if (value.kind === "object") return { kind: "object", fields: Object.fromEntries(Object.entries(value.fields).map(([name, field]) => [name, convertValue(field)])) };
    return value;
  };
  const convertNode = (node) => {
    const written = node.props[ID_PROP];
    const own = written?.kind === "literal" && typeof written.value === "string" && !seen.has(written.value) ? written.value : newId();
    seen.add(own);
    const props = {};
    for (const [name, value] of Object.entries(node.props)) if (name !== ID_PROP) props[name] = convertValue(value);
    return { kind: "element", id: own, name: node.name, props, children: node.children.map(convertChild) };
  };
  const convertChild = (child) => (child.kind === "element" ? convertNode(child) : child.kind === "map" ? { ...child, node: convertNode(child.node) } : child);
  return { doc: { header: tree.header, mock: tree.mock, board: convertNode(tree.board) }, errors: tree.errors };
}

/**
 * Where each element of `doc` sits in `text`, a print of `doc` (with or without ids): loc ("line:col") ↔ id. The two
 * trees are walked side by side, so it holds for any print of the same document.
 */
export function locsOf(doc, text, { components } = {}) {
  const tree = parsePage(text, { components });
  const printed = elementsOf(tree.board);
  const own = elementsOf(doc.board);
  const idAt = new Map();
  const locOf = new Map();
  own.forEach((node, index) => {
    const at = printed[index];
    if (!at || at.name !== node.name) return;
    idAt.set(at.loc, node.id);
    locOf.set(node.id, at.loc);
  });
  return { idAt, locOf };
}

/**
 * Where each element of `before` (shown as `beforeText`) is in `after` (shown as `afterText`), told by its id (core rebuild
 * M3: the selection follows its element through edits, undo and redo, exactly): { "line:col": "line:col" }, null for an
 * element that is gone. Two documents whose ids do not carry over (a page read again) map nothing.
 */
export function locMap(before, beforeText, after, afterText, { components } = {}) {
  return mapLocs(locsOf(before, beforeText, { components }), locsOf(after, afterText, { components }));
}

function mapLocs(from, to) {
  const map = {};
  let kept = 0;
  for (const [loc, id] of from.idAt) {
    const next = to.locOf.get(id) ?? null;
    map[loc] = next;
    if (next) kept += 1;
  }
  return kept ? map : null;
}

/* ── edit ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** An op with its element locs (written for `from`) moved to `to` by `map` (the ops that name other elements). */
function translateOp(op, map) {
  const one = (loc) => (typeof loc === "string" ? map(loc) ?? loc : loc);
  switch (op?.op) {
    case "wrap": return op.with ? { ...op, with: op.with.map(one) } : op;
    case "ungroup": return op.kids ? { ...op, kids: Object.fromEntries(Object.entries(op.kids).map(([loc, kid]) => [one(loc), kid])) } : op;
    case "group": return { ...op, ...(op.with ? { with: op.with.map(one) } : {}), ...(op.kids ? { kids: Object.fromEntries(Object.entries(op.kids).map(([loc, kid]) => [one(loc), kid])) } : {}) };
    case "moveTo":
    case "pasteCode":
      return { ...op, ...(op.parent ? { parent: one(op.parent) } : {}), ...(op.before ? { before: one(op.before) } : {}), ...(op.after ? { after: one(op.after) } : {}), ...(op.replace ? { replace: one(op.replace) } : {}) };
    case "many":
      return {
        ...op,
        locs: (op.locs ?? []).map(one),
        ...(op.opsByLoc ? { opsByLoc: Object.fromEntries(Object.entries(op.opsByLoc).map(([loc, ops]) => [one(loc), ops])) } : {}),
        ...(op.parent ? { parent: one(op.parent) } : {}),
        ...(op.before ? { before: one(op.before) } : {}),
        ...(op.after ? { after: one(op.after) } : {}),
      };
    case "setDataField": return op.table ? { ...op, table: one(op.table) } : op;
    default: return op;
  }
}

/**
 * One edit request ({ loc, name, ops, file }) on a page shown as `text`, whose document is `doc`. The edit runs twice
 * with the engine (`applyOps` / `dataFieldEdit`, passed in so this module stays free of them): on `text`, which gives the
 * new text and the answer exactly as before the document (the person's formatting stays), and on the print with ids,
 * which gives the new document with every element's id. The two give the same page (doc.selftest.mjs); should they not
 * (an op this cannot follow), the page keeps working and its elements take new ids (`ids: false`).
 * Returns { doc, text, answer, ids, locs } (answer: the engine's extras; locs: where each element of `text` is in the new
 * text, as locMap, null without ids), or { error, code }. `sha1`: the engine's, to give hash-checked ops the hash of the
 * text they run on.
 */
export function editDoc(doc, text, request, { components, applyOps, dataFieldEdit, sha1, options = {}, newId = newDocId }) {
  const run = (code, loc, ops) => {
    // A data edit (one row's field; setRowProp: a fixed prop made that row's own) is the data module's.
    if (ops.length === 1 && (ops[0]?.op === "setDataField" || ops[0]?.op === "setRowProp")) {
      const result = dataFieldEdit(code, request.file, loc, request.name, ops[0]);
      if (!("error" in result) && result.file !== request.file) return { error: "A page's data lives in the page itself", code: "forbidden" };
      return result;
    }
    // The ops that check the file's hash check the text they run on.
    return applyOps(code, loc, request.name, ops, options.hash && sha1 ? { ...options, hash: sha1(code) } : options);
  };
  // Code an op brings may carry its elements' ids (data-zen-id: a Figma update keeps its layers' ids): they go to the
  // document through the engine's print below, never into the page's text.
  const plain = request.ops.map((op) => (typeof op?.code === "string" && op.code.includes(ID_PROP) ? { ...op, code: op.code.replace(ID_ATTRIBUTE, "") } : op));
  const shown = run(text, request.loc, plain);
  if (typeof shown.error === "string") return { error: shown.error, code: shown.code };
  const after = docFromText(shown.code, { components, newId });
  if (!after.doc || after.errors.length) return { error: `Not written: the page would break (line ${after.errors[0]?.line ?? 1}: ${after.errors[0]?.message ?? "no board"})`, code: "invalid" };
  let next = null;
  let locs = null;
  const view = locsOf(doc, text, { components });
  const engineText = printPage(doc, { ids: true });
  const engineView = locsOf(doc, engineText, { components });
  const toEngine = (loc) => { const id = view.idAt.get(loc); return id === undefined ? undefined : engineView.locOf.get(id); };
  const target = toEngine(request.loc);
  if (target) {
    const tracked = run(engineText, target, request.ops.map((op) => translateOp(op, toEngine)));
    if (typeof tracked.error !== "string") {
      const read = docFromText(tracked.code, { components, newId }).doc;
      if (read && JSON.stringify(withoutIds(read)) === JSON.stringify(withoutIds(after.doc))) next = read;
    }
  }
  if (next) locs = mapLocs(view, locsOf(next, shown.code, { components }));
  const answer = Object.fromEntries(Object.entries(shown).filter(([name]) => name !== "code" && name !== "changed"));
  return { doc: next ?? after.doc, text: shown.code, answer, ids: Boolean(next), locs };
}

/** The document without its ids (two documents of the same page compare equal). */
export function withoutIds(doc) {
  return JSON.parse(JSON.stringify(doc, (name, value) => (name === "id" || name === "loc" ? undefined : value)));
}
