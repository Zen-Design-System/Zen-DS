// Zen Studio arrange: move or copy a layer to another place in the same file (Figma's drag in auto layout: reorder
// among siblings, drop into another frame, ⌥-drag a copy). docs/research/studio-figma-editing-plan-2026-10-03.md,
// Phase 2. slots.mjs applySlotOp runs it as the slot op "moveTo" (same rules: example pages and templates only, the
// file's hash required, docs chrome and playground slots refused) and hands in its helpers.
//
//   op "moveTo" { parent, before?, after?, copy? }   on the element that moves (loc/name = that element)
//     parent  "<line>:<column>" of the JSX element it goes into (the same parent reorders it)
//     before  "<line>:<column>" of the child it goes in front of (or of an element inside that child: a .map row, a
//             condition's element); after: the child it follows; neither: last
//     copy    true: a copy goes there and the element stays (⌥-drag, ⌘V in the same file); `inserted`, else `moved`
//     replace with copy: the copy takes the place of the child at that loc, which goes (⇧⌘R, paste to replace)
//
//   op "replaceElement" { code, state? }   on the element it replaces (Swap instance: a prop's or slot's component, a layer)
//   op "pasteCode" { code, before?, after?, replace? }   on the element the code goes into (⌘V from another file or
//     after a cut): `code` is one JSX element; names it reads must exist there, or be Zen components (imported) or
//     `toast`; `inserted` = { loc }
//
// Rules:
// - Only a child of an element or fragment moves (`<X />` or `{<X />}` among children); an element in a prop, a
//   condition, a variable or a .map row's root is refused with where it sits.
// - The destination is a JSX element of the same file that is not the element or inside it; a self-closing one opens
//   (layout primitives, Card, Form parts and host tags only).
// - Every name the element reads must mean the same at its new place (the same parameter, variable, import or global):
//   a .map row's `item` cannot leave its row, a state of one example cannot go to another. Names declared inside the
//   element itself (a handler's parameters) do not count.
// - The element keeps its code (re-indented where it lands) and detach's `zen-detached` marker above it; the old place
//   is tidied as removeElement does (a parent that needs children keeps its only child).

import cloning from "../../src/platform/studio/cloning.json" with { type: "json" };
import { parseExpression } from "@babel/parser";
import { applyEdits, applyOps, findElement, jsxName, parseLoc, parseSource } from "./jsx-source.mjs";
import { indentAt, pathTo, piece } from "./source-helpers.mjs";

/** Self-closing elements a layer can be dropped into (they open: `<Stack />` → `<Stack>…</Stack>`). */
const OPENABLE = new Set(["Stack", "Grid", "Box", "Container", "Card", "Form", "FormFieldset", "FormActions"]);
/** Host tags that never hold children. */
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
/** Parents whose text content a block element would break (a <div> inside a <p>, a <button>, a link…). */
const TEXT_PARENTS = new Set(["p", "span", "a", "button", "label", "strong", "em", "small", "b", "i", "code", "h1", "h2", "h3", "h4", "h5", "h6", "Text", "Heading", "Link", "Button", "Badge", "Tag", "Chip"]);
/** Elements that render a block box (Zen layout and surfaces, block host tags). */
const BLOCKS = new Set(["Stack", "Grid", "Box", "Container", "Card", "Form", "FormFieldset", "FormActions", "List", "ListItem", "Table", "Divider", "EmptyState", "InlineMessage", "DescriptionList", "Metric", "MetricCard", "div", "section", "article", "aside", "header", "footer", "main", "nav", "ul", "ol", "li", "table", "form", "fieldset", "figure", "p", "h1", "h2", "h3", "h4", "h5", "h6"]);
const lastSegment = (value) => value.slice(value.lastIndexOf(".") + 1);

/**
 * Elements a component clones or checks by type (src/platform/studio/cloning.json, the list op wrap reads too): one cannot
 * leave such a parent, or land in one, as a move would change what that parent clones.
 */
