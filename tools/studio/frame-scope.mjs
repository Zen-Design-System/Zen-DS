// Zen Studio: Save and Discard per frame. A frame on the canvas (an example card, a component page's playground) owns
// some source ranges of each file it renders; its Save writes only the draft's changes inside them (with the import
// lines they need) and keeps every other change as the draft; its Discard drops only those changes. The toolbar's
// Save all still writes everything. Pure functions over texts (no fs, no server): `node tools/studio/selftest.mjs`.
//
//   frameRanges(code, lines)                     the 1-based inclusive line ranges a frame owns in `code` (a draft),
//                                                given the lines of the JSX it renders (its DOM's data-zen-src locs)
//   frameRangesOf(ast, lines)                    the same from a parsed AST (jsx-source parseSource), to parse once
//   lineChanges(base, content)                   the draft's changes as line ranges, unmerged, with import flags
//   ownChanges(changes, ranges)                  the non-import changes that fall in the ranges
//   frameChanges(base, content, ranges)          the changes inside the frame's ranges (counts for the frame chrome)
//   splitDraft(base, content, ranges, mode)      "save": { text: base + the frame's changes (the new disk) }
//                                                "discard": { text: content without them (the new draft) }
//
// Ownership: each rendered line belongs to its module-level declaration (an example component, a helper it renders);
// inside an array (the `examples` list) to its element, inside a function to the top-level `if (page === "…")`
// branch holding it (the platform's playgrounds). An example object whose render shows a declaration in scope joins
// it (its `code` snippet is synced with the JSX). Import changes join a frame only when its changes need them: the
// subset that leaves the fewest missing or unused imports among the names the draft imports differently wins.
import { parseSource, jsxName, walk } from "./jsx-source.mjs";

/** Above this many line pairs the changed middle counts as one change (no LCS). */
const LCS_LIMIT = 4_000_000;

