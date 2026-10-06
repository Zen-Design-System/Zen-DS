// Helpers the Studio edit ops share (Studio builder GĐ2 M4): an AST path, a movable source piece, one indentation unit
// and import edits (op "wrap" in jsx-source.mjs, the slot ops in slots.mjs, arrange.mjs, data-source.mjs, and detach.mjs,
// which re-exports them). Split out of detach.mjs so the browser engine (browser-engine.mjs) leaves the detach recipes
// out: builder pages have no Detach, and the engine's lazy chunk stays within its budget.
import { posix } from "./posix.mjs";
import { EditError, walk } from "./jsx-source.mjs";

/** One indentation level of written code (also op "wrap"'s, jsx-source.mjs). */
export const UNIT = "  ";
export const PACKAGE = "@zen/design-system";
const SKIP_KEYS = new Set(["loc", "start", "end", "extra", "range", "leadingComments", "trailingComments", "innerComments", "comments", "tokens", "errors"]);
export const FUNCTION_TYPES = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression", "ObjectMethod", "ClassMethod", "ClassPrivateMethod"]);

/** Where each name a recipe writes (and each detachable component) lives: src/components/<Folder>. */
export const COMPONENT_FOLDER = {
  Box: "Layout", Stack: "Layout", Grid: "Layout", Text: "Text", Heading: "Text", Icon: "Icon", Button: "Button", IconButton: "Button",
  DockIcon: "DockIcon", Avatar: "Avatar", Divider: "Divider", MetricTrend: "MetricWidget", EmptyStateIllustration: "EmptyState",
  Card: "Card", ListItem: "ListItem", ListBox: "ListItem", MetricCard: "MetricWidget", Metric: "MetricWidget", EmptyState: "EmptyState",
  DescriptionList: "DescriptionList", InlineMessage: "InlineMessage", Badge: "Badge", Tag: "Tag",
};

/** A refusal: the plan answers ok:false with it, an edit fails with code "invalid" (EditError, flagged `refusal`). */
export function refuse(reason) {
  const error = new EditError("invalid", reason);
  error.refusal = true;
  throw error;
}

export const lineStartOf = (text, index) => text.lastIndexOf("\n", index - 1) + 1;
export const indentAt = (text, index) => /^[ \t]*/.exec(text.slice(lineStartOf(text, index)))[0];
const isNode = (value) => value !== null && typeof value === "object" && typeof value.type === "string";

/** The nodes from `root` down to `target` (inclusive), by range; null when `target` is not under `root`. */
export function pathTo(root, target) {
  const out = [root];
  let node = root;
  while (node !== target) {
    let next = null;
    for (const key in node) {
      if (SKIP_KEYS.has(key)) continue;
      const value = node[key];
      for (const child of Array.isArray(value) ? value : [value]) {
        if (isNode(child) && child.start <= target.start && target.end <= child.end) { next = child; break; }
      }
      if (next) break;
    }
    if (!next) return null;
    out.push(next);
    node = next;
  }
  return out;
}

/**
 * A movable source piece: its text, the indentation of the line it starts on, and which of its lines (1-based index in
 * its split) start inside a string or template literal, so re-indenting never changes a string's content.
 */
export function piece(text, node, start = node.start, end = node.end) {
  const src = text.slice(start, end);
  const protect = new Set();
  if (/[\r\n]/.test(src)) {
    const ranges = [];
    walk(node, (child) => {
      if (child.type === "TemplateElement") ranges.push([child.start, child.end, true]);
      else if (child.type === "StringLiteral") ranges.push([child.start, child.end, false]);
      return true;
    });
    const breaks = /\r\n|\n|\r/g;
    let match;
    let index = 0;
    while ((match = breaks.exec(src))) {
      index += 1;
      const at = start + match.index + match[0].length;
      if (ranges.some(([from, to, inclusive]) => from < at && (inclusive ? at <= to : at < to))) protect.add(index);
    }
  }
  return { src, base: indentAt(text, start), protect };
}

/* ── imports ───────────────────────────────────────────────────────────────────────────────────────────────────── */

const importedName = (specifier) => (specifier.imported?.type === "StringLiteral" ? specifier.imported.value : specifier.imported?.name);

function relModule(file, folder) {
  let specifier = posix.relative(posix.dirname(file), `src/components/${folder}`);
  if (!specifier.startsWith(".")) specifier = `./${specifier}`;
  return specifier;
}

