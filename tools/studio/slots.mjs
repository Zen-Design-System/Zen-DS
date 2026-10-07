// Zen Studio slots: structural source ops on an instance's slot content (Figma's slot editing, at source level): insert
// a child into a slot, remove, duplicate or move an element. Pure functions over a file's text (no server; only
// componentModulesFrom reads the disk). jsx-source.mjs applyOps hands these ops to applySlotOp. Spec:
// docs/research/studio-slots-spec-2026-10-03.md "Source ops".
//
//   applySlotOp(code, loc, name, op, opts?)  → { code, changed, inserted? | removed? | moved?, snippet? } | { error, code }
//        op "insertChild" { code, prop?, index?, wrap?, requires?, state? }  on the parent (loc/name = the parent element);
//                                              `inserted` = { loc } of the new element
//        op "removeElement" {}                 `removed` = true
//        op "duplicateElement" {}              `inserted` = { loc } of the copy
//        op "moveElement" { to: "prev"|"next" } `moved` = { loc } of the element at its new place
//        op "moveTo" { parent, before?, after?, copy? }  drag to reorder / reparent / ⌥-copy in the same file
//                                              (arrange.mjs); `moved` = { loc }, or `inserted` = { loc } for a copy;
//                                              `replace` (with copy): paste to replace
//        op "pasteCode" { code, before?, after?, replace? }  on the parent: ⌘V of code from another file (arrange.mjs)
//        op "replaceElement" { code, state? }  on the element: Swap instance, `code` in its place (arrange.mjs)
//        op "many" { action: remove|duplicate|setProps, locs, ops? }  a multi-selection in one file (arrange.mjs)
//        op "clearSlot" { prop? }              on the host: empties the slot (Figma "Delete contents"); `cleared` = true
//        op "resetSlot" { prop? }              on the host: the slot as the saved file has it (Figma "Reset slot"); `reset` = true
//        ops "insertItem" | "removeItem" | "duplicateItem" | "moveItem" | "groupItem" | "ungroupItem" { prop, index?, to?, with?, regroup?, code?, single?, list?, requires? }
//                                              on the host: the objects of a data slot (`trailing={[{ … }]}`, items.mjs);
//                                              `item` = { prop, index } where the item is now; `updated` / `removed` = true
//        opts: { file (repo-relative, required), snippets?, componentModules? (Map or object: name → src/components
//                folder), requiredChildren? (Set of components whose children are required), requiredProps? (Map
//                component → Set of required props), hash? (sha1 of `code`; required for remove, move, clear and
//                reset), base? (the saved disk text of the file, given when it has a draft; resetSlot reads it), eol? }
//   describeSlots(code, file, loc, { base }?) → { selfClosing, attributes, children, childrenModified?, modifiedProps?,
//                                                savedAttributes?, newSinceSave? } | null   (what GET /element adds; the flags need `base`)
//   withSlots(element, slots)                 → the SourceElement with those fields merged in
//   mapLine(before, after, line)              → where a line of `before` sits in `after` (src/platform/studio/code/diff.ts)
//   componentModulesFrom(root)                → in component-modules.mjs (Node only: it reads the disk)
//   requiredFromApi(api)                      → { requiredChildren, requiredProps } from src/platform/api.generated.json
//   SLOT_OPS, isSlotFile(rel)
//
// Rules (spec, user decisions 2026-10-03):
// - Only example pages (src/platform/examples/pages/*.tsx) and templates (src/templates/**) take structural ops (the
//   playgrounds live in other files); docs chrome, a top-level *Playground declaration and any parent holding a
//   <PlaygroundSlot> are refused with a reason. The main component (src/components) is never touched.
// - `index` is a position in SourceElement.children (fragments flattened, whitespace text and comments skipped): the
//   new element goes before that child's node (inside its fragment), omitted = after the last one. A self-closing
//   parent is expanded. A prop slot that is absent, null, undefined or false takes `prop={code}`; one element becomes a
//   fragment with the new one; a fragment takes it as a child; anything else is refused ("Its content comes from …").
//   `wrap: { tag, props }` (gap-less slots) puts the slot's content and the new element in <Stack|Grid|Box …props>.
// - The code is one JSX element: no data-zen-src, no raw U+2028/U+2029, no free names but Zen components (imported
//   per folder in examples, from "@zen/design-system" in templates), JS built-ins (Date, Math…), platformMedia (example
//   pages: imported from ../../PlatformMedia) and `toast` (then the nearest enclosing component
//   gets `const { toast } = useToast();` unless a toast binding is in scope) and the names of `state: [{ name, initial,
//   type? }]` (2026-10-04, stateful items: the component gets `const [name, setName] = useState(initial);` under fresh
//   names, `open2` when `open` or `setOpen` is spelled in the file, and `useState` joins the react import). Insert and
//   pasteCode take it. Line endings follow the file; lines are
//   re-indented to where they land (two-space steps become tabs in a tab-indented file).
// - Remove by the element's place: a JSX child goes with its line(s); an attribute value takes its attribute; the right
//   side of && takes the whole condition; a ternary branch becomes null (the whole condition when nothing is left); an
//   array item goes with its comma. A function's root, a .map row, a variable or object value, PlaygroundSlot and the
//   only child of a component that requires children are refused. Component imports left unused are dropped.
// - Clear (user, 2026-10-03): every child goes (elements, expressions, text and comments: a comment inside the host
//   annotates its content, and a zen-allow comment only excuses what follows it) and `<X …>…</X>` becomes `<X … />`
//   (a multi-line opening tag keeps its layout, `/>` goes where the file's other multi-line self-closing tags put it);
//   a prop slot loses its attribute. Refused: an empty slot, required children or a required prop.
// - Reset (user, 2026-10-03): the host is found in `base` by mapping its line through the draft ↔ disk line diff (an
//   unchanged line maps; a moved or edited one takes the same-named element on a line the diff left unmatched, in the
//   gap it left or with the same opening tag); its children (from the end of its attributes to its closing tag) or
//   its prop come back from there, re-indented. Imports the restored content needs come back; unused ones go,
//   except the saved file's own.
// - Example snippets (`code:` template literals) follow on exactly-once anchors (the element's own code, the previous
//   sibling, the parent's opening tag; the host's whole copy for clear and reset); otherwise
//   `snippet: { synced: false, reason }`.
import { posix } from "./posix.mjs";
import { parseExpression } from "@babel/parser";
import { CHROME_MARK, EditError, applyEdits, changedRange, chromeFunctions, collapseJsxText, describeAttr, describeAttrsIn, findElement, formatAttr, insideAny, isAnnotatedFile, jsxName, parseLoc, parseSource, sha1, snippetLiterals, staticString, walk } from "./jsx-source.mjs";
import { isPlaygroundFile } from "./shared-code.mjs";
import { UNIT, pathTo, piece } from "./source-helpers.mjs";
import { manyPlan, moveToPlan, pasteCodePlan, replacePlan } from "./arrange.mjs";
import { ITEM_OPS, itemPlan } from "./items.mjs";

const BOM = "\uFEFF";
const PACKAGE = "@zen/design-system";
const BUILDER_PACKAGE = "@zen/design-system/builder";
/** What a builder page's code may use from its runtime besides Zen components (Board is the page's root). */
const BUILDER_RUNTIME = ["Screen", "Overlay", "proto"];
const PLUGINS = ["jsx", "typescript"];
const LINE_SEPARATOR = /[\u2028\u2029]/;
const FUNCTION_TYPES = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression", "ObjectMethod", "ClassMethod", "ClassPrivateMethod"]);
const TS_WRAPPERS = new Set(["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression", "TSTypeAssertion", "ParenthesizedExpression"]);
/** Layout primitives a slot's content can be wrapped in (src/components/Layout). */
const WRAP_TAGS = ["Stack", "Grid", "Box"];
/** Built-in values inserted code may read (`new Date(2026, 9, 14)`, `Math.round`): never the page's own names. */
const JS_GLOBALS = new Set(["Date", "Math", "Number", "String", "Boolean", "Array", "Object", "JSON", "Intl"]);
/** Props that are never content slots. */
const NOT_SLOTS = new Set(["key", "ref", "className", "style", "dangerouslySetInnerHTML"]);
/** Docs chrome rendered from other files (chromeFunctions finds the ones a file declares itself). */
const CHROME_NAMES = ["ExamplePage", "ComponentPreview", "PlaygroundControls", "PlaygroundFilterChip", "PlaygroundSlot", "PlaygroundToggle", "ExampleCard", "PlatformCode"];
/** What a removal or a move cannot touch: where a node sits, in a reason. */
const WHERE = { ConditionalExpression: "a condition (? :)", LogicalExpression: "a condition (&& / ||)", IfStatement: "an if", CallExpression: "a function call", ArrayExpression: "an array", VariableDeclarator: "a variable", ObjectProperty: "an object", SwitchCase: "a switch", AssignmentExpression: "an assignment", SequenceExpression: "a sequence", TemplateLiteral: "a template literal" };
/** Names a component can take from src/components when the caller passes no componentModules (the common ones). */
const FALLBACK_FOLDERS = {
  Accordion: "Accordion", Avatar: "Avatar", AvatarStack: "Avatar", Badge: "Badge", Button: "Button", IconButton: "Button", Card: "Card",
  Checkbox: "Checkbox", DescriptionList: "DescriptionList", Divider: "Divider", DockIcon: "DockIcon", EmptyState: "EmptyState",
  FormFieldset: "Form", Icon: "Icon", Image: "Image", InlineMessage: "InlineMessage", InputField: "Input", NumberField: "Input",
  SelectField: "Input", TextAreaField: "Input", Box: "Layout", Container: "Layout", Grid: "Layout", Stack: "Layout", Link: "Link",
  List: "ListItem", ListItem: "ListItem", Metric: "MetricWidget", MetricCard: "MetricWidget", ProgressBar: "Progress",
  RadioButton: "RadioButton", Tag: "Tag", Heading: "Text", Text: "Text", Toggle: "Toggle", useToast: "Toast",
};

export const SLOT_OPS = new Set(["insertChild", "removeElement", "duplicateElement", "moveElement", "moveTo", "pasteCode", "replaceElement", "many", "clearSlot", "resetSlot", ...ITEM_OPS]);
/** Ops sent on the slot's host (the parent), not on an element inside the slot. */
const HOST_OPS = new Set(["insertChild", "pasteCode", "clearSlot", "resetSlot", ...ITEM_OPS]);

/** Files whose slot content the Studio may restructure: example pages and templates (case-exact). */
export function isSlotFile(rel) {
  return typeof rel === "string" && !rel.includes("?") && (/^src\/platform\/examples\/pages\/[^/]+\.tsx$/.test(rel) || /^src\/templates\/.+\.tsx$/.test(rel) || LOCAL_PAGE.test(rel));
}

/** A builder page kept in the browser (Studio builder GĐ2): "local:<id>.zen.tsx". */
export const LOCAL_PAGE = /^local:[a-z0-9][a-z0-9-]*\.zen\.tsx$/;

/**
 * Shared code (plan WP-B2): an annotated file that examples use but that is neither an example page, a template nor a
 * playground file (PlatformDemoActions.tsx, chatDemo.tsx…). Restructured only once the person confirmed (request
 * `shared: true`): the change reaches every place that uses it, like Figma's "Edit main component".
 */
export function isSharedFile(rel) {
  return isAnnotatedFile(rel) && !isSlotFile(rel) && !isPlaygroundFile(rel);
}

/** The refusal that asks the client to confirm a structural edit in shared code (code "confirm"; the server adds who uses it). */
export const sharedRefusal = (file) => fail("confirm", `${file} is shared code: this change applies everywhere it is used.`);

/* ── small helpers ────────────────────────────────────────────────────────────────────────────────────────────────── */

const fail = (code, error) => ({ error, code });
const attrName = (attr) => (attr.type === "JSXAttribute" ? jsxName(attr.name) : "");
const lineStartOf = (text, index) => text.lastIndexOf("\n", index - 1) + 1;
const indentAt = (text, index) => /^[ \t]*/.exec(text.slice(lineStartOf(text, index)))[0];
const startsLine = (text, index) => /^[ \t]*$/.test(text.slice(lineStartOf(text, index), index));
/** Only spaces between `index` and the end of its line (and the line does end). */
const endsLine = (text, index) => /^[ \t]*\r?\n/.test(text.slice(index));
/** Source quoted in a reason: one line, at most 48 characters. */
const short = (source) => { const flat = source.replace(/\s+/g, " ").trim(); return flat.length > 48 ? `${flat.slice(0, 47)}…` : flat; };
const isFunction = (node) => node && (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression" || node.type === "FunctionDeclaration");
const isMapCall = (node) => (node?.type === "CallExpression" || node?.type === "OptionalCallExpression") && (node.callee?.type === "MemberExpression" || node.callee?.type === "OptionalMemberExpression") && !node.callee.computed && node.callee.property.type === "Identifier" && node.callee.property.name === "map";

/** A refusal shown to the user (EditError code "invalid" unless said otherwise). */
function refuse(reason, code = "invalid") {
  const error = new EditError(code, reason);
  error.refusal = true;
  throw error;
}

const unwrapTs = (node) => {
  let value = node;
  while (value && TS_WRAPPERS.has(value.type)) value = value.expression;
  return value;
};
const isNullish = (node) => {
  const value = unwrapTs(node);
  return !value || value.type === "NullLiteral" || (value.type === "Identifier" && value.name === "undefined") || (value.type === "BooleanLiteral" && !value.value);
};

/** Line and column (Babel's: 1-based, 0-based) of an offset of `text`. */
function locAt(text, offset) {
  const head = text.slice(0, offset);
  const breaks = head.match(/\r\n|[\n\r\u2028\u2029]/g) ?? [];
  const lastBreak = Math.max(head.lastIndexOf("\n"), head.lastIndexOf("\r"), head.lastIndexOf("\u2028"), head.lastIndexOf("\u2029"));
  return { line: breaks.length + 1, column: offset - (lastBreak + 1) };
}
const locString = (loc) => `${loc.line}:${loc.column}`;

/** The file's indentation step: a tab when most indented lines start with one, else two spaces. */
function indentUnit(text) {
  let tabs = 0;
  let spaces = 0;
  for (const match of text.matchAll(/^(\t|  )(?=[ \t]*\S)/gm)) if (match[1] === "\t") tabs += 1; else spaces += 1;
  return tabs > spaces ? "\t" : UNIT;
}

/** A piece's text with its continuation lines moved from its own indentation to `to` (protected lines untouched). */
function reindent(part, to, eol, unit = UNIT) {
  const lines = part.src.split(/\r\n|\n|\r/);
  if (lines.length === 1) return part.src;
  return lines.map((line, i) => {
    if (i === 0 || part.protect.has(i)) return line;
    if (!line.trim()) return "";
    let k = 0;
    while (k < part.base.length && k < line.length && (line[k] === " " || line[k] === "\t")) k += 1;
    let rest = line.slice(k);
    if (unit !== UNIT) {
      // Nested levels of code written with two-space steps, in a tab-indented file.
      const lead = /^[ \t]*/.exec(rest)[0];
      rest = lead.replace(/ {2}/g, unit) + rest.slice(lead.length);
    }
    return to + rest;
  }).join(eol);
}

/** The range of a value, with the parentheses around it (`(\n <X />\n)`) when it has them. */
function valueRange(text, node) {
  const parenStart = node.extra?.parenthesized ? node.extra.parenStart : undefined;
  if (typeof parenStart === "number") {
    const close = /^\s*\)/.exec(text.slice(node.end));
    if (close) return { start: parenStart, end: node.end + close[0].length };
  }
  return { start: node.start, end: node.end };
}

/**
 * The edit that deletes text[start, end) tidily: whole lines when nothing else is on them (within floor..ceiling, a
 * template literal's text), with one of the blank lines around them when both are blank (no double blank line left);
 * the spaces after it when it starts its line; else the spaces before it when a space or the line end follows
 * (`a <b/> c` → `a c`).
 */
function removeRange(text, start, end, { floor = 0, ceiling = text.length } = {}) {
  const lineStart = Math.max(lineStartOf(text, start), floor);
  const newline = text.indexOf("\n", end);
  const lineEnd = newline < 0 || newline >= ceiling ? -1 : newline;
  const lead = text.slice(lineStart, start);
  const rest = lineEnd < 0 ? text.slice(end, ceiling) : text.slice(end, lineEnd);
  const alone = /^[ \t]*$/.test(lead);
  if (alone && lineEnd >= 0 && /^[ \t]*\r?$/.test(rest)) {
    const previousStart = lineStart >= 2 ? text.lastIndexOf("\n", lineStart - 2) + 1 : 0;
    const blankBefore = lineStart > floor && /^[ \t]*\r?\n$/.test(text.slice(Math.max(previousStart, floor), lineStart));
    const nextNewline = text.indexOf("\n", lineEnd + 1);
    const blankAfter = nextNewline >= 0 && nextNewline < ceiling && /^[ \t]*\r?$/.test(text.slice(lineEnd + 1, nextNewline));
    return { start: lineStart, end: (blankBefore && blankAfter ? nextNewline : lineEnd) + 1, text: "" };
  }
  if (alone) return { start, end: end + /^[ \t]*/.exec(rest)[0].length, text: "" };
  if (/[ \t]$/.test(lead) && (/^[ \t]/.test(rest) || /^[ \t]*\r?$/.test(rest) || rest.startsWith("</"))) return { start: start - /[ \t]*$/.exec(lead)[0].length, end, text: "" };
  // Right after a tag (`<p><b/> world`): the spaces after it go, so the text does not start with one.
  if (/[>}]$/.test(lead) && /^[ \t]+\S/.test(rest)) return { start, end: end + /^[ \t]*/.exec(rest)[0].length, text: "" };
  return { start, end, text: "" };
}

/** The edit that removes one attribute (jsx-source removeAttrEdit: its line, its spaces, or the joined line break). */
function removeAttrEdit(attr, text, lineCommentEnds) {
  const lineStart = lineStartOf(text, attr.start);
  const newline = text.indexOf("\n", attr.end);
  const lineEnd = newline < 0 ? text.length : newline;
  const rest = text.slice(attr.end, lineEnd);
  const ownLine = /^[ \t]*$/.test(text.slice(lineStart, attr.start));
  if (ownLine && lineStart > 0 && /^[ \t]*\r?$/.test(rest)) return { start: lineStart, end: newline < 0 ? text.length : newline + 1, text: "" };
  let start = attr.start;
  if (!ownLine) {
    while (start > lineStart && /[ \t]/.test(text[start - 1])) start -= 1;
    return { start, end: attr.end, text: "" };
  }
  const follow = /^[ \t]+(?=[^\s])/.exec(rest);
  let joined = attr.start;
  while (joined > 0 && /\s/.test(text[joined - 1])) joined -= 1;
  const comment = lineCommentEnds.has(joined);
  // ` />` after it ends the tag: the line break before it goes (as jsx-source), not a `/>` left alone on the line.
  if (follow && (comment || !/^\/?>/.test(rest.slice(follow[0].length)))) return { start: attr.start, end: attr.end + follow[0].length, text: "" };
  return { start: comment ? attr.start : joined, end: attr.end, text: "" };
}

/** Where `focus` (one of `edits`) starts in applyEdits' output, plus `within` (applyEdits' order: start, length, list order). */
function outputOffset(edits, focus, within) {
  const order = (edit) => edits.indexOf(edit);
  const before = (a, b) => a.start - b.start || (a.end - a.start) - (b.end - b.start) || order(a) - order(b);
  let shift = 0;
  for (const edit of edits) if (edit !== focus && before(edit, focus) < 0) shift += edit.text.length - (edit.end - edit.start);
  return focus.start + shift + within;
}

/* ── children as the Studio lists them ────────────────────────────────────────────────────────────────────────────── */

