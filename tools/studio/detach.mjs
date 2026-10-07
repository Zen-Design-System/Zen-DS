// Zen Studio "Detach component" (Figma's Detach instance) at source level: a presentational Zen component instance is
// rewritten as Zen layout primitives with token props (Box / Stack / Text / Heading) plus the Zen atoms it renders as
// leaves (Icon, Avatar, DockIcon, Button, IconButton, Divider, MetricTrend, EmptyStateIllustration), so the Studio's
// spacing and text-style editors can edit the result. Pure (no fs); jsx-source.mjs applyOps calls it for op "detach".
//
//   detachPlan(code, loc, name, { file?, instances?, lists? })
//                                                 → DetachPlan (src/platform/studio/types.ts): ok + component + repeated
//                                                   (+ mapRow for a .map row) + slots, or ok:false + reason
//   detachEdits(text, element, ast, opts)         → { edits, component, approximations, rootOffset, repeated, mapRow, skipSlots }
//        opts: { measured?, instance?, file?, eol?, typographyKeys?, plan?, componentCss? }  (throws EditError on a refusal)
//   importEdits, pathTo, piece, UNIT              also used by jsx-source.mjs op "wrap" (the Layout import, the element's path,
//                                                 lines inside strings that re-indenting must not touch, one indent level)
//
// Rules (user decisions 2026-10-03):
// - Only presentational components (DETACHABLE). An interactive instance is refused with a reason: Card / ListItem with
//   onClick, href or selected; Badge / Tag with remove / onRemove (Tag onClick); InlineMessage with onClose. Interactive
//   components (Button, Input, Table, Dialog…) never detach.
// - Each recipe maps the original attributes' source text (kept verbatim: title={task.title}, caption={`…`},
//   leading={<DockIcon …/>}, children) to primitives whose structure, spacing and text styles mirror the component's
//   own TSX and CSS (cited per recipe). `measured` (token keys the client read on the rendered instance for the plan's
//   slots) overrides the recipe defaults; what a primitive cannot express goes to `approximations`.
// - The output is marked `{/* zen-detached: <Component> · Zen Studio */}` (JSX child position) or
//   `/* zen-detached: … */` (expression position). Imports: the primitives used join the file's imports (a template's
//   "@zen/design-system" import, else ../components/<Folder> relative paths); the original component's specifier goes
//   when nothing uses it any more.
// - Inside a `.map` callback only the selected row detaches: the element becomes `(index as number) === K ?
//   (<detached/>) : (<original/>)` (the cast keeps TypeScript from narrowing the index inside the row), with the
//   callback's index parameter (added as `zenIndex` when missing). Nested maps, rows rendered conditionally, elements
//   that render several times outside a .map callback and a .map that runs in several places (`lists` > 1) are refused.
// - CSS keyed on the component's class (`.zen-card.pe-list-card`, `.pe-panel > .zen-card__content`) stops applying:
//   with `componentCss` (selectors the dev server read from the repo's CSS) the matches are listed as approximations.
import { posix } from "./posix.mjs";
import { CHROME_MARK, EditError, applyEdits, chromeFunctions, findElement, formatAttr, formatText, insideAny, jsxName, parseLoc, parseSource, registerDetach, staticString, walk } from "./jsx-source.mjs";
import { FUNCTION_TYPES, PACKAGE, UNIT, importEdits, indentAt, lineStartOf, pathTo, piece, refuse } from "./source-helpers.mjs";

// The shared helpers moved to source-helpers.mjs (Studio builder GĐ2 M4); importers of detach.mjs keep finding them here.
export { UNIT, importEdits, pathTo, piece } from "./source-helpers.mjs";


/** The comment that marks a detached element. */
export const detachMark = (component) => `zen-detached: ${component} · Zen Studio`;

/** Components a recipe exists for, in the order the Studio lists them. */
export const DETACHABLE = ["Card", "ListItem", "MetricCard", "Metric", "EmptyState", "DescriptionList", "InlineMessage", "Badge", "Tag"];


/** Components that are controls or overlays: never detached (a clearer reason than "not supported"). */
const INTERACTIVE = new Set([
  "Button", "IconButton", "Link", "Chip", "Tabs", "Segmented", "Toggle", "Checkbox", "RadioButton", "RadioGroup", "Slider", "Rating",
  "Input", "InputField", "TextField", "NumberField", "SelectField", "Select", "TextAreaField", "DateField", "DatePicker", "Search",
  "Autocomplete", "RichText", "Uploader", "ColorSelector", "Table", "Dialog", "ModalForm", "SidePanel", "BottomSheet", "Popover",
  "Menu", "Tooltip", "Accordion", "Pagination", "Stepper", "Sidebar", "TopNavigation", "BottomNavigation", "AppShell", "Toast",
  "ActionBar", "Breadcrumbs", "Form", "AiChat", "Chat", "ChartCard",
]);
const PRIMITIVES = new Set(["Box", "Stack", "Grid", "Container", "Text", "Heading"]);

/* ── refusals ─────────────────────────────────────────────────────────────────────────────────────────────────────── */


function notDetachable(name) {
  if (!/^[A-Z]/.test(name)) return `<${name}> is plain markup already; only Zen components detach.`;
  if (PRIMITIVES.has(name)) return `<${name}> is a layout primitive already.`;
  if (INTERACTIVE.has(name)) return `<${name}> is interactive; only presentational components detach (${DETACHABLE.join(", ")}).`;
  return `<${name}> has no detach recipe; detach works on ${DETACHABLE.join(", ")}.`;
}

/* ── measured values ──────────────────────────────────────────────────────────────────────────────────────────────── */