/** Every name the file declares outside its imports (functions, classes, variables, parameters, catch clauses…). */
function declaredNames(ast) {
  const names = new Set();
  const addPattern = (node) => {
    if (!node) return;
    if (node.type === "Identifier") names.add(node.name);
    else if (node.type === "ObjectPattern") node.properties.forEach((property) => addPattern(property.type === "RestElement" ? property.argument : property.value));
    else if (node.type === "ArrayPattern") node.elements.forEach(addPattern);
    else if (node.type === "AssignmentPattern") addPattern(node.left);
    else if (node.type === "RestElement") addPattern(node.argument);
    else if (node.type === "TSParameterProperty") addPattern(node.parameter);
  };
  walk(ast.program, (node) => {
    if (node.type === "ImportDeclaration") return false;
    if ((node.type === "FunctionDeclaration" || node.type === "ClassDeclaration" || node.type === "FunctionExpression" || node.type === "ClassExpression") && node.id) names.add(node.id.name);
    if (FUNCTION_TYPES.has(node.type)) node.params.forEach(addPattern);
    if (node.type === "VariableDeclarator") addPattern(node.id);
    if (node.type === "CatchClause") addPattern(node.param);
    if ((node.type === "TSEnumDeclaration" || node.type === "TSModuleDeclaration") && node.id?.type === "Identifier") names.add(node.id.name);
    return true;
  });
  return names;
}

/**
 * Import edits: `needed` names join the import of their module (merged in code-point order, type specifiers last;
 * a new import line sorted among the component imports when the module has none); each name in `remove` loses its
 * specifier (the whole import when nothing is left). Templates (and any file already importing it) use "@zen/design-system".
 * `action` names the edit in a refusal ("rename it before <action>"); `looseTarget`: a name may also join an import of
 * its folder spelled differently (`../components/Layout/index`) when no import has the exact module (wrap uses both).
 * Also used by jsx-source.mjs op "wrap".
 */