/** jsx-source listChildren: fragments flattened, whitespace text and {/* comments *\/} skipped; `node` = the source node. */
function slotEntries(container, text) {
  const out = [];
  let textIndex = 0;
  const visit = (children) => {
    for (const child of children) {
      if (child.type === "JSXText") {
        const value = collapseJsxText(child.value);
        if (value) out.push({ child: { kind: "text", index: textIndex++, value }, node: child });
      } else if (child.type === "JSXElement") {
        const start = child.openingElement.loc.start;
        out.push({ child: { kind: "element", name: jsxName(child.openingElement.name), loc: `${start.line}:${start.column}` }, node: child });
      } else if (child.type === "JSXFragment") {
        visit(child.children);
      } else if (child.type === "JSXExpressionContainer" && child.expression.type === "JSXEmptyExpression") {
        continue;
      } else {
        const literal = child.type === "JSXExpressionContainer" ? staticString(child.expression) : null;
        if (literal !== null && literal.trim()) out.push({ child: { kind: "text", index: textIndex++, value: literal, expression: true }, node: child });
        else out.push({ child: { kind: "expression", raw: text.slice(child.start, child.end) }, node: child });
      }
    }
  };
  visit(container.children);
  return out;
}

/** The parent node (element or fragment) whose `children` array holds `node`, searched under `container`. */
function holderOf(container, node) {
  if (container.children.includes(node)) return container;
  for (const child of container.children) {
    if (child.type === "JSXFragment" && child.start <= node.start && node.end <= child.end) return holderOf(child, node);
  }
  return container;
}

/** Children that are more than layout whitespace (comments included). */
const significant = (container) => container.children.filter((child) => !(child.type === "JSXText" && !child.value.trim()));
const isComment = (node) => node.type === "JSXExpressionContainer" && node.expression.type === "JSXEmptyExpression";
/**
 * First and last visible character of a child (a text child without its surrounding whitespace). Measured on the raw
 * source: Babel's JSXText value turns each CRLF into one LF, so its lengths are short by one per line break.
 */
const visibleStart = (text, node) => (node.type === "JSXText" ? node.start + /^\s*/.exec(text.slice(node.start, node.end))[0].length : node.start);
const visibleEnd = (text, node) => (node.type === "JSXText" ? node.end - /\s*$/.exec(text.slice(node.start, node.end))[0].length : node.end);
const openEnd = (container) => (container.type === "JSXFragment" ? container.openingFragment.end : container.openingElement.end);
const closeStart = (container) => (container.type === "JSXFragment" ? container.closingFragment.start : container.closingElement.start);

/** The `{/* zen-detached: … *\/}` marker right before a child (detach writes it), if any. */
function detachMarker(holder, node) {
  const kids = significant(holder);
  const previous = kids[kids.indexOf(node) - 1];
  if (!previous || !isComment(previous)) return null;
  const comments = previous.expression.innerComments ?? [];
  return comments.some((comment) => comment.value.includes("zen-detached:")) ? previous : null;
}

/* ── the inserted code ────────────────────────────────────────────────────────────────────────────────────────────── */

/** Names a pattern declares. */
export function patternNames(node, out) {
  if (!node) return;
  if (node.type === "Identifier") out.add(node.name);
  else if (node.type === "ObjectPattern") node.properties.forEach((property) => patternNames(property.type === "RestElement" ? property.argument : property.value, out));
  else if (node.type === "ArrayPattern") node.elements.forEach((element) => patternNames(element, out));
  else if (node.type === "AssignmentPattern") patternNames(node.left, out);
  else if (node.type === "RestElement") patternNames(node.argument, out);
}

/**
 * Validates the client's `code`: one JSX element and nothing else, no data-zen-src, no raw line separators, no free
 * names but Zen components (`folders`), `toast`, `platformMedia` (example pages; mediaImportEdits) and the `allowed`
 * ones (the insert's own state, stateFor). Returns the element, its piece (lines inside strings protected),
 * the components it needs imported and whether it uses `toast`.
 */
function prepareCode(raw, folders, allowed = new Set()) {
  if (typeof raw !== "string" || !raw.trim()) refuse("insertChild needs `code`: one JSX element");
  if (raw.length > 65536) refuse("The code is too long (64 KB at most)");
  if (LINE_SEPARATOR.test(raw)) refuse("The code holds a line separator (U+2028/U+2029); write it as \\u2028");
  const src = raw.replace(/\r\n|\r/g, "\n").replace(/^(?:[ \t]*\n)+/, "").replace(/\s+$/, "");
  let node;
  try {
    node = parseExpression(src, { plugins: PLUGINS });
  } catch (error) {
    refuse(`The code is not one JSX element: ${error.message.replace(/\s*\(\d+:\d+\)$/, "")}`);
  }
  if (node.type === "JSXFragment") refuse("The code is a fragment (<>…</>); insert one element (a Stack holds several)");
  if (node.type !== "JSXElement") refuse("The code is not one JSX element");
  if (src.slice(0, node.start).trim() || src.slice(node.end).trim()) refuse("The code must be one JSX element and nothing else");
  const declared = new Set();
  const skip = new WeakSet();
  const tags = new Set();
  const values = new Set();
  walk(node, (inner) => {
    if (FUNCTION_TYPES.has(inner.type)) inner.params.forEach((param) => patternNames(param, declared));
    if (inner.type === "VariableDeclarator") patternNames(inner.id, declared);
    if (inner.type === "CatchClause") patternNames(inner.param, declared);
    if ((inner.type === "MemberExpression" || inner.type === "OptionalMemberExpression") && !inner.computed) skip.add(inner.property);
    if ((inner.type === "ObjectProperty" || inner.type === "ObjectMethod") && !inner.computed && !inner.shorthand) skip.add(inner.key);
    if (inner.type === "JSXAttribute" && attrName(inner) === "data-zen-src") refuse("The code carries data-zen-src; the Studio adds it");
    if (inner.type === "JSXOpeningElement") {
      // Tag names are JSXIdentifiers (attribute names too): only a capitalised or member tag's root is a reference.
      let root = inner.name;
      while (root.type === "JSXMemberExpression") root = root.object;
      if (root.type === "JSXIdentifier" && (/^[A-Z]/.test(root.name) || inner.name.type === "JSXMemberExpression")) tags.add(root.name);
    }
    if (inner.type === "Identifier" && !skip.has(inner)) values.add(inner.name);
    return true;
  });
  const needed = new Set();
  let toast = false;
  let media = false;
  for (const name of [...tags, ...values]) {
    if (declared.has(name) || allowed.has(name)) continue;
    if (name === "toast") { toast = true; continue; }
    if (name === "platformMedia") { media = true; continue; }
    if (name === "undefined" || name === "NaN" || name === "Infinity" || JS_GLOBALS.has(name)) continue;
    if (CHROME_NAMES.includes(name)) refuse(`<${name}> is docs chrome; it cannot be inserted`);
    if (/^[A-Z]/.test(name) && folders.has(name)) { needed.add(name); continue; }
    refuse(/^[A-Z]/.test(name)
      ? `<${name}> is not a Zen component (no src/components folder exports it); inserted code can use Zen components only`
      : `The code uses \`${name}\`, which a slot cannot provide (only Zen components and toast); write the value in the code`);
  }
  return { node, src, part: piece(src, node), name: jsxName(node.openingElement.name), needed, toast, media };
}

/* ── imports (detach.mjs importEdits with a full name → folder map) ───────────────────────────────────────────────── */

const importedName = (specifier) => (specifier.imported?.type === "StringLiteral" ? specifier.imported.value : specifier.imported?.name);
export const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function relModule(file, folder) {
  let specifier = posix.relative(posix.dirname(file), `src/components/${folder}`);
  if (!specifier.startsWith(".")) specifier = `./${specifier}`;
  return specifier;
}

/** Every name the file declares outside its imports (functions, classes, variables, parameters, catch clauses…). */
function declaredNames(ast) {
  const names = new Set();
  walk(ast.program, (node) => {
    if (node.type === "ImportDeclaration") return false;
    if ((node.type === "FunctionDeclaration" || node.type === "ClassDeclaration" || node.type === "FunctionExpression" || node.type === "ClassExpression") && node.id) names.add(node.id.name);
    if (FUNCTION_TYPES.has(node.type)) node.params.forEach((param) => patternNames(param.type === "TSParameterProperty" ? param.parameter : param, names));
    if (node.type === "VariableDeclarator") patternNames(node.id, names);
    if (node.type === "CatchClause") patternNames(node.param, names);
    if ((node.type === "TSEnumDeclaration" || node.type === "TSModuleDeclaration") && node.id?.type === "Identifier") names.add(node.id.name);
    return true;
  });
  return names;
}

/** References to `name` outside import declarations (JSX tags, identifiers; not property names or keys). */
function referenceCount(ast, name) {
  let count = 0;
  const skip = new WeakSet();
  walk(ast.program, (node) => {
    if (node.type === "ImportDeclaration") return false;
    if ((node.type === "MemberExpression" || node.type === "OptionalMemberExpression") && !node.computed) skip.add(node.property);
    if ((node.type === "ObjectProperty" || node.type === "ClassProperty" || node.type === "ObjectMethod" || node.type === "ClassMethod") && !node.computed && !node.shorthand) skip.add(node.key);
    if (node.type === "JSXAttribute") skip.add(node.name);
    if (node.type === "JSXMemberExpression") skip.add(node.property);
    if ((node.type === "Identifier" || node.type === "JSXIdentifier") && node.name === name && !skip.has(node)) count += 1;
    return true;
  });
  return count;
}

/**
 * detach.mjs importEdits (same rules: templates and files already importing it use "@zen/design-system", else the
 * folder's relative module; names merge in code-point order, a new line sorts among the folder imports; a name the file
 * binds elsewhere is refused) with `folders` (name → src/components folder) instead of its fixed 22-name map.
 */
function importChanges(ast, text, eol, file, needed, remove, folders) {
  const body = ast.program.body;
  const imports = body.filter((statement) => statement.type === "ImportDeclaration");
  const valueImports = imports.filter((statement) => statement.importKind !== "type");
  const packageStyle = valueImports.some((statement) => statement.source.value === PACKAGE) || (/^src\/templates\//.test(file ?? "") && !valueImports.some((statement) => /(^|\/)components\//.test(statement.source.value)));
  const moduleFor = (name) => (packageStyle ? PACKAGE : relModule(file, folders.get(name)));
  const sourceFits = (source, name) => source === PACKAGE || new RegExp(`(^|/)components/${folders.get(name)}(/index(\\.tsx?)?)?$`).test(source);
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
      refuse(`The file's own ${name} (imported from "${statement.source.value}"${typeOnly ? " as a type" : ""}) is not Zen's ${name}; rename it before inserting.`);
    }
    if (declared.has(name)) refuse(`The file declares its own ${name}; rename it before inserting.`);
    const module = moduleFor(name);
    if (!adds.has(module)) adds.set(module, []);
    adds.get(module).push(name);
  }
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
    if (edit.start <= statement.start && edit.end >= statement.end) gone.add(statement);
    return true;
  };
  const addedTo = new Set();
  const noNamespace = (statement) => !statement.specifiers.some((specifier) => specifier.type === "ImportNamespaceSpecifier");
  for (const [module, names] of adds) {
    const target = valueImports.find((statement) => statement.source.value === module && noNamespace(statement))
      ?? (module !== PACKAGE ? valueImports.find((statement) => statement.source.value !== PACKAGE && noNamespace(statement) && names.every((name) => sourceFits(statement.source.value, name))) : undefined);
    if (target && !handled.has(target) && touch(target, names)) addedTo.add(module);
  }
  for (const statement of drops.keys()) if (!handled.has(statement)) touch(statement, []);
  const fresh = [...adds].filter(([module]) => !addedTo.has(module)).sort(([a], [b]) => byCodePoint(a, b));
  const anchors = imports.filter((statement) => !gone.has(statement));
  for (const [module, names] of fresh) edits.push(newImport(anchors, text, eol, module, names));
  return edits.map((edit) => ({ ...edit, isImport: true }));
}

/** A builder page's runtime import (@zen/design-system/builder) gains `names` it does not import yet. */
function builderImportEdits(ast, text, eol, names) {
  const imports = ast.program.body.filter((statement) => statement.type === "ImportDeclaration");
  const statement = imports.find((candidate) => candidate.source.value === BUILDER_PACKAGE && candidate.importKind !== "type");
  const missing = names.filter((name) => !statement?.specifiers.some((specifier) => specifier.local.name === name));
  if (!missing.length) return [];
  const edit = statement ? rebuildImport(statement, text, eol, missing, new Set()) : newImport(imports, text, eol, BUILDER_PACKAGE, missing);
  return edit ? [{ ...edit, isImport: true }] : [];
}

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
    // Alone on its line (a trailing `// comment` about it goes with it): the whole line.
    const lineStart = lineStartOf(text, statement.start);
    const newline = text.indexOf("\n", statement.end);
    if (/^[ \t]*$/.test(text.slice(lineStart, statement.start)) && newline >= 0 && /^[ \t]*(?:\/\/.*)?\r?$/.test(text.slice(statement.end, newline))) return { start: lineStart, end: newline + 1, text: "" };
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