function clonedPlace(h, element, nodePath, holderAt, parent, copy) {
  const name = lastSegment(jsxName(element.openingElement.name));
  const verb = copy ? "copied" : "moved";
  const anywhere = Object.values(cloning.parents).find((entry) => entry.anywhere === true && Array.isArray(entry.only) && entry.only.includes(name));
  if (anywhere) h.refuse(anywhere.reason.replaceAll("{element}", `<${name}>`));
  // The element it is a child of now (through fragments).
  let k = holderAt;
  while (k > 0 && (nodePath[k].type === "JSXFragment" || nodePath[k].type === "JSXExpressionContainer")) k -= 1;
  const owner = nodePath[k]?.type === "JSXElement" ? lastSegment(jsxName(nodePath[k].openingElement.name)) : null;
  const from = owner ? cloning.parents[owner] : null;
  if (from && !Array.isArray(from.only) && !copy) h.refuse(`<${name}> is the child <${owner}> clones; ${verb === "moved" ? "move" : "copy"} the <${owner}> instead.`);
  const into = cloning.parents[lastSegment(jsxName(parent.openingElement.name))];
  if (into) {
    const target = lastSegment(jsxName(parent.openingElement.name));
    if (!Array.isArray(into.only)) h.refuse(`<${target}> takes one child, which it clones; drop beside it instead.`);
    if (!into.only.includes(name)) h.refuse(`<${target}> holds ${into.only.map((only) => `<${only}>`).join(", ")} only; drop <${name}> beside it instead.`);
  }
}

/** AST keys that never hold code a name could be read in. */
const SKIP_KEYS = new Set(["loc", "start", "end", "extra", "range", "leadingComments", "trailingComments", "innerComments", "typeAnnotation", "returnType", "typeParameters", "typeArguments", "predicate"]);

function visit(node, parent, key, callback) {
  if (!node || typeof node.type !== "string") return;
  callback(node, parent, key);
  for (const name of Object.keys(node)) {
    if (SKIP_KEYS.has(name)) continue;
    const value = node[name];
    if (Array.isArray(value)) value.forEach((child) => visit(child, node, name, callback));
    else if (value && typeof value.type === "string") visit(value, node, name, callback);
  }
}

/** Is this Identifier / JSXIdentifier read as a name (not a property, key, attribute or declaration)? */
function isReference(node, parent, key) {
  if (node.type === "JSXIdentifier") {
    // <Card>, <Layout.Stack> (its object): a component; lower-case tags and attribute names are not names.
    if ((parent.type === "JSXOpeningElement" || parent.type === "JSXClosingElement") && key === "name") return /^[A-Z]/.test(node.name);
    return parent.type === "JSXMemberExpression" && key === "object";
  }
  if (node.type !== "Identifier") return false;
  if ((parent.type === "MemberExpression" || parent.type === "OptionalMemberExpression") && key === "property" && !parent.computed) return false;
  if ((parent.type === "ObjectProperty" || parent.type === "ObjectMethod" || parent.type === "ClassProperty" || parent.type === "ClassMethod") && key === "key" && !parent.computed) return false;
  if (parent.type === "LabeledStatement" || parent.type === "BreakStatement" || parent.type === "ContinueStatement") return false;
  if (parent.type?.startsWith("TS")) return false;
  return true;
}