const LONG = { "3xsmall": "3xs", "2xsmall": "2xs", xsmall: "xs", small: "sm", medium: "md", large: "lg", xlarge: "xl", "2xlarge": "2xl", "3xlarge": "3xl" };
const SCALE = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"];
const GAPS = new Set(["none", ...SCALE, "giant", "xgiant", "2xgiant"]);
const PADDINGS = new Set(["none", ...SCALE, "4xl"]);
const RADII = new Set(["none", ...SCALE.filter((step) => step !== "3xs"), "full"]);
const TONES = new Set(["strongest", "base", "light", "primary", "secondary", "tertiary", "accent", "info", "positive", "negative", "warning", "inverse", "on-colors", "disabled", "inherit"]);
const PLAIN_KEY = /^[^"'`\\\r\n${}\u2028\u2029]+$/;

/** Measured values the recipe may use: unknown kinds or values outside the token scales are dropped. */
function validMeasured(measured, keys) {
  const values = {};
  if (measured && typeof measured === "object" && !Array.isArray(measured)) {
    for (const [key, raw] of Object.entries(measured)) if (typeof raw === "string" && raw) values[key] = LONG[raw] ?? raw;
  }
  return { values, keys };
}

/* ── small text helpers ───────────────────────────────────────────────────────────────────────────────────────────── */

/** Source quoted in a reason: one line, at most 48 characters. */
const short = (source) => { const flat = source.replace(/\s+/g, " ").trim(); return flat.length > 48 ? `${flat.slice(0, 47)}…` : flat; };


/** A piece of new code around an original one (`before` and `after` hold no line break, so protected lines stay). */
const around = (part, before, after) => ({ src: `${before}${part.src}${after}`, base: part.base, protect: part.protect });

/** A piece's text with its continuation lines moved from its own indentation to `to` (protected lines untouched). */
function reindent(part, to, eol) {
  const lines = part.src.split(/\r\n|\n|\r/);
  if (lines.length === 1) return part.src;
  return lines.map((line, i) => {
    if (i === 0 || part.protect.has(i)) return line;
    if (!line.trim()) return "";
    let k = 0;
    while (k < part.base.length && k < line.length && (line[k] === " " || line[k] === "\t")) k += 1;
    return to + line.slice(k);
  }).join(eol);
}

/* ── output tree and printer ──────────────────────────────────────────────────────────────────────────────────────── */

// Element: { type: "el", tag, props: Prop[], children: Child[] }
// Prop: { kind: "str", name, value } | { kind: "true", name } | { kind: "code", name, code } (generated, one line)
//     | { kind: "expr", name, piece } ({…} from source) | { kind: "attr", piece } (an original attribute, verbatim)
//     | { kind: "value", name, piece, braces } (an original attribute's value under a new name)
//     | { kind: "comment", text, line } (a comment of the original element the output would drop; `line` for //)
// Child: el | { type: "text", value } | { type: "expr", piece } | { type: "raw", piece } (JSX element from source)
//     | { type: "code", code } | { type: "region", piece, block } (an original children region)
//     | { type: "guard", test: piece | { code }, then: el } ({test ? <el/> : null})
//     | { type: "either", test: piece, yes: Child[], no: Child[] } ({test ? (…) : (…)})
//     | { type: "map", array: piece (ending in ".map"), params, item: el } ({array((params) => (<item/>))})
const el = (tag, props = [], children = []) => ({ type: "el", tag, props: props.filter(Boolean), children: children.filter(Boolean) });
const str = (name, value) => (value === undefined || value === null ? null : { kind: "str", name, value });
const code = (name, value) => (value === undefined || value === null ? null : { kind: "code", name, code: String(value) });
const flag = (name, on = true) => (on ? { kind: "true", name } : null);
/** Text tone, left out when it is the default (strongest). */
const toneProp = (value) => (value && value !== "strongest" && value !== "primary" ? str("tone", value) : null);

function printProp(prop, indent, eol) {
  switch (prop.kind) {
    case "str": return formatAttr(prop.name, { kind: "string", value: prop.value });
    case "true": return prop.name;
    case "code": return `${prop.name}={${prop.code}}`;
    case "expr": return `${prop.name}={${reindent(prop.piece, indent, eol)}}`;
    case "value": return prop.braces ? `${prop.name}={${reindent(prop.piece, indent, eol)}}` : `${prop.name}=${reindent(prop.piece, indent, eol)}`;
    case "attr": return reindent(prop.piece, indent, eol);
    case "comment": return prop.text;
    default: throw new Error(`unknown prop kind ${prop.kind}`);
  }
}

function printChild(child, indent, eol) {
  switch (child.type) {
    case "el": return printElement(child, indent, eol);
    case "text": return formatText(child.value);
    case "expr": return `{${reindent(child.piece, indent, eol)}}`;
    case "raw": return reindent(child.piece, indent, eol);
    case "code": return `{${child.code}}`;
    case "region": return reindent(child.piece, indent, eol);
    case "guard": {
      const test = child.test.code ?? reindent(child.test, indent, eol);
      const then = printElement(child.then, indent + UNIT, eol);
      return !then.includes("\n") && indent.length + test.length + then.length < 110
        ? `{${test} ? ${then} : null}`
        : `{${test} ? (${eol}${indent}${UNIT}${then}${eol}${indent}) : null}`;
    }
    case "either": {
      // {test ? (rows) : (rows)}: one element as is, several in a fragment, none as null.
      const side = (list) => {
        if (!list.length) return "null";
        const inner = indent + UNIT;
        if (list.length === 1) return `(${eol}${inner}${printChild(list[0], inner, eol)}${eol}${indent})`;
        return `(${eol}${inner}<>${list.map((item) => eol + inner + UNIT + printChild(item, inner + UNIT, eol)).join("")}${eol}${inner}</>${eol}${indent})`;
      };
      return `{${reindent(child.test, indent, eol)} ? ${side(child.yes)} : ${side(child.no)}}`;
    }
    case "map": return `{${reindent(child.array, indent, eol)}((${child.params}) => (${eol}${indent}${UNIT}${printElement(child.item, indent + UNIT, eol)}${eol}${indent}))}`;
    default: throw new Error(`unknown child type ${child.type}`);
  }
}

/** JSX for an output element; its first line carries no indentation (the caller places it), the rest are absolute. */
function printElement(node, indent, eol) {
  const inner = indent + UNIT;
  const props = node.props.map((prop) => printProp(prop, inner, eol));
  // A // comment among the props ends its line: the props go one per line.
  const flat = props.every((prop) => !prop.includes("\n")) && !node.props.some((prop) => prop.kind === "comment" && prop.line) && indent.length + node.tag.length + 3 + props.join(" ").length <= 110;
  const open = !props.length ? `<${node.tag}` : flat ? `<${node.tag} ${props.join(" ")}` : `<${node.tag}${props.map((prop) => eol + inner + prop).join("")}${eol}${indent}`;
  if (!node.children.length) return flat ? `${open} />` : `${open}/>`;
  const only = node.children.length === 1 ? node.children[0] : null;
  if (only?.type === "region" && !only.block) return `${open}>${reindent(only.piece, inner, eol)}</${node.tag}>`;
  const kids = node.children.map((child) => printChild(child, inner, eol));
  // One short child stays on the tag's line (a children region only when it was written on the tag's line).
  if (flat && only && (["text", "expr", "code"].includes(only.type) || (only.type === "region" && !only.ownLines)) && !kids[0].includes("\n") && indent.length + open.length + kids[0].length + node.tag.length + 4 <= 120) {
    return `${open}>${kids[0]}</${node.tag}>`;
  }
  return `${open}>${kids.map((kid) => eol + inner + kid).join("")}${eol}${indent}</${node.tag}>`;
}

/* ── reading the original element ─────────────────────────────────────────────────────────────────────────────────── */

const NULLISH = (node) => !node || node.type === "NullLiteral" || (node.type === "Identifier" && node.name === "undefined") || (node.type === "BooleanLiteral" && !node.value);
const isJsx = (node) => node?.type === "JSXElement" || node?.type === "JSXFragment";
/** Expressions that bind looser than a conditional: parenthesised when they become a guard's test. */
const LOOSE_TEST = new Set(["ConditionalExpression", "AssignmentExpression", "SequenceExpression", "ArrowFunctionExpression", "YieldExpression"]);

/** A value that is truthy whatever it holds: TypeScript rejects `x ? … : …` on it (TS2872), so it is never guarded. */
const TRUTHY = (node) => isJsx(node)
  || (node.type === "StringLiteral" && node.value !== "")
  || (node.type === "TemplateLiteral" && node.quasis.some((quasi) => quasi.value.cooked))
  || (node.type === "NumericLiteral" && node.value !== 0)
  || (node.type === "BooleanLiteral" && node.value)
  || ["ObjectExpression", "ArrayExpression", "ArrowFunctionExpression", "FunctionExpression"].includes(node.type)
  || (node.type === "ConditionalExpression" && TRUTHY(node.consequent) && TRUTHY(node.alternate));
/** An expression's source as an operand of `&&`: parenthesized unless it is a primary, member, call or unary expression. */
const SIMPLE_OPERAND = new Set(["Identifier", "ThisExpression", "MemberExpression", "OptionalMemberExpression", "CallExpression", "OptionalCallExpression", "StringLiteral", "NumericLiteral", "BooleanLiteral", "NullLiteral", "TemplateLiteral", "UnaryExpression", "TSNonNullExpression"]);
const operand = (node, source) => (SIMPLE_OPERAND.has(node.type) && !node.extra?.parenthesized ? source : `(${source})`);
/** A reference TypeScript narrows in `x ? x.y : …` (identifiers and plain property chains). */
const narrowable = (node) => node.type === "Identifier" || node.type === "ThisExpression"
  || ((node.type === "MemberExpression" || node.type === "OptionalMemberExpression") && (!node.computed || node.property.type === "StringLiteral" || node.property.type === "NumericLiteral") && narrowable(node.object));

class Recipe {
  constructor(text, element, ast, nodePath, { measured, eol, file }) {
    this.text = text;
    this.element = element;
    this.ast = ast;
    this.path = nodePath;
    this.eol = eol;
    this.file = file;
    this.measured = measured.values;
    this.typographyKeys = measured.keys;
    this.approximations = [];
    this.uses = new Set();
    /** Components the detach removes besides the element itself (DescriptionItem children): their imports may go. */
    this.dropped = new Set();
    /** Plan slots this instance does not use (the client need not measure them). */
    this.skipSlots = new Set();
    this.consumed = new Set();
    this.attrs = [];
    for (const node of element.openingElement.attributes) {
      if (node.type === "JSXSpreadAttribute") refuse(`It spreads {...${short(text.slice(node.argument.start, node.argument.end))}}: detach needs every prop written out.`);
      const name = jsxName(node.name);
      const value = node.value;
      let info;
      if (!value) info = { kind: "true" };
      else if (value.type === "StringLiteral") info = { kind: "string", value: value.value, valueNode: value };
      else if (value.type === "JSXExpressionContainer") {
        const expression = value.expression;
        if (expression.type === "JSXEmptyExpression") refuse(`Its ${jsxName(node.name)} attribute is empty ({}).`);
        else {
          const literal = staticString(expression);
          info = literal !== null ? { kind: "string", value: literal, valueNode: value, expression } : { kind: "expr", expression, valueNode: value };
        }
      } else info = { kind: "expr", expression: value, valueNode: value, bare: true };
      this.attrs.push({ name, node, ...info });
    }
    // Comments between the opening tag's attributes travel with the attribute they precede when it is passed through;
    // any comment of the element the output does not carry (in a re-read attribute value, a dropped child) leads the
    // output root's props (detachEdits).
    this.comments = (ast.comments ?? []).filter((comment) => comment.start >= element.start && comment.end <= element.end);
    this.leadingComments = new Map();
    const opening = element.openingElement;
    for (const comment of this.comments) {
      if (comment.end > opening.end) continue;
      if (opening.attributes.some((node) => node.start <= comment.start && comment.end <= node.end)) continue;
      const next = opening.attributes.find((node) => node.start >= comment.end);
      if (!next) continue;
      const entry = this.leadingComments.get(next) ?? { start: comment.start, list: [] };
      entry.list.push(comment);
      this.leadingComments.set(next, entry);
    }
  }

  /** The attribute named `name` (the last one, as React reads it). */
  attr(name) { return this.attrs.findLast((attr) => attr.name === name) ?? null; }
  has(name) { return this.attr(name) !== null; }
  consume(...names) { for (const name of names) this.consumed.add(name); }

  /** Its string value (also {"x"} and {`x`}); undefined when unset; refuses an expression with `what` in the reason. */
  literal(name, allowed) {
    const attr = this.attr(name);
    this.consume(name);
    if (!attr) return undefined;
    if (attr.kind !== "string") refuse(`Its ${name} comes from {${this.src(attr)}}; set a fixed ${name} before detaching.`);
    if (allowed && !allowed.includes(attr.value)) refuse(`Its ${name}="${attr.value}" is not one the recipe knows (${allowed.join(", ")}).`);
    return attr.value;
  }

  /** true / false for a boolean attribute (shorthand, {true}, {false}); undefined when unset; refuses an expression. */
  boolean(name) {
    const attr = this.attr(name);
    this.consume(name);
    if (!attr) return undefined;
    if (attr.kind === "true") return true;
    if (attr.kind === "expr" && attr.expression.type === "BooleanLiteral") return attr.expression.value;
    refuse(`Its ${name} comes from {${this.src(attr)}}; set it to true or false before detaching.`);
    return undefined;
  }

  /** A number attribute ({2}); undefined when unset. */
  number(name) {
    const attr = this.attr(name);
    this.consume(name);
    if (!attr) return undefined;
    if (attr.kind === "expr" && attr.expression.type === "NumericLiteral") return attr.expression.value;
    refuse(`Its ${name} comes from {${this.src(attr)}}; set a fixed ${name} before detaching.`);
    return undefined;
  }

  /** The value's source: the expression without braces, or the string literal as written (shortened for reasons). */
  src(attr) { return short(this.fullSrc(attr)); }
  fullSrc(attr) { return attr.expression ? this.text.slice(attr.expression.start, attr.expression.end) : this.text.slice(attr.valueNode?.start ?? attr.node.start, attr.valueNode?.end ?? attr.node.end); }

  /** Interactive props that make this instance a control: refused with the reason. */
  refuseInteractive(names, what) {
    for (const name of names) {
      const attr = this.attr(name);
      if (!attr) continue;
      // {false}, {null} and {undefined} turn the prop off: the instance is presentational.
      if (attr.kind === "expr" && NULLISH(attr.expression)) { this.consume(name); continue; }
      refuse(`This ${this.name} is interactive (${name}${attr.kind === "true" ? "" : "={…}"}): ${what}. Only presentational instances detach.`);
    }
  }

  get name() { return jsxName(this.element.openingElement.name); }

  /** A measured token key for `key` when it is valid for `kind`, else `fallback`. */
  m(key, kind, fallback) {
    const value = this.measured[key];
    if (value === undefined) return fallback;
    const ok = kind === "gap" ? GAPS.has(value)
      : kind === "padding" ? PADDINGS.has(value)
      : kind === "radius" ? RADII.has(value)
      : kind === "tone" ? TONES.has(value)
      : kind === "textStyle" ? (this.typographyKeys?.size ? this.typographyKeys.has(value) : PLAIN_KEY.test(value)) : false;
    return ok ? value : fallback;
  }

  approx(message) { if (!this.approximations.includes(message)) this.approximations.push(message); }
  use(...names) { for (const name of names) this.uses.add(name); return names[0]; }

  /** An attribute's value as the same-named (or renamed) prop of an output element. */
  prop(attr, name = attr?.name) {
    if (!attr) return null;
    if (attr.kind === "true") return flag(name);
    if (attr.kind === "string" && !attr.expression) return { kind: "value", name, piece: piece(this.text, attr.valueNode), braces: false };
    return { kind: "expr", name, piece: piece(this.text, attr.expression) };
  }

  /** An attribute's value placed as content: text, a JSX element as is, or {expression}. */
  content(attr) {
    if (!attr) return null;
    if (attr.kind === "string") return { type: "text", value: attr.value };
    if (attr.kind === "true") return { type: "code", code: "true" };
    if (isJsx(attr.expression)) return { type: "raw", piece: piece(this.text, attr.expression) };
    return { type: "expr", piece: piece(this.text, attr.expression) };
  }

  /**
   * `wrap(content)` for an attribute the component renders only when it is truthy: a JSX or string value is always
   * there; `c ? <X/> : null` keeps its condition; any other expression is guarded with {value ? … : null}.
   */
  guarded(attr, wrap) {
    if (!attr) return null;
    if (attr.kind === "string") return attr.value === "" ? null : wrap(this.content(attr));
    if (attr.kind === "true") return wrap(this.content(attr));
    const expression = attr.expression;
    if (TRUTHY(expression) || expression.type === "TemplateLiteral") return wrap(this.content(attr));
    if (expression.type === "ConditionalExpression" && NULLISH(expression.alternate) !== NULLISH(expression.consequent)) {
      const shown = NULLISH(expression.alternate) ? expression.consequent : expression.alternate;
      const test = this.text.slice(expression.test.start, expression.test.end);
      const inner = isJsx(shown) ? { type: "raw", piece: piece(this.text, shown) } : shown.type === "StringLiteral" ? { type: "text", value: shown.value } : { type: "expr", piece: piece(this.text, shown) };
      let condition = NULLISH(expression.alternate) ? test : `!(${test})`;
      // The component renders the value only when it is truthy: `c ? value : null` with a value that may be "" or 0 is
      // guarded by both (a value that is always truthy stays out: TypeScript rejects it in a condition, TS2872).
      const shownSource = this.text.slice(shown.start, shown.end);
      if (!TRUTHY(shown) && shown.type !== "TemplateLiteral" && shownSource !== test && !/[\r\n]/.test(condition + shownSource)) {
        condition = `${NULLISH(expression.alternate) ? operand(expression.test, test) : condition} && ${operand(shown, shownSource)}`;
      }
      return { type: "guard", test: { code: condition }, then: wrap(inner) };
    }
    if (expression.type === "LogicalExpression" && expression.operator === "&&" && isJsx(expression.right)) {
      return { type: "guard", test: piece(this.text, expression.left), then: wrap({ type: "raw", piece: piece(this.text, expression.right) }) };
    }
    // A test that binds looser than `?:` (a nested ternary, an assignment, a sequence, an arrow) needs parentheses, or
    // the guard's own `? … : null` would attach to its last branch.
    if (LOOSE_TEST.has(expression.type)) return { type: "guard", test: { code: `(${this.text.slice(expression.start, expression.end)})` }, then: wrap(this.content(attr)) };
    return { type: "guard", test: piece(this.text, expression), then: wrap(this.content(attr)) };
  }

  /** Attributes the recipe did not read, as written: `key` and `ref` (they lead the output root's props). */
  lead() { return this.passThrough().filter((attr) => attr.name === "key" || attr.name === "ref"); }
  /** The other attributes the recipe did not read (aria-*, data-*, id, className…): they follow the root's props. */
  rest(...skip) { return this.passThrough().filter((attr) => attr.name !== "key" && attr.name !== "ref" && !skip.includes(attr.name)); }
  /** Each attribute with the comments written right above it in the opening tag. */
  passThrough() {
    return this.attrs.filter((attr) => !this.consumed.has(attr.name)).map((attr) => {
      const comments = this.leadingComments.get(attr.node);
      return { kind: "attr", name: attr.name, piece: piece(this.text, attr.node, comments?.start ?? attr.node.start, attr.node.end) };
    });
  }

  /** The element's children between its tags: null when empty; block (movable onto its own lines) or inline. */
  region() {
    const element = this.element;
    if (!element.closingElement) return null;
    const start = element.openingElement.end;
    const end = element.closingElement.start;
    const raw = this.text.slice(start, end);
    if (!raw.trim()) return null;
    const lead = /^\s*/.exec(raw)[0];
    const trail = /\s*$/.exec(raw)[0];
    // Whitespace on the tag's own line is content (JSX keeps " " before <b/> or after text); a line break is not.
    if ((!lead || /[\r\n]/.test(lead)) && (!trail || /[\r\n]/.test(trail))) {
      return { type: "region", block: true, ownLines: /[\r\n]/.test(lead), piece: piece(this.text, element, start + lead.length, end - trail.length) };
    }
    return { type: "region", block: false, piece: piece(this.text, element, start, end) };
  }

  /** The children that render something (not whitespace, not {/* comments *\/}). */
  meaningfulChildren() {
    return this.element.children.filter((child) => !(child.type === "JSXText" && !child.value.trim()) && !(child.type === "JSXExpressionContainer" && child.expression.type === "JSXEmptyExpression"));
  }

  /** A JSX ancestor (inside this file) named one of `names`, nearest first. */
  ancestor(...names) {
    for (let i = this.path.length - 2; i >= 0; i -= 1) {
      const node = this.path[i];
      if (node.type === "JSXElement" && names.includes(jsxName(node.openingElement.name))) return node;
    }
    return null;
  }

  /** An object literal attribute's properties (label, onClick…): name → value node; refuses other forms. */
  objectProps(attr, allowed) {
    const expression = attr.expression;
    if (attr.kind !== "expr" || expression.type !== "ObjectExpression") refuse(`Its ${attr.name} comes from {${this.src(attr)}}; write it as an object literal before detaching.`);
    const out = {};
    for (const property of expression.properties) {
      const key = property.type === "ObjectProperty" && !property.computed ? (property.key.type === "Identifier" ? property.key.name : property.key.type === "StringLiteral" ? property.key.value : null) : null;
      if (!key || !allowed.includes(key)) refuse(`Its ${attr.name} has ${property.type === "SpreadElement" ? "a spread" : property.type === "ObjectMethod" ? "a method" : key ? `"${key}"` : "a computed key"}, which the recipe cannot place (it knows ${allowed.join(", ")}).`);
      out[key] = property.value;
    }
    return out;
  }

  /** An object property value as a prop of an output element. */
  valueProp(node, name) {
    if (!node) return null;
    if (node.type === "StringLiteral") return str(name, node.value);
    return { kind: "expr", name, piece: piece(this.text, node) };
  }

  /** An object property value as content. */
  valueContent(node) {
    if (!node) return null;
    if (node.type === "StringLiteral") return { type: "text", value: node.value };
    const literal = staticString(node);
    if (literal !== null) return { type: "text", value: literal };
    if (isJsx(node)) return { type: "raw", piece: piece(this.text, node) };
    return { type: "expr", piece: piece(this.text, node) };
  }

  /** An icon prop (IconName | ReactNode) as content: a name → <Icon name decorative />, a node as is. */
  icon(attr, size) {
    if (!attr) return null;
    if (attr.kind === "string") return el(this.use("Icon"), [str("name", attr.value), str("size", size), flag("decorative")]);
    if (attr.kind === "true") return null;
    const expression = attr.expression;
    if (isJsx(expression)) return { type: "raw", piece: piece(this.text, expression) };
    // What it can evaluate to: both branches of a ?:, the right side of && (its left renders as itself either way).
    const leaves = [];
    const collect = (node, logical) => {
      if (node.type === "ConditionalExpression") { collect(node.consequent, logical); collect(node.alternate, logical); } else if (node.type === "LogicalExpression" && node.operator === "&&") { collect(node.right, true); } else leaves.push({ node, logical });
    };
    collect(expression, false);
    if (leaves.every((leaf) => leaf.node.type === "StringLiteral" && !leaf.logical)) return el(this.use("Icon"), [{ kind: "expr", name: "name", piece: piece(this.text, expression) }, str("size", size), flag("decorative")]);
    if (!leaves.every(({ node }) => isJsx(node) || NULLISH(node) || node.type === "CallExpression")) {
      this.approx(`${attr.name}={${this.src(attr)}} is placed as is: an icon name string there would show as text (wrap it in <Icon name={…} decorative />).`);
    }
    return { type: "expr", piece: piece(this.text, expression) };
  }
}

/* ── recipes ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Slots of a Box root's padding: all sides, and each axis (CSS keyed on a class may pad them differently, e.g. 4px 0). */
const PADDING_SLOTS = [{ key: "padding", kind: "padding", selector: "" }, { key: "paddingX", kind: "paddingX", selector: "" }, { key: "paddingY", kind: "paddingY", selector: "" }];

/** The root's padding props: paddingX + paddingY when both axes were measured and differ, else one padding. */
function boxPadding(r, fallback) {
  const x = r.m("paddingX", "padding", undefined);
  const y = r.m("paddingY", "padding", undefined);
  if (x !== undefined && y !== undefined && x !== y) return [str("paddingX", x), str("paddingY", y)];
  return [str("padding", x !== undefined && x === y ? x : r.m("padding", "padding", fallback))];
}

/** Card theme → Box surface/border (src/components/Card/card.css). */
function cardBox(r, { theme, spacing, surface }, rootProps) {
  const small = spacing === "sm";
  const fill = theme === "pale" || theme === "semi-pale" ? "pale" : surface === "alt" ? "surface-alt" : "surface";
  if (theme === "shadow") r.approx("Card theme shadow: Shadow/Bottom/Level-1 is dropped (Box has no shadow).");
  if (theme === "pale") r.approx("Card theme pale: Support/Neutral/Pale with the overlay blur becomes Box surface pale (Neutral/Pale).");
  if (theme === "semi-pale") r.approx("Card theme semi-pale: the Pale→Subtle gradient with the overlay blur becomes Box surface pale.");
  const padding = boxPadding(r, small ? "md" : "xl");
  if (!small) r.approx(`Card padding is fixed at ${padding.map((prop) => prop.value).join(" × ")} (Card-padding-medium follows the breakpoint: 24 desktop, 20 tablet and phone).`);
  return [
    ...rootProps,
    str("surface", fill),
    theme === "border" ? str("border", "pale") : null,
    str("radius", r.m("radius", "radius", small ? "lg" : "2xl")),
    ...padding,
  ];
}

/** Children Card renders in .zen-card__content (flex column, gap 0): block children as they are, else a Stack. */
const BLOCK_CHILDREN = new Set(["Stack", "Grid", "Box", "Heading", "Form", "List", "DescriptionList", "Divider", "InlineMessage", "EmptyState", "Metric", "Table", "Container"]);
const INLINE_TEXT = new Set(["span", "strong", "em", "small", "label", "code", "time"]);
function cardContent(r) {
  const region = r.region();
  if (!region) return [];
  const kids = r.meaningfulChildren();
  const block = kids.every((child) => {
    if (child.type !== "JSXElement") return false;
    const name = jsxName(child.openingElement.name);
    if (name === "Text") {
      const as = child.openingElement.attributes.find((attr) => attr.type === "JSXAttribute" && jsxName(attr.name) === "as");
      return !as || (as.value?.type === "StringLiteral" && !INLINE_TEXT.has(as.value.value));
    }
    return BLOCK_CHILDREN.has(name);
  });
  if (block && region.block) return [region];
  return [el(r.use("Stack"), [str("gap", "none")], [region])];
}

/** Card sub-action: a node as is, or { label, icon?, onClick? } → IconButton flat primary sm (Card.tsx). */
function subAction(r) {
  const attr = r.attr("subAction");
  r.consume("subAction");
  if (!attr) return null;
  if (attr.kind === "expr" && attr.expression.type === "ObjectExpression") {
    const props = r.objectProps(attr, ["label", "icon", "onClick"]);
    return el(r.use("IconButton"), [
      str("appearance", "flat"), str("level", "primary"), str("size", "sm"),
      r.valueProp(props.label, "aria-label"),
      props.onClick ? r.valueProp(props.onClick, "onClick") : null,
      props.icon ? r.valueProp(props.icon, "icon") : str("icon", "icon-dots-horizontal-line"),
    ]);
  }
  return r.content(attr);
}

/** Content plus sub-action: Card pins the sub-action to the top-right corner; a primitive puts it beside the content. */
function withSubAction(r, content, sub) {
  if (!sub) return content;
  r.approx("The sub-action sits beside the content in a row (Card pins it to the top-right corner).");
  const body = content.length === 1 && content[0].type === "el" ? content[0] : el(r.use("Stack"), [str("gap", "none")], content);
  body.props.push(code("style", "{ flex: 1 }"));
  return [el(r.use("Stack"), [str("direction", "row"), str("align", "start"), str("gap", "xs")], [body, sub])];
}

const CARD_THEMES = ["shadow", "flat", "pale", "border", "semi-pale"];
const spacingKey = (value) => (value === "sm" || value === "small" ? "sm" : "md");

const RECIPES = {
  /** src/components/Card/Card.tsx + card.css: padding Card-padding-medium/small, radius 2XLarge/Large, theme fills. */
  Card: {
    slots: [...PADDING_SLOTS, { key: "radius", kind: "radius", selector: "" }],
    build(r) {
      r.refuseInteractive(["onClick", "selected", "active"], "a clickable or selectable card");
      const theme = r.literal("theme", CARD_THEMES) ?? "shadow";
      const spacing = spacingKey(r.literal("spacing", ["sm", "md", "small", "medium"]) ?? "md");
      const surface = r.literal("surface", ["default", "alt"]);
      // Only a Canvas/Alt shell sets --zen-card-surface (platform.css .pe-shell[data-canvas="alt"]): flagged where the file uses one.
      if (!surface && theme !== "pale" && theme !== "semi-pale" && /\bcanvas(?:=|:\s*)["']alt["']/.test(r.text)) r.approx("Card follows an inherited --zen-card-surface (Surface/Alt on a Canvas/Alt shell); the Box uses Surface/Default.");
      const as = r.attr("as");
      r.consume("as", "children");
      const sub = subAction(r);
      const content = withSubAction(r, cardContent(r), sub);
      return el(r.use("Box"), [...cardBox(r, { theme, spacing, surface }, [...r.lead(), r.prop(as)]), ...r.rest()], content);
    },
  },

  /**
   * src/components/ListItem/ListItem.tsx + list-item.css: row (gap Medium, align center), padding Padding/Small above and
   * below whether or not it is clickable (only a deprecated List inset pads it sideways, see listRowBox); Leading · Contents (gap
   * 2XSmall: title Body/Base/Bold one line, caption Body/Small/Regular Light) · Trailing (gap Small).
   */
  ListItem: {
    slots: [
      { key: "paddingX", kind: "paddingX", selector: "" }, { key: "paddingY", kind: "paddingY", selector: "" }, { key: "gap", kind: "gap", selector: "" },
      { key: "contentsGap", kind: "gap", selector: ".zen-list-item__contents" },
      { key: "titleStyle", kind: "textStyle", selector: ".zen-list-item__title" }, { key: "captionStyle", kind: "textStyle", selector: ".zen-list-item__caption" },
      { key: "trailingGap", kind: "gap", selector: ".zen-list-item__trailing" },
    ],
    build(r) {
      r.refuseInteractive(["onClick", "href", "selected"], "a clickable or selected row");
      const lines = r.number("titleLines") ?? 1;
      const as = r.attr("as");
      if (as && as.kind !== "string") refuse(`Its as comes from {${r.src(as)}}; set as="li" or as="div" before detaching.`);
      r.consume("as", "title", "caption", "leading", "trailing", "children");
      const box = listRowBox(r);
      const paddingX = r.m("paddingX", "padding", box.x);
      const paddingY = r.m("paddingY", "padding", box.y);
      const padded = (value) => value !== undefined && value !== "none";
      if (box.note) r.approx(box.note(paddingX));
      const region = r.region();
      const contents = region
        ? el(r.use("Stack"), [str("gap", r.m("contentsGap", "gap", "2xs")), code("style", "{ flex: 1 }")], [region])
        : el(r.use("Stack"), [str("gap", r.m("contentsGap", "gap", "2xs")), code("style", "{ flex: 1 }")], [
          el(r.use("Text"), [str("as", "span"), str("textStyle", r.m("titleStyle", "textStyle", "Body/Base/Bold")), lines === 2 ? code("truncate", 2) : flag("truncate")], [r.content(r.attr("title"))]),
          r.guarded(r.attr("caption"), (value) => el(r.use("Text"), [str("as", "span"), str("textStyle", r.m("captionStyle", "textStyle", "Body/Small/Regular")), str("tone", "light")], [value])),
        ]);
      const trailing = r.guarded(r.attr("trailing"), (value) => el(r.use("Stack"), [str("direction", "row"), str("align", "center"), str("gap", r.m("trailingGap", "gap", "sm"))], [value]));
      return el(r.use("Stack"), [
        ...r.lead(),
        as ? r.prop(as) : str("as", "li"),
        str("direction", "row"), str("align", "center"), str("gap", r.m("gap", "gap", "md")),
        padded(paddingX) ? str("paddingX", paddingX) : null,
        padded(paddingY) ? str("paddingY", paddingY) : null,
        ...r.rest(),
      ], [r.icon(r.attr("leading")), contents, trailing]);
    },
  },

  /** MetricCard (MetricWidget.tsx): a Card (Shadow, Spacing Medium) holding an XLarge Metric and a Sub-Action. */
  MetricCard: {
    slots: [...PADDING_SLOTS, { key: "radius", kind: "radius", selector: "" }, ...metricSlots(".zen-metric")],
    build(r) {
      const theme = r.literal("theme", CARD_THEMES) ?? "shadow";
      r.consume("className");
      const className = r.attr("className");
      const sub = subAction(r);
      const metric = buildMetric(r);
      const dropped = r.rest();
      if (dropped.length) r.approx(`MetricCard does not pass ${dropped.map((attr) => attr.name).join(", ")} to the page; the detached code drops ${dropped.length > 1 ? "them" : "it"} too.`);
      return el(r.use("Box"), [...cardBox(r, { theme, spacing: "md" }, r.lead()), r.prop(className)], withSubAction(r, [metric], sub));
    },
  },

  /** Metric (MetricWidget.tsx + metric-widget.css): Icon-Highlight and Title-Highlight layouts per size. */
  Metric: {
    slots: metricSlots(""),
    build(r) {
      const metric = buildMetric(r, true);
      metric.props.unshift(...r.lead());
      metric.props.push(...r.rest());
      return metric;
    },
  },

  /**
   * EmptyState.tsx + empty-state.css: a centred column min(320px, 100%) wide (gap XSmall, padding-bottom 4XLarge) of the
   * illustration, then the body (gap XLarge) of Title + Caption (gap 2XSmall) and the full-width CTAs (gap Small).
   */
  EmptyState: {
    slots: [
      { key: "gap", kind: "gap", selector: "" }, { key: "bodyGap", kind: "gap", selector: ".zen-empty-state__body" },
      { key: "titleStyle", kind: "textStyle", selector: ".zen-empty-state__title" }, { key: "captionStyle", kind: "textStyle", selector: ".zen-empty-state__caption" },
      { key: "actionsGap", kind: "gap", selector: ".zen-empty-state__actions" },
    ],
    build(r) {
      r.consume("title", "children", "icon", "primaryAction", "secondaryAction");
      const explicitLevel = r.number("headingLevel");
      if (explicitLevel !== undefined && ![2, 3, 4, 5, 6].includes(explicitLevel)) refuse(`Its headingLevel={${explicitLevel}} is outside 2–6.`);
      const compact = r.boolean("compactTitle") ?? false;
      const illustrationAttr = r.attr("illustration");
      r.consume("illustration");
      const chart = r.ancestor("ChartCard");
      let level = explicitLevel ?? 3;
      if (explicitLevel === undefined && chart) {
        const chartLevel = chart.openingElement.attributes.find((attr) => attr.type === "JSXAttribute" && jsxName(attr.name) === "headingLevel");
        const value = chartLevel?.value?.type === "JSXExpressionContainer" && chartLevel.value.expression.type === "NumericLiteral" ? chartLevel.value.expression.value : 3;
        level = Math.min(value + 1, 6);
      }
      const titleStyle = r.m("titleStyle", "textStyle", compact || chart || level >= 4 ? "Body/Extra/Bold" : "Heading/4");
      let illustration = null;
      if (!illustrationAttr || illustrationAttr.kind === "true" || (illustrationAttr.kind === "expr" && illustrationAttr.expression.type === "BooleanLiteral")) {
        const on = !illustrationAttr || illustrationAttr.kind === "true" || illustrationAttr.expression.value;
        if (on) illustration = el(r.use("EmptyStateIllustration"), [r.prop(r.attr("icon"))]);
      } else if (illustrationAttr.kind === "expr" && isJsx(illustrationAttr.expression)) {
        illustration = r.content(illustrationAttr);
      } else refuse(`Its illustration comes from {${r.src(illustrationAttr)}}; set it to true, false or an element before detaching.`);
      const button = (attr, level) => {
        if (!attr) return null;
        const props = r.objectProps(attr, ["label", "onClick", "level"]);
        return el(r.use("Button"), [props.level ? r.valueProp(props.level, "level") : str("level", level), r.valueProp(props.onClick, "onClick")], [r.valueContent(props.label)]);
      };
      const actions = [button(r.attr("primaryAction"), "primary"), button(r.attr("secondaryAction"), "tertiary")].filter(Boolean);
      const region = r.region();
      const content = el(r.use("Stack"), [str("gap", "2xs")], [
        el(r.use("Heading"), [code("level", level), str("textStyle", titleStyle), str("align", "center")], [r.content(r.attr("title"))]),
        region ? el(r.use("Text"), [str("textStyle", r.m("captionStyle", "textStyle", "Body/Base/Regular")), str("tone", "light"), str("align", "center")], [region]) : null,
      ]);
      const body = actions.length
        ? el(r.use("Stack"), [str("gap", r.m("bodyGap", "gap", "xl"))], [content, el(r.use("Stack"), [str("gap", r.m("actionsGap", "gap", "sm")), str("align", "stretch")], actions)])
        : content;
      const style = r.attr("style");
      const styleProp = style
        ? { kind: "expr", name: "style", piece: around(piece(r.text, style.expression ?? style.valueNode), '{ width: "min(320px, 100%)", marginInline: "auto", paddingBottom: "var(--zen-spacing-padding-4-xlarge)", ...', " }") }
        : code("style", '{ width: "min(320px, 100%)", marginInline: "auto", paddingBottom: "var(--zen-spacing-padding-4-xlarge)" }');
      return el(r.use("Stack"), [
        ...r.lead(),
        str("as", "section"), str("gap", r.m("gap", "gap", "xs")), styleProp,
        ...r.rest("style"),
      ], [illustration ? el(r.use("Stack"), [str("align", "center")], [illustration]) : null, body]);
    },
  },

  /**
   * DescriptionList.tsx + description-list.css: rows of term (Body/Small/Regular, Base) and value (Body/Base/Medium,
   * end-aligned inline), row gap XSmall inline / Medium stacked; divider: Pale rules with Padding/Small around them;
   * the emphasis row (a total) in Body/Base/Bold under a High (Solid) rule.
   */
  DescriptionList: {
    slots: [
      { key: "gap", kind: "gap", selector: "" },
      { key: "termStyle", kind: "textStyle", selector: ".zen-description-list__term" },
      { key: "descriptionStyle", kind: "textStyle", selector: ".zen-description-list__description" },
    ],
    build(r) {
      const layout = r.literal("layout", ["inline", "stacked"]) ?? "inline";
      const divider = r.boolean("divider") ?? false;
      if (r.has("stackBelow")) r.number("stackBelow");
      r.consume("items", "children");
      // Entries: a row; `either` (rows under a condition: `c ? {…} : {…}`, `...(c ? [{…}] : [])`); `map` (`...xs.map(…)`).
      const entries = [];
      const itemsAttr = r.attr("items");
      if (itemsAttr) {
        const items = itemsAttr.kind === "expr" ? unwrapTs(itemsAttr.expression) : null;
        if (items?.type === "ArrayExpression") for (const item of items.elements) entries.push(...descriptionEntries(r, item));
        else if (items && isMapCall(items)) entries.push(mappedRows(r, items));
        else refuse(`Its rows come from {${r.src(itemsAttr)}}; detach needs the items written out as an array of objects.`);
      }
      for (const child of r.meaningfulChildren()) {
        if (child.type !== "JSXElement" || jsxName(child.openingElement.name) !== "DescriptionItem") refuse("Its children are not DescriptionItem elements written out.");
        r.dropped.add("DescriptionItem");
        const item = new Recipe(r.text, child, r.ast, r.path, { measured: { values: {} }, eol: r.eol, file: r.file });
        const emphasis = item.boolean("emphasis") ?? false;
        entries.push({ kind: "row", row: { term: item.content(item.attr("term")), description: item.content(item.attr("description")), action: item.content(item.attr("action")), emphasis } });
      }
      if (!entries.length) refuse("It has no rows to detach.");
      const rows = entries.flatMap((entry) => (entry.kind === "row" ? [entry.row] : entry.kind === "map" ? [entry.row] : [...entry.yes, ...entry.no]));
      const inline = layout === "inline";
      r.approx("The dl/dt/dd semantics become divs in Stacks (no layout primitive renders a description list).");
      if (inline) r.approx("Inline rows no longer share one term column and no longer stack below 280px (stackBelow).");
      if (inline && rows.some((row) => row.action)) r.approx("Rows no longer share the action column: a row without an action (or with a narrower one) runs its value further to the end instead of lining up with the other values.");
      if (rows.some((row) => row.emphasis) && !divider) r.approx("The total's High rule sits in the list gap (the component pads it with Padding/Small).");
      // A divider list has no gap of its own (its rows carry Padding/Small around each rule): the measured gap reads 0.
      if (divider) r.skipSlots.add("gap");
      const gap = divider ? "sm" : r.m("gap", "gap", inline ? "xs" : "md");
      const termStyle = r.m("termStyle", "textStyle", "Body/Small/Regular");
      const valueStyle = r.m("descriptionStyle", "textStyle", "Body/Base/Medium");
      // Terms and values are divs (Text as="div"): a value may hold block content (a Stack, a List), which a <p> cannot.
      // Inline rows: the term takes up to half the row (fit-content(50%)), the value the rest, end-aligned (minmax(0, 1fr)).
      const rowElement = (row, key) => {
        const term = el(r.use("Text"), [str("as", "div"), str("textStyle", row.emphasis ? "Body/Base/Bold" : termStyle), row.emphasis ? null : str("tone", "base"), inline ? code("style", '{ maxWidth: "50%" }') : null], [row.term]);
        const value = el(r.use("Text"), [str("as", "div"), str("textStyle", row.emphasis ? "Body/Base/Bold" : valueStyle), inline ? str("align", "end") : null, inline ? code("style", "{ flex: 1, minWidth: 0 }") : null], [row.description]);
        if (inline) return el(r.use("Stack"), [key, str("direction", "row"), str("align", "baseline"), str("gap", "md")], [term, value, row.action]);
        if (row.action) return el(r.use("Stack"), [key, str("direction", "row"), str("align", "center"), str("justify", "between"), str("gap", "md")], [el(r.use("Stack"), [str("gap", "2xs"), code("style", "{ flex: 1, minWidth: 0 }")], [term, value]), row.action]);
        return el(r.use("Stack"), [key, str("gap", "2xs")], [term, value]);
      };
      // Rules sit between rendered rows (divider), and above the total (emphasis): never above the list's first row.
      const rule = (row) => (divider || row.emphasis ? el(r.use("Divider"), [row.emphasis ? str("color", "high") : null]) : null);
      const hiddenRule = "A rule shows above the first row when the rows before it are hidden (the component rules only between rendered rows).";
      let before = false;
      // Whether every entry so far may render no row (a .map, or a condition with an empty side): a rule above the next
      // entry may then be the list's first line. An always-rendered row (a literal, or a condition with rows on both sides) ends that.
      let emptySoFar = true;
      const ruled = (row, first) => {
        const line = first && !before ? null : rule(row);
        if (line && first && emptySoFar) r.approx(hiddenRule);
        return line;
      };
      const branch = (list) => list.flatMap((row, index) => [ruled(row, index === 0), rowElement(row)]).filter(Boolean);
      const out = [];
      for (const entry of entries) {
        if (entry.kind === "row") {
          out.push(ruled(entry.row, true), rowElement(entry.row));
          emptySoFar = false;
        } else if (entry.kind === "either") {
          out.push({ type: "either", test: entry.test, yes: branch(entry.yes), no: branch(entry.no) });
          if (entry.yes.length && entry.no.length) emptySoFar = false;
        } else {
          const key = entry.row.id ? { kind: "expr", name: "key", piece: piece(r.text, entry.row.id) } : code("key", entry.index);
          const line = rule(entry.row);
          if (line && before && emptySoFar) r.approx(hiddenRule);
          const item = line
            ? el(r.use("Stack"), [key, str("gap", gap)], [before ? line : { type: "guard", test: { code: `${entry.index} > 0` }, then: line }, rowElement(entry.row)])
            : rowElement(entry.row, key);
          out.push({ type: "map", array: entry.array, params: entry.row.id && (!line || before) ? entry.params : entry.indexed, item });
        }
        before = true;
      }
      return el(r.use("Stack"), [...r.lead(), str("gap", gap), ...r.rest()], out.filter(Boolean));
    },
  },

  /**
   * InlineMessage.tsx + inline-message.css: Subtle surface, padding Medium, radius Large, row gap Small: icon (20px,
   * Content/<theme>/Light) · content (gap Small) of the text (gap 3XSmall: title Body/Base/Bold, caption Body/Small/Regular)
   * and a Tertiary sm action; role alert for warning/negative, else status.
   */
  InlineMessage: {
    slots: [
      ...PADDING_SLOTS, { key: "radius", kind: "radius", selector: "" }, { key: "gap", kind: "gap", selector: "" },
      { key: "titleStyle", kind: "textStyle", selector: ".zen-inline-message__title" }, { key: "captionStyle", kind: "textStyle", selector: ".zen-inline-message__caption" },
      { key: "titleTone", kind: "tone", selector: ".zen-inline-message__title" }, { key: "captionTone", kind: "tone", selector: ".zen-inline-message__caption" },
    ],
    build(r) {
      r.refuseInteractive(["onClose"], "a dismissible message");
      r.consume("closeLabel", "title", "children", "icon", "action");
      const status = r.literal("status", ["success", "error", "warning", "info"]);
      const theme = r.literal("theme", ["neutral", "info", "positive", "warning", "negative", "custom"]) ?? (status === "success" ? "positive" : status === "error" ? "negative" : status) ?? "neutral";
      const family = { info: "info", positive: "positive", warning: "warning", negative: "negative" }[theme];
      if (family) r.approx(`Theme ${theme}: the ${family[0].toUpperCase()}${family.slice(1)}/Subtle fill becomes Box surface subtle (Neutral/Subtle); the title takes the ${family} tone (Base, not Strongest).`);
      r.approx("The icon takes the text colour (InlineMessage paints it Content/<Theme>/Light).");
      const iconAttr = r.attr("icon");
      const themeIcon = { neutral: "icon-info-circle-solid", info: "icon-info-circle-solid", positive: "icon-check-circle-solid", warning: "icon-alert-triangle-solid", negative: "icon-alert-octagon-solid", custom: "icon-image-solid" }[theme];
      let icon;
      if (!iconAttr || iconAttr.kind === "true" || (iconAttr.kind === "expr" && iconAttr.expression.type === "BooleanLiteral" && iconAttr.expression.value)) icon = el(r.use("Icon"), [str("name", themeIcon), theme === "custom" ? str("size", "xl") : null, flag("decorative")]);
      else if (iconAttr.kind === "expr" && iconAttr.expression.type === "BooleanLiteral") icon = null;
      else icon = r.icon(iconAttr);
      const region = r.region();
      const text = [
        r.guarded(r.attr("title"), (value) => el(r.use("Text"), [str("as", "span"), str("textStyle", r.m("titleStyle", "textStyle", "Body/Base/Bold")), toneProp(r.m("titleTone", "tone", family ?? "strongest"))], [value])),
        region ? el(r.use("Text"), [str("as", "span"), str("textStyle", r.m("captionStyle", "textStyle", "Body/Small/Regular")), toneProp(r.m("captionTone", "tone", family ?? "base"))], [region]) : null,
      ].filter(Boolean);
      const actionAttr = r.attr("action");
      const action = actionAttr ? (() => {
        const props = r.objectProps(actionAttr, ["label", "onClick"]);
        return el(r.use("Button"), [str("level", "tertiary"), str("size", "sm"), r.valueProp(props.onClick, "onClick")], [r.valueContent(props.label)]);
      })() : null;
      const textStack = el(r.use("Stack"), [str("gap", "3xs")], text);
      const content = action ? el(r.use("Stack"), [str("gap", "sm"), str("align", "start")], [textStack, action]) : textStack;
      const urgent = theme === "negative" || theme === "warning";
      return el(r.use("Box"), [
        ...r.lead(),
        str("surface", "subtle"), str("radius", r.m("radius", "radius", "lg")), ...boxPadding(r, "md"), str("role", urgent ? "alert" : "status"),
        ...r.rest(),
      ], [el(r.use("Stack"), [str("direction", "row"), str("gap", r.m("gap", "gap", "sm")), str("align", "start")], [icon, content])]);
    },
  },

  /** Badge.tsx + badge.css: a rounded pill, padding/gap per Size, a leading dot or icon, the label in the Size's text style. */
  Badge: {
    slots: [
      { key: "paddingX", kind: "paddingX", selector: "" }, { key: "paddingY", kind: "paddingY", selector: "" }, { key: "gap", kind: "gap", selector: "" },
      { key: "textStyle", kind: "textStyle", selector: ".zen-badge__text" }, { key: "tone", kind: "tone", selector: ".zen-badge__text" },
    ],
    build(r) {
      r.refuseInteractive(["remove", "onRemove"], "a removable badge");
      phrasingCheck(r);
      r.consume("removeLabel", "children", "leading");
      const themes = ["accent", "neutral", "yellow", "orange", "red", "crimson", "pink", "plum", "purple", "violet", "indigo", "blue", "cyan", "teal", "green", "brown", "inverse", "on-color"];
      const theme = r.literal("theme", themes) ?? r.literal("color", themes) ?? "neutral";
      const background = r.literal("background", ["solid", "subtle"]) ?? "solid";
      const size = { xs: "xs", xsmall: "xs", sm: "sm", small: "sm", md: "md", medium: "md" }[r.literal("size", ["xs", "sm", "md", "xsmall", "small", "medium"]) ?? "md"];
      const leadingIcon = r.boolean("leadingIcon") ?? true;
      const tone = { neutral: "strongest", accent: "accent", yellow: "warning", red: "negative", crimson: "negative", green: "positive", blue: "info", cyan: "info", indigo: "info" }[theme] ?? "strongest";
      if (background === "solid" || theme !== "neutral") r.approx(`Badge ${theme} ${background}: the fill becomes Box surface subtle (Neutral/Subtle) and the label takes the ${tone} tone.`);
      r.approx("Badge's fixed height, min-width and the label's own side padding (2–4px) are not kept.");
      const textStyle = r.m("textStyle", "textStyle", size === "xs" ? "Caption/Medium" : size === "sm" ? "Body/Small/Medium" : "Body/Base/Medium");
      const leadingAttr = r.attr("leading");
      let leading = null;
      if (size !== "xs") {
        if (leadingAttr) leading = r.icon(leadingAttr, size === "md" ? "sm" : "xs");
        else if (leadingIcon) leading = el(r.use("Icon"), [str("name", "icon-circle-small-solid"), str("size", size === "md" ? "sm" : "xs"), flag("decorative")]);
      }
      if (leading) r.approx("The leading dot or icon takes the label colour (Badge paints it separately).");
      const region = r.region();
      const label = el(r.use("Text"), [str("as", "span"), str("textStyle", textStyle), toneProp(r.m("tone", "tone", tone)), flag("truncate")], region ? [region] : []);
      const pad = { md: ["xs", "2xs", "2xs"], sm: ["2xs", "3xs", "none"], xs: ["3xs", "3xs", "3xs"] }[size];
      return el(r.use("Box"), [
        ...r.lead(),
        str("surface", "subtle"), str("radius", "full"), str("paddingX", r.m("paddingX", "padding", pad[0])), str("paddingY", r.m("paddingY", "padding", pad[1])),
        code("style", '{ width: "max-content", maxWidth: "100%" }'),
        ...r.rest(),
      ], [el(r.use("Stack"), [str("direction", "row"), str("align", "center"), str("gap", r.m("gap", "gap", pad[2]))], [leading, label])]);
    },
  },

  /** Tag.tsx + tag.css: Medium, rounded, Neutral/Ghost fill, 1px stroke, padding 4/6, gap 2, leading icon or 2XSmall photo, Body/Base/Medium label. */
  Tag: {
    slots: [
      { key: "paddingX", kind: "paddingX", selector: "" }, { key: "paddingY", kind: "paddingY", selector: "" }, { key: "gap", kind: "gap", selector: "" },
      { key: "textStyle", kind: "textStyle", selector: ".zen-tag__label" },
    ],
    build(r) {
      r.refuseInteractive(["remove", "onRemove", "onClick"], "a removable or clickable tag");
      phrasingCheck(r);
      r.consume("removeLabel", "children", "leading", "photoSrc");
      const disabled = r.boolean("disabled") ?? false;
      const error = r.boolean("error") ?? false;
      const state = r.literal("state", ["default", "hover", "focused", "error", "disabled"]);
      if (error || state === "error") r.approx("State error: the Negative fill and stroke are not kept.");
      if (state === "hover" || state === "focused") r.approx(`State ${state} is a preview state; the detached tag shows the default look.`);
      const off = disabled || state === "disabled";
      r.approx("Tag's Border/Neutral/Subtle stroke and Shadow/Action/Tertiary become Box border pale (a static box); the 6px side padding becomes 2xs.");
      if (off) r.approx("State disabled: the Border/Disabled stroke becomes Box border pale.");
      const photo = r.attr("photoSrc");
      const leading = photo
        ? el(r.use("Avatar"), [str("size", "2xsmall"), str("theme", "photo"), str("background", "subtle"), r.prop(photo, "src"), str("alt", "")])
        : r.icon(r.attr("leading"), "sm");
      const region = r.region();
      const label = el(r.use("Text"), [str("as", "span"), str("textStyle", r.m("textStyle", "textStyle", "Body/Base/Medium")), off ? str("tone", "disabled") : null, flag("truncate")], region ? [region] : []);
      return el(r.use("Box"), [
        ...r.lead(),
        // Tag's fill is Neutral/Ghost/Default, the same colour as Surface/Default in light and dark (tokens.css).
        str("surface", "surface"), str("border", "pale"), str("radius", "full"), str("paddingX", r.m("paddingX", "padding", "2xs")), str("paddingY", r.m("paddingY", "padding", "2xs")),
        off ? str("aria-disabled", "true") : null,
        code("style", '{ width: "max-content", maxWidth: "100%" }'),
        ...r.rest(),
      ], [el(r.use("Stack"), [str("direction", "row"), str("align", "center"), str("gap", r.m("gap", "gap", "3xs"))], [leading, label])]);
    },
  },
};

/** Text `as` values (and tags) whose content model allows a <div>: the default <p> and the phrasing ones do not. */
const FLOW_TEXT = new Set(["div", "li", "dt", "dd", "figcaption"]);
const PHRASING_TAGS = new Set(["span", "label", "strong", "em", "small", "b", "i", "u", "s", "a", "button", "code", "time", "abbr", "cite", "q", "sub", "sup", "mark", "legend", "h1", "h2", "h3", "h4", "h5", "h6", "Heading", "Link"]);

/**
 * Badge / Tag render a <span>; the detached Box is a <div>. Inside a paragraph (<p>, <Text> as p) that is a DOM-nesting
 * error (refused); inside other phrasing content (a span, a heading, a label…) it is invalid HTML browsers still show
 * (an approximation). The nearest JSX element around it decides; inside an attribute value nothing is known.
 */
function phrasingCheck(r) {
  for (let i = r.path.length - 2; i >= 0; i -= 1) {
    const node = r.path[i];
    if (node.type === "JSXAttribute") return;
    if (node.type !== "JSXElement") continue;
    const name = jsxName(node.openingElement.name);
    let tag = name;
    if (name === "Text") {
      const as = node.openingElement.attributes.find((attr) => attr.type === "JSXAttribute" && jsxName(attr.name) === "as");
      if (as && as.value?.type !== "StringLiteral") return;
      tag = as ? as.value.value : "p";
      if (FLOW_TEXT.has(tag)) return;
    }
    const where = name === "Text" ? `<Text${tag === "p" ? "" : ` as="${tag}"`}>` : `<${name}>`;
    if (tag === "p") refuse(`It sits inside a paragraph (${where}): the detached ${r.name} is a <div> Box, which a <p> cannot hold. Give the text as="div" or move the ${r.name.toLowerCase()} out of it before detaching.`);
    if (PHRASING_TAGS.has(tag)) r.approx(`It sits inside ${where} (phrasing content): the detached <div> Box is invalid HTML there (browsers still show it).`);
    return;
  }
}

function metricSlots(prefix) {
  const at = (selector) => (prefix ? `${prefix} ${selector}`.trim() : selector);
  return [
    { key: "metricGap", kind: "gap", selector: prefix },
    { key: "contentsGap", kind: "gap", selector: at(".zen-metric__contents") },
    { key: "labelStyle", kind: "textStyle", selector: at(".zen-metric__label") },
    { key: "titleStyle", kind: "textStyle", selector: at(".zen-metric__title") },
    { key: "valueStyle", kind: "textStyle", selector: at(".zen-metric__value") },
  ];
}

/**
 * The box a ListItem keeps (list-item.css, Figma List-Item since 2026-10-06): Padding/Small above and below, clickable or
 * not; only a deprecated List inset (its own List's or an outer one's, the variable inherits) pads it sideways. { x, y }
 * (x undefined: no side padding) and `note(x)` for an inset that follows the breakpoint or cannot be read.
 */
function listRowBox(r) {
  const list = r.path.findLast((node, i) => i < r.path.length - 1 && node.type === "JSXElement" && zenName(r, node) === "List");
  const inset = list ? listInset(r, list) : {};
  return { x: inset.x, y: "sm", note: inset.note };
}

/** `rows.map(fn)`, `rows?.flatMap(fn)`, `Array.from(x, fn)`: fn's result renders where the call is. */
function rowsCall(node) {
  if (node?.type !== "CallExpression" && node?.type !== "OptionalCallExpression") return false;
  const callee = node.callee;
  if (isMapCallee(callee)) return true;
  if ((callee.type !== "MemberExpression" && callee.type !== "OptionalMemberExpression") || callee.computed || callee.property.type !== "Identifier") return false;
  return callee.property.name === "flatMap" || (callee.property.name === "from" && callee.object.type === "Identifier" && callee.object.name === "Array");
}
/** The function a rows call renders per row, when `fn` is it. */
const rowsCallback = (call, fn) => rowsCall(call) && FUNCTION_TYPES.has(fn?.type) && call.arguments.at(-1) === fn;

/** Whether an import source is Zen: the package, or a relative path into src/components. */
const zenSource = (r, source) => source === PACKAGE || (source.startsWith(".") && posix.join(posix.dirname(r.file ?? "src/platform/x.tsx"), source).startsWith("src/components/"));
/**
 * What a JSX element is: a Zen component's own name (read through the file's imports, so aliases and namespace imports
 * resolve), "tag" for a DOM element, null for anything else (a local or third-party component).
 */
function zenName(r, node) {
  const name = jsxName(node.openingElement.name);
  if (/^[a-z]/.test(name)) return "tag";
  const [head, member, deeper] = name.split(".");
  if (deeper) return null;
  for (const statement of r.ast.program.body) {
    if (statement.type !== "ImportDeclaration" || statement.importKind === "type" || !zenSource(r, statement.source.value)) continue;
    const specifier = statement.specifiers.find((item) => item.local.name === head);
    if (!specifier) continue;
    if (specifier.type === "ImportSpecifier") return member ? null : specifier.imported.name ?? specifier.imported.value;
    if (specifier.type === "ImportNamespaceSpecifier") return member ?? null;
  }
  return null;
}

/**
 * The --zen-list-inset `list`'s rows read: its deprecated inset, else the nearest outer List's (the variable inherits),
 * else none (no padding). { x, note(x) } where the inset follows the breakpoint or cannot be read.
 */
function listInset(r, list) {
  for (let i = r.path.indexOf(list); i >= 0; i -= 1) {
    const node = r.path[i];
    if (FUNCTION_TYPES.has(node.type) && !rowsCallback(r.path[i - 1], node)) break;
    if (node.type !== "JSXElement" || zenName(r, node) !== "List") continue;
    const attrs = node.openingElement.attributes;
    const at = attrs.findLastIndex((attr) => attr.type === "JSXAttribute" && jsxName(attr.name) === "inset");
    const spread = attrs.findLastIndex((attr) => attr.type === "JSXSpreadAttribute");
    const whose = node === list ? "Its List" : "An outer List (its rows inherit --zen-list-inset)";
    if (spread > at) return { note: (x) => `${whose} spreads {${short(r.text.slice(attrs[spread].argument.start, attrs[spread].argument.end))}}, which may set its inset; the detached row fixes paddingX ${x ?? "none"}.` };
    if (at < 0) continue;
    const written = attrs[at].value?.type === "JSXExpressionContainer" ? attrs[at].value.expression : attrs[at].value;
    const value = !written || NULLISH(written) ? "auto" : staticString(written);
    if (value === "auto") continue;
    if (value === "none") return {};
    if (value === "comfortable") return { x: "xl", note: (x) => `${whose} has inset="comfortable", which follows the breakpoint (Margin/Comfortable: xl on desktop and tablet, lg on phones); the detached row fixes paddingX ${x ?? "none"}.` };
    if (value === "compact") return { x: "lg", note: (x) => `${whose} has inset="compact", which follows the breakpoint (Margin/Compact: lg on desktop and tablet, md on phones); the detached row fixes paddingX ${x ?? "none"}.` };
    return { note: (x) => `${whose} takes its inset from {${short(r.text.slice(written.start, written.end))}}; the detached row fixes paddingX ${x ?? "none"}.` };
  }
  return {};
}

/**
 * Whether style-guard's type/visual-heading would read this <Text> as a title: a Heading/1–4 or Subheading style around
 * text that is not a number or a value-like expression (tools/style-guard/check-styles.mjs, checkTsx).
 */
function visualHeading(node) {
  const style = node.props.find((prop) => prop.name === "textStyle")?.value ?? "";
  if (!/^Heading\/(?:1|2|3|4|Subheading)$/.test(style)) return false;
  const child = node.children[0];
  if (!child) return false;
  if (child.type === "text") return !/^[\s\d$€£¥%.,+\-−×/:]+$/.test(child.value);
  if (child.type === "expr" || child.type === "code") {
    const source = child.code ?? child.piece.src;
    return !/^[^}]*(value|count|total|amount|price|percent|stat|metric|number|sum|\.length)[^}]*$/i.test(source);
  }
  return true;
}

/* ── DescriptionList rows ──────────────────────────────────────────────────────────────────────────────────────── */

/** The expression inside `x as T`, `x satisfies T`, `x!` and parentheses. */
function unwrapTs(node) {
  let current = node;
  while (current && ["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression", "TSTypeAssertion", "ParenthesizedExpression"].includes(current.type)) current = current.expression;
  return current;
}

const isMapCall = (node) => (node.type === "CallExpression" || node.type === "OptionalCallExpression") && isMapCallee(node.callee) && node.arguments.length >= 1;

/** One items object literal: { id?, term, description, action?, emphasis? (true/false) }. */
function descriptionRow(r, object) {
  const props = r.objectProps({ name: "items", kind: "expr", expression: object }, ["id", "term", "description", "action", "emphasis"]);
  if (props.emphasis && props.emphasis.type !== "BooleanLiteral") refuse("An item's emphasis comes from an expression; set it to true or false before detaching.");
  return { id: props.id ?? null, term: r.valueContent(props.term), description: r.valueContent(props.description), action: r.valueContent(props.action), emphasis: props.emphasis?.value === true };
}

/** Entries for one element of the items array: an object, `c ? {…} : {…}`, `...[…]`, `...(c ? […] : […])`, `...xs.map(…)`. */
function descriptionEntries(r, item) {
  if (!item) refuse("Its items array has a hole.");
  if (item.type === "ObjectExpression") return [{ kind: "row", row: descriptionRow(r, item) }];
  if (item.type === "ConditionalExpression" && item.consequent.type === "ObjectExpression" && item.alternate.type === "ObjectExpression") {
    return [{ kind: "either", test: piece(r.text, item.test), yes: [descriptionRow(r, item.consequent)], no: [descriptionRow(r, item.alternate)] }];
  }
  if (item.type === "SpreadElement") {
    const argument = unwrapTs(item.argument);
    const literalRows = (node) => {
      const list = unwrapTs(node);
      return list?.type === "ArrayExpression" && list.elements.every((element) => element?.type === "ObjectExpression") ? list.elements.map((element) => descriptionRow(r, element)) : null;
    };
    const rows = literalRows(argument);
    if (rows) return rows.map((row) => ({ kind: "row", row }));
    if (argument.type === "ConditionalExpression") {
      const yes = literalRows(argument.consequent);
      const no = literalRows(argument.alternate);
      if (yes && no) return [{ kind: "either", test: piece(r.text, argument.test), yes, no }];
    }
    if (isMapCall(argument)) return [mappedRows(r, argument)];
  }
  const what = item.type === "SpreadElement" ? `a spread (...${short(r.text.slice(item.argument.start, item.argument.end))})` : `an expression (${short(r.text.slice(item.start, item.end))})`;
  return refuse(`Its items array builds rows from ${what}; detach handles object literals, c ? {…} : {…}, ...(c ? [{…}] : []) and ...xs.map((x) => ({…})).`);
}

/** `xs.map((x, i) => ({ term, description… }))`: one row written once inside a .map of the same array. */
function mappedRows(r, call) {
  const fn = call.arguments[0];
  if (fn.type !== "ArrowFunctionExpression" || unwrapTs(fn.body)?.type !== "ObjectExpression") {
    refuse(`Its rows come from a .map whose callback does more than return an object literal (${short(r.text.slice(call.start, call.end))}).`);
  }
  if (fn.params.length > 2 || fn.params.some((param) => param.type === "RestElement") || (fn.params[1] && fn.params[1].type !== "Identifier")) refuse("Its rows come from a .map with parameters the recipe cannot reuse (rest or a pattern index).");
  const used = new Set();
  walk(fn, (node) => { if (node.type === "Identifier") used.add(node.name); return true; });
  let index = fn.params[1]?.name ?? "zenRow";
  for (let n = 2; !fn.params[1] && used.has(index); n += 1) index = `zenRow${n}`;
  const written = fn.params.length ? r.text.slice(fn.params[0].start, fn.params.at(-1).end) : "_zenItem";
  const array = call.callee.object;
  const plain = ["Identifier", "MemberExpression", "OptionalMemberExpression", "CallExpression", "OptionalCallExpression", "ArrayExpression", "ThisExpression"].includes(array.type);
  const source = piece(r.text, array);
  return {
    kind: "map",
    array: around(source, plain ? "" : "(", `${plain ? "" : ")"}${call.callee.optional ? "?." : "."}map`),
    params: written,
    /** The parameters with an index (added when the callback has none): for a key or a guard that needs it. */
    indexed: fn.params[1] ? written : `${written}, ${index}`,
    index,
    row: descriptionRow(r, unwrapTs(fn.body)),
  };
}

const METRIC_SIZES = { xs: "xsmall", sm: "small", md: "medium", lg: "large", xl: "xlarge", xsmall: "xsmall", small: "small", medium: "medium", large: "large", xlarge: "xlarge" };
const METRIC_LABEL = { xlarge: "Body/Base/Regular", large: "Body/Base/Regular", medium: "Body/Small/Regular", small: "Body/Small/Regular", xsmall: "Caption/Regular" };
const METRIC_VALUE = { xlarge: "Display/4", large: "Heading/1", medium: "Heading/3", small: "Heading/4", xsmall: "Heading/Subheading" };

/** Metric (MetricWidget.tsx, metric-widget.css): `own` = a Metric element (its className goes on the root). */
function buildMetric(r, own = false) {
  const size = METRIC_SIZES[r.literal("size", Object.keys(METRIC_SIZES)) ?? "xl"];
  const variant = r.literal("variant", ["icon-highlight", "title-highlight"]) ?? "icon-highlight";
  const iconSize = r.literal("iconSize", ["md", "lg", "medium", "large"]);
  r.consume("label", "value", "trend", "icon", "iconTheme", "iconBackground", "iconEmoji", "action");
  const className = own ? r.attr("className") : null;
  if (own) r.consume("className");
  const stacked = size === "xlarge" || size === "large";
  const dockSize = iconSize ? (iconSize === "lg" || iconSize === "large" ? "large" : "medium") : stacked ? "large" : "medium";
  const iconAttr = r.attr("icon");
  const background = r.attr("iconBackground") ? r.prop(r.attr("iconBackground"), "background") : str("background", "subtle");
  const dockProps = (extra) => [...extra, r.prop(r.attr("iconTheme"), "theme"), background, str("size", dockSize)];
  let dock = null;
  if (r.has("iconEmoji")) dock = el(r.use("DockIcon"), [str("theme", "emoji"), r.prop(r.attr("iconEmoji"), "emoji"), background, str("size", dockSize)]);
  else if (!iconAttr) dock = el(r.use("DockIcon"), dockProps([str("icon", "icon-home-02-solid")]));
  else if (iconAttr.kind === "string") dock = el(r.use("DockIcon"), dockProps([r.prop(iconAttr)]));
  else if (iconAttr.kind === "expr" && iconAttr.expression.type === "BooleanLiteral") dock = iconAttr.expression.value ? refuse("Its icon={true} is not an icon name.") : null;
  else dock = { type: "guard", test: piece(r.text, iconAttr.expression), then: el(r.use("DockIcon"), dockProps([r.prop(iconAttr)])) };
  const trendAttr = r.attr("trend");
  let trend = null;
  if (trendAttr) {
    r.use("MetricTrend");
    if (trendAttr.kind === "expr" && trendAttr.expression.type === "ObjectExpression") {
      const props = r.objectProps(trendAttr, ["direction", "label"]);
      trend = el("MetricTrend", [r.valueProp(props.direction, "trend")], [r.valueContent(props.label)]);
    } else if (trendAttr.kind === "expr") {
      const source = piece(r.text, trendAttr.expression);
      const dot = narrowable(trendAttr.expression) ? "." : "?.";
      trend = { type: "guard", test: source, then: el("MetricTrend", [{ kind: "expr", name: "trend", piece: around(source, "", `${dot}direction`) }], [{ type: "expr", piece: around(source, "", `${dot}label`) }]) };
    } else refuse("Its trend is not an object.");
  }
  r.approx("The number's tabular figures (font-variant-numeric) are not kept.");
  const label = (style, tone) => el(r.use("Text"), [str("as", "span"), str("textStyle", style), tone ? str("tone", tone) : null], [r.content(r.attr("label"))]);
  const valueStyle = r.m("valueStyle", "textStyle", METRIC_VALUE[size]);
  const value = el(r.use("Text"), [str("as", "span"), str("textStyle", valueStyle)], [r.content(r.attr("value"))]);
  // style-guard type/visual-heading asks a <Text textStyle="Heading/…"> for a title to be a <Heading>; Metric renders its
  // number (and its Title-Highlight title) as a span, so the detached code keeps the span and says why.
  const allowed = (node, what) => (visualHeading(node) ? [{ type: "code", code: `/* zen-allow-visual-heading: ${what} (Metric renders a span, not a heading) */` }, node] : [node]);
  if (variant === "title-highlight") {
    const titled = size === "xlarge" || size === "large" || size === "medium";
    r.approx("Title-Highlight: the Dock icon ends the row (bottom-aligned) instead of being pinned to the bottom-right corner.");
    const contentsGap = { xlarge: "xl", large: "lg", medium: "md", small: "sm", xsmall: "sm" }[size];
    const header = titled ? el(r.use("Stack"), [str("direction", "row"), str("align", "center"), str("justify", "between"), str("gap", "sm")], [...allowed(label(r.m("titleStyle", "textStyle", "Heading/Subheading")), "the metric's title"), r.content(r.attr("action"))]) : null;
    const content = el(r.use("Stack"), [str("gap", "2xs"), str("align", "start")], [titled ? null : label(r.m("labelStyle", "textStyle", "Caption/Regular"), "light"), ...allowed(value, "the metric's value"), trend]);
    return el(r.use("Stack"), [str("direction", "row"), str("align", "end"), str("justify", "between"), str("gap", r.m("metricGap", "gap", "md")), r.prop(className)], [
      el(r.use("Stack"), [str("gap", r.m("contentsGap", "gap", contentsGap)), code("style", "{ flex: 1 }")], [header, content]),
      dock,
    ]);
  }
  if (r.has("action")) refuse("Its action only shows in the title-highlight variant.");
  return el(r.use("Stack"), [stacked ? null : str("direction", "row"), str("gap", r.m("metricGap", "gap", stacked ? "md" : "sm")), str("align", "start"), r.prop(className)], [
    dock,
    el(r.use("Stack"), [str("gap", r.m("contentsGap", "gap", "2xs")), str("align", "start")], [
      el(r.use("Stack"), [str("gap", "3xs")], [label(r.m("labelStyle", "textStyle", METRIC_LABEL[size]), "light"), ...allowed(value, "the metric's value")]),
      trend,
    ]),
  ]);
}

/* ── CSS keyed on the component's classes ─────────────────────────────────────────────────────────────────────────── */

/**
 * The classes each component's DOM carries: `roots` on the instance root (with --modifiers), `inside` only below it.
 * A rule that pairs one of the instance's own classes with them stops applying once the primitives replace it.
 */
const COMPONENT_CLASSES = {
  Card: { roots: ["zen-card"], inside: ["zen-card__"] },
  ListItem: { roots: ["zen-list-item"], inside: ["zen-list-item__"] },
  MetricCard: { roots: ["zen-card", "zen-metric-card"], inside: ["zen-card__", "zen-metric"] },
  Metric: { roots: ["zen-metric"], inside: ["zen-metric__"] },
  EmptyState: { roots: ["zen-empty-state"], inside: ["zen-empty-state__"] },
  DescriptionList: { roots: ["zen-description-list"], inside: ["zen-description-list__"] },
  InlineMessage: { roots: ["zen-inline-message"], inside: ["zen-inline-message__"] },
  Badge: { roots: ["zen-badge"], inside: ["zen-badge__"] },
  Tag: { roots: ["zen-tag"], inside: ["zen-tag__"] },
};

/**
 * The rules of a stylesheet whose selector names a .zen-* class: [{ file, line, selector }] (line of the selector's
 * start; at-rule preludes skipped, nested rules read). The dev server passes them to detach as `componentCss`.
 */
export function cssRules(css, file) {
  const out = [];
  // Comments become spaces (line breaks kept, so the line numbers hold).
  const text = String(css).replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
  const breaks = [];
  for (let i = text.indexOf("\n"); i >= 0; i = text.indexOf("\n", i + 1)) breaks.push(i);
  const lineOf = (index) => {
    let low = 0;
    let high = breaks.length;
    while (low < high) { const mid = (low + high) >> 1; if (breaks[mid] < index) low = mid + 1; else high = mid; }
    return low + 1;
  };
  let boundary = 0;
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) { if (ch === "\\") i += 1; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === "{") {
      const raw = text.slice(boundary, i);
      const selector = raw.trim();
      if (selector && !selector.startsWith("@") && selector.includes(".zen-")) out.push({ file, line: lineOf(boundary + raw.length - raw.trimStart().length), selector: selector.replace(/\s+/g, " ") });
      boundary = i + 1;
    } else if (ch === "}" || ch === ";") boundary = i + 1;
  }
  return out;
}