/** Named value imports from Zen component modules: local name → specifier. */
function componentImports(ast) {
  const out = new Map();
  for (const statement of ast.program.body) {
    if (statement.type !== "ImportDeclaration" || statement.importKind === "type") continue;
    if (statement.source.value !== PACKAGE && !/(^|\/)components\//.test(statement.source.value)) continue;
    for (const specifier of statement.specifiers) if (specifier.type === "ImportSpecifier" && specifier.importKind !== "type") out.set(specifier.local.name, specifier);
  }
  return out;
}

/* ── guards ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The top-level *Playground declaration that holds `node`, or null. The platform's `if (page === …)` playground
 * branches live in PlatformExamples.tsx / PlatformMobilePlaygrounds.tsx, which isSlotFile already refuses; an
 * example's or a template's own `if (step === "cart")` screens are instance content and stay editable.
 */
function playgroundOf(ast, node) {
  for (const statement of ast.program.body) {
    if (statement.start > node.start || statement.end < node.end) continue;
    const declaration = statement.type === "ExportNamedDeclaration" || statement.type === "ExportDefaultDeclaration" ? statement.declaration ?? statement : statement;
    let name = null;
    if (declaration.type === "FunctionDeclaration") name = declaration.id?.name ?? null;
    if (declaration.type === "VariableDeclaration") {
      const declarator = declaration.declarations.find((item) => item.start <= node.start && node.end <= item.end);
      name = declarator?.id?.type === "Identifier" ? declarator.id.name : null;
    }
    return name && /Playground$/.test(name) ? `<${name}>` : null;
  }
  return null;
}

/** Names of the functions this file marks as docs chrome, plus the chrome other files render. */
function chromeNames(ast, text) {
  const names = new Set(CHROME_NAMES);
  if (!text.includes(CHROME_MARK)) return names;
  for (const statement of ast.program.body) {
    const marked = [statement, statement.declaration].some((node) => node?.leadingComments?.some((comment) => comment.value.includes(CHROME_MARK)));
    if (!marked) continue;
    const declaration = statement.declaration ?? statement;
    if (declaration.type === "FunctionDeclaration" && declaration.id) names.add(declaration.id.name);
    if (declaration.type === "VariableDeclaration") declaration.declarations.forEach((item) => { if (item.id.type === "Identifier") names.add(item.id.name); });
  }
  return names;
}

const holdsPlaygroundSlot = (node) => {
  let found = false;
  walk(node, (inner) => {
    if (found) return false;
    if (inner.type === "JSXOpeningElement" && jsxName(inner.name) === "PlaygroundSlot") found = true;
    return !found;
  });
  return found;
};

/** The nearest JSX element above nodePath[at] (fragments skipped), or null. */
function jsxOwner(nodePath, at) {
  for (let i = at - 1; i >= 0; i -= 1) {
    const node = nodePath[i];
    if (node.type === "JSXAttribute") return null;
    if (node.type === "JSXElement") return node;
    if (node.type !== "JSXFragment" && node.type !== "JSXExpressionContainer" && !TS_WRAPPERS.has(node.type)) return null;
  }
  return null;
}

function guard(ctx, nodePath, op) {
  const { ast, text, element } = ctx;
  const name = jsxName(element.openingElement.name);
  const playground = playgroundOf(ast, element);
  if (playground) refuse(`It is in ${playground}: a playground's slots stay empty (add content in an example).`, "forbidden");
  const chrome = chromeNames(ast, text);
  if (name === "PlaygroundSlot") refuse("A PlaygroundSlot marks a playground's empty slot; it stays (add content in an example).", "forbidden");
  if (chrome.has(name)) refuse(`<${name}> is docs chrome; the Studio does not change it.`, "forbidden");
  if (HOST_OPS.has(op)) {
    if (holdsPlaygroundSlot(element)) refuse(`<${name}> holds a PlaygroundSlot: it stays empty in the playground (add content in an example).`, "forbidden");
    return;
  }
  const owner = jsxOwner(nodePath, nodePath.length - 1);
  if (holdsPlaygroundSlot(element) || (owner && holdsPlaygroundSlot(owner))) refuse(`<${owner ? jsxName(owner.openingElement.name) : name}> holds a PlaygroundSlot: a playground's slots stay empty.`, "forbidden");
  if (owner && chrome.has(jsxName(owner.openingElement.name))) refuse(`<${jsxName(owner.openingElement.name)}> is docs chrome; the Studio does not change its content.`, "forbidden");
}

/* ── the component that hosts `toast` ─────────────────────────────────────────────────────────────────────────────── */

/** The component name of a function (capitalised: function X, const X = () =>, const X = memo(() => …)), or null. */
function componentName(nodePath, at) {
  const fn = nodePath[at];
  if ((fn.type === "FunctionDeclaration" || fn.type === "FunctionExpression") && fn.id && /^[A-Z]/.test(fn.id.name)) return fn.id.name;
  if (fn.type === "FunctionDeclaration") return null;
  let i = at - 1;
  while (i >= 0 && (TS_WRAPPERS.has(nodePath[i].type) || (nodePath[i].type === "CallExpression" && nodePath[i].arguments.includes(nodePath[i + 1])))) i -= 1;
  const holder = nodePath[i];
  if (holder?.type === "VariableDeclarator" && holder.id.type === "Identifier" && /^[A-Z]/.test(holder.id.name)) return holder.id.name;
  return null;
}

/**
 * The innermost binding named `name` visible at the end of nodePath (block statements, parameters, imports on the way):
 * { what (in a reason), declarator? (a variable's), param? (a parameter's) }, or null.
 */
function bindingOf(nodePath, name) {
  const binds = (pattern) => { const names = new Set(); patternNames(pattern, names); return names.has(name); };
  for (let i = nodePath.length - 1; i >= 0; i -= 1) {
    const node = nodePath[i];
    const param = FUNCTION_TYPES.has(node.type) ? node.params.find(binds) : null;
    if (param) return { what: "a prop or parameter", param };
    const statements = node.type === "Program" || node.type === "BlockStatement" ? node.body : [];
    for (const statement of statements) {
      const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
      const declarator = declaration?.type === "VariableDeclaration" ? declaration.declarations.find((item) => binds(item.id)) : null;
      if (declarator) return { what: "a variable or state", declarator };
      if (declaration?.type === "FunctionDeclaration" && declaration.id?.name === name) return { what: "a function" };
      if (statement.type === "ImportDeclaration" && statement.specifiers.some((specifier) => specifier.local.name === name)) return { what: `an import from "${statement.source.value}"` };
    }
  }
  return null;
}

/** `const { toast } = useToast()` (other names may join it) or `const toast = useToast().toast`: Zen's toast. */
function isToastHook(declarator) {
  const isHookCall = (node) => node?.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "useToast";
  const init = unwrapTs(declarator.init);
  if (declarator.id.type === "ObjectPattern") {
    return isHookCall(init) && declarator.id.properties.some((property) => property.type === "ObjectProperty" && !property.computed && propertyName(property.key) === "toast" && property.value.type === "Identifier" && property.value.name === "toast");
  }
  return declarator.id.type === "Identifier" && (init?.type === "MemberExpression" || init?.type === "OptionalMemberExpression") && !init.computed && propertyName(init.property) === "toast" && isHookCall(unwrapTs(init.object));
}

/**
 * A parameter that hands the component a toast function: `toast` typed in the signature as a function
 * (`{ toast }: { toast: (options: ToastOptions) => void }`, `toast: ToastApi["toast"]`). A string, an untyped or a
 * named props type is not taken on trust.
 */
function isToastParameter(param, name) {
  const pattern = param.type === "AssignmentPattern" ? param.left : param;
  const annotation = pattern.typeAnnotation?.typeAnnotation;
  let type = null;
  if (pattern.type === "Identifier") type = annotation;
  else if (pattern.type === "ObjectPattern" && annotation?.type === "TSTypeLiteral") {
    const bound = (value) => (value?.type === "AssignmentPattern" ? value.left : value);
    const property = pattern.properties.find((item) => item.type === "ObjectProperty" && !item.computed && bound(item.value)?.type === "Identifier" && bound(item.value).name === name);
    const key = property ? propertyName(property.key) : null;
    type = annotation.members.find((member) => member.type === "TSPropertySignature" && !member.computed && key !== null && propertyName(member.key) === key)?.typeAnnotation?.typeAnnotation ?? null;
  }
  while (type?.type === "TSParenthesizedType") type = type.typeAnnotation;
  if (type?.type === "TSFunctionType") return true;
  return type?.type === "TSIndexedAccessType" && type.objectType.type === "TSTypeReference" && type.objectType.typeName.type === "Identifier" && type.objectType.typeName.name === "ToastApi"
    && type.indexType.type === "TSLiteralType" && type.indexType.literal.type === "StringLiteral" && type.indexType.literal.value === "toast";
}

/**
 * `toast` for an inserted action: the useToast() binding in scope (or a parameter typed as a function) is reused; else
 * the nearest enclosing component (capitalised) gets `const { toast } = useToast();` as its first statement. Refused
 * when another `toast` (a prop, state, variable or import) is in scope, in an arrow that returns its JSX directly, and
 * where no component encloses the slot (a lowercase helper, an example's render).
 */
function toastHook(ctx, nodePath) {
  const statement = toastStatement(ctx, nodePath);
  return statement ? componentHook(ctx, nodePath, [statement], { who: "The action", does: "calls toast", need: "`const { toast } = useToast();`" }) : null;
}

/** The useToast() statement an inserted action needs, or null when a toast binding in scope is reused. */
function toastStatement(ctx, nodePath) {
  const own = bindingOf(nodePath, "toast");
  if ((own?.declarator && isToastHook(own.declarator)) || (own?.param && isToastParameter(own.param, "toast"))) return null;
  if (own) refuse(`The action calls toast, but this slot already sees another \`toast\` (${own.what}), not useToast's; rename it before inserting an action.`);
  return `const { toast } = useToast()${ctx.semicolons ? ";" : ""}`;
}

/**
 * Hook `statements` as the first statements of the nearest enclosing component (capitalised function) of nodePath:
 * one edit (a hook belongs to the component, never to a .map callback or a lowercase helper inside it). `who`, `does`
 * and `need` word the refusals ("The action", "calls toast", "`const { toast } = useToast();`").
 */
function componentHook(ctx, nodePath, statements, { who, does, need }) {
  const { text, eol, unit } = ctx;
  for (let i = nodePath.length - 1; i >= 0; i -= 1) {
    if (!FUNCTION_TYPES.has(nodePath[i].type)) continue;
    const name = componentName(nodePath, i);
    if (!name) continue;
    const fn = nodePath[i];
    if (fn.body.type !== "BlockStatement") refuse(`${who} needs ${need} in <${name}>, which returns its JSX directly (no { } body); add the hook in the code first.`);
    const body = fn.body;
    const directives = body.directives ?? [];
    const anchor = directives.at(-1) ?? null;
    const first = body.body.find((item) => !anchor || item.start >= anchor.end) ?? null;
    if (first && startsLine(text, first.start) && first.loc.start.line > (anchor ?? body).loc.start.line) {
      const at = lineStartOf(text, first.start);
      const indent = indentAt(text, first.start);
      return { start: at, end: at, text: statements.map((statement) => `${indent}${statement}${eol}`).join("") };
    }
    const after = anchor ? anchor.end : body.start + 1;
    if (first) return { start: after, end: after, text: statements.map((statement) => ` ${statement}`).join("") };
    return { start: after, end: after, text: statements.map((statement) => `${eol}${indentAt(text, fn.start)}${unit}${statement}`).join("") };
  }
  refuse(`${who} ${does}, but no component encloses this slot to hold ${need}; insert it inside a component (a capitalised function).`);
}

/* ── state for stateful items (useState; user, 2026-10-04: every DS component can be inserted) ───────────────────── */

const STATE_NAME = /^[a-z][A-Za-z0-9]{0,39}$/;
/** React's convention: `open` → `setOpen`. */
const setterOf = (name) => `set${name[0].toUpperCase()}${name.slice(1)}`;
/** Type words a state's `type` may use (`useState<…>`): no names from the file. */
const STATE_TYPE = /^(?:string|number|boolean|null|Date|\[\]|[|\s()]|"[^"\\]*"|-?\d+(?:\.\d+)?)+$/;

/** A literal: strings, numbers, booleans, null, `new Date(…literals)`, arrays and objects of them. */
function isLiteralValue(node) {
  const value = unwrapTs(node);
  if (!value) return false;
  if (["StringLiteral", "NumericLiteral", "BooleanLiteral", "NullLiteral"].includes(value.type)) return true;
  if (value.type === "UnaryExpression" && value.operator === "-" && value.argument.type === "NumericLiteral") return true;
  if (value.type === "TemplateLiteral") return !value.expressions.length;
  if (value.type === "ArrayExpression") return value.elements.every((item) => item && item.type !== "SpreadElement" && isLiteralValue(item));
  if (value.type === "ObjectExpression") return value.properties.every((item) => item.type === "ObjectProperty" && !item.computed && !item.shorthand && (item.key.type === "Identifier" || item.key.type === "StringLiteral") && isLiteralValue(item.value));
  if (value.type === "NewExpression") return value.callee.type === "Identifier" && value.callee.name === "Date" && value.arguments.every((item) => isLiteralValue(item));
  return false;
}

/**
 * op.state checked: [{ name, initial, type? }] (8 at most): `name` lowerCamel, `initial` a literal, `type` built-in
 * type words only. The code reads `name` and `setName`; nothing else of the file.
 */
function stateEntries(state) {
  if (state === undefined || state === null) return [];
  if (!Array.isArray(state) || state.length > 8) refuse("`state` lists the useState values the code reads: [{ name, initial, type? }], 8 at most");
  const seen = new Set();
  return state.map((entry) => {
    if (!entry || typeof entry !== "object" || typeof entry.name !== "string" || !STATE_NAME.test(entry.name)) refuse('Each `state` entry needs a lowerCamel `name` ("open", "selectedTab")');
    if (seen.has(entry.name)) refuse(`The state "${entry.name}" is listed twice`);
    seen.add(entry.name);
    const initial = typeof entry.initial === "string" ? entry.initial.trim() : "";
    let node = null;
    try {
      node = initial ? parseExpression(initial, { plugins: PLUGINS }) : null;
    } catch {
      node = null;
    }
    if (!node || !isLiteralValue(node) || LINE_SEPARATOR.test(initial)) refuse(`The state "${entry.name}" needs \`initial\`: a literal (string, number, boolean, null, a Date, an array or an object of them)`);
    const type = entry.type === undefined || entry.type === null ? null : typeof entry.type === "string" ? entry.type.trim() : "";
    if (type !== null && (!type || !STATE_TYPE.test(type))) refuse(`The state "${entry.name}": \`type\` takes built-in types only (string, number, boolean, null, Date, "literal", [] and |)`);
    return { name: entry.name, initial, type };
  });
}

/** Every identifier the file spells (bindings, references, keys): a new state name avoids all of them. */
function spelledNames(ast) {
  const names = new Set();
  walk(ast.program, (node) => {
    if (node.type === "Identifier" || node.type === "JSXIdentifier") names.add(node.name);
    return true;
  });
  return names;
}

/**
 * The state an inserted item declares: fresh names (`open`, else `open2`, `open3`…: neither the name nor its setter is
 * spelled anywhere in the file), `src` with the code's names renamed to them, the useState statements and the names
 * the code may now read. `src` is the client's code (one JSX element or several); a state name read as an object
 * shorthand (`{ open }`) is refused (it would rename the key).
 */
function stateFor(ctx, src, state) {
  const entries = stateEntries(state);
  if (!entries.length) return { src, statements: [], names: new Set() };
  const taken = spelledNames(ctx.ast);
  const renames = new Map();
  const names = new Set();
  const statements = [];
  for (const entry of entries) {
    let name = entry.name;
    for (let n = 2; taken.has(name) || taken.has(setterOf(name)) || names.has(name) || names.has(setterOf(name)); n += 1) name = `${entry.name}${n}`;
    if (name !== entry.name) { renames.set(entry.name, name); renames.set(setterOf(entry.name), setterOf(name)); }
    names.add(name);
    names.add(setterOf(name));
    statements.push(`const [${name}, ${setterOf(name)}] = useState${entry.type ? `<${entry.type}>` : ""}(${entry.initial})${ctx.semicolons ? ";" : ""}`);
  }
  if (!renames.size) return { src, statements, names };
  let node;
  try {
    node = parseExpression(`<>${src}</>`, { plugins: PLUGINS });
  } catch {
    return { src, statements, names };
  }
  const hits = [];
  const skip = new WeakSet();
  walk(node, (inner) => {
    if ((inner.type === "MemberExpression" || inner.type === "OptionalMemberExpression") && !inner.computed) skip.add(inner.property);
    if (inner.type === "ObjectProperty" && !inner.computed) {
      if (inner.shorthand && renames.has(inner.key.name)) refuse(`The code reads the state "${inner.key.name}" as \`{ ${inner.key.name} }\`; write \`${inner.key.name}: ${inner.key.name}\``);
      skip.add(inner.key);
    }
    if (inner.type === "Identifier" && !skip.has(inner) && renames.has(inner.name)) hits.push(inner);
    return true;
  });
  let out = src;
  for (const hit of hits.sort((a, b) => b.start - a.start)) out = `${out.slice(0, hit.start - 2)}${renames.get(hit.name)}${out.slice(hit.end - 2)}`;
  return { src: out, statements, names };
}

/** The module example pages import platformMedia from (src/platform/PlatformMedia.tsx). */
const MEDIA_MODULE = "../../PlatformMedia";
const isExamplePage = (file) => /^src\/platform\/examples\/pages\/[^/]+\.tsx$/.test(file ?? "");

/**
 * Named value imports of `names` from `module` (useState from "react", platformMedia from PlatformMedia): joins a named
 * import of that module, else a new line, before the first import for "react", among the imports for the others.
 */
function moduleImportEdits(ctx, module, names) {
  const { ast, text, eol } = ctx;
  const imports = ast.program.body.filter((statement) => statement.type === "ImportDeclaration");
  const own = imports.filter((statement) => statement.source.value === module && statement.importKind !== "type");
  const has = (name) => own.some((statement) => statement.specifiers.some((specifier) => specifier.type === "ImportSpecifier" && specifier.importKind !== "type" && specifier.local.name === name && importedName(specifier) === name));
  const missing = names.filter((name) => !has(name));
  if (!missing.length) return [];
  const bound = new Set(imports.flatMap((statement) => statement.specifiers.map((specifier) => specifier.local.name)));
  const declared = declaredNames(ast);
  for (const name of missing) if (bound.has(name) || declared.has(name)) refuse(`The file's own ${name} is not the one from "${module}"; rename it before inserting.`);
  const named = own.find((statement) => statement.specifiers.some((specifier) => specifier.type === "ImportSpecifier"));
  const edit = named ? rebuildImport(named, text, eol, missing, new Set()) : null;
  if (edit) return [{ ...edit, isImport: true }];
  if (module !== "react") return [{ ...newImport(imports, text, eol, module, missing), isImport: true }];
  const first = imports[0];
  const quote = first && text[first.source.start] === "'" ? "'" : '"';
  const line = `import { ${[...missing].sort(byCodePoint).join(", ")} } from ${quote}react${quote}${ctx.semicolons ? ";" : ""}`;
  const at = first ? lineStartOf(text, first.start) : 0;
  return [{ start: at, end: at, text: `${line}${eol}`, isImport: true }];
}

/** The platformMedia import an Image needs (example pages only; templates bring their own pictures). */
function mediaImportEdits(ctx) {
  if (!isExamplePage(ctx.file)) refuse("The code reads platformMedia, which only the example pages import (src/platform/PlatformMedia.tsx); in a template, import your picture and pass its src.");
  return moduleImportEdits(ctx, MEDIA_MODULE, ["platformMedia"]);
}

/**
 * The hook edits an insert needs: `const { toast } = useToast();` (when the code calls toast) and the state's useState
 * lines, in one statement block at the top of the enclosing component, plus the useState import.
 */
function hookEdits(ctx, nodePath, { toast, statements }) {
  const toastLine = toast ? toastStatement(ctx, nodePath) : null;
  const lines = [...(toastLine ? [toastLine] : []), ...statements];
  if (!lines.length) return { edits: [], useToast: false };
  const words = statements.length
    ? { who: "The item", does: toastLine ? "calls toast and keeps state" : "keeps state", need: [toastLine ? "`const { toast } = useToast();`" : null, "its `useState` lines"].filter(Boolean).join(" and ") }
    : { who: "The action", does: "calls toast", need: "`const { toast } = useToast();`" };
  const edits = [componentHook(ctx, nodePath, lines, words)];
  if (statements.length) edits.push(...moduleImportEdits(ctx, "react", ["useState"]));
  return { edits, useToast: Boolean(toastLine) };
}

/** Calls of `toast` inside `fn` (not property names or keys; `skip`, the hook's own pattern, left out). */
function toastUses(fn, skip) {
  let count = 0;
  const keys = new WeakSet();
  walk(fn, (node) => {
    if (node === skip) return false;
    if ((node.type === "MemberExpression" || node.type === "OptionalMemberExpression") && !node.computed) keys.add(node.property);
    if ((node.type === "ObjectProperty" || node.type === "ObjectMethod") && !node.computed && !node.shorthand) keys.add(node.key);
    if (node.type === "Identifier" && node.name === "toast" && !keys.has(node)) count += 1;
    return true;
  });
  return count;
}

/**
 * The removals of `const { toast } = useToast();` hooks (toast its only name) that `edits` leave unused: toast was used
 * in the component before, nowhere after (an inserted action's hook leaves with it). `keep(statement source)`: hooks
 * that stay anyway (a reset keeps the saved file's).
 */
function toastHookRemovals(ctx, edits, keep = () => false) {
  const { text, ast } = ctx;
  const hooks = [];
  walk(ast.program, (node) => {
    if (node.type !== "VariableDeclaration" || node.declarations.length !== 1) return true;
    const [declarator] = node.declarations;
    if (isToastHook(declarator) && (declarator.id.type === "Identifier" || declarator.id.properties.length === 1)) hooks.push(node);
    return true;
  });
  if (!hooks.length) return [];
  const after = parseSource(applyEdits(text, edits));
  if (!after) return [];
  const out = [];
  for (const hook of hooks) {
    if (edits.some((edit) => edit.start < hook.end && edit.end > hook.start) || keep(text.slice(hook.start, hook.end))) continue;
    const fn = (pathTo(ast.program, hook) ?? []).findLast((node) => FUNCTION_TYPES.has(node.type));
    if (!fn || !toastUses(fn, hook.declarations[0].id)) continue;
    // The same statement after the edits: shifted by the edits before it.
    const start = hook.start + edits.reduce((shift, edit) => shift + (edit.end <= hook.start ? edit.text.length - (edit.end - edit.start) : 0), 0);
    let moved = null;
    walk(after.program, (node) => {
      if (moved || node.start > start || node.end < start) return false;
      if (node.type === "VariableDeclaration" && node.start === start) { moved = node; return false; }
      return true;
    });
    const fnAfter = moved ? (pathTo(after.program, moved) ?? []).findLast((node) => FUNCTION_TYPES.has(node.type)) : null;
    if (fnAfter && !toastUses(fnAfter, moved.declarations[0].id)) out.push(removeRange(text, hook.start, hook.end));
  }
  return out;
}

/** How often `names` are read in `fn` outside `skip` (member properties and non-shorthand object keys are not reads). */
function identifierUses(fn, names, skip) {
  let count = 0;
  const keys = new WeakSet();
  walk(fn, (node) => {
    if (node === skip) return false;
    if ((node.type === "MemberExpression" || node.type === "OptionalMemberExpression") && !node.computed) keys.add(node.property);
    if ((node.type === "ObjectProperty" || node.type === "ObjectMethod") && !node.computed && !node.shorthand) keys.add(node.key);
    if (node.type === "Identifier" && names.has(node.name) && !keys.has(node)) count += 1;
    return true;
  });
  return count;
}

/** `const [x, setX] = useState(…)` (or React.useState), one or two plain names. */
function isStateHook(declarator) {
  const init = unwrapTs(declarator.init);
  if (init?.type !== "CallExpression") return false;
  const callee = init.callee;
  const useState = (callee.type === "Identifier" && callee.name === "useState")
    || (callee.type === "MemberExpression" && !callee.computed && callee.object.type === "Identifier" && callee.object.name === "React" && propertyName(callee.property) === "useState");
  const elements = declarator.id.type === "ArrayPattern" ? declarator.id.elements : null;
  return useState && Boolean(elements) && elements.length >= 1 && elements.length <= 2 && elements.every((element) => element === null || element.type === "Identifier");
}

/**
 * The removals of `const [x, setX] = useState(…)` statements that `edits` leave unused: x or setX was read in the
 * component before and neither is after (removing a Dialog and the button that opened it, clearing a slot that held a
 * stateful item; E2E ST-10). A state that was already unused is not this edit's to remove. `keep` as for the toast hook.
 */
function stateHookRemovals(ctx, edits, keep = () => false) {
  const { text, ast } = ctx;
  const hooks = [];
  walk(ast.program, (node) => {
    if (node.type === "VariableDeclaration" && node.declarations.length === 1 && isStateHook(node.declarations[0])) hooks.push(node);
    return true;
  });
  if (!hooks.length) return [];
  const after = parseSource(applyEdits(text, edits));
  if (!after) return [];
  const out = [];
  for (const hook of hooks) {
    if (edits.some((edit) => edit.start < hook.end && edit.end > hook.start) || keep(text.slice(hook.start, hook.end))) continue;
    const names = new Set(hook.declarations[0].id.elements.filter(Boolean).map((element) => element.name));
    const fn = (pathTo(ast.program, hook) ?? []).findLast((node) => FUNCTION_TYPES.has(node.type));
    if (!fn || !identifierUses(fn, names, hook)) continue;
    const start = hook.start + edits.reduce((shift, edit) => shift + (edit.end <= hook.start ? edit.text.length - (edit.end - edit.start) : 0), 0);
    let moved = null;
    walk(after.program, (node) => {
      if (moved || node.start > start || node.end < start) return false;
      if (node.type === "VariableDeclaration" && node.start === start) { moved = node; return false; }
      return true;
    });
    const fnAfter = moved ? (pathTo(after.program, moved) ?? []).findLast((node) => FUNCTION_TYPES.has(node.type)) : null;
    if (fnAfter && !identifierUses(fnAfter, names, moved)) out.push(removeRange(text, hook.start, hook.end));
  }
  return out;
}

/** The edit that takes the named import `name` out of `module`'s import (the whole import when it was the only name). */
function namedImportRemoval(ctx, module, name) {
  const { text, ast } = ctx;
  for (const node of ast.program.body) {
    if (node.type !== "ImportDeclaration" || node.source.value !== module || node.importKind === "type") continue;
    const index = node.specifiers.findIndex((spec) => spec.type === "ImportSpecifier" && propertyName(spec.imported) === name && spec.local.name === name);
    if (index < 0) continue;
    const specs = node.specifiers;
    if (specs.length === 1) return [removeRange(text, node.start, node.end)];
    // `{ a, useState, b }`: from this name to the next one; the last one: from the previous name's end.
    return index < specs.length - 1
      ? [{ start: specs[index].start, end: specs[index + 1].start, text: "" }]
      : [{ start: specs[index - 1].end, end: specs[index].end, text: "" }];
  }
  return [];
}

/* ── insertChild ──────────────────────────────────────────────────────────────────────────────────────────────────── */

/** The new element as an edit: `text` holds it at `within`. */
const placed = (edit, within) => ({ edits: [edit], focus: { edit, within } });

/** Inserting into a container (element or fragment) that has an opening and a closing tag, before entries[at] or last. */
function insertIntoContainer(ctx, container, at, code) {
  const { text, eol, unit } = ctx;
  const entries = slotEntries(container, text);
  if (at < entries.length) {
    const node = entries[at].node;
    const start = visibleStart(text, node);
    if (startsLine(text, start)) {
      const indent = indentAt(text, start);
      const lineStart = lineStartOf(text, start);
      return placed({ start: lineStart, end: lineStart, text: `${indent}${reindent(code.part, indent, eol, unit)}${eol}` }, indent.length);
    }
    return placed({ start, end: start, text: reindent(code.part, indentAt(text, start), eol, unit) }, 0);
  }
  const holder = entries.length ? holderOf(container, entries.at(-1).node) : container;
  const last = entries.length ? entries.at(-1).node : significant(container).at(-1) ?? null;
  if (last) {
    const end = visibleEnd(text, last);
    if (endsLine(text, end)) {
      const lastStart = visibleStart(text, last);
      const close = closeStart(holder);
      const indent = startsLine(text, lastStart) ? indentAt(text, lastStart) : startsLine(text, close) ? `${indentAt(text, close)}${unit}` : indentAt(text, lastStart);
      return placed({ start: end, end, text: `${eol}${indent}${reindent(code.part, indent, eol, unit)}` }, eol.length + indent.length);
    }
    return placed({ start: end, end, text: reindent(code.part, indentAt(text, end), eol, unit) }, 0);
  }
  // Empty: the new element on its own lines when the parent starts its line, else inline.
  const open = openEnd(container);
  const close = closeStart(container);
  if (startsLine(text, container.start)) {
    const base = startsLine(text, close) ? indentAt(text, close) : indentAt(text, container.start);
    const inner = base + unit;
    return placed({ start: open, end: close, text: `${eol}${inner}${reindent(code.part, inner, eol, unit)}${eol}${base}` }, eol.length + inner.length);
  }
  return placed({ start: open, end: close, text: reindent(code.part, indentAt(text, container.start), eol, unit) }, 0);
}

/**
 * A self-closing parent opened (`<Card … />` → `<Card …>` + the new element + `</Card>`): on lines of its own when the
 * parent starts its line (`ownLine`; a snippet's copy says so itself), else inline.
 */
function expandSelfClosing(ctx, element, code, ownLine = startsLine(ctx.text, element.start)) {
  const { text, eol, unit, lineCommentEnds } = ctx;
  const opening = element.openingElement;
  const slash = opening.end - 2;
  if (text.slice(slash, opening.end) !== "/>") refuse("The parent's tag could not be opened (no `/>`)");
  const close = `</${jsxName(opening.name)}>`;
  if (startsLine(text, slash) && lineStartOf(text, slash) > opening.start) {
    // `/>` on its own line: `>` stays there, the content and the closing tag follow on their own lines.
    const base = indentAt(text, slash);
    const inner = base + unit;
    return placed({ start: slash, end: opening.end, text: `>${eol}${inner}${reindent(code.part, inner, eol, unit)}${eol}${base}${close}` }, 1 + eol.length + inner.length);
  }
  let from = slash;
  while (from > opening.start && /\s/.test(text[from - 1])) from -= 1;
  if (lineCommentEnds.has(from)) from = slash;
  if (ownLine) {
    const base = indentAt(text, element.start);
    const inner = base + unit;
    return placed({ start: from, end: opening.end, text: `>${eol}${inner}${reindent(code.part, inner, eol, unit)}${eol}${base}${close}` }, 1 + eol.length + inner.length);
  }
  return placed({ start: from, end: opening.end, text: `>${reindent(code.part, indentAt(text, element.start), eol, unit)}${close}` }, 1);
}

/**
 * The slot's content and the new element inside `<tag …attrs>`: the content's lines move one level deeper (lines inside
 * strings and template literals, and blank lines, keep theirs); on one line when the content was inline.
 */
function wrapContent(ctx, container, at, code, { tag, attrs }) {
  const { text, eol, unit } = ctx;
  const entries = slotEntries(container, text);
  const nodes = significant(container);
  const regionStart = visibleStart(text, nodes[0]);
  const regionEnd = visibleEnd(text, nodes.at(-1));
  const open = `<${tag}${attrs.map((attr) => ` ${attr}`).join("")}>`;
  const close = `</${tag}>`;
  const target = at < entries.length ? entries[at].node : null;
  if (!(startsLine(text, regionStart) && endsLine(text, regionEnd))) {
    // Inline content: the wrapper's tags around it on the same line (an insert at the start goes after the open tag).
    const before = target ? visibleStart(text, target) : regionEnd;
    const focus = { start: before, end: before, text: reindent(code.part, indentAt(text, regionStart), eol, unit) };
    return { edits: [{ start: regionStart, end: regionStart, text: open }, focus, { start: regionEnd, end: regionEnd, text: close }], focus: { edit: focus, within: 0 } };
  }
  const edits = [];
  let focus;
  const base = indentAt(text, regionStart);
  const inner = base + unit;
  edits.push({ start: regionStart, end: regionStart, text: `${open}${eol}${inner}` });
  let within = 0;
  if (target) {
    const before = visibleStart(text, target);
    if (lineStartOf(text, before) === lineStartOf(text, regionStart)) {
      focus = { start: regionStart, end: regionStart, text: `${reindent(code.part, inner, eol, unit)}${eol}${inner}` };
    } else if (startsLine(text, before)) {
      const indent = indentAt(text, before) + unit;
      focus = { start: lineStartOf(text, before), end: lineStartOf(text, before), text: `${indent}${reindent(code.part, indent, eol, unit)}${eol}` };
      within = indent.length;
    } else {
      focus = { start: before, end: before, text: reindent(code.part, indentAt(text, before) + unit, eol, unit) };
    }
    edits.push(focus);
  }
  // One level deeper for every line of the content after its first (lines inside strings and blank lines keep theirs).
  const { protect } = piece(text, container, regionStart, regionEnd);
  const src = text.slice(regionStart, regionEnd);
  const starts = [];
  for (const match of src.matchAll(/\r\n|\n|\r/g)) starts.push(regionStart + match.index + match[0].length);
  starts.forEach((lineAt, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : regionEnd;
    if (protect.has(i + 1) || !text.slice(lineAt, end).trim()) return;
    edits.push({ start: lineAt, end: lineAt, text: unit });
  });
  if (!target) {
    const last = nodes.at(-1);
    const indent = (startsLine(text, visibleStart(text, last)) ? indentAt(text, visibleStart(text, last)) : base) + unit;
    focus = { start: regionEnd, end: regionEnd, text: `${eol}${indent}${reindent(code.part, indent, eol, unit)}` };
    within = eol.length + indent.length;
    edits.push(focus);
  }
  edits.push({ start: regionEnd, end: regionEnd, text: `${eol}${base}${close}` });
  return { edits, focus: { edit: focus, within } };
}

/** One element in a prop slot joined by the new one: a fragment (or the wrapper) around both, in `index` order. */
function joinInProp(ctx, attr, old, index, code, wrap) {
  const { text, eol, unit } = ctx;
  const range = { start: old.start, end: old.end };
  const oldPart = piece(text, old);
  const first = index === 0;
  const open = wrap ? `<${wrap.tag}${wrap.attrs.map((item) => ` ${item}`).join("")}>` : "<>";
  const close = wrap ? `</${wrap.tag}>` : "</>";
  if (!/[\r\n]/.test(oldPart.src) && !/\n/.test(code.part.src)) {
    const pair = first ? [code.part.src, oldPart.src] : [oldPart.src, code.part.src];
    const joined = `${open}${pair[0]}${pair[1]}${close}`;
    return placed({ ...range, text: joined }, open.length + (first ? 0 : oldPart.src.length));
  }
  const base = startsLine(text, old.start) ? indentAt(text, old.start) : indentAt(text, attr.start);
  const inner = base + unit;
  const oldText = reindent(oldPart, inner, eol);
  const newText = reindent(code.part, inner, eol, unit);
  const head = `${open}${eol}${inner}`;
  const joined = first ? `${head}${newText}${eol}${inner}${oldText}${eol}${base}${close}` : `${head}${oldText}${eol}${inner}${newText}${eol}${base}${close}`;
  return placed({ ...range, text: joined }, head.length + (first ? 0 : oldText.length + eol.length + inner.length));
}

const SLOT_PROP = /^[A-Za-z_$][\w$]*$/;

/** The op's slot: null for children (`prop` omitted or "children"), else the prop's name (refused when it is no slot). */
function slotProp(op) {
  const prop = op.prop === undefined || op.prop === null || op.prop === "children" ? null : op.prop;
  if (prop !== null && (typeof prop !== "string" || !SLOT_PROP.test(prop) || NOT_SLOTS.has(prop) || /^on[A-Z]/.test(prop))) refuse(`"${prop}" is not a slot prop`);
  return prop;
}

/** insertChild: the edits that put `code` into the parent's children or `prop` slot (+ imports and the toast hook). */
function insertPlan(ctx, nodePath, op) {
  const { text, element, eol } = ctx;
  const parentName = jsxName(element.openingElement.name);
  const state = stateFor(ctx, typeof op.code === "string" ? op.code : "", op.state);
  // A builder page (Studio builder GĐ2) has no hooks: its actions are proto.*(…) handlers, which the page imports.
  const builderPage = LOCAL_PAGE.test(ctx.file ?? "");
  const code = prepareCode(typeof op.code === "string" ? state.src : op.code, ctx.folders, builderPage ? new Set([...state.names, ...BUILDER_RUNTIME]) : state.names);
  if (builderPage && (code.toast || state.statements?.length)) refuse("A builder page has no hooks: an action is proto.toast(…), proto.navigate(…) or proto.open(…), and a control keeps its own state");
  if (CHROME_NAMES.includes(code.name)) refuse(`<${code.name}> is docs chrome; it cannot be inserted.`);
  if (op.requires !== undefined && (!Array.isArray(op.requires) || op.requires.some((item) => item !== "toast" && item !== "media"))) refuse('`requires` lists what the code needs: "toast" or "media"');
  if (op.index !== undefined && op.index !== null && !(Number.isInteger(op.index) && op.index >= 0)) refuse("`index` must be a position in the slot (0 or more)");
  const prop = slotProp(op);
  let wrap = null;
  if (op.wrap !== undefined && op.wrap !== null) {
    if (typeof op.wrap !== "object" || Array.isArray(op.wrap)) refuse("`wrap` must be { tag, props }");
    const tag = op.wrap.tag ?? "Stack";
    if (!WRAP_TAGS.includes(tag)) refuse(`wrap puts the slot's content in ${WRAP_TAGS.join(", ")} (not ${JSON.stringify(op.wrap.tag)})`);
    const props = op.wrap.props ?? {};
    if (props === null || typeof props !== "object" || Array.isArray(props)) refuse("wrap `props` must be an object of { name: EditValue }");
    const attrs = Object.entries(props).map(([name, value]) => {
      if (name === "children" || name === "key") refuse(`"${name}" cannot be a wrap prop`);
      return formatAttr(name, value);
    });
    wrap = { tag, attrs };
  }
  const index = op.index ?? null;
  let plan = null;
  let usedWrap = false;
  let snippet = null;
  const atIndex = (entries) => {
    if (index === null) return entries.length;
    if (index > entries.length) refuse(`The slot holds ${entries.length} item${entries.length === 1 ? "" : "s"}; position ${index} is past its end (reload the element)`, "stale");
    return index;
  };
  const intoContainer = (container) => {
    const entries = slotEntries(container, text);
    const at = atIndex(entries);
    if (wrap && entries.length) { usedWrap = true; return wrapContent(ctx, container, at, code, wrap); }
    snippet = { kind: "container", container, at, entries };
    return insertIntoContainer(ctx, container, at, code);
  };
  if (prop === null) {
    if (element.openingElement.selfClosing) {
      atIndex([]);
      snippet = { kind: "self-closing" };
      plan = expandSelfClosing(ctx, element, code);
    } else plan = intoContainer(element);
  } else {
    const attr = element.openingElement.attributes.findLast((item) => attrName(item) === prop);
    const where = (value) => `Its content comes from ${short(text.slice(value.start, value.end))}; edit it in the code.`;
    if (!attr) {
      atIndex([]);
      // A new prop: after the last attribute (on its own line when the attributes are one per line).
      const opening = element.openingElement;
      const last = opening.attributes.at(-1);
      const indent = last ? indentAt(text, last.start) : indentAt(text, element.start);
      const ownLine = last && last.loc.start.line > opening.loc.start.line && startsLine(text, last.start);
      const head = `${ownLine ? `${eol}${indent}` : " "}${prop}={`;
      const at = last ? last.end : (opening.typeArguments ?? opening.typeParameters ?? opening.name).end;
      plan = placed({ start: at, end: at, text: `${head}${reindent(code.part, indent, eol, ctx.unit)}}` }, head.length);
    } else if (!attr.value) {
      refuse(`Its content comes from \`${prop}\` (true); edit it in the code.`);
    } else {
      const value = attr.value.type === "JSXExpressionContainer" ? unwrapTs(attr.value.expression) : attr.value;
      if (value.type === "JSXEmptyExpression" || isNullish(value)) {
        atIndex([]);
        const range = value.type === "JSXEmptyExpression" ? { start: attr.value.start + 1, end: attr.value.end - 1 } : valueRange(text, attr.value.expression);
        plan = placed({ ...range, text: reindent(code.part, indentAt(text, attr.start), eol, ctx.unit) }, 0);
      } else if (value.type === "JSXFragment") {
        plan = intoContainer(value);
      } else if (value.type === "JSXElement") {
        const at = atIndex([value]);
        usedWrap = Boolean(wrap);
        plan = joinInProp(ctx, attr, value, at, code, wrap);
      } else refuse(where(value));
    }
  }
  const needed = new Set(code.needed);
  if (usedWrap) needed.add(wrap.tag);
  const edits = [...plan.edits];
  const hooks = hookEdits(ctx, nodePath, { toast: code.toast, statements: state.statements });
  edits.push(...hooks.edits);
  if (hooks.useToast) needed.add("useToast");
  if (code.media) edits.push(...mediaImportEdits(ctx));
  for (const name of needed) if (!ctx.folders.has(name)) refuse(`<${name}> is not a Zen component (no src/components folder exports it)`);
  edits.push(...importChanges(ctx.ast, text, eol, ctx.file, [...needed], [], ctx.folders));
  // A Screen or an Overlay added to the Board (GĐ2 M3), or proto.*(…) handlers: the builder runtime import gains them.
  const runtime = builderPage ? BUILDER_RUNTIME.filter((name) => new RegExp(name === "proto" ? "\\bproto\\." : `<${name}\\b`).test(code.src)) : [];
  if (runtime.length) edits.push(...builderImportEdits(ctx.ast, text, eol, runtime));
  return {
    edits,
    focus: { ...plan.focus, name: code.name },
    answer: "inserted",
    snippet: (literal) => {
      if (state.statements.length) return { reason: `an item with state is not copied into the example snippet (its useState lines are not in it); update it by hand (<${parentName}>)` };
      if (usedWrap) return { reason: `a wrapped slot is not copied into the example snippet; update it by hand (<${parentName}>)` };
      if (prop !== null && snippet?.kind !== "container") return { reason: `a new ${prop} value is not copied into the example snippet; update it by hand (<${parentName}>)` };
      return insertSnippet(ctx, literal, code, snippet, parentName);
    },
  };
}

/* ── removeElement ────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A function as a reason names it: its own name, its const, its object key ("the example's render" for render). */
function functionLabel(fn, holder) {
  if (fn.id?.name) return fn.id.name;
  if (holder?.type === "VariableDeclarator" && holder.id.type === "Identifier") return holder.id.name;
  const key = fn.type === "ObjectMethod" || fn.type === "ClassMethod" ? fn.key : holder?.type === "ObjectProperty" ? holder.key : null;
  const keyName = key ? propertyName(key) : null;
  if (keyName === "render") return "the example's render";
  return keyName ?? "its function";
}

/**
 * Why the node at nodePath[i] cannot be removed (or duplicated): it is what a function returns, a .map row, a
 * variable's or an object's value, a call's argument…
 */
function rootReason(nodePath, i, what, action = "remove") {
  const node = nodePath[i];
  const parent = nodePath[i - 1];
  let fnAt = -1;
  if (FUNCTION_TYPES.has(parent?.type) && parent.body === node) fnAt = i - 1;
  else if (parent?.type === "ReturnStatement") fnAt = nodePath.findLastIndex((item, k) => k < i - 1 && FUNCTION_TYPES.has(item.type));
  if (fnAt >= 0) {
    const fn = nodePath[fnAt];
    const holder = nodePath[fnAt - 1];
    if (isMapCall(holder) && holder.arguments[0] === fn) {
      return action === "remove" ? `${what} is the row of a .map list; remove the row in its data (here it would remove every row).` : `${what} is the row of a .map list; add the row to its data.`;
    }
    const name = functionLabel(fn, holder);
    return action === "remove" ? `${what} is the root of ${name}; there would be nothing left to render.` : `${what} is the root of ${name}; wrap it in a layout first, then duplicate it inside.`;
  }
  const verb = action === "remove" ? "remove" : "duplicate";
  if (parent?.type === "VariableDeclarator") return `${what} is the value of \`${parent.id.type === "Identifier" ? parent.id.name : "a variable"}\`; ${verb} it where that is used, or edit the code.`;
  if (parent?.type === "ObjectProperty") return `${what} is a value in an object (data); edit the data in the code.`;
  if (parent?.type === "CallExpression" || parent?.type === "NewExpression") return `${what} is passed to a function call; edit it in the code.`;
  return `${what} sits in ${WHERE[parent?.type] ?? "code the Studio does not restructure"}; edit it in the code.`;
}

/**
 * How removing the value at nodePath[at] is written, by its parent: { edits, anchor (what the snippet must show) }.
 * Walks up when nothing would be left (the && condition, an all-null ternary, an empty fragment).
 */
function removal(ctx, nodePath, at, what) {
  const { text } = ctx;
  let i = at;
  while (i > 0 && TS_WRAPPERS.has(nodePath[i - 1].type)) i -= 1;
  const value = nodePath[i];
  const parent = nodePath[i - 1];
  switch (parent?.type) {
    case "JSXElement":
    case "JSXFragment":
      return removeChild(ctx, nodePath, i, what);
    case "JSXExpressionContainer": {
      const holder = nodePath[i - 2];
      if (holder?.type === "JSXAttribute") return removeAttribute(ctx, nodePath, i - 2, what);
      if (holder?.type === "JSXElement" || holder?.type === "JSXFragment") return removeChild(ctx, nodePath, i - 1, what);
      break;
    }
    case "JSXAttribute":
      return removeAttribute(ctx, nodePath, i - 1, what);
    case "LogicalExpression":
      if (parent.operator === "&&" && parent.right === value) return removal(ctx, nodePath, i - 1, what);
      refuse(`${what} sits in a condition (${parent.operator}); edit it in the code.`);
      break;
    case "ConditionalExpression": {
      if (parent.test === value) refuse(`${what} is the test of a condition; edit it in the code.`);
      const other = parent.consequent === value ? parent.alternate : parent.consequent;
      if (isNullish(other)) return removal(ctx, nodePath, i - 1, what);
      const range = valueRange(text, value);
      return { edits: [{ ...range, text: "null" }], anchor: { node: value, replacement: "null" } };
    }
    case "ArrayExpression":
      return removeArrayItem(ctx, parent, value);
    default:
  }
  refuse(rootReason(nodePath, i, what));
}

/** A JSX child (element, {expression} or fragment) goes with its line(s), with detach's marker above it. */
function removeChild(ctx, nodePath, i, what) {
  const { text } = ctx;
  const node = nodePath[i];
  const parent = nodePath[i - 1];
  if (parent.type === "JSXFragment" && significant(parent).every((child) => child === node || isComment(child))) return removal(ctx, nodePath, i - 1, what);
  const owner = jsxOwner(nodePath, i);
  if (owner) {
    const ownerName = jsxName(owner.openingElement.name);
    const rest = slotEntries(owner, text).filter((entry) => !(node.start <= entry.node.start && entry.node.end <= node.end));
    if (!rest.length && ctx.requiredChildren.has(ownerName)) refuse(`${what} is the only content of <${ownerName}>, which needs children; replace it instead of removing it.`);
  }
  const marker = detachMarker(parent, node);
  const start = marker && /^\s*$/.test(text.slice(marker.end, node.start)) ? marker.start : node.start;
  return { edits: [removeRange(text, start, node.end)], anchor: { node } };
}

/** An attribute whose value is the element goes as a whole (refused when the component requires that prop). */
function removeAttribute(ctx, nodePath, k, what) {
  const attr = nodePath[k];
  const owner = nodePath[k - 2];
  const prop = attrName(attr);
  const ownerName = owner?.type === "JSXElement" ? jsxName(owner.openingElement.name) : "";
  if (ctx.requiredProps.get(ownerName)?.has(prop)) refuse(`${what} is the ${prop} of <${ownerName}>, which requires it; replace it instead of removing it.`);
  return { edits: [removeAttrEdit(attr, ctx.text, ctx.lineCommentEnds)], anchor: { node: attr } };
}

/** An array item goes with its comma (its whole line when it is alone on it). */
function removeArrayItem(ctx, array, item) {
  const { text } = ctx;
  const { start, end } = valueRange(text, item);
  const index = array.elements.indexOf(item);
  const comma = /^\s*,/.exec(text.slice(end));
  let edit;
  if (comma) {
    const afterComma = end + comma[0].length;
    const lineRest = /^[ \t]*\r?\n/.exec(text.slice(afterComma));
    if (startsLine(text, start) && lineRest) edit = { start: lineStartOf(text, start), end: afterComma + lineRest[0].length, text: "" };
    else edit = { start, end: afterComma + /^[ \t]*/.exec(text.slice(afterComma))[0].length, text: "" };
  } else if (index > 0 && array.elements[index - 1]) {
    const previousEnd = valueRange(text, array.elements[index - 1]).end;
    edit = { start: previousEnd + text.slice(previousEnd, start).indexOf(","), end, text: "" };
  } else edit = { start, end, text: "" };
  return { edits: [edit], anchor: null };
}

function removePlan(ctx, nodePath) {
  const { element } = ctx;
  const what = `<${jsxName(element.openingElement.name)}>`;
  const result = removal(ctx, nodePath, nodePath.length - 1, what);
  return {
    edits: result.edits,
    focus: null,
    answer: "removed",
    snippet: (literal) => (result.anchor ? removeSnippet(ctx, literal, result.anchor, what) : { reason: `an array item's removal is not copied into the example snippet; update it by hand (${what})` }),
  };
}

/* ── duplicateElement ─────────────────────────────────────────────────────────────────────────────────────────────── */

function duplicatePlan(ctx, nodePath) {
  const { text, element, eol, unit } = ctx;
  const name = jsxName(element.openingElement.name);
  const what = `<${name}>`;
  const key = element.openingElement.attributes.find((attr) => attrName(attr) === "key");
  if (key) refuse(`${what} has a key (${short(text.slice(key.start, key.end))}); a copy would repeat it. Edit it in the code.`);
  let i = nodePath.length - 1;
  while (i > 0 && TS_WRAPPERS.has(nodePath[i - 1].type)) i -= 1;
  const parent = nodePath[i - 1];
  const src = text.slice(element.start, element.end);
  const asChild = parent.type === "JSXElement" || parent.type === "JSXFragment" || (parent.type === "JSXExpressionContainer" && ["JSXElement", "JSXFragment"].includes(nodePath[i - 2]?.type));
  let plan;
  let kind;
  if (asChild) {
    kind = "child";
    if (startsLine(text, element.start) && endsLine(text, element.end) && parent.type !== "JSXExpressionContainer") {
      const indent = indentAt(text, element.start);
      plan = placed({ start: element.end, end: element.end, text: `${eol}${indent}${src}` }, eol.length + indent.length);
    } else {
      const unitNode = parent.type === "JSXExpressionContainer" ? parent : element;
      plan = placed({ start: unitNode.end, end: unitNode.end, text: src }, 0);
    }
  } else if (parent.type === "JSXAttribute" || (parent.type === "JSXExpressionContainer" && nodePath[i - 2]?.type === "JSXAttribute")
    || (parent.type === "ConditionalExpression" && parent.test !== nodePath[i]) || (parent.type === "LogicalExpression" && parent.operator === "&&" && parent.right === nodePath[i])) {
    // One element in a prop or a condition's branch: both copies in a fragment.
    kind = "fragment";
    const holder = parent.type === "JSXAttribute" ? parent : nodePath.slice(0, i).findLast((node) => node.type === "JSXAttribute") ?? element;
    const part = piece(text, element);
    if (!/[\r\n]/.test(src)) plan = placed({ start: element.start, end: element.end, text: `<>${src}${src}</>` }, 2 + src.length);
    else {
      const base = startsLine(text, element.start) ? indentAt(text, element.start) : indentAt(text, holder.start);
      const inner = base + unit;
      const copy = reindent(part, inner, eol);
      const head = `<>${eol}${inner}`;
      plan = placed({ start: element.start, end: element.end, text: `${head}${copy}${eol}${inner}${copy}${eol}${base}</>` }, head.length + copy.length + eol.length + inner.length);
    }
  } else refuse(rootReason(nodePath, i, what, "duplicate"));
  return {
    edits: plan.edits,
    focus: { ...plan.focus, name },
    answer: "inserted",
    snippet: (literal) => (kind === "child" ? duplicateSnippet(ctx, literal, element, what) : { reason: `a copy inside a new fragment is not copied into the example snippet; update it by hand (${what})` }),
  };
}

/* ── moveElement ──────────────────────────────────────────────────────────────────────────────────────────────────── */

function movePlan(ctx, nodePath, to) {
  const { text, element, eol } = ctx;
  const name = jsxName(element.openingElement.name);
  const what = `<${name}>`;
  if (to !== "prev" && to !== "next") refuse('moveElement needs `to`: "prev" or "next"');
  let i = nodePath.length - 1;
  if (nodePath[i - 1]?.type === "JSXExpressionContainer") i -= 1;
  const node = nodePath[i];
  const parent = nodePath[i - 1];
  if (parent?.type !== "JSXElement" && parent?.type !== "JSXFragment") refuse(`${what} is not one of an element's children (it sits in ${parent?.type === "JSXAttribute" ? "a prop" : WHERE[parent?.type] ?? "code"}); only children move.`);
  const siblings = parent.children.filter((child) => child.type !== "JSXText" && !isComment(child));
  const at = siblings.indexOf(node);
  const other = siblings[to === "prev" ? at - 1 : at + 1];
  if (!other) {
    const holder = parent.type === "JSXFragment" ? "its fragment" : `<${jsxName(parent.openingElement.name)}>`;
    refuse(`${what} is already the ${to === "prev" ? "first" : "last"} item in ${holder}.`);
  }
  const [a, b] = to === "prev" ? [other, node] : [node, other];
  const unitOf = (child) => {
    const marker = detachMarker(parent, child);
    const start = marker && /^\s*$/.test(text.slice(marker.end, child.start)) ? marker.start : child.start;
    return { start, end: child.end, part: piece(text, child, start, child.end) };
  };
  const ua = unitOf(a);
  const ub = unitOf(b);
  const aText = reindent(ub.part, ua.part.base, eol);
  const bText = reindent(ua.part, ub.part.base, eol);
  const first = { start: ua.start, end: ua.end, text: aText };
  const second = { start: ub.start, end: ub.end, text: bText };
  // The moved element's own text ends its unit's (a marker above it moves with it; `{<X />}` adds its brace after it).
  const movedText = node === a ? bText : aText;
  const ownText = reindent(piece(text, element), (node === a ? ub : ua).part.base, eol);
  const focusEdit = node === a ? second : first;
  return {
    edits: [first, second],
    focus: { edit: focusEdit, within: movedText.length - ownText.length - (node.end - element.end), name },
    answer: "moved",
    snippet: (literal) => moveSnippet(ctx, literal, a, b, what),
  };
}

/* ── clearSlot ────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Where an opening tag's attributes end (its name, or its type arguments, when it has none). */
const attrsEnd = (opening) => (opening.attributes.at(-1) ?? opening.typeArguments ?? opening.typeParameters ?? opening.name).end;
/** The attributes are one per line: the last one starts its own line, below the tag's name. */
const attrsPerLine = (text, opening) => {
  const last = opening.attributes.at(-1);
  return Boolean(last) && last.loc.start.line > opening.loc.start.line && startsLine(text, last.start);
};

/**
 * How the file closes its self-closing tags: `ownLine` after attributes one per line (true: `/>` on its own line,
 * false: right after the last attribute, null: the file has neither) and `space` before `/>` (" " unless `<X/>` wins).
 */
function closingStyle(ast, text) {
  let own = 0;
  let after = 0;
  let spaced = 0;
  let tight = 0;
  walk(ast.program, (node) => {
    if (node.type !== "JSXOpeningElement" || !node.selfClosing) return true;
    const slash = node.end - 2;
    if (startsLine(text, slash)) own += 1;
    else if (attrsPerLine(text, node)) after += 1;
    else if (/[ \t]/.test(text[slash - 1])) spaced += 1;
    else tight += 1;
    return true;
  });
  return { ownLine: own > after ? true : after > own ? false : null, space: tight > spaced ? "" : " " };
}

/**
 * The edit that empties a host's children: `>`, the children and the closing tag become `/>`. The attributes keep their
 * layout; after attributes one per line (or `>` on its own line) `/>` goes where the file puts it (closingStyle, else
 * where `>` was), never after a comment that sits between the last attribute and `>`.
 */
function selfCloseEdits(c, host) {
  const { text, eol } = c;
  const opening = host.openingElement;
  const gt = opening.end - 1;
  const from = attrsEnd(opening);
  const gtOwnLine = startsLine(text, gt);
  let beforeGt = gt;
  while (beforeGt > from && /[ \t]/.test(text[beforeGt - 1])) beforeGt -= 1;
  if (!gtOwnLine && !attrsPerLine(text, opening)) return [{ start: beforeGt, end: host.end, text: `${c.closing.space}/>` }];
  if (c.closing.ownLine ?? gtOwnLine) {
    if (gtOwnLine) return [{ start: gt, end: host.end, text: "/>" }];
    return [{ start: beforeGt, end: host.end, text: `${eol}${indentAt(text, host.start)}/>` }];
  }
  const commented = (c.ast.comments ?? []).some((comment) => comment.start >= from && comment.end <= gt);
  if (commented) return [{ start: gtOwnLine ? gt : beforeGt, end: host.end, text: gtOwnLine ? "/>" : `${c.closing.space}/>` }];
  return [{ start: from, end: host.end, text: `${c.closing.space}/>` }];
}

/** The edits that empty `host`'s slot (`prop` null: its children; else that attribute goes). */
function clearEdits(c, host, prop) {
  if (prop === null) return selfCloseEdits(c, host);
  return host.openingElement.attributes.filter((attr) => attrName(attr) === prop).map((attr) => removeAttrEdit(attr, c.text, c.lineCommentEnds));
}

/** A slot's source for comparing: no indentation, no trailing spaces, no blank lines. */
const normalised = (src) => src.split(/\r\n|[\n\r\u2028\u2029]/).map((line) => line.trim()).filter(Boolean).join("\n");
/** The children slot's source, normalised ("" when self-closing or blank). */
const childrenSource = (text, host) => (host.openingElement.selfClosing ? "" : normalised(text.slice(host.openingElement.end, host.closingElement.start)));
/** A prop slot's value source, normalised ("" when absent, `{}`, null, undefined or false; "true" when it has no value). */
function propSource(text, host, prop) {
  const attr = host.openingElement.attributes.findLast((item) => attrName(item) === prop);
  if (!attr) return "";
  if (!attr.value) return "true";
  const value = attr.value.type === "JSXExpressionContainer" ? attr.value.expression : attr.value;
  if (value.type === "JSXEmptyExpression" || isNullish(value)) return "";
  return normalised(text.slice(attr.value.start, attr.value.end));
}

/**
 * clearSlot (Figma "Delete contents"): on the host. Children: everything inside goes (elements, expressions, text and
 * comments) and the tag closes itself; a prop slot: the attribute goes. Refused when the slot is empty (comments alone
 * count as empty, as the Studio lists them) and when the component requires the children or the prop.
 */
function clearPlan(ctx, op) {
  const { text, element } = ctx;
  const name = jsxName(element.openingElement.name);
  const prop = slotProp(op);
  if (prop === null) {
    if (element.openingElement.selfClosing || !slotEntries(element, text).length) refuse(`Nothing to clear: <${name}> has no content.`);
    if (ctx.requiredChildren.has(name)) refuse(`<${name}> needs children; replace its content instead of clearing it.`);
  } else {
    if (!propSource(text, element, prop)) refuse(`Nothing to clear: <${name}> has no ${prop}.`);
    if (ctx.requiredProps.get(name)?.has(prop)) refuse(`<${name}> requires ${prop}; replace it instead of clearing it.`);
  }
  ctx.closing = closingStyle(ctx.ast, text);
  return {
    edits: clearEdits(ctx, element, prop),
    focus: null,
    answer: "cleared",
    snippet: (literal) => hostSnippet(ctx, literal, (c, host) => clearEdits(c, host, prop)),
  };
}

/* ── resetSlot: the host in the saved text ────────────────────────────────────────────────────────────────────────── */

/** Above this many cells (middle lines × middle lines) the middle counts as replaced (diff.ts MAX_CELLS). */
const MAX_CELLS = 2000 * 2000;
/** Lines as Babel counts them (U+2028/U+2029 end lines too), so index i is loc.line i + 1. */
const splitLines = (text) => text.split(/\r\n|[\n\r\u2028\u2029]/);

/**
 * Line alignment (src/platform/studio/code/diff.ts align, ported): common prefix and suffix, then an LCS walk of the
 * middle (a tie takes the removal first; too big a middle stays unmatched). `toB[i]` = the line of `b` that line i of
 * `a` is unchanged as (-1: removed or changed), `toA` the other way.
 */
function alignLines(a, b) {
  const toB = new Int32Array(a.length).fill(-1);
  const toA = new Int32Array(b.length).fill(-1);
  const same = (i, j) => { toB[i] = j; toA[j] = i; };
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) { same(prefix, prefix); prefix += 1; }
  let suffix = 0;
  while (suffix < a.length - prefix && suffix < b.length - prefix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) {
    same(a.length - 1 - suffix, b.length - 1 - suffix);
    suffix += 1;
  }
  const n = a.length - prefix - suffix;
  const m = b.length - prefix - suffix;
  if (n * m > MAX_CELLS) return { toB, toA };
  // lcs[i * (m + 1) + j] = LCS length of the middles from i and j (≤ 2000, fits 16 bits).
  const width = m + 1;
  const lcs = new Uint16Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i * width + j] = a[prefix + i] === b[prefix + j] ? lcs[(i + 1) * width + j + 1] + 1 : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[prefix + i] === b[prefix + j]) { same(prefix + i, prefix + j); i += 1; j += 1; }
    else if (lcs[(i + 1) * width + j] >= lcs[i * width + j + 1]) i += 1;
    else j += 1;
  }
  return { toB, toA };
}