const splitLines = (text) => text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
const unwrap = (node) => {
  let value = node;
  while (value && (value.type === "TSAsExpression" || value.type === "TSSatisfiesExpression" || value.type === "TSNonNullExpression" || value.type === "ParenthesizedExpression")) value = value.expression;
  return value;
};
const contains = (node, line) => node?.loc && node.loc.start.line <= line && node.loc.end.line >= line;
const isFunction = (node) => node && (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression" || node.type === "FunctionDeclaration");
const propertyName = (key) => (key?.type === "Identifier" ? key.name : key?.type === "StringLiteral" ? key.value : null);

/** `page === "button"`, `"button" === page`, or several of them joined by || (a playground branch). */
function isPageTest(test) {
  const node = unwrap(test);
  if (!node) return false;
  if (node.type === "LogicalExpression" && node.operator === "||") return isPageTest(node.left) && isPageTest(node.right);
  return node.type === "BinaryExpression" && (node.operator === "===" || node.operator === "==")
    && (node.left.type === "StringLiteral" || node.right.type === "StringLiteral");
}

/** The function a top-level declaration declares (function x, const x = () => …, memo/forwardRef(…)), or null. */
function declaredFunction(node) {
  const value = unwrap(node);
  if (isFunction(value)) return value;
  if (value?.type === "CallExpression") return value.arguments.map(unwrap).find(isFunction) ?? null;
  return null;
}

/** Inside a function: the top-level `if (page === "…")` branch of its body that holds `line`, or null. */
function pageBranch(fn, line) {
  if (fn?.body?.type !== "BlockStatement") return null;
  return fn.body.body.find((statement) => statement.type === "IfStatement" && contains(statement, line) && isPageTest(statement.test)) ?? null;
}

/** What a line of a top-level statement belongs to: { node, name } (name: the declaration it renders as, if any). */
function ownerOf(statement, line) {
  const declaration = statement.type === "ExportNamedDeclaration" || statement.type === "ExportDefaultDeclaration" ? statement.declaration ?? statement : statement;
  if (declaration.type === "FunctionDeclaration") {
    const branch = pageBranch(declaration, line);
    return branch ? { node: branch, name: null } : { node: statement, name: declaration.id?.name ?? null };
  }
  if (declaration.type === "VariableDeclaration") {
    const declarator = declaration.declarations.find((item) => contains(item, line));
    if (!declarator) return { node: statement, name: null };
    const name = declarator.id?.type === "Identifier" ? declarator.id.name : null;
    const init = unwrap(declarator.init);
    if (init?.type === "ArrayExpression") {
      const element = init.elements.find((item) => item && contains(item, line));
      if (element) return { node: element, name: null };
    }
    const fn = declaredFunction(declarator.init);
    const branch = fn ? pageBranch(fn, line) : null;
    if (branch) return { node: branch, name: null };
    return { node: statement, name };
  }
  return { node: statement, name: null };
}

/** Example objects of the file ({ code: `…`, render }) with the names their render shows. */
function exampleObjects(ast) {
  const out = [];
  walk(ast, (node) => {
    if (node.type !== "ObjectExpression") return true;
    let code = false;
    let render = null;
    for (const property of node.properties) {
      if (property.computed) continue;
      const key = propertyName(property.key);
      if (key === "code" && property.type === "ObjectProperty" && property.value.type === "TemplateLiteral") code = true;
      if (key === "render" && (property.type === "ObjectMethod" || (property.type === "ObjectProperty" && isFunction(property.value)))) render = property;
    }
    if (!code || !render) return true;
    const names = new Set();
    walk(render, (inner) => {
      if (inner.type === "JSXOpeningElement") names.add(jsxName(inner.name));
      if (inner.type === "CallExpression" && inner.callee.type === "Identifier") names.add(inner.callee.name);
      return true;
    });
    out.push({ node, names });
    return true;
  });
  return out;
}

/** Sorted, merged [from, to] ranges (touching or overlapping ranges become one). */
function mergeRanges(ranges) {
  const sorted = ranges.map(([from, to]) => [from, to]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out = [];
  for (const range of sorted) {
    const last = out[out.length - 1];
    if (last && range[0] <= last[1] + 1) last[1] = Math.max(last[1], range[1]);
    else out.push(range);
  }
  return out;
}

/**
 * The line ranges a frame owns in `code` (the draft text the canvas renders): [[from, to], …], 1-based inclusive,
 * sorted and merged. `lines`: the 1-based lines its rendered JSX starts on (data-zen-src). null: the text does not
 * parse. Lines in imports or outside any statement own nothing.
 */
export function frameRanges(code, lines) {
  const ast = parseSource(code);
  return ast ? frameRangesOf(ast, lines) : null;
}

/** frameRanges from an AST already parsed (parseSource) of the same text. */
export function frameRangesOf(ast, lines) {
  const body = ast.program.body;
  const ranges = [];
  const names = new Set();
  for (const line of new Set(lines)) {
    if (!Number.isInteger(line) || line < 1) continue;
    const statement = body.find((item) => contains(item, line));
    if (!statement || statement.type === "ImportDeclaration") continue;
    const owner = ownerOf(statement, line);
    ranges.push([owner.node.loc.start.line, owner.node.loc.end.line]);
    if (owner.name) names.add(owner.name);
  }
  if (names.size) {
    for (const example of exampleObjects(ast)) {
      if ([...example.names].some((name) => names.has(name))) ranges.push([example.node.loc.start.line, example.node.loc.end.line]);
    }
  }
  return mergeRanges(ranges);
}

/** The lines before the first statement that is not an import (0-based end), or 0 when the text does not parse. */
function importEnd(code) {
  const ast = parseSource(code);
  const first = ast?.program.body.find((statement) => statement.type !== "ImportDeclaration");
  if (!ast) return 0;
  if (!first) return splitLines(code).length;
  const comment = (first.leadingComments ?? [])[0];
  return (comment ?? first).loc.start.line - 1;
}

/**
 * The changes from `base` to `content` as line ranges (0-based, half-open), in order and unmerged:
 * [{ a: [from, to], b: [from, to], imports }]. `imports`: the change lies in the import block of both texts.
 */
export function lineChanges(base, content) {
  const a = splitLines(base);
  const b = splitLines(content);
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head += 1;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail += 1;
  const n = a.length - head - tail;
  const m = b.length - head - tail;
  const raw = [];
  if (n > 0 && m > 0 && n * m <= LCS_LIMIT) {
    const width = m + 1;
    const lcs = new Uint32Array((n + 1) * width);
    for (let i = n - 1; i >= 0; i -= 1) {
      for (let j = m - 1; j >= 0; j -= 1) {
        lcs[i * width + j] = a[head + i] === b[head + j] ? lcs[(i + 1) * width + j + 1] + 1 : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && a[head + i] === b[head + j]) { i += 1; j += 1; continue; }
      const fromA = i;
      const fromB = j;
      while ((i < n || j < m) && !(i < n && j < m && a[head + i] === b[head + j])) {
        if (j >= m || (i < n && lcs[(i + 1) * width + j] >= lcs[i * width + j + 1])) i += 1;
        else j += 1;
      }
      raw.push([head + fromA, head + i, head + fromB, head + j]);
    }
  } else if (n > 0 || m > 0) raw.push([head, head + n, head, head + m]);
  const endA = importEnd(base);
  const endB = importEnd(content);
  return raw.map(([aFrom, aTo, bFrom, bTo]) => ({ a: [aFrom, aTo], b: [bFrom, bTo], imports: aTo <= endA && bTo <= endB && (aFrom < endA || bFrom < endB) }));
}

/** Whether a change touches the frame's ranges (in content lines; a pure removal by where it sat). */
function inRanges(change, ranges) {
  const [from, to] = change.b;
  return ranges.some(([start, end]) => (to > from ? from < end && to > start - 1 : from >= start - 1 && from <= end));
}

/** The changes (lineChanges) a frame owns: not imports, inside its ranges. */
export const ownChanges = (changes, ranges) => changes.filter((change) => !change.imports && inRanges(change, ranges));

/** `base` with the chosen changes taken from `content` (the others keep the base lines). */
function compose(base, content, changes, chosen) {
  const a = splitLines(base);
  const b = splitLines(content);
  const out = [];
  let at = 0;
  for (const change of changes) {
    out.push(...a.slice(at, change.a[0]));
    out.push(...(chosen.has(change) ? b.slice(change.b[0], change.b[1]) : a.slice(change.a[0], change.a[1])));
    at = change.a[1];
  }
  out.push(...a.slice(at));
  return out.join("");
}

/** The local names a file imports. */
function importedNames(ast) {
  const names = new Set();
  for (const statement of ast?.program.body ?? []) {
    if (statement.type !== "ImportDeclaration") continue;
    for (const specifier of statement.specifiers) names.add(specifier.local.name);
  }
  return names;
}

/** The names of `wanted` used outside the imports (as detach.mjs counts references: not keys, members or attributes). */
function usedNames(ast, wanted) {
  const used = new Set();
  const skip = new WeakSet();
  walk(ast.program, (node) => {
    if (node.type === "ImportDeclaration") return false;
    if ((node.type === "MemberExpression" || node.type === "OptionalMemberExpression") && !node.computed) skip.add(node.property);
    if ((node.type === "ObjectProperty" || node.type === "ClassProperty" || node.type === "ObjectMethod" || node.type === "ClassMethod") && !node.computed && !node.shorthand) skip.add(node.key);
    if (node.type === "JSXAttribute") skip.add(node.name);
    if (node.type === "JSXMemberExpression") skip.add(node.property);
    if ((node.type === "Identifier" || node.type === "JSXIdentifier") && wanted.has(node.name) && !skip.has(node)) used.add(node.name);
    return true;
  });
  return used;
}

/** Missing or unused imports among `names` (Infinity: the text does not parse as well as `errors` allows). */
function importCost(text, names, errors) {
  const ast = parseSource(text);
  if (!ast || ast.errors.length > errors) return Infinity;
  const imported = importedNames(ast);
  const used = usedNames(ast, names);
  let cost = 0;
  for (const name of names) if (imported.has(name) !== used.has(name)) cost += 1;
  return cost;
}

/**
 * The draft's changes inside the frame: { changes, added, removed } (counts of change blocks and of lines), import
 * changes not counted. `ranges`: frameRanges of the content.
 */
export function frameChanges(base, content, ranges) {
  const own = ownChanges(lineChanges(base, content), ranges);
  return {
    changes: own.length,
    added: own.reduce((sum, change) => sum + change.b[1] - change.b[0], 0),
    removed: own.reduce((sum, change) => sum + change.a[1] - change.a[0], 0),
  };
}

/**
 * Splits a draft (`base` → `content`) at a frame (`ranges`: frameRanges of the content).
 *   mode "save":    { text } = base + the frame's changes (+ the imports they need): what Save writes to disk; the
 *                   draft goes on as base = text, content unchanged
 *   mode "discard": { text } = content without the frame's changes (+ the imports only they needed): the new draft
 * `taken`: how many change blocks moved (0: the frame has no changes in this file, `text` is null).
 */
export function splitDraft(base, content, ranges, mode) {
  if (mode !== "save" && mode !== "discard") throw new TypeError(`mode must be "save" or "discard"`);
  const changes = lineChanges(base, content);
  const own = ownChanges(changes, ranges);
  if (!own.length) return { text: null, taken: 0 };
  const imports = changes.filter((change) => change.imports);
  // "save" takes the frame's changes onto the base; "discard" keeps every change but the frame's.
  const chosenFor = (extra) => new Set(mode === "save"
    ? [...own, ...extra]
    : changes.filter((change) => !own.includes(change) && !extra.includes(change)));
  let picked = [];
  if (imports.length) {
    const baseAst = parseSource(base);
    const contentAst = parseSource(content);
    const before = importedNames(baseAst);
    const after = importedNames(contentAst);
    // Only names the draft imports differently can go missing or unused because of the split.
    const names = new Set([...before, ...after].filter((name) => before.has(name) !== after.has(name)));
    if (names.size) {
      const errors = Math.max(baseAst?.errors.length ?? 0, contentAst?.errors.length ?? 0);
      let best = importCost(compose(base, content, changes, chosenFor(picked)), names, errors);
      // Greedy: an import change joins when it lowers the cost (the fewest import lines move on a tie).
      for (const change of imports) {
        if (best === 0) break;
        const trial = [...picked, change];
        const cost = importCost(compose(base, content, changes, chosenFor(trial)), names, errors);
        if (cost < best) { best = cost; picked = trial; }
      }
    }
  }
  return { text: compose(base, content, changes, chosenFor(picked)), taken: own.length + picked.length };
}