export function importEdits(ast, text, eol, file, needed, remove, { action = "detaching", looseTarget = false } = {}) {
  const body = ast.program.body;
  const imports = body.filter((statement) => statement.type === "ImportDeclaration");
  const valueImports = imports.filter((statement) => statement.importKind !== "type");
  const packageStyle = valueImports.some((statement) => statement.source.value === PACKAGE) || (/^src\/templates\//.test(file ?? "") && !valueImports.some((statement) => /(^|\/)components\//.test(statement.source.value)));
  const moduleFor = (name) => (packageStyle ? PACKAGE : relModule(file ?? "src/platform/x.tsx", COMPONENT_FOLDER[name]));
  const sourceFits = (source, name) => source === PACKAGE || new RegExp(`(^|/)components/${COMPONENT_FOLDER[name]}(/index(\\.tsx?)?)?$`).test(source);
  const bindings = new Map();
  for (const statement of imports) {
    for (const specifier of statement.specifiers) bindings.set(specifier.local.name, { statement, specifier });
  }
  const declared = declaredNames(ast);
  const adds = new Map();
  for (const name of needed) {
    const binding = bindings.get(name);
    if (binding) {
      const { statement, specifier } = binding;
      const typeOnly = statement.importKind === "type" || specifier.importKind === "type";
      if (!typeOnly && specifier.type === "ImportSpecifier" && importedName(specifier) === name && sourceFits(statement.source.value, name)) continue;
      refuse(`The file's own ${name} (imported from "${statement.source.value}"${typeOnly ? " as a type" : ""}) is not Zen's ${name}; rename it before ${action}.`);
    }
    if (declared.has(name)) refuse(`The file declares its own ${name}; rename it before ${action}.`);
    const module = moduleFor(name);
    if (!adds.has(module)) adds.set(module, []);
    adds.get(module).push(name);
  }
  // Specifiers to drop, per statement (named imports only).
  const drops = new Map();
  for (const local of remove) {
    const binding = bindings.get(local);
    if (!binding || binding.specifier.type !== "ImportSpecifier") continue;
    if (!drops.has(binding.statement)) drops.set(binding.statement, new Set());
    drops.get(binding.statement).add(local);
  }
  const edits = [];
  const handled = new Set();
  const gone = new Set();
  const touch = (statement, names) => {
    const edit = rebuildImport(statement, text, eol, names, drops.get(statement) ?? new Set());
    if (!edit) return false;
    edits.push(edit);
    handled.add(statement);
    // A statement that goes as a whole is no anchor for a new import line (that would insert into the removed range).
    if (edit.start <= statement.start && edit.end >= statement.end) gone.add(statement);
    return true;
  };
  const addedTo = new Set();
  const noNamespace = (statement) => !statement.specifiers.some((specifier) => specifier.type === "ImportNamespaceSpecifier");
  for (const [module, names] of adds) {
    const target = valueImports.find((statement) => statement.source.value === module && noNamespace(statement))
      ?? (looseTarget && module !== PACKAGE ? valueImports.find((statement) => statement.source.value !== PACKAGE && noNamespace(statement) && names.every((name) => sourceFits(statement.source.value, name))) : undefined);
    if (target && !handled.has(target) && touch(target, names)) addedTo.add(module);
  }
  for (const statement of drops.keys()) if (!handled.has(statement)) touch(statement, []);
  const fresh = [...adds].filter(([module]) => !addedTo.has(module)).sort(([a], [b]) => byCodePoint(a, b));
  const anchors = imports.filter((statement) => !gone.has(statement));
  for (const [module, names] of fresh) edits.push(newImport(anchors, text, eol, module, names));
  return edits;
}

export const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** One import's `{ … }` rewritten with `addNames` (sorted in) and without `dropLocals`; the statement goes when empty. */
function rebuildImport(statement, text, eol, addNames, dropLocals) {
  const named = statement.specifiers.filter((specifier) => specifier.type === "ImportSpecifier");
  const others = statement.specifiers.filter((specifier) => specifier.type !== "ImportSpecifier");
  const open = text.indexOf("{", statement.start);
  const close = text.lastIndexOf("}", statement.source.start);
  if (open < 0 || open > statement.source.start || close < open) return null;
  const inside = text.slice(open + 1, close);
  if (/\/[*/]/.test(inside)) return null;
  const items = named.filter((specifier) => !dropLocals.has(specifier.local.name)).map((specifier) => ({ text: text.slice(specifier.start, specifier.end), name: importedName(specifier), type: specifier.importKind === "type" }));
  for (const name of [...addNames].sort(byCodePoint)) {
    const at = items.findIndex((item) => !item.type && byCodePoint(item.name, name) > 0);
    const lastValue = items.findLastIndex((item) => !item.type);
    items.splice(at >= 0 ? at : lastValue + 1, 0, { text: name, name, type: false });
  }
  if (!items.length) {
    if (others.length) {
      const comma = text.lastIndexOf(",", open);
      return { start: comma >= others.at(-1).end ? comma : open, end: close + 1, text: "" };
    }
    const lineStart = lineStartOf(text, statement.start);
    const newline = text.indexOf("\n", statement.end);
    if (/^[ \t]*$/.test(text.slice(lineStart, statement.start)) && newline >= 0 && /^[ \t]*\r?$/.test(text.slice(statement.end, newline))) return { start: lineStart, end: newline + 1, text: "" };
    return { start: statement.start, end: statement.end, text: "" };
  }
  if (/[\r\n]/.test(inside)) {
    const indent = named.length ? indentAt(text, named[0].start) : `${indentAt(text, statement.start)}${UNIT}`;
    const trailing = /,\s*$/.test(inside);
    return { start: open + 1, end: close, text: `${eol}${items.map((item) => indent + item.text).join(`,${eol}`)}${trailing ? "," : ""}${eol}${indentAt(text, statement.start)}` };
  }
  const pad = /^\s/.test(inside) || !named.length ? " " : "";
  return { start: open + 1, end: close, text: `${pad}${items.map((item) => item.text).join(", ")}${pad}` };
}

/** A new `import { … } from "module";` line: sorted among the imports from the same folder, else after the last import. */
function newImport(imports, text, eol, module, names) {
  const last = imports.findLast((statement) => statement.specifiers.length) ?? imports.at(-1);
  const quote = last && text[last.source.start] === "'" ? "'" : '"';
  const semicolon = last && !text.slice(last.start, last.end).endsWith(";") ? "" : ";";
  const line = `import { ${[...names].sort(byCodePoint).join(", ")} } from ${quote}${module}${quote}${semicolon}`;
  const folder = module.slice(0, module.lastIndexOf("/") + 1);
  const peers = folder ? imports.filter((statement) => statement.source.value.startsWith(folder) && !statement.source.value.slice(folder.length).includes("/")) : [];
  const after = peers.find((statement) => byCodePoint(statement.source.value, module) > 0);
  if (after) return { start: lineStartOf(text, after.start), end: lineStartOf(text, after.start), text: `${line}${eol}` };
  const anchor = peers.at(-1) ?? last;
  if (!anchor) return { start: 0, end: 0, text: `${line}${eol}` };
  const newline = text.indexOf("\n", anchor.end);
  const rest = text.slice(anchor.end, newline < 0 ? text.length : newline);
  const at = /^[ \t]*(?:\/\/.*)?\r?$/.test(rest) && newline >= 0 ? newline - (text[newline - 1] === "\r" ? 1 : 0) : anchor.end;
  return { start: at, end: at, text: `${eol}${line}` };
}