/** Where line `line` (1-based) of `before` sits in `after`: its number there when unchanged, else null (diff.ts mapLine). */
export function mapLine(before, after, line) {
  if (before === after) return line;
  const a = splitLines(before);
  if (!Number.isInteger(line) || line < 1 || line > a.length) return null;
  const at = alignLines(a, splitLines(after)).toB[line - 1];
  return at >= 0 ? at + 1 : null;
}

/**
 * A file's JSX elements in source order, each with what matching compares: name, JSX parent (null: a root), slot (how
 * the parent holds it: "children", "prop:<name>", or "root:<top-level declaration>" for a root), depth, the elements
 * inside it (`kids` directly, `size` in all), and lazily its normalised source (`key`) and word counts (`words`).
 */
function jsxTree(text, ast) {
  const nodes = [];
  walk(ast.program, (node) => {
    if (node.type === "JSXElement") nodes.push(node);
    return true;
  });
  nodes.sort((a, b) => a.start - b.start);
  const info = new Map();
  const open = [];
  nodes.forEach((node, index) => {
    while (open.length && open.at(-1).end <= node.start) open.pop();
    const parent = open.at(-1) ?? null;
    const holder = parent ? parent.openingElement.attributes.find((attr) => attr.start <= node.start && node.end <= attr.end) : null;
    const slot = !parent ? `root:${enclosingTopLevel(ast, node)?.name ?? ""}` : holder ? `prop:${attrName(holder)}` : "children";
    const line = node.openingElement.loc.start.line - 1;
    info.set(node, { node, index, parent, slot, depth: parent ? info.get(parent).depth + 1 : 0, name: jsxName(node.openingElement.name), line, column: node.openingElement.loc.start.column, kids: [], size: 0, key: null, words: null });
    if (parent) info.get(parent).kids.push(node);
    open.push(node);
  });
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const item = info.get(nodes[i]);
    if (item.parent) info.get(item.parent).size += item.size + 1;
  }
  const keyOf = (node) => {
    const item = info.get(node);
    item.key ??= normalised(text.slice(node.start, node.end));
    return item.key;
  };
  const wordsOf = (node) => {
    const item = info.get(node);
    if (!item.words) {
      item.words = new Map();
      for (const [word] of keyOf(node).matchAll(/[\w$]+/g)) item.words.set(word, (item.words.get(word) ?? 0) + 1);
    }
    return item.words;
  };
  const inside = (node) => nodes.slice(info.get(node).index + 1, info.get(node).index + 1 + info.get(node).size);
  return { nodes, info, keyOf, wordsOf, inside };
}