/** `text` split where `test(ch)` holds outside (), [] and strings. */
function splitTop(text, test) {
  const out = [];
  let depth = 0;
  let quote = null;
  let current = "";
  for (const ch of text) {
    if (quote) { current += ch; if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; current += ch; continue; }
    if (ch === "(" || ch === "[") depth += 1;
    else if ((ch === ")" || ch === "]") && depth > 0) depth -= 1;
    if (depth === 0 && test(ch)) { out.push(current); current = ""; continue; }
    current += ch;
  }
  out.push(current);
  return out;
}

/** The classes of each compound selector of a complex selector (top level only: not inside :is() or :not()). */
function selectorCompounds(complex) {
  return splitTop(complex, (ch) => /\s/.test(ch) || ch === ">" || ch === "+" || ch === "~").filter((part) => part.trim()).map((compound) => {
    let flat = "";
    let depth = 0;
    for (const ch of compound) {
      if (ch === "(" || ch === "[") depth += 1;
      if (depth === 0) flat += ch;
      if ((ch === ")" || ch === "]") && depth > 0) depth -= 1;
    }
    return [...flat.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((match) => match[1]);
  });
}

/** The class names the instance's className surely holds (string parts; a token touching a ${…} is partial, so left out). */
function elementClasses(r) {
  const attr = r.attr("className");
  const out = new Set();
  const add = (value, joinedBefore = false, joinedAfter = false) => {
    const tokens = value.split(/\s+/);
    if (joinedBefore && !/^\s/.test(value)) tokens.shift();
    if (joinedAfter && !/\s$/.test(value)) tokens.pop();
    for (const token of tokens) if (/^-?[_a-zA-Z][\w-]*$/.test(token)) out.add(token);
  };
  if (!attr) return out;
  if (attr.kind === "string") add(attr.value);
  else if (attr.kind === "expr") {
    walk(attr.expression, (node) => {
      if (node.type === "StringLiteral") add(node.value);
      if (node.type !== "TemplateLiteral") return true;
      node.quasis.forEach((quasi, i) => add(quasi.value.cooked ?? "", i > 0, i < node.quasis.length - 1));
      return false;
    });
  }
  return out;
}

/**
 * Rules of `componentCss` ([{ file, line, selector }], the dev server's scan of the repo's CSS) that stop applying when
 * the instance detaches: a compound selector pairing one of its classes with the component's root class
 * (`.zen-card.pe-list-card`), or one of its classes above a part only the component renders (`.pe-panel > .zen-card__content`).
 */
function cssKeyedOnComponent(r, componentCss) {
  if (!Array.isArray(componentCss) || !componentCss.length) return [];
  const own = elementClasses(r);
  const known = COMPONENT_CLASSES[r.name];
  if (!own.size || !known) return [];
  const isRoot = (name) => known.roots.some((root) => name === root || name.startsWith(`${root}--`));
  const isInside = (name) => known.inside.some((prefix) => (prefix.endsWith("__") ? name.startsWith(prefix) : name === prefix || name.startsWith(`${prefix}__`) || name.startsWith(`${prefix}--`)));
  const hits = [];
  for (const rule of componentCss) {
    if (!rule || typeof rule.selector !== "string" || !rule.selector.includes(".zen-")) continue;
    for (const complex of splitTop(rule.selector, (ch) => ch === ",")) {
      const compounds = selectorCompounds(complex);
      const hit = compounds.some((classes, i) => classes.some((name) => own.has(name))
        && (classes.some(isRoot) || compounds.slice(i + 1).some((later) => later.some(isInside))));
      if (hit) { hits.push({ file: String(rule.file ?? ""), line: Number.isInteger(rule.line) ? rule.line : null, selector: complex.replace(/\s+/g, " ").trim() }); break; }
    }
  }
  return hits;
}

/* ── .map rows ────────────────────────────────────────────────────────────────────────────────────────────────────── */

const TRANSPARENT = new Set(["JSXElement", "JSXFragment", "JSXExpressionContainer", "JSXAttribute", "JSXOpeningElement", "TSAsExpression", "TSNonNullExpression", "TSSatisfiesExpression", "ParenthesizedExpression"]);
const isMapCallee = (callee) => (callee?.type === "MemberExpression" || callee?.type === "OptionalMemberExpression") && !callee.computed && callee.property.type === "Identifier" && callee.property.name === "map";
const WHERE = { ConditionalExpression: "a condition (? :)", LogicalExpression: "a condition (&& / ||)", IfStatement: "an if", CallExpression: "a function call", ArrayExpression: "an array", VariableDeclarator: "a variable", ObjectProperty: "an object", SwitchCase: "a switch" };

/**
 * Whether the element renders once per row of a .map callback: { repeated: false } when it is not inside one, else
 * the callback, its index parameter (or the edit that adds `zenIndex`). Refuses nested maps, rows that render the
 * element only sometimes, and an element inside a function nested in the callback.
 */
function mapContext(text, nodePath) {
  const isMapCallback = (i) => {
    const fn = nodePath[i];
    const call = nodePath[i - 1];
    return (fn.type === "ArrowFunctionExpression" || fn.type === "FunctionExpression") && (call?.type === "CallExpression" || call?.type === "OptionalCallExpression") && call.arguments[0] === fn && isMapCallee(call.callee);
  };
  let at = -1;
  for (let i = nodePath.length - 2; i >= 0; i -= 1) if (FUNCTION_TYPES.has(nodePath[i].type)) { at = i; break; }
  if (at < 0) return { repeated: false };
  const mapAbove = (limit) => nodePath.slice(0, limit).some((node, i) => FUNCTION_TYPES.has(node.type) && isMapCallback(i));
  if (!isMapCallback(at)) {
    if (mapAbove(at)) refuse("It renders inside a function nested in a .map callback, so which row it belongs to is unknown.");
    return { repeated: false };
  }
  if (mapAbove(at)) refuse("It is inside nested .map callbacks; detach supports one level of .map.");
  const fn = nodePath[at];
  for (let i = at + 1; i < nodePath.length - 1; i += 1) {
    const node = nodePath[i];
    if (TRANSPARENT.has(node.type)) continue;
    if (node.type === "BlockStatement" && node === fn.body) continue;
    if (node.type === "ReturnStatement" && nodePath[i - 1] === fn.body) continue;
    refuse(`It renders only for some rows (inside ${WHERE[node.type] ?? node.type}), so its position does not match the row index.`);
  }
  if (fn.body.type === "BlockStatement") {
    let returns = 0;
    walk(fn.body, (node) => {
      if (FUNCTION_TYPES.has(node.type)) return false;
      if (node.type === "ReturnStatement") returns += 1;
      return true;
    });
    if (returns > 1) refuse("The .map callback returns from more than one place, so some rows may not render it.");
  }
  const params = fn.params;
  if (params.some((param) => param.type === "RestElement")) refuse("The .map callback takes ...rest parameters; name its index parameter first.");
  const row = rowRoot(fn);
  if (params.length >= 2) {
    if (params[1].type !== "Identifier") refuse("The .map callback's index parameter is a pattern; name it first.");
    return { repeated: true, fn, row, index: params[1].name, paramEdit: null };
  }
  const used = new Set();
  walk(fn, (node) => { if (node.type === "Identifier") used.add(node.name); return true; });
  let index = "zenIndex";
  for (let n = 2; used.has(index); n += 1) index = `zenIndex${n}`;
  if (params.length === 1) {
    const param = params[0];
    const parenthesized = text.slice(fn.start, param.start).includes("(");
    const paramEdit = parenthesized
      ? { start: param.end, end: param.end, text: `, ${index}` }
      : { start: param.start, end: param.end, text: `(${text.slice(param.start, param.end)}, ${index})` };
    return { repeated: true, fn, row, index, paramEdit };
  }
  const open = text.indexOf("(", fn.start);
  const close = text.indexOf(")", open);
  if (open < 0 || close < 0 || close > fn.body.start) refuse("The .map callback's parameter list could not be found.");
  return { repeated: true, fn, row, index, paramEdit: { start: open + 1, end: close, text: `_zenItem, ${index}` } };
}

/**
 * The element a .map callback returns for each row ({ loc, name }; null for a fragment, which carries no data-zen-src):
 * its rendered instances are the rows of one list, siblings under one parent, so the client counts the row and the
 * lists (a .map inside a render prop runs once per call) from them.
 */
function rowRoot(fn) {
  let value = fn.body;
  if (value.type === "BlockStatement") {
    let found = null;
    walk(value, (node) => {
      if (FUNCTION_TYPES.has(node.type)) return false;
      if (node.type === "ReturnStatement") found = node.argument;
      return true;
    });
    value = found;
  }
  value = unwrapTs(value);
  if (value?.type !== "JSXElement") return null;
  const name = jsxName(value.openingElement.name);
  if (name === "Fragment" || name === "React.Fragment") return null;
  return { loc: `${value.loc.start.line}:${value.loc.start.column}`, name };
}

/* ── imports ──────────────────────────────────────────────────────────────────────────────────────────────────────── */


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


/* ── the edit ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The text edits that detach `element` (a JSXElement of `ast`, parsed from `text` without BOM): the element replaced by
 * the recipe's primitives (or, inside a .map callback, by `index === instance ? detached : original`), the callback's
 * index parameter when it had none, and the import changes. Throws EditError (code "invalid", `refusal: true` for a
 * reason to show) when it cannot. `plan: true` checks everything for row 0 without needing `instance`.
 */
/**
 * Builder pages (GĐ4 M4: a *.zen.tsx page takes no `style`): the inline layouts the recipes write become Layout props
 * that render the same (layout.css): `width: max-content` capped at 100% is width="hug" (fit-content); `flex: 1` (with
 * `minWidth: 0`) in a recipe's Stack is Fill along that Stack (width in a row, height in a column). Any other style
 * refuses the detach on a page, saying which.
 */
function pageLayout(node, component, parent = null) {
  if (!node || node.type !== "el") return;
  const at = node.props.findIndex((prop) => prop.name === "style");
  if (at >= 0) {
    const prop = node.props[at];
    const style = prop.kind === "code" ? prop.code.replace(/\s+/g, " ").trim() : null;
    const row = parent?.props.some((entry) => entry.kind === "str" && entry.name === "direction" && entry.value === "row");
    const inStack = Boolean(parent && /Stack$/.test(parent.tag));
    const props = style === '{ width: "max-content", maxWidth: "100%" }' ? [str("width", "hug")]
      : (style === "{ flex: 1 }" || style === "{ flex: 1, minWidth: 0 }") && inStack ? [str(row ? "width" : "height", "fill")]
        : null;
    if (!props) refuse(`${component} cannot be detached on a builder page yet: its layout needs an inline style${style ? ` (${style})` : ""}, which pages do not take`);
    node.props.splice(at, 1, ...props);
  }
  for (const child of node.children) {
    if (child.type === "el") pageLayout(child, component, node);
    else if (child.type === "guard") pageLayout(child.then, component, node);
    else if (child.type === "map") pageLayout(child.item, component, node);
    else if (child.type === "either") for (const side of [child.yes, child.no]) for (const item of side) pageLayout(item, component, node);
  }
}

export function detachEdits(text, element, ast, { measured, instance, file, eol = text.includes("\r\n") ? "\r\n" : "\n", typographyKeys, plan = false, componentCss } = {}) {
  const name = jsxName(element.openingElement.name);
  const recipe = Object.hasOwn(RECIPES, name) ? RECIPES[name] : null;
  if (!recipe) refuse(notDetachable(name));
  const nodePath = pathTo(ast.program, element);
  if (!nodePath) throw new EditError("not-found", "The element is not in the file's tree");
  const map = mapContext(text, nodePath);
  if (map.repeated && !plan && !(Number.isInteger(instance) && instance >= 0)) throw new EditError("invalid", "This element renders once per row of a .map callback: pass `instance` (the row to detach, 0-based).");
  if (!map.repeated && Number.isInteger(instance) && instance > 0) refuse("It renders several times but not inside a .map callback, so one instance cannot be detached alone (detach would change every instance).");
  const keys = typographyKeys instanceof Set ? typographyKeys : Array.isArray(typographyKeys) ? new Set(typographyKeys) : null;
  const recipeContext = new Recipe(text, element, ast, nodePath, { measured: validMeasured(measured, keys), eol, file });
  const root = recipe.build(recipeContext);
  // A builder page takes no style (dialect.mjs): the recipes' inline layouts become the Layout props that render them.
  if (typeof file === "string" && /\.zen\.tsx$/.test(file)) pageLayout(root, name);
  const keyed = cssKeyedOnComponent(recipeContext, componentCss);
  for (const hit of keyed.slice(0, 4)) {
    recipeContext.approx(`CSS keyed on the ${name} class stops applying: ${hit.selector} (${hit.file}${hit.line ? `:${hit.line}` : ""}).`);
  }
  if (keyed.length > 4) recipeContext.approx(`${keyed.length - 4} more CSS rules keyed on the ${name} class stop applying (${[...new Set(keyed.slice(4).map((hit) => hit.file))].join(", ")}).`);
  // Comments of the element the output does not carry (beside a re-read prop, inside a rebuilt value) lead the root's props.
  const flat = (value) => value.replace(/\s+/g, " ");
  const draft = flat(printElement(root, "", eol));
  const loose = recipeContext.comments.map((comment) => text.slice(comment.start, comment.end)).filter((source, i, all) => !draft.includes(flat(source)) && all.indexOf(source) === i);
  root.props.unshift(...loose.map((source) => ({ kind: "comment", text: source, line: source.startsWith("//") })));
  const mark = detachMark(name);
  const parent = nodePath[nodePath.length - 2];
  const position = parent.type === "JSXElement" || parent.type === "JSXFragment" ? "child" : parent.type === "JSXAttribute" ? "attr" : "expr";
  const lineStart = lineStartOf(text, element.start);
  const startsLine = /^[ \t]*$/.test(text.slice(lineStart, element.start));
  const base = indentAt(text, element.start);
  let replacement;
  let rootAt;
  if (map.repeated) {
    const inner = base + UNIT;
    const row = plan ? 0 : instance;
    // `(index as number)`: a bare `index === K` would narrow the index to K inside the detached branch, and the row's own
    // comparisons (disabled={index === 0}) would then fail TypeScript (TS2367: no overlap between 1 and 0).
    const head = `${position === "expr" ? "" : "{"}(${map.index} as number) === ${row} ? (${eol}${inner}/* ${mark} */${eol}${inner}`;
    const printed = printElement(root, inner, eol);
    const original = reindent(piece(text, element), inner, eol);
    replacement = `${head}${printed}${eol}${base}) : (${eol}${inner}${original}${eol}${base})${position === "expr" ? "" : "}"}`;
    rootAt = head.length;
  } else {
    const printed = printElement(root, base, eol);
    // On its own line above the element when the element starts its line (never right after `return`, where a line
    // break would end the statement), else just before it.
    const head = position === "child"
      ? (startsLine ? `{/* ${mark} */}${eol}${base}` : `{/* ${mark} */}`)
      : position === "attr" ? `{/* ${mark} */ ` : startsLine ? `/* ${mark} */${eol}${base}` : `/* ${mark} */ `;
    replacement = `${head}${printed}${position === "attr" ? "}" : ""}`;
    rootAt = head.length;
  }
  const elementEdits = [{ start: element.start, end: element.end, text: replacement }];
  if (map.paramEdit) elementEdits.push(map.paramEdit);
  // The original component's import goes when nothing else uses it (counted on the text after the element edit).
  const withElement = applyEdits(text, elementEdits);
  const reparsed = parseSource(withElement);
  if (!reparsed || reparsed.errors.length > ast.errors.length) throw new EditError("invalid", "The detached code does not parse (a recipe bug); nothing was written.");
  const remove = [name, ...recipeContext.dropped].filter((local) => referenceCount(reparsed, local) === 0);
  const importChanges = importEdits(ast, text, eol, file, recipeContext.uses, remove);
  const edits = [...elementEdits, ...importChanges.map((edit) => ({ ...edit, isImport: true }))];
  const shift = edits.filter((edit) => edit !== elementEdits[0] && edit.end <= element.start).reduce((sum, edit) => sum + edit.text.length - (edit.end - edit.start), 0);
  return { edits, component: name, approximations: recipeContext.approximations, rootOffset: element.start + shift + rootAt, rootTag: root.tag, repeated: map.repeated, mapRow: map.repeated ? map.row : null, skipSlots: recipeContext.skipSlots };
}

/** Plan slots for a component (selector "" = the instance root itself, else querySelector from the root). */
export function detachSlots(component) {
  return Object.hasOwn(RECIPES, component) ? RECIPES[component].slots.map((slot) => ({ ...slot })) : [];
}

/**
 * GET /detach-plan: whether the element at `loc` (named `name`) can be detached, whether it is a .map row (the edit
 * then needs `instance`; `mapRow` = the element the callback returns, to find the row's list) and the slots the client
 * measures. Every refusal of the edit shows here as ok:false.
 * `instances`: how many times the element renders (optional); more than one outside a .map callback is refused.
 * `lists`: for a .map row, how many separate lists render it (the .map runs in several places); more than one is refused.
 */
export function detachPlan(code, loc, name, { file, instances, lists } = {}) {
  const text = code.startsWith("﻿") ? code.slice(1) : code;
  const target = parseLoc(loc);
  if (!target) return { ok: false, reason: `Bad loc "${loc}" (expected "<line>:<column>").` };
  const ast = parseSource(text);
  if (!ast) return { ok: false, reason: "The file does not parse." };
  const element = findElement(ast, target);
  if (!element) return { ok: false, reason: `No JSX element starts at ${loc}.` };
  const actual = jsxName(element.openingElement.name);
  if (actual !== name) return { ok: false, reason: `Expected <${name}> at ${loc}, found <${actual}>.` };
  if (text.includes(CHROME_MARK) && insideAny(chromeFunctions(ast), element)) return { ok: false, reason: `<${actual}> is docs chrome (zen-studio-chrome).` };
  try {
    const result = detachEdits(text, element, ast, { file, plan: true });
    if (!result.repeated && Number.isInteger(instances) && instances > 1) {
      return { ok: false, reason: `It renders ${instances} times but not inside a .map callback, so one instance cannot be detached alone (detach would change every instance).` };
    }
    if (result.repeated && Number.isInteger(lists) && lists > 1) {
      return { ok: false, reason: `This list repeats in ${lists} places; detaching a row would change each of them.` };
    }
    const slots = detachSlots(actual).filter((slot) => !result.skipSlots.has(slot.key));
    return { ok: true, component: actual, repeated: result.repeated, ...(result.repeated ? { mapRow: result.mapRow } : {}), slots };
  } catch (error) {
    if (error instanceof EditError) return { ok: false, reason: error.message };
    throw error;
  }
}

// jsx-source.mjs runs op "detach" through what registers here: the dev server and the selftests import detach.mjs; the
// browser engine does not (builder pages have no Detach), so its bundle leaves the recipes out.
registerDetach(detachEdits);