/** The names the element reads from outside itself (a handler's parameters and local variables left out). */
function freeNames(element, patternNames, functionTypes) {
  const declared = new Set();
  const used = new Set();
  visit(element, null, null, (node, parent) => {
    if (functionTypes.has(node.type)) node.params.forEach((param) => patternNames(param, declared));
    if (node.type === "VariableDeclarator") patternNames(node.id, declared);
    if (node.type === "CatchClause" && node.param) patternNames(node.param, declared);
    if ((node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") && node.id) declared.add(node.id.name);
    void parent;
  });
  visit(element, null, null, (node, parent, key) => {
    if (!parent || !isReference(node, parent, key)) return;
    // A declaration's own name (a parameter, a declarator id) is not a read.
    if (parent.type === "VariableDeclarator" && key === "id") return;
    if (functionTypes.has(parent.type) && (key === "params" || key === "id")) return;
    if (!declared.has(node.name)) used.add(node.name);
  });
  return used;
}

const sameBinding = (a, b) => {
  if (!a || !b) return a === b;
  if (a.declarator || b.declarator) return a.declarator === b.declarator;
  if (a.param || b.param) return a.param === b.param;
  return a.what === b.what;
};

/**
 * The plan for op moveTo (see the header). `h`: slots.mjs helpers { refuse, removal, insertIntoContainer,
 * expandSelfClosing, slotEntries, holderOf, guard, bindingOf, detachMarker, patternNames, TS_WRAPPERS, FUNCTION_TYPES,
 * WHERE, isMapCall }.
 */
export function moveToPlan(ctx, nodePath, op, h) {
  const { text, ast, element } = ctx;
  const name = jsxName(element.openingElement.name);
  const what = `<${name}>`;
  const copy = op.copy === true;
  if (op.copy !== undefined && typeof op.copy !== "boolean") h.refuse("`copy` must be true or false");
  if (typeof op.parent !== "string" || !parseLoc(op.parent)) h.refuse('moveTo needs `parent`: the "<line>:<column>" of the element it goes into');

  // Where the element sits now: among an element's or a fragment's children (`<X />` or `{<X />}`).
  let i = nodePath.length - 1;
  while (i > 0 && h.TS_WRAPPERS.has(nodePath[i - 1].type)) i -= 1;
  let unit = nodePath[i];
  let holderAt = i - 1;
  if (nodePath[holderAt]?.type === "JSXExpressionContainer" && (nodePath[i - 2]?.type === "JSXElement" || nodePath[i - 2]?.type === "JSXFragment")) {
    unit = nodePath[holderAt];
    holderAt -= 1;
  }
  const holder = nodePath[holderAt];
  if (holder?.type !== "JSXElement" && holder?.type !== "JSXFragment") {
    const fn = h.FUNCTION_TYPES.has(holder?.type) ? holder : holder?.type === "ReturnStatement" ? nodePath.findLast((node, k) => k < i - 1 && h.FUNCTION_TYPES.has(node.type)) : null;
    const owner = fn ? nodePath[nodePath.indexOf(fn) - 1] : null;
    if (fn && h.isMapCall(owner) && owner.arguments[0] === fn) h.refuse(`${what} is the row of a .map list; reorder the rows in its data.`);
    const where = holder?.type === "JSXAttribute" || (holder?.type === "JSXExpressionContainer" && nodePath[i - 2]?.type === "JSXAttribute") ? "a prop" : h.WHERE[holder?.type] ?? "code the Studio does not restructure";
    h.refuse(`${what} sits in ${where}; only an element's children can be ${copy ? "copied" : "moved"} by dragging. Edit it in the code.`);
  }

  // The destination.
  if (op.replace !== undefined && op.replace !== null && !copy) h.refuse("`replace` needs `copy`: the copy takes the replaced layer's place");
  const { parent, parentName, parentPath } = destination(ctx, h, op.parent);
  if (element.start <= parent.start && parent.end <= element.end) h.refuse(`${what} cannot go inside itself.`);
  clonedPlace(h, element, nodePath, holderAt, parent, copy);
  landing(h, name, parent, parentName);
  const { entries, at, replaced } = positionIn(ctx, h, parent, parentName, op);
  if (replaced && replaced.start <= element.start && element.end <= replaced.end) h.refuse(`${what} is inside the layer it would replace; paste it elsewhere.`);
  if (!copy) {
    const own = entries.findIndex((entry) => entry.node === unit || entry.node === element);
    if (own >= 0 && (at === own || at === own + 1)) h.refuse(`${what} is already there.`);
  } else {
    const key = element.openingElement.attributes.find((attr) => attr.type === "JSXAttribute" && jsxName(attr.name) === "key");
    if (key) h.refuse(`${what} has a key; a copy would repeat it. Edit it in the code.`);
  }

  // Every name it reads means the same thing where it lands.
  for (const used of freeNames(element, h.patternNames, h.FUNCTION_TYPES)) {
    const here = h.bindingOf(nodePath, used);
    const there = h.bindingOf(parentPath, used);
    if (!sameBinding(here, there)) {
      h.refuse(`${what} uses \`${used}\` (${here?.what ?? "a global"}), which ${there ? "is something else" : "does not exist"} inside <${parentName}>; ${copy ? "copy" : "move"} it in the code.`);
    }
  }

  // The code that goes (with detach's marker above it), placed like an inserted element.
  const marker = h.detachMarker(holder, unit);
  const start = marker && /^\s*$/.test(text.slice(marker.end, unit.start)) ? marker.start : element.start;
  const { edit, placed, within } = place(ctx, h, parent, entries, at, { part: piece(text, element, start, element.end), name }, name);
  const removed = copy ? [] : h.removal(ctx, nodePath, nodePath.length - 1, what).edits;
  for (const gone of removed) {
    if (gone.start < edit.start && edit.start < gone.end) h.refuse(`${what} cannot be dropped there (inside the code it leaves).`);
  }
  if (replaced) removed.push(...replacing(ctx, h, replaced));
  if (replaced) removed.push(...tidyImports(ctx, h, [...removed, ...placed.edits], []));
  return {
    edits: [...removed, ...placed.edits],
    focus: { edit, within, name },
    answer: copy ? "inserted" : "moved",
    snippet: () => ({ reason: `a ${copy ? (replaced ? "paste" : "copy") : "move"} is not copied into the example snippet; update it by hand (${what})` }),
  };
}

/* ── shared by moveTo and pasteCode ──────────────────────────────────────────────────────────────────────────────── */

/** The element at `loc` that something goes into, checked like an insert (docs chrome, playground slots). */
function destination(ctx, h, loc) {
  if (typeof loc !== "string" || !parseLoc(loc)) h.refuse('Send `parent`: the "<line>:<column>" of the element it goes into');
  const parent = findElement(ctx.ast, parseLoc(loc));
  if (!parent) h.refuse(`No element starts at ${loc}; select the layer again`, "stale");
  const parentPath = pathTo(ctx.ast.program, parent);
  if (!parentPath) h.refuse("The destination is not in the file's tree", "not-found");
  h.guard({ ...ctx, element: parent }, parentPath, "insertChild");
  return { parent, parentName: jsxName(parent.openingElement.name), parentPath };
}

/** Whether an element named `name` may land in `parent` (cloning parents, text, a self-closing tag that cannot open). */
function landing(h, name, parent, parentName) {
  const target = lastSegment(parentName);
  const into = cloning.parents[target];
  if (into) {
    if (!Array.isArray(into.only)) h.refuse(`<${target}> takes one child, which it clones; drop beside it instead.`);
    if (!into.only.includes(lastSegment(name))) h.refuse(`<${target}> holds ${into.only.map((only) => `<${only}>`).join(", ")} only; drop <${name}> beside it instead.`);
  }
  if (TEXT_PARENTS.has(target) && BLOCKS.has(lastSegment(name))) h.refuse(`<${parentName}> holds text; <${name}> would put a block inside it. Drop it beside <${parentName}> instead.`);
  if (parent.openingElement.selfClosing && !(OPENABLE.has(parentName) || (/^[a-z]/.test(parentName) && !VOID_TAGS.has(parentName)))) {
    h.refuse(`<${parentName}> has no children to drop into; drop beside it instead.`);
  }
}

/**
 * Where among `parent`'s children: `before` / `after` / `replace` name a child (its loc, or an element inside it: a
 * .map row, a condition's element); none = last. `replaced` = the element `replace` names.
 */
function positionIn(ctx, h, parent, parentName, op) {
  for (const side of ["before", "after", "replace"]) {
    if (op[side] !== undefined && op[side] !== null && (typeof op[side] !== "string" || !parseLoc(op[side]))) h.refuse(`\`${side}\` must be a "<line>:<column>" of a child element`);
  }
  if ([op.before, op.after, op.replace].filter(Boolean).length > 1) h.refuse("Send one of `before`, `after` or `replace`");
  const entries = parent.openingElement.selfClosing ? [] : h.slotEntries(parent, ctx.text);
  const indexOfLoc = (loc) => {
    const direct = entries.findIndex((entry) => entry.child.kind === "element" && entry.child.loc === loc);
    if (direct >= 0) return direct;
    const inner = findElement(ctx.ast, parseLoc(loc));
    return inner ? entries.findIndex((entry) => entry.node.start <= inner.start && inner.end <= entry.node.end) : -1;
  };
  const named = op.before ?? op.after ?? op.replace;
  if (!named) return { entries, at: entries.length, replaced: null };
  const k = indexOfLoc(named);
  if (k < 0) h.refuse(`<${parentName}> has no child at ${named}; select the layer again`, "stale");
  const replaced = op.replace ? findElement(ctx.ast, parseLoc(op.replace)) : null;
  return { entries, at: op.after ? k + 1 : k, replaced };
}

/** The insert edit of `code` at `at` (in front of a detached element's marker too); `within` = its opening tag. */
function place(ctx, h, parent, entries, at, code, name) {
  const { text } = ctx;
  const placed = parent.openingElement.selfClosing ? h.expandSelfClosing(ctx, parent, code) : h.insertIntoContainer(ctx, parent, at, code);
  const edit = placed.edits[0];
  const next = at < entries.length ? entries[at].node : null;
  const nextMarker = next ? h.detachMarker(h.holderOf(parent, next), next) : null;
  const lineStart = (offset) => text.lastIndexOf("\n", offset - 1) + 1;
  if (nextMarker && edit.start === edit.end && edit.start === lineStart(next.start) && /^\s*$/.test(text.slice(nextMarker.end, next.start))) {
    edit.start = lineStart(nextMarker.start);
    edit.end = edit.start;
  }
  const within = Math.max(placed.focus.within, edit.text.indexOf(`<${name}`, placed.focus.within));
  return { edit, placed, within };
}

/** The removal of the element a paste replaces (as removeElement writes it). */
function replacing(ctx, h, replaced) {
  const path = pathTo(ctx.ast.program, replaced);
  if (!path) h.refuse("The replaced layer is not in the file's tree", "not-found");
  return h.removal(ctx, path, path.length - 1, `<${jsxName(replaced.openingElement.name)}>`).edits;
}

/** Import edits: the Zen components `needed` join, the ones `edits` leave unused go (one importChanges call). */
function tidyImports(ctx, h, edits, needed) {
  const without = parseSource(applyEdits(ctx.text, edits));
  const unused = without ? [...h.componentImports(ctx.ast).keys()].filter((local) => h.referenceCount(ctx.ast, local) > 0 && h.referenceCount(without, local) === 0) : [];
  return needed.length || unused.length ? h.importChanges(ctx.ast, ctx.text, ctx.eol, ctx.file, needed, unused, ctx.folders) : [];
}

/** Names pasted code may read without a binding where it lands. */
const GLOBALS = new Set(["undefined", "NaN", "Infinity", "Math", "Date", "Number", "String", "Boolean", "Array", "Object", "JSON", "Intl", "console", "window", "document"]);

/**
 * The plan for op pasteCode { code, before?, after?, replace?, state? } on the element the code goes into (⌘V / ⇧⌘R
 * from another file, after a cut, or an Assets item). `code` is one JSX element; every name it reads must exist where it
 * lands, or be a Zen component (imported as an insert does), `toast` (the component gains useToast()) or a name of
 * `state` (the component gains its useState lines, slots.mjs stateFor).
 */
export function pasteCodePlan(ctx, nodePath, op, h) {
  const { element: parent } = ctx;
  const parentName = jsxName(parent.openingElement.name);
  const raw = op.code;
  if (typeof raw !== "string" || !raw.trim()) h.refuse("pasteCode needs `code`: one JSX element");
  if (raw.length > 65536) h.refuse("The code is too long (64 KB at most)");
  if (/[\u2028\u2029]/.test(raw)) h.refuse("The code holds a line separator (U+2028/U+2029)");
  // An Assets item with state (op.state, as insertChild takes it): its names are renamed fresh before anything reads them.
  const state = h.stateFor(ctx, raw.replace(/\r\n|\r/g, "\n").replace(/^(?:[ \t]*\n)+/, "").replace(/\s+$/, ""), op.state);
  const src = state.src;
  // One JSX element, or several side by side (several layers copied together), each one its own line(s).
  const wrapped = `<>\n${src}\n</>`;
  let fragment;
  try {
    fragment = parseExpression(wrapped, { plugins: ["jsx", "typescript"] });
  } catch (error) {
    h.refuse(`The clipboard is not JSX elements: ${error.message.replace(/\s*\(\d+:\d+\)$/, "")}`);
  }
  if (fragment.type !== "JSXFragment") h.refuse("The clipboard is not JSX elements");
  const elements = fragment.children.filter((child) => !(child.type === "JSXText" && !child.value.trim()));
  if (!elements.length || elements.some((child) => child.type !== "JSXElement")) h.refuse("The clipboard must hold JSX elements and nothing else");
  if (elements.length > 50) h.refuse("Paste 50 layers at most at once");
  let annotated = false;
  visit(fragment, null, null, (inner) => { if (inner.type === "JSXAttribute" && jsxName(inner.name) === "data-zen-src") annotated = true; });
  if (annotated) h.refuse("The code carries data-zen-src; the Studio adds it");
  const node = elements[0];
  const name = jsxName(node.openingElement.name);
  for (const element of elements) landing(h, jsxName(element.openingElement.name), parent, parentName);
  const { entries, at, replaced } = positionIn(ctx, h, parent, parentName, op);
  const needed = [];
  let toast = false;
  let media = false;
  const names = new Set(elements.flatMap((element) => [...freeNames(element, h.patternNames, h.FUNCTION_TYPES)]));
  for (const used of names) {
    if (state.names.has(used) || h.bindingOf(nodePath, used)) continue;
    if (used === "toast") { toast = true; continue; }
    if (used === "platformMedia") { media = true; continue; }
    if (/^[A-Z]/.test(used) && ctx.folders.has(used)) { needed.push(used); continue; }
    if (GLOBALS.has(used)) continue;
    h.refuse(/^[A-Z]/.test(used)
      ? `<${used}> is not a Zen component this file can import; paste it in the code`
      : `The pasted layer uses \`${used}\`, which does not exist inside <${parentName}>; paste it in the code`);
  }
  const { edit, placed, within } = place(ctx, h, parent, entries, at, { part: piece(wrapped, fragment, elements[0].start, elements.at(-1).end), name }, name);
  const edits = [...placed.edits];
  if (replaced) edits.push(...replacing(ctx, h, replaced));
  const hooks = h.hookEdits(ctx, nodePath, { toast, statements: state.statements, react: state.react });
  edits.push(...hooks.edits);
  if (hooks.useToast) needed.push("useToast");
  if (media) edits.push(...h.mediaImportEdits(ctx));
  edits.push(...tidyImports(ctx, h, edits, needed));
  return {
    edits,
    focus: { edit, within, name },
    answer: "inserted",
    snippet: () => ({ reason: `a paste is not copied into the example snippet; update it by hand (<${name}>)` }),
  };
}

/**
 * The plan for op replaceElement { code, state? } on the element it replaces (Figma's Swap instance, Studio builder GĐ4
 * M2): `code`, one JSX element (a palette item's code), takes its place wherever it is written: a child, a prop's value
 * (`leading={<Avatar />}`), a .map row or what a function returns. The element's `key` goes onto the new one. Names the
 * code reads follow pasteCode (Zen components imported, `toast`, `state`); the components the swap leaves unused go.
 * One edit, one undo step. Answer: inserted: { loc } (the new element).
 */
export function replacePlan(ctx, nodePath, op, h) {
  const { element, text } = ctx;
  const raw = op.code;
  if (typeof raw !== "string" || !raw.trim()) h.refuse("replaceElement needs `code`: one JSX element");
  if (raw.length > 65536) h.refuse("The code is too long (64 KB at most)");
  if (/[\u2028\u2029]/.test(raw)) h.refuse("The code holds a line separator (U+2028/U+2029)");
  const state = h.stateFor(ctx, raw.replace(/\r\n|\r/g, "\n").trim(), op.state);
  let node;
  try {
    node = parseExpression(state.src, { plugins: ["jsx", "typescript"] });
  } catch (error) {
    h.refuse(`The code is not one JSX element: ${error.message.replace(/\s*\(\d+:\d+\)$/, "")}`);
  }
  if (node.type !== "JSXElement") h.refuse("The code must be one JSX element");
  const name = jsxName(node.openingElement.name);
  if (node.openingElement.attributes.some((attr) => attr.type === "JSXAttribute" && jsxName(attr.name) === "data-zen-src")) h.refuse("The code carries data-zen-src; the Studio adds it");
  // A parent that clones its only child (a Tooltip's trigger) takes the components cloning.json lists only.
  const holder = nodePath.at(-2);
  if (holder?.type === "JSXElement") {
    const into = cloning.parents[lastSegment(jsxName(holder.openingElement.name))];
    if (into && Array.isArray(into.only) && !into.only.includes(lastSegment(name))) h.refuse(`<${jsxName(holder.openingElement.name)}> holds ${into.only.map((only) => `<${only}>`).join(", ")} only.`);
  }
  const needed = [];
  let toast = false;
  let media = false;
  for (const used of freeNames(node, h.patternNames, h.FUNCTION_TYPES)) {
    if (state.names.has(used) || h.bindingOf(nodePath, used)) continue;
    if (used === "toast") { toast = true; continue; }
    if (used === "platformMedia") { media = true; continue; }
    if (/^[A-Z]/.test(used) && ctx.folders.has(used)) { needed.push(used); continue; }
    if (GLOBALS.has(used)) continue;
    h.refuse(/^[A-Z]/.test(used) ? `<${used}> is not a Zen component this file can import` : `The new layer uses \`${used}\`, which does not exist here`);
  }
  // The element's key stays (a .map row keeps its identity), right after the new tag's name.
  const key = element.openingElement.attributes.find((attr) => attr.type === "JSXAttribute" && jsxName(attr.name) === "key");
  const hasKey = node.openingElement.attributes.some((attr) => attr.type === "JSXAttribute" && jsxName(attr.name) === "key");
  let src = state.src;
  if (key && !hasKey) {
    const at = node.openingElement.name.end - node.start;
    src = `${src.slice(0, at)} ${text.slice(key.start, key.end)}${src.slice(at)}`;
  }
  // Its later lines take the replaced element's indentation.
  const indent = indentAt(text, element.start);
  const body = src.split("\n").map((line, index) => (index === 0 || !line ? line : `${indent}${line}`)).join(ctx.eol);
  const edit = { start: element.start, end: element.end, text: body };
  const edits = [edit];
  const hooks = h.hookEdits(ctx, nodePath, { toast, statements: state.statements, react: state.react });
  edits.push(...hooks.edits);
  if (hooks.useToast) needed.push("useToast");
  if (media) edits.push(...h.mediaImportEdits(ctx));
  edits.push(...tidyImports(ctx, h, edits, needed));
  return {
    edits,
    focus: { edit, within: 0, name },
    answer: "inserted",
    snippet: () => ({ reason: `a swap is not copied into the example snippet; update it by hand (<${name}>)` }),
  };
}

/* ── several layers at once ──────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The plan for op many { action, locs, ops?, opsByLoc? } (a multi-selection, Figma: Delete / ⌘D / a property on several
 * layers): every element at `locs` (one file) is removed, duplicated (each copy right after it) or given the same `ops`
 * (setProp / removeProp) in one edit, one undo step; `move` with `to` ("prev" / "next") steps them among their siblings
 * (manyMovePlan). `opsByLoc` gives an element its own ops instead (Reset all
 * overrides on an instance and its nested instances, GĐ4 M3). An element inside another listed one goes with it. The
 * answer: removed: true, inserted: { loc } (the first copy), moved: { loc, locs } (old loc → new loc) or updated: true.
 */
export function manyPlan(ctx, nodePath, op, h) {
  const { ast, text } = ctx;
  const action = op.action;
  if (!["remove", "duplicate", "setProps", "move"].includes(action)) h.refuse('many needs `action`: "remove", "duplicate", "setProps" or "move"');
  if (!Array.isArray(op.locs) || !op.locs.length || op.locs.length > 200 || op.locs.some((loc) => typeof loc !== "string" || !parseLoc(loc))) h.refuse("many needs `locs`: the \"<line>:<column>\" of each layer (200 at most)");
  const elements = [...new Set(op.locs)].map((loc) => {
    const element = findElement(ast, parseLoc(loc));
    if (!element) h.refuse(`No element starts at ${loc}; select the layers again`, "stale");
    return element;
  });
  // A layer inside another selected one goes (or is copied) with it.
  const outer = elements.filter((element) => !elements.some((other) => other !== element && other.start <= element.start && element.end <= other.end));
  outer.sort((a, b) => a.start - b.start);
  if (action === "setProps") {
    const propOps = (ops) => Array.isArray(ops) && ops.length > 0 && ops.every((inner) => inner?.op === "setProp" || inner?.op === "removeProp");
    const byLoc = op.opsByLoc && typeof op.opsByLoc === "object" ? op.opsByLoc : null;
    if (byLoc ? !op.locs.every((loc) => propOps(byLoc[loc])) : !propOps(op.ops)) h.refuse("setProps takes `ops` (or `opsByLoc`, one list per loc): setProp / removeProp only");
    // Bottom-up, so the places above stay where they are; each element is found by its loc in the original text.
    let next = text;
    for (const element of [...elements].sort((a, b) => b.start - a.start)) {
      const loc = `${element.openingElement.loc.start.line}:${element.openingElement.loc.start.column}`;
      const own = byLoc ? byLoc[op.locs.find((candidate) => findElement(ast, parseLoc(candidate)) === element)] : op.ops;
      const result = applyOps(next, loc, jsxName(element.openingElement.name), own, { snippets: false, file: ctx.file });
      if (result.error) h.refuse(`<${jsxName(element.openingElement.name)}> at ${loc}: ${result.error}`);
      next = result.code;
    }
    return { edits: [{ start: 0, end: text.length, text: next }], focus: null, answer: "updated", snippet: () => ({ reason: "a change on several layers is not copied into the example snippet; update it by hand" }) };
  }
  if (action === "move") return manyMovePlan(ctx, outer, op.to, h);
  const plans = outer.map((element) => {
    const path = pathTo(ast.program, element);
    if (!path) h.refuse("A layer is not in the file's tree", "not-found");
    const local = { ...ctx, element };
    h.guard(local, path, action === "remove" ? "removeElement" : "duplicateElement");
    if (action === "remove") return { edits: h.removal(local, path, path.length - 1, `<${jsxName(element.openingElement.name)}>`).edits, focus: null };
    return h.duplicatePlan(local, path);
  });
  const edits = plans.flatMap((plan) => plan.edits);
  const sorted = [...edits].sort((a, b) => a.start - b.start);
  for (let k = 1; k < sorted.length; k += 1) {
    if (sorted[k].start < sorted[k - 1].end) h.refuse("Two of the layers share code (one is inside a condition or a list of the other); change them one at a time");
  }
  if (action === "remove") return { edits, focus: null, answer: "removed", snippet: () => ({ reason: "removing several layers is not copied into the example snippet; update it by hand" }) };
  return { edits, focus: plans[0].focus, answer: "inserted", snippet: () => ({ reason: "duplicating several layers is not copied into the example snippet; update it by hand" }) };
}

/**
 * Arrow keys on several layers of one parent (Figma's reorder in auto layout): each selected child takes one place
 * earlier (`prev`) or later (`next`), stepping over the unselected sibling next to it; a run of selected children moves
 * as a block, and one already at the edge stays (only when none can move it is refused). Each child's place is rewritten
 * with the child that lands there (a detach marker above a child moves with it). The answer: moved { loc, locs }, `locs`
 * mapping each moved layer's loc before the move to its loc after (a layer inside another selected one is not listed).
 */
function manyMovePlan(ctx, outer, to, h) {
  const { ast, text, eol } = ctx;
  if (to !== "prev" && to !== "next") h.refuse('move needs `to`: "prev" or "next"');
  let parent = null;
  const nodes = outer.map((element) => {
    const path = pathTo(ast.program, element);
    if (!path) h.refuse("A layer is not in the file's tree", "not-found");
    h.guard({ ...ctx, element }, path, "moveElement");
    let i = path.length - 1;
    if (path[i - 1]?.type === "JSXExpressionContainer") i -= 1;
    const holder = path[i - 1];
    const what = `<${jsxName(element.openingElement.name)}>`;
    if (holder?.type !== "JSXElement" && holder?.type !== "JSXFragment") h.refuse(`${what} is not one of an element's children (it sits in ${holder?.type === "JSXAttribute" ? "a prop" : h.WHERE[holder?.type] ?? "code"}); only children move.`);
    if (parent && holder !== parent) h.refuse("The layers sit in different parents; select layers of one parent to move them with the arrow keys");
    parent = holder;
    return path[i];
  });
  const siblings = parent.children.filter((child) => child.type !== "JSXText" && !h.isComment(child));
  const picked = new Set(nodes);
  const order = [...siblings];
  // Figma's step: walking toward the edge, a selected child swaps with the unselected one beside it.
  const step = to === "prev" ? 1 : -1;
  for (let k = to === "prev" ? 1 : order.length - 2; k >= 0 && k < order.length; k += step) {
    const other = k - step;
    if (picked.has(order[k]) && !picked.has(order[other])) [order[k], order[other]] = [order[other], order[k]];
  }
  if (order.every((child, k) => child === siblings[k])) {
    const holder = parent.type === "JSXFragment" ? "its fragment" : `<${jsxName(parent.openingElement.name)}>`;
    h.refuse(`The layers are already the ${to === "prev" ? "first" : "last"} items in ${holder}.`);
  }
  const unitOf = (child) => {
    const marker = h.detachMarker(parent, child);
    const start = marker && /^\s*$/.test(text.slice(marker.end, child.start)) ? marker.start : child.start;
    return { start, end: child.end, part: piece(text, child, start, child.end) };
  };
  const units = siblings.map(unitOf);
  // Every place that changes, and every selected child's place (its loc is read from its edit).
  const edits = [];
  const editOf = new Map();
  siblings.forEach((child, k) => {
    const landing = order[k];
    if (landing === child && !picked.has(landing)) return;
    const from = units[siblings.indexOf(landing)];
    const edit = { start: units[k].start, end: units[k].end, text: h.reindent(from.part, units[k].part.base, eol) };
    edits.push(edit);
    editOf.set(landing, { edit, base: units[k].part.base });
  });
  const focuses = outer.map((element, k) => {
    const node = nodes[k];
    const { edit, base } = editOf.get(node);
    const ownText = h.reindent(piece(text, element), base, eol);
    const from = `${element.openingElement.loc.start.line}:${element.openingElement.loc.start.column}`;
    return { edit, within: edit.text.length - ownText.length - (node.end - element.end), name: jsxName(element.openingElement.name), from };
  });
  return {
    edits,
    focus: focuses[0],
    focuses,
    answer: "moved",
    snippet: () => ({ reason: "moving several layers is not copied into the example snippet; update it by hand" }),
  };
}