/** How alike two elements' sources are: Dice over their words (0…1). */
function likeness(a, x, b, y) {
  const one = a.wordsOf(x);
  const two = b.wordsOf(y);
  let total = 0;
  let common = 0;
  for (const [word, count] of one) { total += count; common += Math.min(count, two.get(word) ?? 0); }
  for (const count of two.values()) total += count;
  return total ? (2 * common) / total : 1;
}

/**
 * Which saved element each current one is (Map current → saved; absent: new since the save). Lines alone cannot tell
 * siblings that open with the same line apart (a move, a remove or an insert next to them pairs the wrong ones), so:
 * 1. identical elements (normalised source; biggest first, with all they hold) pair up: the line diff's pairing first,
 *    then the nearest to where the diff puts them, skipping a saved element the diff gives to a changed element of the
 *    same name (an edited original keeps it; its untouched duplicate is the new one);
 * 2. a changed element pairs with the saved element its paired elements sit in (same depth below, Dice ≥ 0.5);
 * 3. under paired parents (and per top-level declaration for roots), the rest of each slot pair by likeness (ties: the
 *    diff's pairing, then the nearest): all of them when both sides have as many, else when alike (≥ 0.5) or on lines
 *    the diff pairs;
 * 4. an element on a line the diff pairs takes the same-named element there (same column, else the same place);
 * 5. an element whose parent changed (wrapped, unwrapped) pairs within its nearest paired ancestor: the only one of its
 *    name on both sides, else the most alike (≥ 0.5).
 * Each new pair repeats step 3 under it.
 */
function matchElements(now, then) {
  const a = jsxTree(now.text, now.ast);
  const b = jsxTree(then.text, then.ast);
  const lines = splitLines(now.text);
  const { toB } = alignLines(lines, splitLines(then.text));
  // Where each current line would be in the saved text: its nearest paired line above (else below), plus the offset.
  const estimate = new Int32Array(lines.length);
  for (let line = 0, above = -1; line < lines.length; line += 1) {
    if (toB[line] >= 0) above = line;
    estimate[line] = above >= 0 ? toB[above] + line - above : -1;
  }
  for (let line = lines.length - 1, below = -1; line >= 0; line -= 1) {
    if (toB[line] >= 0) below = line;
    if (estimate[line] < 0) estimate[line] = below >= 0 ? toB[below] - (below - line) : line;
  }
  /** How far a saved element is from where the diff puts a current one (lines first, then columns). */
  const distance = (x, y) => {
    const here = a.info.get(x);
    const there = b.info.get(y);
    return Math.abs(there.line - estimate[here.line]) * 10000 + Math.abs(there.column - here.column);
  };
  const pairs = new Map();
  const taken = new Map();
  const queue = [];
  const link = (x, y) => { pairs.set(x, y); taken.set(y, x); queue.push([x, y]); };
  const free = (x) => !pairs.has(x);
  const open = (y) => !taken.has(y);
  const named = (tree, node) => tree.info.get(node).name;
  const savedOnLine = new Map();
  for (const y of b.nodes) {
    const line = b.info.get(y).line;
    if (!savedOnLine.has(line)) savedOnLine.set(line, []);
    savedOnLine.get(line).push(y);
  }
  const nowOnLine = new Map();
  for (const x of a.nodes) {
    const line = a.info.get(x).line;
    if (!nowOnLine.has(line)) nowOnLine.set(line, []);
    nowOnLine.get(line).push(x);
  }
  // The diff's pairing: the same-named element at the same column on the paired line, else at the same place there.
  const anchor = new Map();
  const anchoredTo = new Map();
  for (const x of a.nodes) {
    const { line, column, name } = a.info.get(x);
    if (toB[line] < 0) continue;
    const there = (savedOnLine.get(toB[line]) ?? []).filter((y) => named(b, y) === name);
    const y = there.find((item) => b.info.get(item).column === column) ?? there[nowOnLine.get(line).filter((item) => named(a, item) === name).indexOf(x)];
    if (y) { anchor.set(x, y); anchoredTo.set(y, x); }
  }
  const linkAll = (x, y) => {
    link(x, y);
    const xs = a.inside(x);
    const ys = b.inside(y);
    if (xs.length === ys.length) xs.forEach((item, i) => { if (free(item) && open(ys[i])) link(item, ys[i]); });
  };

  // 1. Identical elements.
  const groups = new Map();
  for (const x of a.nodes) {
    const key = `${named(a, x)}\n${a.keyOf(x)}`;
    if (!groups.has(key)) groups.set(key, { now: [], then: [] });
    groups.get(key).now.push(x);
  }
  for (const y of b.nodes) groups.get(`${named(b, y)}\n${b.keyOf(y)}`)?.then.push(y);
  const identical = new Set();
  for (const group of groups.values()) if (group.then.length) group.now.forEach((x) => identical.add(x));
  const ordered = [...groups].filter(([, group]) => group.then.length).sort(([p], [q]) => q.length - p.length);
  for (const [, group] of ordered) {
    for (const x of group.now) {
      const y = anchor.get(x);
      if (free(x) && y && open(y) && group.then.includes(y)) linkAll(x, y);
    }
    const scored = [];
    for (const x of group.now.filter(free)) for (const y of group.then.filter(open)) scored.push({ x, y, far: distance(x, y) });
    scored.sort((p, q) => p.far - q.far);
    for (const { x, y } of scored) {
      if (!free(x) || !open(y)) continue;
      const rival = anchoredTo.get(y);
      if (rival && rival !== x && free(rival) && !identical.has(rival)) continue;
      linkAll(x, y);
    }
  }

  // 2. Changed elements, by what they hold (the deepest first).
  for (let i = a.nodes.length - 1; i >= 0; i -= 1) {
    const x = a.nodes[i];
    if (!free(x)) continue;
    const item = a.info.get(x);
    const votes = new Map();
    for (const inner of a.inside(x)) {
      let y = pairs.get(inner);
      for (let k = a.info.get(inner).depth - item.depth; y && k > 0; k -= 1) y = b.info.get(y).parent;
      if (y && open(y) && named(b, y) === item.name) votes.set(y, (votes.get(y) ?? 0) + 1);
    }
    let best = null;
    for (const [y, count] of votes) {
      const dice = (2 * count) / (item.size + b.info.get(y).size);
      if (dice >= 0.5 && (!best || dice > best.dice)) best = { y, dice };
    }
    if (best) link(x, best.y);
  }

  // 3. Each slot of a pair (roots: per top-level declaration), until no pair is left to look under.
  const slotsOf = (tree, list) => {
    const out = new Map();
    for (const node of list) {
      const { slot, name } = tree.info.get(node);
      const key = `${slot}\n${name}`;
      if (!out.has(key)) out.set(key, []);
      out.get(key).push(node);
    }
    return out;
  };
  const settle = (xs, ys) => {
    const mine = slotsOf(a, xs.filter(free));
    const theirs = slotsOf(b, ys.filter(open));
    for (const [key, list] of mine) {
      const other = theirs.get(key);
      if (!other) continue;
      const even = list.length === other.length;
      const scored = [];
      for (const x of list) for (const y of other) scored.push({ x, y, like: likeness(a, x, b, y), anchored: anchor.get(x) === y, far: distance(x, y) });
      scored.sort((p, q) => q.like - p.like || Number(q.anchored) - Number(p.anchored) || p.far - q.far);
      for (const { x, y, like, anchored } of scored) if (free(x) && open(y) && (even || anchored || like >= 0.5)) link(x, y);
    }
  };
  const drain = () => {
    while (queue.length) {
      const [x, y] = queue.shift();
      settle(a.info.get(x).kids, b.info.get(y).kids);
    }
  };
  const roots = (tree) => tree.nodes.filter((node) => !tree.info.get(node).parent);
  queue.splice(0, queue.length, ...[...pairs].sort(([p], [q]) => p.start - q.start));
  settle(roots(a), roots(b));
  drain();

  // 4. The diff's pairing for the rest.
  for (const x of a.nodes) {
    const y = anchor.get(x);
    if (free(x) && y && open(y)) { link(x, y); drain(); }
  }

  // 5. Moved to another parent within a paired ancestor (none: within the same top-level declaration).
  const rootSlot = (tree, node) => {
    let top = node;
    while (tree.info.get(top).parent) top = tree.info.get(top).parent;
    return tree.info.get(top).slot;
  };
  for (const x of a.nodes) {
    if (!free(x)) continue;
    const name = named(a, x);
    let up = a.info.get(x).parent;
    while (up && free(up)) up = a.info.get(up).parent;
    const declaration = up ? null : rootSlot(a, x);
    const scope = up ? b.inside(pairs.get(up)) : b.nodes.filter((y) => named(b, y) === name && rootSlot(b, y) === declaration);
    const candidates = scope.filter((y) => open(y) && named(b, y) === name);
    if (!candidates.length) continue;
    const rivals = (up ? a.inside(up) : a.nodes.filter((item) => named(a, item) === name && rootSlot(a, item) === declaration)).filter((item) => free(item) && named(a, item) === name);
    let best = null;
    for (const y of candidates) {
      const like = likeness(a, x, b, y);
      const far = distance(x, y);
      if (!best || like > best.like || (like === best.like && far < best.far)) best = { y, like, far };
    }
    if (best.like >= 0.5 || (candidates.length === 1 && rivals.length === 1)) { link(x, best.y); drain(); }
  }
  return pairs;
}

/**
 * The host as the saved text has it: { text, ast, host } (host null: the element is new since the save), or null when
 * the saved text does not parse. The element pairing is matchElements'.
 */
function savedHost(ctx, baseCode) {
  const { text, ast, element } = ctx;
  const baseText = baseCode.startsWith(BOM) ? baseCode.slice(1) : baseCode;
  const baseAst = parseSource(baseText);
  if (!baseAst) return null;
  const saved = (host) => ({ text: baseText, ast: baseAst, host: host ?? null });
  if (baseText === text) return saved(findElement(baseAst, element.openingElement.loc.start));
  return saved(matchElements({ text, ast }, { text: baseText, ast: baseAst }).get(element));
}

/** Names a piece of code reads (capitalised tags, identifiers; not properties, keys or what it declares itself). */
function usedNames(nodes) {
  const declared = new Set();
  const skip = new WeakSet();
  const names = new Set();
  for (const root of nodes) {
    walk(root, (inner) => {
      if (FUNCTION_TYPES.has(inner.type)) inner.params.forEach((param) => patternNames(param, declared));
      if (inner.type === "VariableDeclarator") patternNames(inner.id, declared);
      if (inner.type === "CatchClause") patternNames(inner.param, declared);
      if ((inner.type === "MemberExpression" || inner.type === "OptionalMemberExpression") && !inner.computed) skip.add(inner.property);
      if ((inner.type === "ObjectProperty" || inner.type === "ObjectMethod") && !inner.computed && !inner.shorthand) skip.add(inner.key);
      if (inner.type === "JSXOpeningElement") {
        let root = inner.name;
        while (root.type === "JSXMemberExpression") root = root.object;
        if (root.type === "JSXIdentifier" && (/^[A-Z]/.test(root.name) || inner.name.type === "JSXMemberExpression")) names.add(root.name);
      }
      if (inner.type === "Identifier" && !skip.has(inner)) names.add(inner.name);
      return true;
    });
  }
  return [...names].filter((name) => !declared.has(name));
}

/**
 * What the restored content needs from the file: Zen component imports the saved file had and the draft lost come
 * back (`needed`, with their folder from the saved import when `folders` lacks it); another missing import, or a
 * declaration the saved file had and the draft lost, is refused. `kept`: the saved file's import names (a reset never
 * drops one of those as unused: it heads back to the saved file). `hook`: the content calls `toast`, which the host's
 * scope no longer binds while the saved one had Zen's useToast() hook (a clear or remove took it with its last action).
 */
function restoredImports(ctx, saved, nodes, nodePath) {
  const bindings = (tree) => {
    const out = new Map();
    for (const statement of tree.program.body) {
      if (statement.type === "ImportDeclaration") for (const specifier of statement.specifiers) out.set(specifier.local.name, { statement, specifier });
    }
    return out;
  };
  const now = bindings(ctx.ast);
  const then = bindings(saved.ast);
  const folders = new Map(ctx.folders);
  const needed = new Set();
  let declaredNow = null;
  let declaredThen = null;
  let hook = false;
  for (const name of usedNames(nodes)) {
    if (now.has(name)) continue;
    // The saved scope's useToast() hook, which a clear or remove took away with its last action, comes back.
    if (name === "toast" && !bindingOf(nodePath, "toast")) {
      const savedBinding = bindingOf(pathTo(saved.ast.program, saved.host) ?? [], "toast");
      if (savedBinding?.declarator && isToastHook(savedBinding.declarator)) { hook = true; continue; }
    }
    const binding = then.get(name);
    if (binding) {
      const { statement, specifier } = binding;
      const source = statement.source.value;
      const zen = statement.importKind !== "type" && specifier.type === "ImportSpecifier" && specifier.importKind !== "type" && importedName(specifier) === name && (source === PACKAGE || /(^|\/)components\//.test(source));
      const folder = /(?:^|\/)components\/([^/]+)/.exec(source)?.[1];
      if (zen && folder && !folders.has(name)) folders.set(name, folder);
      if (!zen || !folders.has(name)) refuse(`The saved content uses ${name}, imported from "${source}", which this file no longer imports; reset it in the code.`);
      needed.add(name);
      continue;
    }
    declaredNow ??= declaredNames(ctx.ast);
    declaredThen ??= declaredNames(saved.ast);
    if (declaredThen.has(name) && !declaredNow.has(name)) refuse(`The saved content uses \`${name}\`, which this file no longer declares; reset it in the code.`);
  }
  return { needed, folders, kept: new Set(then.keys()), hook };
}

/**
 * Reset: the saved component's `useToast()` hook back where it was there: after the statement before it, else before
 * the one after it, in the function around the host whose body still has that statement as saved. null: not found.
 */
function savedHookEdit(ctx, nodePath, saved) {
  const { text, eol } = ctx;
  const isHook = (statement) => statement.type === "VariableDeclaration" && statement.declarations.length === 1 && isToastHook(statement.declarations[0]);
  const savedFns = (pathTo(saved.ast.program, saved.host) ?? []).filter((node) => FUNCTION_TYPES.has(node.type) && node.body?.type === "BlockStatement").reverse();
  const statements = savedFns.map((fn) => fn.body.body).find((list) => list.some(isHook));
  if (!statements) return null;
  const index = statements.findIndex(isHook);
  const hook = saved.text.slice(statements[index].start, statements[index].end);
  const source = (statement) => (statement ? saved.text.slice(statement.start, statement.end) : null);
  const [before, after] = [source(statements[index - 1]), source(statements[index + 1])];
  for (const fn of [...nodePath].reverse()) {
    if (!FUNCTION_TYPES.has(fn.type) || fn.body?.type !== "BlockStatement") continue;
    const own = fn.body.body;
    const previous = before && own.find((statement) => text.slice(statement.start, statement.end) === before);
    if (previous && endsLine(text, previous.end)) return { start: previous.end, end: previous.end, text: `${eol}${indentAt(text, previous.start)}${hook}` };
    const next = after && own.find((statement) => text.slice(statement.start, statement.end) === after);
    if (next && startsLine(text, next.start)) return { start: lineStartOf(text, next.start), end: lineStartOf(text, next.start), text: `${indentAt(text, next.start)}${hook}${eol}` };
  }
  return null;
}

/**
 * A reset's import changes as the saved file has them: a statement that differs from its saved self only by the names
 * the reset adds back (`needed`) and drops (`unused`) becomes the saved statement again; one the draft no longer has
 * comes back as saved, after its nearest earlier saved neighbour that is (or becomes) as saved here, else before the
 * nearest later one. Anything else, and any clash, goes through importChanges.
 */
function savedImportEdits(ctx, saved, needed, unused, folders) {
  const { text, ast, eol, file } = ctx;
  const fallback = () => importChanges(ast, text, eol, file, needed, unused, folders);
  const imports = (tree) => tree.program.body.filter((statement) => statement.type === "ImportDeclaration");
  const nowImports = imports(ast);
  const thenImports = imports(saved.ast);
  const locals = (statement) => statement.specifiers.map((specifier) => specifier.local.name);
  const sameModule = (p, q) => p.source.value === q.source.value && (p.importKind ?? "value") === (q.importKind ?? "value");
  const nowSource = (statement) => text.slice(statement.start, statement.end);
  const savedSource = (statement) => saved.text.slice(statement.start, statement.end);
  const savedText = (statement) => savedSource(statement).replace(/\r\n|\n|\r/g, eol);
  const edits = [];
  const restored = new Set();
  const dropped = new Set();
  // Saved statement → the draft statement that is (or, restored, becomes) its saved self.
  const becomes = new Map();
  for (const statement of thenImports) {
    const twin = nowImports.find((item) => !locals(item).some((name) => unused.includes(name)) && nowSource(item) === savedSource(statement));
    if (twin) becomes.set(statement, twin);
  }
  const statements = thenImports.filter((statement) => locals(statement).some((name) => needed.includes(name)));
  const lost = [];
  for (const statement of statements) {
    const names = locals(statement);
    const back = needed.filter((name) => names.includes(name));
    const same = nowImports.filter((item) => sameModule(item, statement));
    if (!same.length && back.length === names.length) lost.push(statement);
    if (same.length !== 1) continue;
    const after = new Set([...locals(same[0]).filter((name) => !unused.includes(name)), ...back]);
    if (after.size !== names.length || !names.every((name) => after.has(name))) continue;
    edits.push({ start: same[0].start, end: same[0].end, text: savedText(statement) });
    becomes.set(statement, same[0]);
    back.forEach((name) => restored.add(name));
    locals(same[0]).filter((name) => unused.includes(name)).forEach((name) => dropped.add(name));
  }
  // Lost statements, in saved order (several at one place go in as saved).
  for (const statement of lost) {
    const index = thenImports.indexOf(statement);
    const earlier = thenImports.slice(0, index).reverse().map((item) => becomes.get(item)).find(Boolean);
    const later = earlier ? null : thenImports.slice(index + 1).map((item) => becomes.get(item)).find(Boolean);
    if (earlier) {
      const newline = text.indexOf("\n", earlier.end);
      const rest = text.slice(earlier.end, newline < 0 ? text.length : newline);
      if (newline < 0 || !/^[ \t]*\r?$/.test(rest)) continue;
      const at = newline - (text[newline - 1] === "\r" ? 1 : 0);
      edits.push({ start: at, end: at, text: `${eol}${savedText(statement)}` });
    } else if (later) {
      const at = lineStartOf(text, later.start);
      if (!/^[ \t]*$/.test(text.slice(at, later.start))) continue;
      edits.push({ start: at, end: at, text: `${savedText(statement)}${eol}` });
    } else continue;
    locals(statement).forEach((name) => restored.add(name));
  }
  if (!edits.length) return fallback();
  const rest = importChanges(ast, text, eol, file, needed.filter((name) => !restored.has(name)), unused.filter((name) => !dropped.has(name)), folders);
  const all = [...edits.map((edit) => ({ ...edit, isImport: true })), ...rest];
  const sorted = [...all].sort((p, q) => p.start - q.start || p.end - q.end);
  if (sorted.some((edit, i) => i > 0 && edit.start < sorted[i - 1].end)) return fallback();
  return all;
}

/* ── resetSlot ────────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The edits that give `host` (in c.text) the slot `saved.host` has. Children: from the end of the attributes to the end
 * of the element (`>`, the children, `</X>`, or `/>`), as saved, re-indented from the saved host's line to this one's.
 * A prop: the saved attribute replaces this one (re-indented), joins the attributes (like a new insertChild prop) or,
 * when the saved host has none, this one goes.
 */
function resetEdits(c, host, prop, saved) {
  const { text, eol } = c;
  const then = saved.host;
  if (prop === null) {
    const part = { ...piece(saved.text, then, attrsEnd(then.openingElement), then.end), base: indentAt(saved.text, then.start) };
    return [{ start: attrsEnd(host.openingElement), end: host.end, text: reindent(part, indentAt(text, host.start), eol) }];
  }
  const attrs = host.openingElement.attributes.filter((attr) => attrName(attr) === prop);
  const old = then.openingElement.attributes.findLast((attr) => attrName(attr) === prop);
  if (!old) return attrs.map((attr) => removeAttrEdit(attr, text, c.lineCommentEnds));
  const part = piece(saved.text, old);
  const last = attrs.at(-1);
  if (last) return [...attrs.slice(0, -1).map((attr) => removeAttrEdit(attr, text, c.lineCommentEnds)), { start: last.start, end: last.end, text: reindent(part, indentAt(text, last.start), eol) }];
  // Absent now. Its saved neighbours are still neighbours here, with what else was between them (spaces, the comments
  // about it): the saved text between them comes back, re-indented (its line breaks, and a `/>` after it, as saved).
  const opening = host.openingElement;
  const savedOpening = then.openingElement;
  const savedAttrs = savedOpening.attributes;
  const index = savedAttrs.indexOf(old);
  const head = (tag) => (tag.typeArguments ?? tag.typeParameters ?? tag.name).end;
  const tail = (tag) => tag.end - (tag.selfClosing ? 2 : 1);
  const counterpart = (attr) => (attr ? opening.attributes.findLast((item) => attrName(item) === attrName(attr)) ?? null : null);
  const savedBefore = savedAttrs[index - 1] ?? null;
  const savedAfter = savedAttrs[index + 1] ?? null;
  const before = counterpart(savedBefore);
  const after = counterpart(savedAfter);
  const from = savedBefore ? (before ? before.end : -1) : head(opening);
  const to = savedAfter ? (after ? after.start : -1) : opening.selfClosing === savedOpening.selfClosing ? tail(opening) : -1;
  const savedFrom = savedBefore ? savedBefore.end : head(savedOpening);
  const savedTo = savedAfter ? savedAfter.start : tail(savedOpening);
  const bare = (source) => source.replace(/\s+/g, "");
  if (from >= 0 && to >= from && bare(text.slice(from, to)) === bare(saved.text.slice(savedFrom, old.start) + saved.text.slice(old.end, savedTo))) {
    const slice = { ...piece(saved.text, savedOpening, savedFrom, savedTo), base: indentAt(saved.text, then.start) };
    const indent = indentAt(text, host.start);
    // The indentation before the next attribute (or `/>`) on its own line: this tag's own, else the saved one re-based.
    const cut = /(?:\r\n|\n|\r)([ \t]*)$/.exec(slice.src);
    if (!cut) return [{ start: from, end: to, text: reindent(slice, indent, eol) }];
    const own = /(?:\r\n|\n|\r)([ \t]*)$/.exec(text.slice(from, to));
    const lead = own ? own[1] : `${indent}${cut[1].slice(slice.base.length)}`;
    return [{ start: from, end: to, text: `${reindent({ ...slice, src: slice.src.slice(0, cut.index) }, indent, eol)}${eol}${lead}` }];
  }
  // Else after the attribute that comes before it in the saved tag (the nearest one this tag still has), else right
  // after the name; on its own line when it starts one in the saved tag (indented like this tag's own-line attributes,
  // else as saved, re-based on this tag's line).
  const previous = savedAttrs.slice(0, index).reverse().map(attrName).find((item) => item && opening.attributes.some((attr) => attrName(attr) === item));
  const anchor = previous ? opening.attributes.findLast((attr) => attrName(attr) === previous) : null;
  const ownLine = old.loc.start.line > savedOpening.loc.start.line && startsLine(saved.text, old.start);
  const lined = opening.attributes.find((attr) => attr.loc.start.line > opening.loc.start.line && startsLine(text, attr.start));
  const rebased = `${indentAt(text, host.start)}${indentAt(saved.text, old.start).slice(indentAt(saved.text, then.start).length)}`;
  const indent = ownLine ? (lined ? indentAt(text, lined.start) : rebased) : indentAt(text, (anchor ?? host).start);
  const at = anchor ? anchor.end : head(opening);
  return [{ start: at, end: at, text: `${ownLine ? `${eol}${indent}` : " "}${reindent(part, indent, eol)}` }];
}

/**
 * resetSlot (Figma "Reset slot"): on the host; its slot goes back to the saved file (`base`). Refused when there is no
 * base (no draft), when the slot matches it (normalised) and when the host is new since the save.
 */
function resetPlan(ctx, nodePath, op, base) {
  const { text, element } = ctx;
  const prop = slotProp(op);
  const nothing = "Nothing to reset: this slot matches the saved file.";
  if (typeof base !== "string") refuse(nothing);
  const saved = savedHost(ctx, base);
  if (!saved) refuse("The saved file does not parse; reset this slot in the code.");
  if (!saved.host) refuse("This element is new since the last save: remove it instead.");
  const then = saved.host;
  const now = prop === null ? childrenSource(text, element) : propSource(text, element, prop);
  if (now === (prop === null ? childrenSource(saved.text, then) : propSource(saved.text, then, prop))) refuse(nothing);
  const restored = prop === null ? (then.openingElement.selfClosing ? [] : then.children) : then.openingElement.attributes.filter((attr) => attrName(attr) === prop).slice(-1);
  const { needed, folders, kept, hook } = restoredImports(ctx, saved, restored, nodePath);
  const edits = resetEdits(ctx, element, prop, saved);
  if (hook) {
    const add = savedHookEdit(ctx, nodePath, saved) ?? toastHook(ctx, nodePath);
    if (add) { edits.push(add); needed.add("useToast"); }
  }
  return {
    edits,
    focus: null,
    answer: "reset",
    needed,
    folders,
    kept,
    keepHook: (statement) => saved.text.includes(statement),
    imports: (names, unused) => savedImportEdits(ctx, saved, names, unused, folders),
    snippet: (literal) => resetSnippet(ctx, literal, prop, saved),
  };
}

/* ── example snippets ─────────────────────────────────────────────────────────────────────────────────────────────── */

const propertyName = (key) => (key.type === "Identifier" ? key.name : key.type === "StringLiteral" ? key.value : null);
/** Raw text as it reads inside a template literal: \ ` and ${ escaped (and the inverse). */
const templateRaw = (value) => value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
const untemplateRaw = (value) => value.replace(/\\(\\|`|\$(?=\{))/g, "$1");
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Old code → a whitespace-tolerant pattern: its tokens joined by \s+, not glued to a neighbouring word. */
function tolerantPattern(raw) {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return null;
  const head = /^[\w$]/.test(tokens[0]) ? "(?<![\\w$])" : "";
  const tail = /[\w$]$/.test(tokens.at(-1)) ? "(?![\\w$])" : "";
  return new RegExp(head + tokens.map(escapeRegExp).join("\\s+") + tail, "g");
}

/** The module-level declaration that holds `node`, with its name when it is a function or a const. */
function enclosingTopLevel(ast, node) {
  for (const statement of ast.program.body) {
    const declaration = statement.type === "ExportNamedDeclaration" || statement.type === "ExportDefaultDeclaration" ? statement.declaration ?? statement : statement;
    if (!declaration || declaration.start > node.start || declaration.end < node.end) continue;
    if (declaration.type === "FunctionDeclaration") return { name: declaration.id?.name ?? null };
    if (declaration.type === "VariableDeclaration") {
      for (const declarator of declaration.declarations) {
        if (declarator.start <= node.start && declarator.end >= node.end) return { name: declarator.id?.type === "Identifier" ? declarator.id.name : null };
      }
    }
    return { name: null };
  }
  return null;
}

/** Example objects of the file: { code: `…`, render: () => … } (render may also be a method or a function). */
function exampleObjects(ast) {
  const out = [];
  walk(ast, (node) => {
    if (node.type !== "ObjectExpression") return true;
    let code = null;
    let render = null;
    for (const property of node.properties) {
      if (property.computed) continue;
      const key = property.key ? propertyName(property.key) : null;
      if (key === "code" && property.type === "ObjectProperty" && property.value.type === "TemplateLiteral") code = property.value;
      if (key === "render" && (property.type === "ObjectMethod" || (property.type === "ObjectProperty" && isFunction(property.value)))) render = property.type === "ObjectMethod" ? property : property.value;
    }
    if (code && render) out.push({ code, render });
    return true;
  });
  return out;
}

function renderedNames(fn) {
  const names = new Set();
  walk(fn, (node) => {
    if (node.type === "JSXOpeningElement") names.add(jsxName(node.name));
    return true;
  });
  return names;
}

/** jsx-source snippetFor: the one example snippet that shows `node`, or a reason. */
function snippetFor(ast, node) {
  const examples = exampleObjects(ast);
  if (!examples.length) return { literal: null, reason: null };
  const inline = examples.filter((example) => example.render.start <= node.start && example.render.end >= node.end);
  if (inline.length === 1) return { literal: inline[0].code, reason: null };
  const owner = enclosingTopLevel(ast, node);
  if (!owner?.name) return { literal: null, reason: "no example snippet shows this code" };
  const rendering = examples.filter((example) => renderedNames(example.render).has(owner.name));
  if (rendering.length === 1) return { literal: rendering[0].code, reason: null };
  return { literal: null, reason: rendering.length ? `more than one example renders <${owner.name}>` : "no example snippet shows this code" };
}

/** The snippet that shows `node`: { literal } | { reason } | null (the file has no example snippets). */
function snippetOwner(ctx, node) {
  if (!snippetLiterals(ctx.ast).length) return null;
  const owner = snippetFor(ctx.ast, node);
  if (!owner.literal) return owner.reason ? { reason: owner.reason } : null;
  return { literal: owner.literal };
}

/** The one place a snippet shows `source` (whitespace-tolerant), or a reason. */
function snippetHit(text, literal, source, what) {
  const pattern = tolerantPattern(templateRaw(source));
  const hits = [];
  if (pattern) {
    for (const quasi of literal.quasis) {
      const raw = text.slice(quasi.start, quasi.end);
      for (const match of raw.matchAll(pattern)) hits.push({ start: quasi.start + match.index, end: quasi.start + match.index + match[0].length, matched: match[0] });
    }
  }
  if (!hits.length) return { reason: `the example snippet does not show this code (${what})` };
  if (hits.length > 1) return { reason: `this code appears more than once in the snippet (${what})` };
  return { hit: hits[0] };
}

/** A hit's line inside the literal (its first line starts after the backtick): indentation, alone at its start / end. */
function hitLine(text, literal, hit) {
  const lineStart = Math.max(lineStartOf(text, hit.start), literal.start + 1);
  const lead = text.slice(lineStart, hit.start);
  const newline = text.indexOf("\n", hit.end);
  return {
    indent: /^[ \t]*/.exec(lead)[0],
    startsLine: /^[ \t]*$/.test(lead),
    endsLine: newline >= 0 && newline < literal.end && /^[ \t]*\r?$/.test(text.slice(hit.end, newline)),
  };
}

/** The new element after a snippet hit: on its own line at `indent` when the hit ends its line, else right after it. */
function afterHit(ctx, literal, hit, part, deeper) {
  const { text, eol, unit } = ctx;
  const line = hitLine(text, literal, hit);
  if (line.endsLine) {
    const indent = line.indent + (deeper ? unit : "");
    return { start: hit.end, end: hit.end, text: `${eol}${indent}${templateRaw(reindent(part, indent, eol, unit))}` };
  }
  return { start: hit.end, end: hit.end, text: templateRaw(reindent(part, line.indent, eol, unit)) };
}

function insertSnippet(ctx, literal, code, where, parentName) {
  const { text, element } = ctx;
  if (where.kind === "self-closing") {
    // The parent's whole copy, expanded the same way (its own lines and indentation; inline when it does not start its
    // line in the snippet, like `trigger={<IconButton … />}`).
    const found = snippetHit(text, literal, text.slice(element.start, element.end), `<${parentName}>`);
    if (found.reason) return found;
    const { hit } = found;
    const line = hitLine(text, literal, hit);
    const prefix = line.indent;
    const copy = `${prefix}${untemplateRaw(hit.matched)}`;
    const parsed = parseSource(copy);
    const statement = parsed?.program.body.length === 1 ? parsed.program.body[0] : null;
    const node = statement?.type === "ExpressionStatement" ? statement.expression : null;
    if (!node || parsed.errors.length || node.type !== "JSXElement" || node.start !== prefix.length || node.end !== copy.length || !node.openingElement.selfClosing) return { reason: `the snippet's copy of <${parentName}> differs` };
    const copyCtx = { ...ctx, text: copy, lineCommentEnds: new Set((parsed.comments ?? []).filter((comment) => comment.type === "CommentLine").map((comment) => comment.end)) };
    const expanded = applyEdits(copy, expandSelfClosing(copyCtx, node, code, line.startsLine).edits).slice(prefix.length);
    return { edits: [{ start: hit.start, end: hit.end, text: templateRaw(expanded) }] };
  }
  const { container, at, entries } = where;
  if (at > 0) {
    const previous = entries[at - 1];
    if (previous.child.kind === "text") return { reason: `the slot's previous item is text, which the snippet cannot be matched on (<${parentName}>)` };
    const what = previous.child.kind === "element" ? `<${previous.child.name}>` : short(previous.child.raw);
    const found = snippetHit(text, literal, text.slice(previous.node.start, previous.node.end), what);
    if (found.reason) return found;
    return { edits: [afterHit(ctx, literal, found.hit, code.part, false)] };
  }
  if (container.type !== "JSXElement") return { reason: `the start of a fragment cannot be matched in the snippet (<${parentName}>)` };
  const opening = container.openingElement;
  const found = snippetHit(text, literal, text.slice(opening.start, opening.end), `<${parentName}>`);
  if (found.reason) return found;
  return { edits: [afterHit(ctx, literal, found.hit, code.part, true)] };
}

function removeSnippet(ctx, literal, anchor, what) {
  const { text } = ctx;
  const found = snippetHit(text, literal, text.slice(anchor.node.start, anchor.node.end), what);
  if (found.reason) return found;
  const { hit } = found;
  if (anchor.replacement) return { edits: [{ start: hit.start, end: hit.end, text: anchor.replacement }] };
  return { edits: [removeRange(text, hit.start, hit.end, { floor: literal.start + 1, ceiling: literal.end - 1 })] };
}

function duplicateSnippet(ctx, literal, element, what) {
  const { text, eol } = ctx;
  const found = snippetHit(text, literal, text.slice(element.start, element.end), what);
  if (found.reason) return found;
  const { hit } = found;
  const line = hitLine(text, literal, hit);
  // The snippet's own spelling of the element, again (same indentation: its lines stay as they are).
  if (line.startsLine && line.endsLine) return { edits: [{ start: hit.end, end: hit.end, text: `${eol}${line.indent}${hit.matched}` }] };
  return { edits: [{ start: hit.end, end: hit.end, text: hit.matched }] };
}

function moveSnippet(ctx, literal, a, b, what) {
  const { text, eol } = ctx;
  const label = (node) => (node.type === "JSXElement" ? `<${jsxName(node.openingElement.name)}>` : short(text.slice(node.start, node.end)));
  const first = snippetHit(text, literal, text.slice(a.start, a.end), label(a));
  if (first.reason) return first;
  const second = snippetHit(text, literal, text.slice(b.start, b.end), label(b));
  if (second.reason) return second;
  if (first.hit.end > second.hit.start) return { reason: `the snippet shows these items in another order (${what})` };
  const indentA = hitLine(text, literal, first.hit).indent;
  const indentB = hitLine(text, literal, second.hit).indent;
  const move = (matched, from, to) => (from === to ? matched : matched.split(/\r\n|\n|\r/).map((line, i) => (i && line.startsWith(from) ? to + line.slice(from.length) : line)).join(eol));
  return {
    edits: [
      { start: first.hit.start, end: first.hit.end, text: move(second.hit.matched, indentB, indentA) },
      { start: second.hit.start, end: second.hit.end, text: move(first.hit.matched, indentA, indentB) },
    ],
  };
}

/**
 * The snippet's own copy of `node` (an element of `text`): where its whole source shows once (whitespace-tolerant), else
 * where its opening tag does (a hand-written snippet that differs inside it). The literal's code is parsed with its
 * escapes undone: { code, ast, node (the copy), at (a code offset → its offset in `text`) } | { reason }.
 */
function snippetCopy(text, literal, node, what) {
  if (literal.quasis.length !== 1) return { reason: `the example snippet has \${…} parts (${what})` };
  let found = snippetHit(text, literal, text.slice(node.start, node.end), what);
  if (found.reason && !found.reason.startsWith("this code appears more than once")) found = snippetHit(text, literal, text.slice(node.openingElement.start, node.openingElement.end), what);
  if (found.reason) return found;
  const begin = literal.quasis[0].start;
  const raw = text.slice(begin, literal.quasis[0].end);
  // untemplateRaw, keeping where each character of the code came from.
  const from = [];
  let code = "";
  for (let i = 0; i < raw.length; i += 1) {
    from.push(begin + i);
    if (raw[i] === "\\" && (raw[i + 1] === "\\" || raw[i + 1] === "`" || (raw[i + 1] === "$" && raw[i + 2] === "{"))) i += 1;
    code += raw[i];
  }
  from.push(begin + raw.length);
  const start = from.indexOf(found.hit.start);
  const at = (tree) => {
    let copy = null;
    if (tree && start >= 0) {
      walk(tree.program, (item) => {
        if (copy || item.start > start || item.end <= start) return false;
        if (item.type === "JSXElement" && item.start === start) { copy = item; return false; }
        return true;
      });
    }
    return copy;
  };
  let ast = parseSource(code);
  let copy = at(ast);
  // Code before it that does not parse with it (two elements side by side): blanked, so offsets and lines stay.
  if (!copy && start > 0) copy = at(ast = parseSource(code.slice(0, start).replace(/[^\r\n]/g, " ") + code.slice(start)));
  if (!copy || jsxName(copy.openingElement.name) !== jsxName(node.openingElement.name)) return { reason: `the snippet's copy of ${what} differs` };
  return { code, ast, node: copy, at: (offset) => from[offset] };
}

/**
 * Clear and reset: the host's copy in the snippet (snippetCopy), changed the way the source is: `change(c, host)` gets
 * the context of the copy (the snippet's code, so re-indenting lands where the snippet has it).
 */
function hostSnippet(ctx, literal, change) {
  const what = `<${jsxName(ctx.element.openingElement.name)}>`;
  const found = snippetCopy(ctx.text, literal, ctx.element, what);
  if (found.reason) return found;
  const { code, ast, node, at } = found;
  const copyCtx = { ...ctx, text: code, ast, element: node, lineCommentEnds: new Set((ast.comments ?? []).filter((comment) => comment.type === "CommentLine").map((comment) => comment.end)) };
  const changed = applyEdits(code, change(copyCtx, node));
  return { edits: [{ start: at(node.start), end: at(node.end), text: templateRaw(changed.slice(node.start, node.end + changed.length - code.length)) }] };
}

/**
 * Reset: the host's copy in the snippet takes the slot the saved file's snippet shows (its copy of the saved host), so
 * a hand-written snippet comes back as it was saved. A snippet that is as saved stays.
 */
function resetSnippet(ctx, literal, prop, saved) {
  const what = `<${jsxName(ctx.element.openingElement.name)}>`;
  const owner = snippetFor(saved.ast, saved.host);
  if (!owner.literal) return { reason: owner.reason ?? `the saved file has no example snippet for this code (${what})` };
  if (ctx.text.slice(literal.start, literal.end) === saved.text.slice(owner.literal.start, owner.literal.end)) return { edits: [] };
  const then = snippetCopy(saved.text, owner.literal, saved.host, what);
  const copied = then.reason ? { reason: `the saved snippet: ${then.reason}` } : hostSnippet(ctx, literal, (c, host) => resetEdits(c, host, prop, { text: then.code, host: then.node }));
  if (!copied.reason || prop !== null) return copied;
  return snippetHunks(ctx, literal, owner.literal, saved, what) ?? copied;
}

/**
 * Reset's fallback for a snippet that shows the host's content but not the host itself (its own tag written another
 * way): the line changes between the saved snippet and this one that sit among the saved host's children there (from
 * the line its first shown child starts on to the one after its last) are undone. null: none of the children shown.
 */
function snippetHunks(ctx, literal, savedLiteral, saved, what) {
  if (literal.quasis.length !== 1 || savedLiteral.quasis.length !== 1) return null;
  const nowStart = literal.quasis[0].start;
  const thenStart = savedLiteral.quasis[0].start;
  const nowRaw = ctx.text.slice(nowStart, literal.quasis[0].end);
  const thenRaw = saved.text.slice(thenStart, savedLiteral.quasis[0].end);
  const starts = (raw) => [0, ...[...raw.matchAll(/\r\n|\n|\r/g)].map((match) => match.index + match[0].length)];
  const nowLines = starts(nowRaw);
  const thenLines = starts(thenRaw);
  const lineAt = (offset) => thenLines.findLastIndex((start) => start <= offset);
  let first = Infinity;
  let last = -1;
  for (const { child, node } of slotEntries(saved.host, saved.text)) {
    if (child.kind === "text") continue;
    const found = snippetHit(saved.text, savedLiteral, saved.text.slice(node.start, node.end), what);
    if (found.reason) continue;
    first = Math.min(first, lineAt(found.hit.start - thenStart));
    last = Math.max(last, lineAt(found.hit.end - thenStart));
  }
  if (last < 0) return null;
  const lines = (raw, at) => at.map((start, i) => raw.slice(start, at[i + 1] ?? raw.length).replace(/(?:\r\n|\n|\r)$/, ""));
  const { toB, toA } = alignLines(lines(nowRaw, nowLines), lines(thenRaw, thenLines));
  const edits = [];
  const offset = (at, raw, i) => (i < at.length ? at[i] : raw.length);
  let i = 0;
  let j = 0;
  while (i < nowLines.length || j < thenLines.length) {
    if (i < nowLines.length && j < thenLines.length && toB[i] === j) { i += 1; j += 1; continue; }
    const hunk = { i, j };
    while (i < nowLines.length && toB[i] < 0) i += 1;
    while (j < thenLines.length && toA[j] < 0) j += 1;
    if (i === hunk.i && j === hunk.j) break;
    // Inside the children's lines, or an insert right before the first / after the last.
    const inside = j > hunk.j ? hunk.j <= last && j - 1 >= first : hunk.j >= first && hunk.j <= last + 1;
    if (inside) edits.push({ start: nowStart + offset(nowLines, nowRaw, hunk.i), end: nowStart + offset(nowLines, nowRaw, i), text: thenRaw.slice(offset(thenLines, thenRaw, hunk.j), offset(thenLines, thenRaw, j)) });
  }
  return { edits };
}

/* ── the op ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

const asFolders = (modules) => {
  if (modules instanceof Map) return modules;
  if (modules && typeof modules === "object") return new Map(Object.entries(modules));
  return new Map(Object.entries(FALLBACK_FOLDERS));
};

/**
 * One structural op on the element at `loc` (named `name`): insertChild, clearSlot, resetSlot (on the slot's host),
 * removeElement, duplicateElement, moveElement. Returns applyOps' answer shape: the new text (BOM and line endings
 * kept), the changed line range (import changes left out), `inserted` / `removed` / `moved` / `cleared` / `reset`, and
 * `snippet` when the file has example snippets; or { error, code: "stale" | "not-found" | "invalid" | "forbidden" }.
 */
/** What arrange.mjs (op moveTo: drag to reorder, reparent or copy) reuses from here. */
const ARRANGE_HELPERS = { refuse, removal, insertIntoContainer, expandSelfClosing, slotEntries, holderOf, guard, importChanges, componentImports, referenceCount, toastHook, stateFor, hookEdits, mediaImportEdits, duplicatePlan, bindingOf, detachMarker, patternNames, isMapCall, TS_WRAPPERS, FUNCTION_TYPES, WHERE };
/** What items.mjs (data-slot items: insertItem, removeItem, duplicateItem, moveItem) borrows from this module. */
const ITEM_HELPERS = { refuse, attrName, short, unwrapTs, isNullish, valueRange, indentAt, startsLine, removeAttrEdit, removeArrayItem, hookEdits, importChanges, hostSnippet, patternNames, FUNCTION_TYPES, JS_GLOBALS };

export function applySlotOp(code, loc, name, op, options = {}) {
  const { snippets = true, file, componentModules, requiredChildren, requiredProps, hash, base, shared = false } = options;
  if (!op || typeof op !== "object" || !SLOT_OPS.has(op.op)) return fail("invalid", `Unknown slot op ${JSON.stringify(op?.op)}`);
  if (typeof code !== "string") return fail("invalid", "No source text");
  // A property on several layers (op many, setProps) is a prop edit, allowed wherever one layer's props are (any annotated
  // file); only structural ops are limited to example pages and templates (E2E I-13).
  const propsOnly = op.op === "many" && op.action === "setProps";
  if (!propsOnly && !isSlotFile(file)) {
    if (!isSharedFile(file)) return fail("forbidden", `Slot content is restructured in example pages (src/platform/examples/pages), templates (src/templates) and shared demo code only${typeof file === "string" ? `, not in ${file}` : ""}.`);
    if (!shared) return sharedRefusal(file);
  }
  // Ops that take content away need the text they were chosen on.
  const hashed = { removeElement: "Remove and move", moveElement: "Remove and move", moveTo: "Remove and move", pasteCode: "Paste and replace", replaceElement: "Paste and replace", many: "Changes to several layers", clearSlot: "Clear and reset", resetSlot: "Clear and reset", insertItem: "Item changes", removeItem: "Item changes", duplicateItem: "Item changes", moveItem: "Item changes", groupItem: "Item changes", ungroupItem: "Item changes" }[op.op];
  if (hashed) {
    if (typeof hash !== "string" || !hash) return fail("invalid", `${hashed} need the file's hash (send \`hash\` with the request)`);
    if (hash !== sha1(code)) return fail("stale", "The file changed since it was read; reload it and try again");
  }
  const bom = code.startsWith(BOM) ? BOM : "";
  const text = bom ? code.slice(1) : code;
  const target = parseLoc(loc);
  if (!target) return fail("invalid", `Bad loc "${loc}" (expected "<line>:<column>")`);
  const ast = parseSource(text);
  if (!ast) return fail("invalid", "The file does not parse");
  const element = findElement(ast, target);
  if (!element) return fail("not-found", `No JSX element starts at ${loc}`);
  const actual = jsxName(element.openingElement.name);
  if (actual !== name) return fail("stale", `Expected <${name}> at ${loc}, found <${actual}>`);
  if (text.includes(CHROME_MARK) && insideAny(chromeFunctions(ast), element)) return fail("forbidden", `<${actual}> at ${loc} is docs chrome (zen-studio-chrome); edit it in the code`);
  const eol = options.eol === "\r\n" || options.eol === "\n" ? options.eol : text.includes("\r\n") ? "\r\n" : "\n";
  const ctx = {
    text, ast, element, eol, file,
    unit: indentUnit(text),
    semicolons: !ast.program.body.some((statement) => statement.type === "ImportDeclaration" && !text.slice(statement.start, statement.end).endsWith(";")),
    lineCommentEnds: new Set((ast.comments ?? []).filter((comment) => comment.type === "CommentLine").map((comment) => comment.end)),
    folders: asFolders(componentModules),
    requiredChildren: requiredChildren instanceof Set ? requiredChildren : new Set(Array.isArray(requiredChildren) ? requiredChildren : []),
    requiredProps: requiredProps instanceof Map ? requiredProps : new Map(Object.entries(requiredProps ?? {}).map(([key, value]) => [key, new Set(value)])),
  };
  let plan;
  let next;
  try {
    const nodePath = pathTo(ast.program, element);
    if (!nodePath) throw new EditError("not-found", "The element is not in the file's tree");
    guard(ctx, nodePath, op.op);
    if (op.op === "insertChild") plan = insertPlan(ctx, nodePath, op);
    else if (op.op === "removeElement") plan = removePlan(ctx, nodePath);
    else if (op.op === "duplicateElement") plan = duplicatePlan(ctx, nodePath);
    else if (op.op === "clearSlot") plan = clearPlan(ctx, op);
    else if (op.op === "resetSlot") plan = resetPlan(ctx, nodePath, op, base);
    else if (op.op === "moveTo") plan = moveToPlan(ctx, nodePath, op, ARRANGE_HELPERS);
    else if (op.op === "pasteCode") plan = pasteCodePlan(ctx, nodePath, op, ARRANGE_HELPERS);
    else if (op.op === "replaceElement") plan = replacePlan(ctx, nodePath, op, ARRANGE_HELPERS);
    else if (op.op === "many") plan = manyPlan(ctx, nodePath, op, ARRANGE_HELPERS);
    else if (ITEM_OPS.has(op.op)) plan = itemPlan(ctx, nodePath, op, ITEM_HELPERS);
    else plan = movePlan(ctx, nodePath, op.to);
    if (plan.answer === "removed" || plan.answer === "cleared" || plan.answer === "reset") {
      // A useToast() hook the change leaves unused goes, and component imports it leaves unused (a reset keeps the
      // saved file's); the ones restored content needs come back (reset: as the saved file writes them).
      plan.edits.push(...toastHookRemovals(ctx, plan.edits, plan.keepHook));
      // The same for a useState pair the change leaves unread, and then react's useState import (E2E ST-10).
      const stateRemovals = stateHookRemovals(ctx, plan.edits, plan.keepHook);
      if (stateRemovals.length) {
        plan.edits.push(...stateRemovals);
        const afterState = parseSource(applyEdits(text, plan.edits));
        if (afterState && referenceCount(ast, "useState") > 0 && referenceCount(afterState, "useState") === 0) plan.edits.push(...namedImportRemoval(ctx, "react", "useState"));
      }
      const without = parseSource(applyEdits(text, plan.edits));
      const unused = without ? [...componentImports(ast).keys()].filter((local) => !plan.kept?.has(local) && referenceCount(ast, local) > 0 && referenceCount(without, local) === 0) : [];
      const needed = [...(plan.needed ?? [])];
      if (unused.length || needed.length) plan.edits.push(...(plan.imports ? plan.imports(needed, unused) : importChanges(ast, text, eol, file, needed, unused, plan.folders ?? ctx.folders)));
    }
    next = applyEdits(text, plan.edits);
  } catch (error) {
    if (error instanceof EditError) return fail(error.code, error.message);
    throw error;
  }
  const after = parseSource(next);
  if (!after || after.errors.length > ast.errors.length) return fail("invalid", "The edit would break the file's syntax");
  const imports = plan.edits.filter((edit) => edit.isImport);
  /** The answer for a text made of `edits` (the main ones, plus a snippet's): changed lines, the focus loc, verified. */
  const answer = (edits, out, reparsed, extra) => {
    const changed = changedRange(applyEdits(text, [...imports, ...extra]), out);
    if (!plan.focus) return { code: bom + out, changed, [plan.answer]: true, ...(plan.item ? { item: plan.item } : {}) };
    const at = locAt(out, outputOffset(edits, plan.focus.edit, plan.focus.within));
    if (plan.focus.name) {
      const found = findElement(reparsed, at);
      if (!found || jsxName(found.openingElement.name) !== plan.focus.name) return null;
    }
    return { code: bom + out, changed, [plan.answer]: { loc: locString(at) } };
  };
  const result = answer(plan.edits, next, after, []);
  if (!result) return fail("invalid", "The new element could not be located after the edit (a bug); nothing was written.");
  if (!snippets) return result;
  // The example snippet that shows the element (none: no report; several or none of the examples: a reason).
  const owner = snippetOwner(ctx, element);
  if (!owner) return result;
  if (owner.reason) return { ...result, snippet: { synced: false, reason: owner.reason } };
  let sync;
  try {
    sync = plan.snippet(owner.literal);
  } catch (error) {
    if (!(error instanceof EditError)) throw error;
    sync = { reason: `the example snippet could not be updated (${error.message})` };
  }
  if (sync.reason) return { ...result, snippet: { synced: false, reason: sync.reason } };
  const all = [...plan.edits, ...sync.edits];
  let synced;
  try {
    synced = applyEdits(text, all);
  } catch (error) {
    if (!(error instanceof EditError)) throw error;
    return { ...result, snippet: { synced: false, reason: "the changes overlap in the snippet" } };
  }
  const reparsed = parseSource(synced);
  if (!reparsed || reparsed.errors.length > after.errors.length) return { ...result, snippet: { synced: false, reason: "updating the snippet would break the file's syntax" } };
  const final = answer(all, synced, reparsed, sync.edits);
  if (!final) return { ...result, snippet: { synced: false, reason: "updating the snippet would move the new element (a bug)" } };
  return { ...final, snippet: { synced: true } };
}

/* ── GET /element additions ───────────────────────────────────────────────────────────────────────────────────────── */

/** The outermost JSX elements under `root` (fragments flattened), as { name, loc }, in source order. */
function outerElements(root) {
  const out = [];
  walk(root, (node) => {
    if (node.type !== "JSXElement") return true;
    const start = node.openingElement.loc.start;
    out.push({ name: jsxName(node.openingElement.name), loc: `${start.line}:${start.column}`, at: node.start });
    return false;
  });
  return out.sort((a, b) => a.at - b.at).map(({ name, loc }) => ({ name, loc }));
}

/** How an expression renders its JSX: "map" (a .map list), "and" (cond && …), "ternary" (? :), "other". */
function formOf(expression) {
  const value = unwrapTs(expression);
  if (isMapCall(value)) return "map";
  if (value?.type === "LogicalExpression" && value.operator === "&&") return "and";
  if (value?.type === "ConditionalExpression") return "ternary";
  return "other";
}

/**
 * What GET /element adds for slots: `selfClosing`; per attribute (same order as SourceElement.attributes) null, or
 * { elements, form } when its value holds JSX (form "element" | "fragment" | "map" | "and" | "ternary" | "other");
 * per child (same order as SourceElement.children) null, or { elements, form } for an expression child.
 * With `base` (the saved text; the plugin passes it when the file has a draft), what differs from the saved host
 * (found as resetSlot finds it; normalised sources compared): `childrenModified`, `modified` on each attribute entry,
 * `modifiedProps` (every prop whose JSX or code value differs, one the draft emptied or removed included; not handlers,
 * key, ref, className, style), `savedAttributes` (each attribute of any kind that differs → the saved one or null;
 * 2026-10-05) and `newSinceSave` (no savedAttributes) when
 * the saved file has no such element (its slots then compare with empty ones). Without `base` these are absent.
 */
export function describeSlots(code, file, loc, { base } = {}) {
  const text = code.startsWith(BOM) ? code.slice(1) : code;
  const target = parseLoc(loc);
  if (!target) return null;
  const ast = parseSource(text);
  if (!ast) return null;
  const element = findElement(ast, target);
  if (!element) return null;
  const opening = element.openingElement;
  const attributes = opening.attributes.map((attr) => {
    if (attr.type !== "JSXAttribute" || !attr.value) return null;
    const value = attr.value.type === "JSXExpressionContainer" ? attr.value.expression : attr.value;
    if (value.type === "JSXEmptyExpression") return null;
    const elements = outerElements(value);
    if (!elements.length) return null;
    const bare = unwrapTs(value);
    return { elements, form: bare.type === "JSXElement" ? "element" : bare.type === "JSXFragment" ? "fragment" : formOf(bare) };
  });
  const children = slotEntries(element, text).map(({ child, node }) => {
    if (child.kind !== "expression") return null;
    const expression = node.type === "JSXExpressionContainer" || node.type === "JSXSpreadChild" ? node.expression : node;
    return { elements: outerElements(expression), form: formOf(expression) };
  });
  const out = { file, loc: `${target.line}:${target.column}`, selfClosing: opening.selfClosing, attributes, children };
  if (typeof base !== "string") return out;
  const saved = savedHost({ text, ast, element }, base);
  if (!saved) return out;
  const then = saved.host;
  const savedProp = (prop) => (then ? propSource(saved.text, then, prop) : "");
  const differs = (prop) => propSource(text, element, prop) !== savedProp(prop);
  out.childrenModified = childrenSource(text, element) !== (then ? childrenSource(saved.text, then) : "");
  out.attributes = attributes.map((entry, i) => (entry ? { ...entry, modified: differs(attrName(opening.attributes[i])) } : entry));
  // Every prop of either version whose value is JSX or code (a slot's content may be `leading={kindIcon(kind)}`); the
  // client reads the registry's slot props only. Not strings, handlers, keys, refs or styling.
  const coded = (attr) => attr.type === "JSXAttribute" && Boolean(attr.value) && attr.value.type !== "StringLiteral" && attr.value.expression?.type !== "JSXEmptyExpression";
  const props = new Set([...opening.attributes, ...(then?.openingElement.attributes ?? [])].filter(coded).map(attrName).filter((prop) => !NOT_SLOTS.has(prop) && !/^on[A-Z]/.test(prop)));
  out.modifiedProps = [...props].filter(differs);
  if (!then) out.newSinceSave = true;
  else out.savedAttributes = savedAttributes(text, element, saved, then);
  return out;
}

/**
 * Every attribute either version writes whose source differs (strings, booleans and bare ones included, handlers and
 * styling too): the saved attribute as describeElement lists it, or null when the saved element does not write it.
 */
function savedAttributes(text, element, saved, then) {
  const savedText = saved.text;
  const named = (host) => host.openingElement.attributes.filter((attr) => attr.type === "JSXAttribute");
  const source = (src, host, prop) => {
    const attr = host.openingElement.attributes.findLast((item) => attrName(item) === prop);
    return attr ? (attr.value ? normalised(src.slice(attr.value.start, attr.value.end)) : "") : null;
  };
  const out = {};
  for (const prop of new Set([...named(element), ...named(then)].map(attrName))) {
    if (source(text, element, prop) === source(savedText, then, prop)) continue;
    const attr = then.openingElement.attributes.findLast((item) => attrName(item) === prop);
    // Described against the saved file (state, origin), the way GET /element describes the current one.
    out[prop] = attr ? describeAttrsIn(saved.ast, then, savedText, [attr])[0] : null;
  }
  return out;
}

/** describeElement's answer with describeSlots merged in (arrays matched by position; both read the same text). */
export function withSlots(element, slots) {
  if (!element || !slots || element.loc !== slots.loc) return element;
  const out = { ...element, selfClosing: slots.selfClosing };
  if (typeof slots.childrenModified === "boolean") out.childrenModified = slots.childrenModified;
  if (slots.modifiedProps) out.modifiedProps = slots.modifiedProps;
  if (slots.savedAttributes) out.savedAttributes = slots.savedAttributes;
  if (slots.newSinceSave) out.newSinceSave = true;
  if (slots.attributes.length === element.attributes.length) out.attributes = element.attributes.map((attr, i) => (slots.attributes[i] ? { ...attr, ...slots.attributes[i] } : attr));
  if (slots.children.length === element.children.length) out.children = element.children.map((child, i) => (slots.children[i] && child.kind === "expression" ? { ...child, ...slots.children[i] } : child));
  return out;
}

/* ── data the plugin caches ───────────────────────────────────────────────────────────────────────────────────────── */

/* componentModulesFrom (it reads src/components from the disk) lives in component-modules.mjs, so this module runs in
   the browser as well (Studio builder GĐ2). */

/** Required children and props per component, from src/platform/api.generated.json ({ slug: [{ name, props }] }). */
export function requiredFromApi(api) {
  const requiredChildren = new Set();
  const requiredProps = new Map();
  for (const list of Object.values(api ?? {})) {
    for (const component of Array.isArray(list) ? list : []) {
      for (const prop of component?.props ?? []) {
        if (!prop?.required || typeof component.name !== "string") continue;
        if (prop.name === "children") requiredChildren.add(component.name);
        else {
          if (!requiredProps.has(component.name)) requiredProps.set(component.name, new Set());
          requiredProps.get(component.name).add(prop.name);
        }
      }
    }
  }
  return { requiredChildren, requiredProps };
}
