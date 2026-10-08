// Zen Studio source helpers: pure functions over a file's text (no fs, no server), shared by the dev-server plugin
// (vite-plugin-zen-studio.mjs) and its selftest (selftest.mjs). Spec: docs/research/zen-studio-spec-2026-10-02.md §8.
//
//   annotate(code, rel, source?)          → { code, map } | null    data-zen-src="<rel>:<line>:<col>" on every JSX element
//   describeElement(code, file, loc)      → SourceElement | null    the element whose opening tag starts at loc (`wrap`:
//                                           whether op "wrap" takes it where it sits, { ok } or { ok: false, reason })
//   applyOps(code, loc, name, ops, opts?) → { code, changed, snippet?, detached?, wrapped? } | { error, code: "stale" | "not-found" | "invalid" | "forbidden" }
//                                           opts: { snippets?, typographyKeys? (Set of typographyStyles keys), file? (repo-relative path),
//                                                   componentCss? (detach: [{ file, line, selector }] read from the repo's CSS) }
//                                           op "detach" (alone): detach.mjs recipes; `detached` = { component, loc, approximations }
//                                           op "wrap" (alone): the element inside <Box|Stack|Grid …props>; `wrapped` = { loc } of the wrapper;
//                                           `with` (sibling locs): several layers of one JSX parent in one wrapper (applyWrapMany)
//                                           op "unwrap" (alone): a Box|Stack|Grid holding one element is replaced by it;
//                                           `unwrapped` = { loc } of the element (applyUnwrap)
//                                           ops "insertChild" | "removeElement" | "duplicateElement" | "moveElement" | "clearSlot" |
//                                           "resetSlot" (alone): slots.mjs applySlotOp; `inserted` / `moved` = { loc }, `removed` /
//                                           `cleared` / `reset` = true; opts add componentModules?, requiredChildren?, requiredProps?,
//                                           hash? (required for remove, move, clear and reset), base? (the saved text, for resetSlot)
//   sha1(text), isAnnotatedFile(rel), changedRange(before, after)
//
// Locations follow Babel: line 1-based, column 0-based, counted without a leading BOM (Vite may or may not strip it).
// Docs chrome: JSX inside a function whose leading comment holds "zen-studio-chrome" is never annotated or edited.
import { posix } from "./posix.mjs";
import { parse, parseExpression } from "@babel/parser";
import MagicString from "magic-string";
import cloning from "../../src/platform/studio/cloning.json" with { type: "json" };
import { UNIT, importEdits, pathTo, piece } from "./source-helpers.mjs";
import { SLOT_OPS, applySlotOp, isSharedFile, sharedRefusal } from "./slots.mjs";

const BOM = "\uFEFF";
const PLUGINS = ["jsx", "typescript"];
const SKIP_KEYS = new Set(["loc", "start", "end", "extra", "range", "leadingComments", "trailingComments", "innerComments", "comments", "tokens", "errors"]);
const CHROME_MARK = "zen-studio-chrome";

/** Platform files that render the docs chrome, not examples: never annotated, never edited. */
const NOT_ANNOTATED = new Set(["PlatformApp.tsx", "PlatformTemplate.tsx", "PlatformCode.tsx", "PlatformFullScreen.tsx", "PlatformPhone.tsx", "PlatformReference.tsx", "PlatformGuidelines.tsx"].map((name) => `src/platform/${name}`));

import { sha1 } from "./sha1.mjs";
export { sha1 };

/** Files whose JSX carries data-zen-src (and which the Studio may edit): src/platform/**\/*.tsx minus the chrome and the Studio, src/templates/**\/*.tsx. Case-exact. */
export function isAnnotatedFile(rel) {
  if (typeof rel !== "string" || !rel.endsWith(".tsx") || rel.includes("?")) return false;
  // A builder page kept in the browser ("local:<id>.zen.tsx", Studio builder GĐ2): its renderer writes data-zen-src.
  if (/^local:[a-z0-9][a-z0-9-]*\.zen\.tsx$/.test(rel)) return true;
  if (rel.startsWith("src/templates/")) return true;
  if (!rel.startsWith("src/platform/") || rel.startsWith("src/platform/studio/")) return false;
  return !NOT_ANNOTATED.has(rel);
}

/* ── parsing and walking ─────────────────────────────────────────────────────────────────────────────────────────── */

export function parseSource(code) {
  try {
    return parse(code, { sourceType: "module", plugins: PLUGINS, errorRecovery: true });
  } catch {
    return null;
  }
}

const stripBom = (code) => (code.startsWith(BOM) ? code.slice(1) : code);
const isNode = (value) => value !== null && typeof value === "object" && typeof value.type === "string";

/** Depth-first walk without recursion (long expression chains would overflow the stack). `visit` returning false skips the subtree. */
function walk(root, visit) {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (visit(node) === false) continue;
    for (const key in node) {
      if (SKIP_KEYS.has(key)) continue;
      const value = node[key];
      if (Array.isArray(value)) {
        for (let i = value.length - 1; i >= 0; i -= 1) if (isNode(value[i])) stack.push(value[i]);
      } else if (isNode(value)) stack.push(value);
    }
  }
}

/** "Button", "Foo.Bar", "div", "svg:path". */
export function jsxName(node) {
  if (!node) return "";
  if (node.type === "JSXIdentifier") return node.name;
  if (node.type === "JSXMemberExpression") return `${jsxName(node.object)}.${jsxName(node.property)}`;
  if (node.type === "JSXNamespacedName") return `${node.namespace.name}:${node.name.name}`;
  return "";
}

const attrName = (attr) => (attr.type === "JSXAttribute" ? jsxName(attr.name) : "");

export function parseLoc(loc) {
  const match = /^(\d+):(\d+)$/.exec(typeof loc === "string" ? loc : "");
  return match ? { line: Number(match[1]), column: Number(match[2]) } : null;
}

/** The JSXElement whose opening tag starts exactly at line:column. */
function findElement(ast, target) {
  let found = null;
  walk(ast, (node) => {
    if (found) return false;
    const loc = node.loc;
    if (loc && (loc.start.line > target.line || loc.end.line < target.line)) return false;
    if (node.type === "JSXElement") {
      const start = node.openingElement.loc.start;
      if (start.line === target.line && start.column === target.column) { found = node; return false; }
    }
    return true;
  });
  return found;
}

/* ── docs chrome ─────────────────────────────────────────────────────────────────────────────────────────────────── */

const FUNCTION_TYPES = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression", "ObjectMethod", "ClassMethod"]);

/** The functions a commented node declares: itself, through export, const x =, memo(…)/forwardRef(…), `as`. */
function declaredFunctions(node, out) {
  if (!node) return;
  if (FUNCTION_TYPES.has(node.type)) { out.add(node); return; }
  switch (node.type) {
    case "ExportNamedDeclaration":
    case "ExportDefaultDeclaration": declaredFunctions(node.declaration, out); break;
    case "VariableDeclaration": node.declarations.forEach((declarator) => declaredFunctions(declarator, out)); break;
    case "VariableDeclarator": declaredFunctions(node.init, out); break;
    case "CallExpression": node.arguments.forEach((argument) => declaredFunctions(argument, out)); break;
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "TSNonNullExpression":
    case "ParenthesizedExpression": declaredFunctions(node.expression, out); break;
    case "ObjectProperty": declaredFunctions(node.value, out); break;
    default:
  }
}

/** Functions marked as docs chrome: a leading comment (on them or on their export / const) contains "zen-studio-chrome". */
export function chromeFunctions(ast) {
  const out = new Set();
  walk(ast, (node) => {
    if (node.leadingComments?.some((comment) => comment.value.includes(CHROME_MARK))) declaredFunctions(node, out);
    return true;
  });
  return out;
}

const insideAny = (functions, node) => [...functions].some((fn) => fn.start <= node.start && node.end <= fn.end);

/* ── annotate ────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Inserts data-zen-src after every JSX tag name (fragments, docs chrome and already-annotated elements skipped); null = untouched. */
export function annotate(code, rel, source = rel) {
  const offset = code.startsWith(BOM) ? 1 : 0;
  const text = offset ? code.slice(1) : code;
  if (!text.includes("<")) return null;
  const ast = parseSource(text);
  if (!ast) return null;
  const chrome = text.includes(CHROME_MARK) ? chromeFunctions(ast) : new Set();
  const s = new MagicString(code);
  let count = 0;
  walk(ast, (node) => {
    if (chrome.has(node)) return false;
    if (node.type !== "JSXOpeningElement") return true;
    const name = jsxName(node.name);
    if (name === "Fragment" || name === "React.Fragment") return true;
    if (node.attributes.some((attr) => attrName(attr) === "data-zen-src")) return true;
    const after = node.typeArguments ?? node.typeParameters ?? node.name;
    s.appendLeft(after.end + offset, ` data-zen-src="${rel}:${node.loc.start.line}:${node.loc.start.column}"`);
    count += 1;
    return true;
  });
  if (!count) return null;
  return { code: s.toString(), map: s.generateMap({ hires: true, source }) };
}

/* ── describe ────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A string literal written as an expression ({"x"}, {`x`}) reads as a string. */
function staticString(expression) {
  if (expression.type === "StringLiteral") return expression.value;
  if (expression.type === "TemplateLiteral" && expression.expressions.length === 0) return expression.quasis[0].value.cooked ?? null;
  return null;
}

function describeAttr(attr, text) {
  const raw = text.slice(attr.start, attr.end);
  const line = attr.loc.start.line;
  if (attr.type === "JSXSpreadAttribute") return { name: "…", kind: "spread", value: text.slice(attr.argument.start, attr.argument.end), raw, line };
  const name = jsxName(attr.name);
  const value = attr.value;
  if (!value) return { name, kind: "true", raw, line };
  if (value.type === "StringLiteral") return { name, kind: "string", value: value.value, raw, line };
  if (value.type === "JSXExpressionContainer") {
    if (value.expression.type !== "JSXEmptyExpression") {
      const literal = staticString(value.expression);
      if (literal !== null) return { name, kind: "string", value: literal, raw, line };
    }
    const shape = value.expression.type === "JSXEmptyExpression" ? null : shapeOf(value.expression, text);
    return { name, kind: "expression", value: text.slice(value.start + 1, value.end - 1).trim(), raw, line, ...(shape ? { shape } : {}) };
  }
  return { name, kind: "expression", value: text.slice(value.start, value.end), raw, line };
}

/* ── the state a prop reads (op setStateInit) ────────────────────────────────────────────────────────────────────── */

// A prop bound to state (`checked={agree}` with `const [agree, setAgree] = useState(false)` in the component) keeps the
// component interactive; its Figma-like variant / boolean edit changes the initial state, the useState argument, never
// the binding (user, 2026-10-05: "Các component vẫn giữ đúng behavior của nó dù có chỉnh sửa variant và bật tắt boolean").

/** `useState(x)`, `useState<T>(x)` or `React.useState(x)`. */
const isUseState = (callee) => (callee?.type === "Identifier" && callee.name === "useState")
  || (callee?.type === "MemberExpression" && !callee.computed && callee.property.type === "Identifier" && callee.property.name === "useState");

/** The literal a useState argument holds (true/false, a string, a number, -n), or undefined for anything else. */
function stateLiteral(node) {
  const value = unwrapTs(node);
  if (!value) return undefined;
  if (value.type === "BooleanLiteral" || value.type === "StringLiteral" || value.type === "NumericLiteral") return value.value;
  if (value.type === "UnaryExpression" && value.operator === "-" && value.argument.type === "NumericLiteral") return -value.argument.value;
  if (value.type === "TemplateLiteral") return staticString(value) ?? undefined;
  return undefined;
}

/** The names a declarator or a parameter binds (`a`, `[a, setA]`, `{ a, b: c }`, `a = 1`, `...rest`). */
function boundNames(pattern, out = []) {
  if (!pattern) return out;
  if (pattern.type === "Identifier") out.push(pattern.name);
  else if (pattern.type === "ArrayPattern") pattern.elements.forEach((element) => boundNames(element, out));
  else if (pattern.type === "ObjectPattern") pattern.properties.forEach((prop) => boundNames(prop.type === "RestElement" ? prop.argument : prop.value, out));
  else if (pattern.type === "AssignmentPattern") boundNames(pattern.left, out);
  else if (pattern.type === "RestElement") boundNames(pattern.argument, out);
  else if (pattern.type === "TSParameterProperty") boundNames(pattern.parameter, out);
  return out;
}

/**
 * The `const [name, setName] = useState(<literal>)` that `name` reads at the element (`path`: its ancestry, root first):
 * the nearest enclosing function that binds `name` decides (a parameter or another declaration there shadows it).
 * { declarator, arg, value } or null.
 */
function stateBinding(path, name) {
  if (!path || !IDENTIFIER.test(name)) return null;
  for (let i = path.length - 1; i >= 0; i -= 1) {
    const fn = path[i];
    if (!/Function/.test(fn.type)) continue;
    if (fn.params.some((param) => boundNames(param).includes(name))) return null;
    if (fn.body?.type !== "BlockStatement") continue;
    for (const statement of fn.body.body) {
      if (statement.type !== "VariableDeclaration") continue;
      for (const declarator of statement.declarations) {
        if (!boundNames(declarator.id).includes(name)) continue;
        const first = declarator.id.type === "ArrayPattern" ? declarator.id.elements[0] : null;
        const call = unwrapTs(declarator.init);
        if (first?.type !== "Identifier" || first.name !== name || call?.type !== "CallExpression" || !isUseState(call.callee) || call.arguments.length !== 1) return null;
        const value = stateLiteral(call.arguments[0]);
        return value === undefined ? null : { declarator, arg: unwrapTs(call.arguments[0]), value };
      }
    }
  }
  return null;
}

/** An attribute's state binding as the Studio reads it: { name, value, line } (SourceAttr.state). */
function attrState(attr, path) {
  if (attr.type !== "JSXAttribute" || attr.value?.type !== "JSXExpressionContainer") return null;
  const expression = unwrapTs(attr.value.expression);
  if (expression?.type !== "Identifier") return null;
  const binding = stateBinding(path, expression.name);
  return binding ? { name: expression.name, value: binding.value, line: binding.declarator.loc.start.line } : null;
}

/** Op setStateInit { name, value }: attribute `name` reads a useState(<literal>); `value` replaces that literal. */
function setStateInitEdits(ast, element, text, op) {
  const attr = element.openingElement.attributes.find((candidate) => candidate.type === "JSXAttribute" && jsxName(candidate.name) === op.name);
  const expression = attr?.value?.type === "JSXExpressionContainer" ? unwrapTs(attr.value.expression) : null;
  if (expression?.type !== "Identifier") throw new EditError("invalid", `${op.name} is not bound to a state variable`);
  const binding = stateBinding(ancestry(ast, element), expression.name);
  if (!binding) throw new EditError("invalid", `${op.name}={${expression.name}} does not read a useState(<literal>) in this component`);
  const value = op.value;
  if (!value || !["boolean", "string", "number"].includes(value.kind) || typeof value.value !== value.kind || (value.kind === "number" && !Number.isFinite(value.value))) {
    throw new EditError("invalid", "setStateInit takes a boolean, string or number value");
  }
  const quote = binding.arg.type === "StringLiteral" && text[binding.arg.start] === "'" ? "'" : '"';
  const code = value.kind === "string" ? jsString(value.value, quote) : String(value.value);
  const declaratorText = text.slice(binding.declarator.start, binding.declarator.end);
  const at = binding.arg.start - binding.declarator.start;
  return [{
    start: binding.arg.start, end: binding.arg.end, text: code, kind: "state", name: expression.name,
    before: declaratorText, after: declaratorText.slice(0, at) + code + declaratorText.slice(at + binding.arg.end - binding.arg.start),
  }];
}

/* ── what an expression prop reads (SourceAttr.origin) ───────────────────────────────────────────────────────────── */

// A prop bound to state or to a .map row must keep its binding (a fixed value would freeze the interaction or every row);
// one bound to props or data may take a fixed value. The client decides from `origin` (2026-10-05, nested booleans).

/** `useState(…)` / `useReducer(…)`, bare or as `React.…`. */
const isStateHook = (callee) => (callee?.type === "Identifier" && /^use(State|Reducer)$/.test(callee.name))
  || (callee?.type === "MemberExpression" && !callee.computed && callee.property.type === "Identifier" && /^use(State|Reducer)$/.test(callee.property.name));
/** A hook other than useState/useReducer (`useFormState`, `useChatDemo`), bare or `X.useY`; React's own pure ones excepted. */
const isCustomHook = (callee) => {
  const name = callee?.type === "Identifier" ? callee.name : callee?.type === "MemberExpression" && !callee.computed && callee.property.type === "Identifier" ? callee.property.name : "";
  return /^use[A-Z]/.test(name) && !/^use(State|Reducer|Id|Ref|Callback|Context)$/.test(name);
};
/** `xs.map(fn)` / `xs.flatMap(fn)` / `xs.forEach(fn)` (optional chaining too), or `Array.from(xs, fn)`. */
const isLoopCall = (node) => (node?.type === "CallExpression" || node?.type === "OptionalCallExpression")
  && (node.callee?.type === "MemberExpression" || node.callee?.type === "OptionalMemberExpression") && !node.callee.computed
  && node.callee.property.type === "Identifier"
  && (/^(map|flatMap|forEach)$/.test(node.callee.property.name) || (node.callee.property.name === "from" && node.callee.object.type === "Identifier" && node.callee.object.name === "Array"));
/** The callback a loop call runs per row: `Array.from`'s second argument, every other's first. */
const loopCallback = (call) => (call.callee.property.name === "from" ? call.arguments[1] : call.arguments[0]);
/** `for (… of …)` / `for (… in …)` / `for (let i = 0; …)`: statements whose body runs once per row. */
const LOOP_STATEMENTS = new Set(["ForOfStatement", "ForInStatement", "ForStatement"]);
/** The declaration a for statement binds (`left` of for-of/in, `init` of a C-style for), or null. */
const loopDeclaration = (node) => {
  const declaration = node.type === "ForStatement" ? node.init : node.left;
  return declaration?.type === "VariableDeclaration" ? declaration : null;
};

/** The identifiers an expression reads at its roots (`one.online` → one, `rows[i].on` → rows, i); functions and JSX inside are not entered. */
function rootsOf(node, out = new Set()) {
  if (!node || typeof node !== "object") return out;
  if (node.type === "Identifier") out.add(node.name);
  else if (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") {
    rootsOf(node.object, out);
    if (node.computed) rootsOf(node.property, out);
  } else for (const key of ["test", "consequent", "alternate", "left", "right", "argument", "expression", "expressions", "callee", "arguments", "elements", "properties", "value", "tag", "quasi"]) {
    const value = node[key];
    if (Array.isArray(value)) value.forEach((item) => rootsOf(item, out));
    else if (value && typeof value === "object") rootsOf(value, out);
  }
  return out;
}

/**
 * Where `name` is declared as seen from path[end] (`path`: an ancestry, root first): a parameter of the nearest
 * enclosing function that binds it ({ param: index of that function }), a for-of/for-in/for loop's own binding
 * ({ loop: index of that statement }), a `catch (error)` parameter ({ caught: index }) or a declaration in an enclosing
 * block ({ declarator, kind, at: index of that block }); null for module scope, imports and globals.
 */
function bindingOf(path, end, name) {
  for (let i = end; i >= 0; i -= 1) {
    const node = path[i];
    if (FUNCTION_TYPES.has(node.type) && node.params.some((param) => boundNames(param).includes(name))) return { param: i };
    // A for-of/in binding is seen by its body only (`right` is evaluated outside it); a C-style for's by every part.
    if (LOOP_STATEMENTS.has(node.type) && (node.type === "ForStatement" || path[i + 1] === node.body)
      && loopDeclaration(node)?.declarations.some((declarator) => boundNames(declarator.id).includes(name))) return { loop: i };
    if (node.type === "CatchClause" && boundNames(node.param).includes(name)) return { caught: i };
    if (node.type !== "BlockStatement") continue;
    for (const statement of node.body) {
      if (statement.type !== "VariableDeclaration") continue;
      const declarator = statement.declarations.find((candidate) => boundNames(candidate.id).includes(name));
      if (declarator) return { declarator, kind: statement.kind, at: i };
    }
  }
  return null;
}

/**
 * What `name` is at path[end]: { loop: index of the loop } for a loop call's callback parameter or a for-of/in/for
 * statement's binding, "state" for the value of a useState/useReducer destructuring, "value" for anything else (a catch
 * parameter too). A local const is followed to what its initializer reads (at most `depth` 4 consts deep): loop beats
 * state beats value.
 */
function bindingKind(path, end, name, depth = 0) {
  const binding = bindingOf(path, end, name);
  if (!binding || binding.caught !== undefined) return "value";
  if (binding.loop !== undefined) return { loop: binding.loop };
  if (binding.param !== undefined) {
    const call = path[binding.param - 1];
    return isLoopCall(call) && loopCallback(call) === path[binding.param] ? { loop: binding.param - 1 } : "value";
  }
  const { declarator } = binding;
  const init = unwrapTs(declarator.init);
  // The value, not the setter: `[open, setOpen]`, `[{ on }, set]`, or the whole pair read as `pair[0]`.
  const value = declarator.id.type === "ArrayPattern" ? boundNames(declarator.id.elements[0]).includes(name) : declarator.id.type === "Identifier";
  if (value && init?.type === "CallExpression" && isStateHook(init.callee)) return "state";
  if (binding.kind !== "const" || !init || depth >= 4) return "value";
  return strongest([...rootsOf(init)].map((root) => bindingKind(path, binding.at, root, depth + 1)));
}

/**
 * Whether `name` reads component state at all: a useState/useReducer value, or a const whose initializer does (followed
 * up to 4 deep). A loop row that also reads state (`selected={entry.id === hireId}`, `checked={draft[row.id]}`) is the
 * component's interaction, so it counts as bound-state even though its kind is loop-bound.
 */
function readsState(path, end, name, depth = 0) {
  const binding = bindingOf(path, end, name);
  if (!binding || binding.declarator === undefined) return false;
  const { declarator } = binding;
  const init = unwrapTs(declarator.init);
  const value = declarator.id.type === "ArrayPattern" ? boundNames(declarator.id.elements[0]).includes(name) : declarator.id.type === "Identifier";
  if (value && init?.type === "CallExpression" && isStateHook(init.callee)) return true;
  // Whatever a custom hook returns (`const { recipients } = useFormState(…)`) may be state it keeps: never fixed.
  if (init?.type === "CallExpression" && isCustomHook(init.callee)) return true;
  if (binding.kind !== "const" || !init || depth >= 4) return false;
  return [...rootsOf(init)].some((root) => readsState(path, binding.at, root, depth + 1));
}

/** The kind that decides among several roots' kinds: the innermost loop, else state, else value. */
const strongest = (kinds) => kinds.reduce((best, kind) => {
  if (typeof kind === "object") return typeof best === "object" && best.loop > kind.loop ? best : kind;
  return typeof best === "object" || best === "state" ? best : kind;
}, "value");

/**
 * How many rows the loop at path[at] runs: a loop call's or a for-of's array literal or same-file top-level const array
 * (`arrays`), `Array.from({ length: N }, fn)`; else undefined (for-in, a C-style for, data from elsewhere).
 */
function loopRows(path, at, arrays) {
  const node = path[at];
  const source = node.type === "ForOfStatement" ? node.right : LOOP_STATEMENTS.has(node.type) ? null
    : node.callee.property.name === "from" ? node.arguments[0] : node.callee.object;
  const object = unwrapTs(source);
  const length = (value) => (value?.type === "ArrayExpression" && !value.elements.some((item) => item?.type === "SpreadElement") ? value.elements.length : undefined);
  if (object?.type === "ArrayExpression") return length(object);
  if (object?.type === "ObjectExpression") {
    const size = object.properties.find((prop) => propertyKey(prop) === "length");
    return size?.value.type === "NumericLiteral" ? size.value.value : undefined;
  }
  if (object?.type !== "Identifier" || bindingOf(path, at, object.name)) return undefined;
  return arrays().get(object.name);
}

/**
 * How many times one source line renders the element at path's end: the product of every enclosing loop's rows (an
 * inner loop's row repeats per outer row too); undefined when one loop's length is unknown (the canvas count then).
 */
function renderedRows(path, arrays) {
  let total = 1;
  for (let i = 0; i < path.length - 1; i += 1) {
    const node = path[i];
    const loops = LOOP_STATEMENTS.has(node.type) ? path[i + 1] === node.body : isLoopCall(node) && loopCallback(node) === path[i + 1];
    if (!loops) continue;
    const rows = loopRows(path, i, arrays);
    if (rows === undefined) return undefined;
    total *= rows;
  }
  return total;
}

/** Top-level `const NAME = [ … ]` of the file (exported or not): name → length (spreads: no length). */
function topLevelArrays(ast) {
  const out = new Map();
  for (const statement of ast.program.body) {
    const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
    if (declaration?.type !== "VariableDeclaration" || declaration.kind !== "const") continue;
    for (const declarator of declaration.declarations) {
      const init = unwrapTs(declarator.init);
      if (declarator.id.type === "Identifier" && init?.type === "ArrayExpression" && !init.elements.some((item) => item?.type === "SpreadElement")) out.set(declarator.id.name, init.elements.length);
    }
  }
  return out;
}

/** A value that reads nothing: a string, number, boolean, null or undefined literal (`-1`, `` `x` `` included). */
const isLiteral = (node) => node.type === "StringLiteral" || node.type === "NumericLiteral" || node.type === "BooleanLiteral" || node.type === "NullLiteral" || node.type === "BigIntLiteral"
  || (node.type === "TemplateLiteral" && node.expressions.length === 0) || (node.type === "Identifier" && node.name === "undefined")
  || (node.type === "UnaryExpression" && node.operator === "-" && node.argument.type === "NumericLiteral");
const NOT_BOUND = new Set(["JSXEmptyExpression", "JSXElement", "JSXFragment", "ObjectExpression", "ArrayExpression", "ArrowFunctionExpression", "FunctionExpression"]);

/**
 * SourceAttr.origin of an attribute `name={…}` (not a literal, JSX, object/array literal or function): { kind, reads,
 * rows? }. `path()` gives the element's ancestry, `arrays()` the file's top-level const arrays (both computed once).
 */
function attrOrigin(attr, path, arrays) {
  if (attr.type !== "JSXAttribute" || attr.value?.type !== "JSXExpressionContainer") return null;
  const expression = unwrapTs(attr.value.expression);
  if (!expression || NOT_BOUND.has(expression.type) || isLiteral(expression)) return null;
  const reads = [...rootsOf(expression)];
  const nodes = path();
  // State wins over a loop: replacing it would stop the component reacting (a fixed value is offered for data only).
  if (reads.some((name) => readsState(nodes, nodes.length - 1, name))) return { kind: "bound-state", reads };
  const kind = strongest(reads.map((name) => bindingKind(nodes, nodes.length - 1, name)));
  if (typeof kind !== "object") return { kind: kind === "state" ? "bound-state" : "bound-value", reads };
  const rows = renderedRows(nodes, arrays);
  return { kind: "loop-bound", reads, ...(rows === undefined ? {} : { rows }) };
}

/* ── object and array literals in attributes (op setField) ───────────────────────────────────────────────────────── */

/** `x as T`, `x satisfies T`, `x!` and parentheses are looked through. */
function unwrapTs(node) {
  let current = node;
  while (current && (current.type === "TSAsExpression" || current.type === "TSSatisfiesExpression" || current.type === "TSNonNullExpression" || current.type === "ParenthesizedExpression")) current = current.expression;
  return current;
}

/** A non-computed object property's key ("label", "aria-label", 0 as "0"); null for computed keys and methods. */
function propertyKey(prop) {
  if (prop.type !== "ObjectProperty" || prop.computed) return null;
  if (prop.key.type === "Identifier") return prop.key.name;
  if (prop.key.type === "StringLiteral") return prop.key.value;
  if (prop.key.type === "NumericLiteral") return String(prop.key.value);
  return null;
}

/** A field value as the inspector reads it: a plain literal, or the expression as written. */
function fieldValue(node, text) {
  const value = unwrapTs(node);
  if (value.type === "BooleanLiteral") return { kind: "boolean", value: value.value };
  if (value.type === "NumericLiteral") return { kind: "number", value: value.value };
  if (value.type === "UnaryExpression" && value.operator === "-" && value.argument.type === "NumericLiteral") return { kind: "number", value: -value.argument.value };
  const literal = staticString(value);
  if (literal !== null) return { kind: "string", value: literal };
  return { kind: "expression", value: text.slice(node.start, node.end) };
}

/**
 * The fields of an object literal written in an attribute (`leading={{ icon: "icon-x", label: "Back" }}`), or the items of
 * an array literal (`trailing={[{ … }, { … }]}`), one level deep: what the inspector edits field by field (op setField).
 * Spreads and computed keys are listed as `kind: "spread"` / skipped; they stay as written. null for anything else.
 */
function shapeOf(node, text) {
  const value = unwrapTs(node);
  if (value?.type === "ObjectExpression") {
    const fields = [];
    for (const prop of value.properties) {
      if (prop.type === "SpreadElement") { fields.push({ key: "…", kind: "spread", value: text.slice(prop.argument.start, prop.argument.end) }); continue; }
      const key = propertyKey(prop);
      if (key !== null) fields.push({ key, ...fieldValue(prop.value, text) });
    }
    return { type: "object", fields };
  }
  if (value?.type === "ArrayExpression") {
    return {
      type: "array",
      items: value.elements.map((item) => {
        if (!item) return { type: "value", kind: "expression", value: "" };
        if (item.type === "SpreadElement") return { type: "value", kind: "spread", value: text.slice(item.argument.start, item.argument.end) };
        return unwrapTs(item).type === "ObjectExpression" ? shapeOf(item, text) : { type: "value", ...fieldValue(item, text) };
      }),
    };
  }
  return null;
}

/** JSX whitespace rules, simplified for display: trim every line (spaces/tabs only, &nbsp; stays) and join with spaces. */
export function collapseJsxText(value) {
  return value.split(/\r\n|\n|\r/).map((line) => line.replace(/^[ \t]+|[ \t]+$/g, "")).filter(Boolean).join(" ");
}

/**
 * Children as the Studio lists them; fragments are flattened; whitespace-only text and {/* comments *\/} are skipped.
 * A {"text"} or {`text`} child (a literal with no ${}) is a text child too (`expression: true`), so it stays editable.
 */
function listChildren(element, text) {
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
        // {" "} spacers stay expressions: they are layout, not content.
        if (literal !== null && literal.trim()) out.push({ child: { kind: "text", index: textIndex++, value: literal, expression: true }, node: child });
        else out.push({ child: { kind: "expression", raw: text.slice(child.start, child.end) }, node: child });
      }
    }
  };
  visit(element.children);
  return out;
}

/** typographyStyles["Key"] (or ['Key'], [`Key`]) member expressions inside an attribute value. */
function typographyKeys(attrValue) {
  const out = [];
  if (!attrValue) return out;
  walk(attrValue, (node) => {
    if ((node.type === "MemberExpression" || node.type === "OptionalMemberExpression") && node.computed && node.object.type === "Identifier" && node.object.name === "typographyStyles") {
      const key = staticString(node.property);
      if (key !== null) out.push({ key, node: node.property, member: node });
    }
    return true;
  });
  return out;
}

const classNameAttr = (attributes) => attributes.findLast((attr) => attrName(attr) === "className") ?? null;

/**
 * The attributes of `element` (in `ast`, parsed from `text`) as the Studio reads them: a bare identifier bound to
 * useState(<literal>) carries its initial state (op setStateInit edits it); any other bound expression says what it
 * reads (origin). One ancestry walk for the element, the file's arrays read once. Also used for the saved file's
 * version of an attribute (slots.mjs savedAttributes), so a restored binding is read the same way.
 */
export function describeAttrsIn(ast, element, text, attrs = element.openingElement.attributes) {
  let path;
  let arrays;
  const pathOf = () => (path ??= ancestry(ast, element));
  const arraysOf = () => (arrays ??= topLevelArrays(ast));
  return attrs.map((attr) => {
    let described = describeAttr(attr, text);
    if (described.kind !== "expression") return described;
    const state = IDENTIFIER.test(described.value ?? "") ? attrState(attr, pathOf()) : null;
    if (state) return { ...described, state };
    // `options={countries}` with `const countries = [{ … }]` in this file: its fields edit there (op setField).
    if (!described.shape && IDENTIFIER.test(described.value ?? "")) {
      const held = constLiteralFor(pathOf(), described.value);
      // A long list (countries, a table's rows) stays bound: field by field it would bury the panel.
      const shape = held && !(held.init.type === "ArrayExpression" && held.init.elements.length > MAX_CONST_ITEMS) ? shapeOf(held.init, text) : null;
      if (shape) described = { ...described, shape, shapeVia: { name: described.value, line: held.declarator.loc.start.line } };
    }
    const origin = attrOrigin(attr, pathOf, arraysOf);
    return origin ? { ...described, origin } : described;
  });
}

export function describeElement(code, file, loc) {
  const text = stripBom(code);
  const target = parseLoc(loc);
  if (!target) return null;
  const ast = parseSource(text);
  if (!ast) return null;
  const element = findElement(ast, target);
  if (!element) return null;
  const opening = element.openingElement;
  const className = classNameAttr(opening.attributes);
  return {
    file,
    loc: `${target.line}:${target.column}`,
    name: jsxName(opening.name),
    startLine: element.loc.start.line,
    endLine: element.loc.end.line,
    attributes: describeAttrsIn(ast, element, text),
    children: listChildren(element, text).map((entry) => entry.child),
    typography: [...new Set(typographyKeys(className?.value).map((entry) => entry.key))],
    wrap: wrapVerdict(text, ast, element),
    // Char offsets of the element in the file text (BOM left out), so the Studio can copy its exact code (⌘C).
    range: { start: element.start, end: element.end },
    hash: sha1(code),
  };
}

/* ── formatting values ───────────────────────────────────────────────────────────────────────────────────────────── */

const ATTR_NAME = /^[A-Za-z_$][\w$-]*(?::[A-Za-z_$][\w$-]*)?$/;
const ENTITY = /&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i;
/** Characters a reader cannot see (non-ASCII spaces, joiners, soft hyphen, BOM): written as escapes or entities. */
const INVISIBLE = /[\u00a0\u00ad\u034f\u061c\u115f\u1160\u1680\u180e\u2000-\u200f\u202a-\u202f\u205f-\u206f\u3000\u3164\ufeff]/;
/** Babel (and JS) count U+2028/U+2029 as line breaks: never written raw, or every line number below drifts. */
const LINE_SEPARATOR = /[\u2028\u2029]/;

class EditError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const unicodeEscape = (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;

/** A JS string literal in `quote` ("), (') or (`); line breaks, control and invisible characters escaped. */
function jsString(value, quote = '"') {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === "\\") out += "\\\\";
    else if (char === quote) out += `\\${quote}`;
    else if (quote === "`" && char === "$" && value[i + 1] === "{") out += "\\$";
    else if (char === "\n") out += quote === "`" ? "\n" : "\\n";
    else if (char === "\r") out += "\\r";
    else if (char === "\t") out += "\\t";
    else if (char < " " || char === "\u007f" || LINE_SEPARATOR.test(char) || INVISIBLE.test(char)) out += unicodeEscape(char);
    else out += char;
  }
  return `${quote}${out}${quote}`;
}

/** name="v" unless the string needs JS escaping, then name={"v"}; true → `name`; false → name={false}; n → name={n}. */
export function formatAttr(name, value) {
  if (!ATTR_NAME.test(name)) throw new EditError("invalid", `"${name}" is not a JSX attribute name`);
  switch (value?.kind) {
    case "string":
      if (typeof value.value !== "string") break;
      return /["\\{}\r\n]/.test(value.value) || ENTITY.test(value.value) || LINE_SEPARATOR.test(value.value) || INVISIBLE.test(value.value) || /[\u0000-\u001f\u007f]/.test(value.value)
        ? `${name}={${jsString(value.value)}}`
        : `${name}="${value.value}"`;
    case "boolean":
      if (value.value === true) return name;
      if (value.value === false) return `${name}={false}`;
      break;
    case "number":
      if (typeof value.value === "number" && Number.isFinite(value.value)) return `${name}={${Object.is(value.value, -0) ? 0 : value.value}}`;
      break;
    case "expression": {
      const code = typeof value.code === "string" ? value.code.trim() : "";
      if (!code) break;
      if (LINE_SEPARATOR.test(code)) throw new EditError("invalid", "The expression holds a line separator (U+2028/U+2029); write it as \\u2028");
      try {
        parseExpression(code, { plugins: PLUGINS });
      } catch (error) {
        throw new EditError("invalid", `Not a single expression: ${error.message}`);
      }
      return `${name}={${code}}`;
    }
    default:
  }
  throw new EditError("invalid", `Bad value for "${name}"`);
}

/** Whether an attribute as written already holds this value (a re-sent value is a no-op, whatever its spelling). */
function sameValue(described, value) {
  switch (value?.kind) {
    case "string": return described.kind === "string" && described.value === value.value;
    case "boolean":
      if (value.value) return described.kind === "true" || (described.kind === "expression" && described.value === "true");
      return described.kind === "expression" && described.value === "false";
    case "number": return described.kind === "expression" && Number(described.value) === value.value && described.value !== "";
    case "expression": return described.kind === "expression" && described.value === String(value.code ?? "").trim();
    default: return false;
  }
}

/** Text JSX keeps as written: no { } < >, line breaks, entity-like sequences or edge spaces. */
const plainTextSafe = (value) => !/[{}<>\r\n]/.test(value) && !ENTITY.test(value) && !LINE_SEPARATOR.test(value) && !/[\u0000-\u001f\u007f]/.test(value);

/** Invisible characters in plain JSX text as entities (&nbsp;, &#x200B;), so the source shows them. */
const entityText = (value) => value.replace(new RegExp(INVISIBLE.source, "g"), (char) => (char === "\u00a0" ? "&nbsp;" : `&#x${char.charCodeAt(0).toString(16).toUpperCase()};`));

/** JSX text: plain when JSX would keep it as is (invisible characters as entities), else {"…"}. */
export function formatText(value) {
  return plainTextSafe(value) && value === value.trim() ? entityText(value) : `{${jsString(value)}}`;
}

const entityCache = new Map();
/** What JSX makes of an entity (Babel's table); unknown names stay as written. */
function decodeEntity(raw) {
  if (!entityCache.has(raw)) {
    let value = raw;
    try {
      const element = parseExpression(`<x>${raw}</x>`, { plugins: PLUGINS });
      if (element.children.length === 1 && element.children[0].type === "JSXText") value = element.children[0].value;
    } catch {
      // keep the raw text
    }
    entityCache.set(raw, value);
  }
  return entityCache.get(raw);
}

/** Raw JSX text split into units that each render as `dec`: an entity, a line break with its indents (one space), a character. */
function textUnits(raw) {
  const units = [];
  const pattern = /(&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);)|([ \t]*(?:\r\n|\n|\r)[ \t\r\n]*)|([\s\S])/giy;
  let match;
  while ((match = pattern.exec(raw))) {
    if (match[1]) units.push({ raw: match[1], dec: decodeEntity(match[1]) });
    else if (match[2]) units.push({ raw: match[2], dec: " " });
    else units.push({ raw: match[3], dec: match[3] });
  }
  return units;
}

/** The text a JSX text child renders (collapsed as describeElement lists it), or null when it is not one plain text. */
function renderedText(raw) {
  try {
    const element = parseExpression(`<x>${raw}</x>`, { plugins: PLUGINS });
    if (element.children.length !== 1 || element.children[0].type !== "JSXText") return null;
    return collapseJsxText(element.children[0].value);
  } catch {
    return null;
  }
}

/**
 * New source for a JSX text whose visible text becomes `value`. The unchanged start and end of the old text keep their
 * spelling (entities such as &amp; and &nbsp;, line breaks); only the middle is rewritten. Falls back to formatText.
 */
function rewriteText(context, value) {
  const { lead, region, trail } = context;
  const units = textUnits(region);
  let prefix = 0;
  let from = 0;
  while (prefix < units.length && units[prefix].dec && value.startsWith(units[prefix].dec, from)) { from += units[prefix].dec.length; prefix += 1; }
  let suffix = 0;
  let to = value.length;
  while (suffix < units.length - prefix) {
    const dec = units[units.length - 1 - suffix].dec;
    if (!dec || to - dec.length < from || !value.endsWith(dec, to)) break;
    to -= dec.length;
    suffix += 1;
  }
  const middle = value.slice(from, to);
  if (value === value.trim() && plainTextSafe(middle)) {
    const candidate = units.slice(0, prefix).map((unit) => unit.raw).join("") + entityText(middle) + units.slice(units.length - suffix).map((unit) => unit.raw).join("");
    if (renderedText(lead + candidate + trail) === value) return candidate;
  }
  return formatText(value);
}

/* ── edit ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const lineStartOf = (text, index) => text.lastIndexOf("\n", index - 1) + 1;

/**
 * `beforeSpread` (setProp ops): a new attribute goes in front of the element's first spread (`status {...avatarOf(p)}`),
 * so a spread that feeds the prop still wins and an edit never overrides what it passes in (a playground's controls).
 * `op.before` (a written attribute's name, "…" for the first spread) places a new attribute in front of it instead: a
 * prop put back where the saved file had it (restoreStep in a playground, which refuses resetSlot).
 */
function setPropEdits(element, text, op, eol, beforeSpread = false) {
  const opening = element.openingElement;
  const formatted = formatAttr(op.name, op.value);
  const existing = opening.attributes.findLast((attr) => attrName(attr) === op.name);
  if (existing) {
    if (sameValue(describeAttr(existing, text), op.value)) return [];
    return [{ start: existing.start, end: existing.end, text: formatted }];
  }
  const isSpread = (attr) => attr.type === "JSXSpreadAttribute";
  const anchor = typeof op.before === "string" ? opening.attributes.find((attr) => (op.before === "…" ? isSpread(attr) : attrName(attr) === op.before)) : null;
  const spread = anchor ?? (beforeSpread ? opening.attributes.find(isSpread) : null);
  if (spread) {
    // A spread (or `before`) that starts its own line: the new attribute takes a line of its own above it, same indent.
    const indent = text.slice(lineStartOf(text, spread.start), spread.start);
    const ownLine = spread.loc.start.line > opening.loc.start.line && /^[ \t]*$/.test(indent);
    return [{ start: spread.start, end: spread.start, text: ownLine ? `${formatted}${eol}${indent}` : `${formatted} ` }];
  }
  const last = opening.attributes.at(-1);
  if (!last) {
    const after = (opening.typeArguments ?? opening.typeParameters ?? opening.name).end;
    return [{ start: after, end: after, text: ` ${formatted}` }];
  }
  // One attribute per line (the last one starts its own line): a new line with the same indent; else a space.
  const indent = text.slice(lineStartOf(text, last.start), last.start);
  const ownLine = last.loc.start.line > opening.loc.start.line && /^[ \t]*$/.test(indent);
  if (!ownLine) return [{ start: last.end, end: last.end, text: ` ${formatted}` }];
  // A `// comment` after the last attribute stays on its line: the new one goes after it, not between them.
  const newline = text.indexOf("\n", last.end);
  const lineEnd = newline < 0 ? text.length : text[newline - 1] === "\r" ? newline - 1 : newline;
  const at = /^[ \t]*\/\/[^\n]*$/.test(text.slice(last.end, lineEnd)) ? lineEnd : last.end;
  return [{ start: at, end: at, text: `${eol}${indent}${formatted}` }];
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** A field value as JS code (setField): strings in `quote` (the one the field was written with), else double quotes. */
function formatFieldValue(value, quote = '"') {
  switch (value?.kind) {
    case "string":
      if (typeof value.value === "string") return jsString(value.value, quote);
      break;
    case "boolean":
      if (typeof value.value === "boolean") return String(value.value);
      break;
    case "number":
      if (typeof value.value === "number" && Number.isFinite(value.value)) return String(Object.is(value.value, -0) ? 0 : value.value);
      break;
    case "expression": {
      const code = typeof value.code === "string" ? value.code.trim() : "";
      if (!code) break;
      if (LINE_SEPARATOR.test(code)) throw new EditError("invalid", "The expression holds a line separator (U+2028/U+2029); write it as \\u2028");
      try {
        parseExpression(code, { plugins: PLUGINS });
      } catch (error) {
        throw new EditError("invalid", `Not a single expression: ${error.message}`);
      }
      return code;
    }
    default:
  }
  throw new EditError("invalid", "Bad setField value");
}

/** Whether a written field already holds this value (a re-sent value is a no-op). */
function sameField(node, value, text) {
  const written = fieldValue(node, text);
  if (value?.kind === "expression") return written.kind === "expression" && written.value.trim() === String(value.code ?? "").trim();
  return written.kind === value?.kind && written.value === value.value;
}

/**
 * Op setField: one field of an object literal written in attribute `name` (`leading={{ … }}`), or of its `index`-th item
 * when the attribute is an array literal (`trailing={[{ … }, …]}`). A value replaces the field's value (a shorthand
 * `{ icon }` becomes `icon: …`) or appends the field in the object's own layout (one per line, or inline); null removes
 * the field with its comma. Spreads and other fields stay as written.
 */
function setFieldEdits(element, text, op, eol, ast) {
  if (!ATTR_NAME.test(op.name ?? "")) throw new EditError("invalid", `"${op.name}" is not a JSX attribute name`);
  if (typeof op.key !== "string" || !op.key || op.key === "…" || /[\r\n]/.test(op.key) || LINE_SEPARATOR.test(op.key)) throw new EditError("invalid", "setField needs a field `key`");
  if (op.index !== undefined && !(Number.isInteger(op.index) && op.index >= 0)) throw new EditError("invalid", "setField `index` must be an item index (0 or more)");
  const attr = element.openingElement.attributes.findLast((candidate) => attrName(candidate) === op.name);
  if (!attr || attr.value?.type !== "JSXExpressionContainer" || attr.value.expression.type === "JSXEmptyExpression") throw new EditError("stale", `<${jsxName(element.openingElement.name)}> has no ${op.name}={…} written in place`);
  let target = unwrapTs(attr.value.expression);
  if (target.type === "Identifier" && ast) {
    // Held by a same-file const (`options={countries}`): the edit goes to its literal.
    const held = constLiteralFor(ancestry(ast, element) ?? [], target.name);
    if (held) target = held.init;
  }
  if (op.index !== undefined) {
    if (target.type !== "ArrayExpression") throw new EditError("stale", `${op.name} is not a list written in place`);
    const item = target.elements[op.index];
    if (!item || item.type === "SpreadElement") throw new EditError("stale", `${op.name} has no item #${op.index + 1}`);
    target = unwrapTs(item);
  }
  if (target.type !== "ObjectExpression") throw new EditError("stale", `${op.name}${op.index !== undefined ? ` item #${op.index + 1}` : ""} is not an object written in place`);
  const properties = target.properties;
  const existing = properties.findLast((prop) => propertyKey(prop) === op.key);
  if (op.value === null) return existing ? [removePropertyEdit(target, existing)] : [];
  if (existing) {
    if (!existing.shorthand && sameField(existing.value, op.value, text)) return [];
    const written = unwrapTs(existing.value);
    const quote = written.type === "TemplateLiteral" ? "`" : written.type === "StringLiteral" && text[written.start] === "'" ? "'" : '"';
    const code = formatFieldValue(op.value, quote);
    if (existing.shorthand) return [{ start: existing.start, end: existing.end, text: `${propertyKeyCode(op.key)}: ${code}` }];
    return [{ start: existing.value.start, end: existing.value.end, text: code }];
  }
  const property = `${propertyKeyCode(op.key)}: ${formatFieldValue(op.value)}`;
  const last = properties.at(-1);
  if (!last) return [{ start: target.start, end: target.end, text: `{ ${property} }` }];
  // A trailing comma after the last field: the new field goes after it, keeping one.
  const between = text.slice(last.end, target.end - 1);
  const comma = /^\s*,/.exec(between);
  const indent = text.slice(lineStartOf(text, last.start), last.start);
  const ownLine = last.loc.start.line > target.loc.start.line && /^[ \t]*$/.test(indent);
  if (comma) {
    const at = last.end + comma[0].length;
    return [{ start: at, end: at, text: ownLine ? `${eol}${indent}${property},` : ` ${property},` }];
  }
  return [{ start: last.end, end: last.end, text: ownLine ? `,${eol}${indent}${property}` : `, ${property}` }];
}

const propertyKeyCode = (key) => (IDENTIFIER.test(key) ? key : jsString(key));

/** Removes one property of an object literal with its comma (the next field moves up into its place). */
function removePropertyEdit(object, prop) {
  const properties = object.properties;
  const index = properties.indexOf(prop);
  if (properties.length === 1) return { start: object.start, end: object.end, text: "{}" };
  if (index < properties.length - 1) return { start: prop.start, end: properties[index + 1].start, text: "" };
  return { start: properties[index - 1].end, end: prop.end, text: "" };
}

/**
 * Removes each attribute named op.name. Alone on its line: the whole line. After other code on its line: the attribute
 * and the spaces before it. Starting its line with more code after it: the attribute and the spaces after it, or, when
 * it ends the tag (`size="sm">`, `size="sm" />`), the line break before it, unless the line above ends in a // comment
 * (joining would comment out the rest of the tag).
 */
function removePropEdits(element, text, op, lineCommentEnds) {
  if (!ATTR_NAME.test(op.name ?? "")) throw new EditError("invalid", `"${op.name}" is not a JSX attribute name`);
  return element.openingElement.attributes.filter((attr) => attrName(attr) === op.name).map((attr) => removeAttrEdit(attr, text, lineCommentEnds));
}

/** The edit that removes one attribute (see removePropEdits). */
function removeAttrEdit(attr, text, lineCommentEnds) {
  const lineStart = lineStartOf(text, attr.start);
  const newline = text.indexOf("\n", attr.end);
  const lineEnd = newline < 0 ? text.length : newline;
  const rest = text.slice(attr.end, lineEnd);
  const startsLine = /^[ \t]*$/.test(text.slice(lineStart, attr.start));
  if (startsLine && lineStart > 0 && /^[ \t]*\r?$/.test(rest)) return { start: lineStart, end: newline < 0 ? text.length : newline + 1, text: "" };
  let start = attr.start;
  if (!startsLine) {
    while (start > lineStart && /[ \t]/.test(text[start - 1])) start -= 1;
    return { start, end: attr.end, text: "" };
  }
  const follow = /^[ \t]+(?=[^\s])/.exec(rest);
  let joined = attr.start;
  while (joined > 0 && /\s/.test(text[joined - 1])) joined -= 1;
  const comment = lineCommentEnds.has(joined);
  // ` />` after it ends the tag: the line break before it goes instead, so removing what setProp put on its own line
  // (`name="x"\n  status />`) gives back `name="x" />`, not a `/>` left alone on that line.
  if (follow && (comment || !/^\/?>/.test(rest.slice(follow[0].length)))) return { start: attr.start, end: attr.end + follow[0].length, text: "" };
  return { start: comment ? attr.start : joined, end: attr.end, text: "" };
}

function setTextEdits(element, text, op) {
  if (typeof op.value !== "string") throw new EditError("invalid", "setText needs a string value");
  const entry = listChildren(element, text).find((item) => item.child.kind === "text" && item.child.index === op.index);
  if (!entry) throw new EditError("stale", `The element has no text child #${op.index}`);
  if (entry.child.value === op.value) return [];
  const node = entry.node;
  if (node.type === "JSXExpressionContainer") {
    // Same form as written: {"…"}, {'…'} or {`…`}.
    const expression = node.expression;
    const quote = expression.type === "TemplateLiteral" ? "`" : text[expression.start] === "'" ? "'" : '"';
    return [{ start: node.start, end: node.end, text: `{${jsString(op.value, quote)}}`, kind: "text" }];
  }
  const raw = text.slice(node.start, node.end);
  const lead = /^[ \t\r\n]*/.exec(raw)[0].length;
  const trail = raw.length > lead ? /[ \t\r\n]*$/.exec(raw)[0].length : 0;
  const context = { lead: raw.slice(0, lead), region: raw.slice(lead, raw.length - trail), trail: raw.slice(raw.length - trail) };
  return [{ start: node.start + lead, end: node.end - trail, text: rewriteText(context, op.value), kind: "text" }];
}

function setTypographyEdits(element, text, op, keys) {
  if (typeof op.from !== "string" || typeof op.to !== "string" || !op.to || /["'`\\\r\n${}\u2028\u2029]/.test(op.to)) throw new EditError("invalid", "setTypography needs plain `from` and `to` keys");
  if (keys?.size && !keys.has(op.to)) throw new EditError("invalid", `"${op.to}" is not a typographyStyles key`);
  const hits = typographyKeys(classNameAttr(element.openingElement.attributes)?.value).filter((entry) => entry.key === op.from);
  if (!hits.length) throw new EditError("stale", `className has no typographyStyles["${op.from}"]`);
  if (op.from === op.to) return [];
  return hits.map(({ node }) => {
    const quote = text[node.start];
    return { start: node.start, end: node.end, text: `${quote}${op.to}${quote}` };
  });
}

/* ── text style (setTextStyle) ───────────────────────────────────────────────────────────────────────────────────── */

/** Where typographyStyles lives (repo-relative, no extension): the import a file gains when it first uses it. */
const TYPOGRAPHY_MODULE = "src/tokens/typography.generated";
const TYPOGRAPHY_SOURCE = /(?:^|\/)tokens\/typography\.generated(?:\.tsx?)?$/;
const PLAIN_KEY = /^[^"'`\\\r\n${}\u2028\u2029]+$/;
/** Class-joining helpers whose arguments are class names (cx("a", b)). */
const CLASS_JOINERS = new Set(["cx", "clsx", "classNames", "classnames", "cn"]);
const typographyUse = (key) => `typographyStyles[${JSON.stringify(key)}]`;

/** A `className=…` attribute's source parsed on its own (offsets are 3 past the source's: `<x ` comes first). */
function parseClassAttr(source) {
  try {
    const element = parseExpression(`<x ${source} />`, { plugins: PLUGINS, createParenthesizedExpressions: true });
    const attributes = element.openingElement.attributes;
    return attributes.length === 1 && attrName(attributes[0]) === "className" ? attributes[0] : null;
  } catch {
    return null;
  }
}

/** The nodes from `root` down to `target` (inclusive), or null. */
function ancestry(root, target) {
  const path = [];
  const visit = (node) => {
    path.push(node);
    if (node === target) return true;
    for (const key in node) {
      if (SKIP_KEYS.has(key)) continue;
      const value = node[key];
      for (const child of Array.isArray(value) ? value : [value]) if (isNode(child) && visit(child)) return true;
    }
    path.pop();
    return false;
  };
  return visit(root) ? path : null;
}

/** The names a function's parameters bind (`({ a, b: [c] }, ...rest)` → a, c, rest). */
function paramNames(fn) {
  const out = [];
  const visit = (pattern) => {
    if (!pattern) return;
    if (pattern.type === "Identifier") out.push(pattern.name);
    else if (pattern.type === "ObjectPattern") pattern.properties.forEach((prop) => visit(prop.type === "RestElement" ? prop.argument : prop.value));
    else if (pattern.type === "ArrayPattern") pattern.elements.forEach(visit);
    else if (pattern.type === "AssignmentPattern") visit(pattern.left);
    else if (pattern.type === "RestElement") visit(pattern.argument);
    else if (pattern.type === "TSParameterProperty") visit(pattern.parameter);
  };
  (fn.params ?? []).forEach(visit);
  return out;
}

/** A same-file const list longer than this is not edited item by item from the inspector. */
const MAX_CONST_ITEMS = 20;

/**
 * `prop={NAME}` held by a same-file `const NAME = [ … ]` or `{ … }` (BACKLOG "Studio object props, next steps"): the
 * literal and its declarator, from the nearest scope out (a function body's own statements, then the module); null when
 * a parameter on the way binds NAME, or the const holds anything else. The Studio edits that literal field by field.
 */
function constLiteralFor(path, name) {
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const node = path[index];
    const fn = node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression" || node.type === "FunctionDeclaration" ? node : null;
    if (fn && paramNames(fn).includes(name)) return null;
    const statements = node.type === "Program" ? node.body : fn?.body?.type === "BlockStatement" ? fn.body.body : null;
    if (!statements) continue;
    for (const statement of statements) {
      const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
      if (declaration?.type !== "VariableDeclaration") continue;
      const declarator = declaration.declarations.find((item) => item.id.type === "Identifier" && item.id.name === name);
      if (!declarator) continue;
      const init = unwrapTs(declarator.init);
      return declaration.kind === "const" && (init?.type === "ArrayExpression" || init?.type === "ObjectExpression") ? { init, declarator } : null;
    }
  }
  return null;
}

/** A value that adds no class: "", ``, undefined, null, false. */
const emptyClass = (node) => (node.type === "StringLiteral" && !node.value.trim())
  || (node.type === "TemplateLiteral" && !node.expressions.length && !node.quasis[0].value.raw.trim())
  || (node.type === "Identifier" && node.name === "undefined") || node.type === "NullLiteral" || (node.type === "BooleanLiteral" && !node.value);

const memberNamed = (callee, name) => callee?.type === "MemberExpression" && !callee.computed && callee.property.type === "Identifier" && callee.property.name === name;

/**
 * The class list a className expression joins: [..].join(" "), [..].filter(Boolean).join(" ") (the array) or
 * cx(..)/clsx(..) (the call); null for any other form.
 */
function classList(expression) {
  if (expression?.type !== "CallExpression") return null;
  if (expression.callee.type === "Identifier" && CLASS_JOINERS.has(expression.callee.name)) return { node: expression, items: expression.arguments };
  if (!memberNamed(expression.callee, "join")) return null;
  let object = expression.callee.object;
  if (object.type === "CallExpression" && memberNamed(object.callee, "filter")) object = object.callee.object;
  return object.type === "ArrayExpression" && !object.elements.includes(null) ? { node: object, items: object.elements } : null;
}

const unsupportedForm = () => new EditError("invalid", "The className uses typographyStyles in a form the Studio cannot rewrite; change it in the code");

/**
 * The className attribute source without one typographyStyles[…] use, tidied: a template keeps one space where the
 * placeholder was, a list loses the item and its comma, `cond && …` and `c ? … : ""` go with it. Null = nothing is left
 * (the attribute goes); `done` = there was no use left to remove.
 */
function withoutOneUse(source) {
  const attr = parseClassAttr(source);
  if (!attr || attr.value?.type !== "JSXExpressionContainer") throw unsupportedForm();
  const hits = typographyKeys(attr.value);
  if (!hits.length) return { source, done: true };
  const expression = attr.value.expression;
  const chain = ancestry(expression, hits[0].member);
  if (!chain) throw unsupportedForm();
  const at = (offset) => offset - 3;
  const splice = (start, end, insert) => ({ source: source.slice(0, at(start)) + insert + source.slice(at(end)), done: false });
  let unit = hits[0].member;
  let index = chain.length - 1;
  for (; index > 0; index -= 1) {
    const parent = chain[index - 1];
    if (parent.type === "ParenthesizedExpression" || parent.type === "TSAsExpression" || parent.type === "TSNonNullExpression" || parent.type === "TSSatisfiesExpression") { unit = parent; continue; }
    if (parent.type === "LogicalExpression" && parent.right === unit) { unit = parent; continue; }
    if (parent.type === "ConditionalExpression" && parent.test !== unit) {
      if (emptyClass(parent.consequent === unit ? parent.alternate : parent.consequent)) { unit = parent; continue; }
      return splice(unit.start, unit.end, '""');
    }
    break;
  }
  if (unit === expression) return { source: null, done: false };
  const parent = chain[index - 1];
  if (parent.type === "TemplateLiteral") {
    const position = parent.expressions.indexOf(unit);
    const left = parent.quasis[position];
    const right = parent.quasis[position + 1];
    const before = source.slice(at(left.start), at(left.end));
    const after = source.slice(at(right.start), at(right.end));
    const trimmedBefore = before.replace(/[ \t]+$/, "");
    const trimmedAfter = after.replace(/^[ \t]+/, "");
    const spaced = trimmedBefore !== before || trimmedAfter !== after;
    const contentBefore = Boolean(trimmedBefore) || position > 0;
    const contentAfter = Boolean(trimmedAfter) || position + 1 < parent.quasis.length - 1;
    return splice(left.start, right.end, trimmedBefore + (spaced && contentBefore && contentAfter ? " " : "") + trimmedAfter);
  }
  const joiner = parent.type === "CallExpression" && parent.callee.type === "Identifier" && CLASS_JOINERS.has(parent.callee.name) && parent.arguments.includes(unit);
  const items = parent.type === "ArrayExpression" && !parent.elements.includes(null) ? parent.elements : joiner ? parent.arguments : null;
  if (items) {
    const position = items.indexOf(unit);
    if (position < items.length - 1) return splice(unit.start, items[position + 1].start, "");
    if (position > 0) return splice(items[position - 1].end, unit.end, "");
    const comma = /^\s*,/.exec(source.slice(at(unit.end)));
    return splice(unit.start, unit.end + (comma ? comma[0].length : 0), "");
  }
  if (parent.type === "BinaryExpression" && parent.operator === "+") {
    const other = parent.left === unit ? parent.right : parent.left;
    return splice(parent.start, parent.end, source.slice(at(other.start), at(other.end)));
  }
  throw unsupportedForm();
}

/** What is left after every use went: null when it adds no class; a static template becomes className="…". */
function tidyClassAttr(source) {
  const attr = parseClassAttr(source);
  if (!attr?.value) return source;
  if (attr.value.type === "StringLiteral") return attr.value.value.trim() ? source : null;
  const expression = attr.value.expression;
  if (expression.type === "JSXEmptyExpression" || emptyClass(expression)) return null;
  if (expression.type === "TemplateLiteral" && !expression.expressions.length) {
    const raw = expression.quasis[0].value.raw;
    return raw === expression.quasis[0].value.cooked && !/["\r\n\\]/.test(raw) ? `${source.slice(0, attr.name.end - 3)}="${raw.trim()}"` : source;
  }
  const list = classList(expression);
  if (list && !list.items.length) return null;
  // [E].filter(Boolean).join(" ") (what adding to another expression E wrote) is E again; {"a"} is "a".
  if (list && list.node.type === "ArrayExpression" && list.items.length === 1 && list.items[0].type !== "SpreadElement") {
    const item = list.items[0];
    return tidyClassAttr(`${source.slice(0, attr.value.start - 3)}{${source.slice(item.start - 3, item.end - 3)}}`);
  }
  if (expression.type === "StringLiteral" && /^"[^"\\\r\n]*"$/.test(source.slice(expression.start - 3, expression.end - 3))) return `${source.slice(0, attr.value.start - 3)}"${expression.value}"`;
  return source;
}

/** The className attribute source with every typographyStyles[…] use removed; null when the attribute goes. */
function withoutTextStyles(source) {
  let current = source;
  for (let guard = 0; guard < 64; guard += 1) {
    const step = withoutOneUse(current);
    if (step.source === null) return null;
    if (step.done) return tidyClassAttr(current);
    current = step.source;
  }
  throw unsupportedForm();
}

/** Edits that add typographyStyles[key] to an element whose className has none (see setTextStyleEdits). */
function addTextStyleEdits(element, text, key, eol) {
  const use = typographyUse(key);
  const attr = classNameAttr(element.openingElement.attributes);
  if (!attr) return setPropEdits(element, text, { name: "className", value: { kind: "expression", code: use } }, eol);
  const name = text.slice(attr.name.start, attr.name.end);
  const withClasses = (classes) => ({ start: attr.start, end: attr.end, text: classes.trim() ? `${name}={\`${templateRaw(classes.trim())} \${${use}}\`}` : `${name}={${use}}` });
  if (!attr.value) return [{ start: attr.start, end: attr.end, text: `${name}={${use}}` }];
  if (attr.value.type === "StringLiteral") return [withClasses(attr.value.value)];
  const expression = attr.value.expression;
  if (expression.type === "JSXEmptyExpression") return [{ start: attr.start, end: attr.end, text: `${name}={${use}}` }];
  const literal = staticString(expression);
  if (literal !== null) return [withClasses(literal)];
  if (expression.type === "TemplateLiteral") {
    const last = expression.quasis.at(-1).value.raw;
    return [{ start: expression.end - 1, end: expression.end - 1, text: `${/\s$/.test(last) ? "" : " "}\${${use}}` }];
  }
  const list = classList(expression);
  if (list) {
    const { node, items } = list;
    if (!items.length) {
      const open = node.type === "ArrayExpression" ? node.start + 1 : text.indexOf("(", node.callee.end) + 1;
      return [{ start: open, end: open, text: use }];
    }
    const last = items.at(-1);
    const ownLine = last.loc.start.line > node.loc.start.line && /^[ \t]*$/.test(text.slice(lineStartOf(text, last.start), last.start));
    return [{ start: last.end, end: last.end, text: ownLine ? `,${eol}${indentAt(text, last.start)}${use}` : `, ${use}` }];
  }
  return [{ start: expression.start, end: expression.end, text: `[${text.slice(expression.start, expression.end)}, ${use}].filter(Boolean).join(" ")` }];
}

/**
 * setTextStyle { value }: the element's className gets typographyStyles[value] — every use it already has switches to
 * value, else one is added (className={…}, a template placeholder, a list item, or [E, …].filter(Boolean).join(" "));
 * value null removes every use (the attribute too when nothing is left). `addsUse`: the file needs the binding.
 */
function setTextStyleEdits(element, text, op, keys, eol, lineCommentEnds) {
  const value = op.value;
  if (value !== null && (typeof value !== "string" || !PLAIN_KEY.test(value))) throw new EditError("invalid", "setTextStyle needs a typographyStyles key (or null to remove it)");
  if (value !== null) {
    if (!keys?.size) throw new EditError("invalid", "The typography styles (src/tokens/typography.generated.ts) cannot be read, so setTextStyle is off");
    if (!keys.has(value)) throw new EditError("invalid", `"${value}" is not a typographyStyles key`);
  }
  const attr = classNameAttr(element.openingElement.attributes);
  const hits = typographyKeys(attr?.value);
  if (hits.length && value !== null) {
    return { edits: hits.filter((hit) => hit.key !== value).map(({ node }) => ({ start: node.start, end: node.end, text: `${text[node.start]}${value}${text[node.start]}` })), addsUse: false };
  }
  if (hits.length) {
    const next = withoutTextStyles(text.slice(attr.start, attr.end));
    return { edits: [next === null ? removeAttrEdit(attr, text, lineCommentEnds) : { start: attr.start, end: attr.end, text: next }], addsUse: false, removedUses: hits.length };
  }
  if (value === null) return { edits: [], addsUse: false };
  return { edits: addTextStyleEdits(element, text, value, eol), addsUse: true };
}

/**
 * The edit that makes `typographyStyles` available in the file, or null when it already is (an import or a top-level
 * declaration of that name): the name joins a named import from tokens/typography.generated, else a new import line
 * follows the last import that binds names (same quotes and semicolons; after the directives, or first, when there is
 * no import).
 */
function typographyImportEdit(ast, text, eol, file) {
  const body = ast.program.body;
  const imports = body.filter((statement) => statement.type === "ImportDeclaration");
  for (const statement of imports) {
    if (statement.importKind === "type") continue;
    if (statement.specifiers.some((specifier) => specifier.local?.name === "typographyStyles" && specifier.importKind !== "type")) return null;
  }
  for (const statement of body) {
    const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
    if ((declaration?.type === "FunctionDeclaration" || declaration?.type === "ClassDeclaration") && declaration.id?.name === "typographyStyles") return null;
    if (declaration?.type === "VariableDeclaration" && declaration.declarations.some((item) => item.id.type === "Identifier" && item.id.name === "typographyStyles")) return null;
  }
  const sameModule = imports.find((statement) => statement.importKind !== "type" && TYPOGRAPHY_SOURCE.test(statement.source.value) && statement.specifiers.length && statement.specifiers.every((specifier) => specifier.type === "ImportSpecifier"));
  if (sameModule) {
    const last = sameModule.specifiers.at(-1);
    const ownLine = last.loc.start.line > sameModule.loc.start.line;
    return { start: last.end, end: last.end, text: ownLine ? `,${eol}${indentAt(text, last.start)}typographyStyles` : ", typographyStyles" };
  }
  if (typeof file !== "string" || !file) throw new EditError("invalid", "setTextStyle needs the file's path to import typographyStyles");
  let specifier = posix.relative(posix.dirname(file), TYPOGRAPHY_MODULE);
  if (!specifier.startsWith(".")) specifier = `./${specifier}`;
  // After the last import that binds names (side-effect imports such as "./page.css" conventionally stay last).
  const lastImport = imports.findLast((statement) => statement.specifiers.length) ?? imports.at(-1);
  const quote = lastImport && text[lastImport.source.start] === "'" ? "'" : '"';
  const semicolon = lastImport && !text.slice(lastImport.start, lastImport.end).endsWith(";") ? "" : ";";
  const line = `import { typographyStyles } from ${quote}${specifier}${quote}${semicolon}`;
  if (lastImport) {
    // After the import's line when only spaces or a // comment follow it on that line.
    const newline = text.indexOf("\n", lastImport.end);
    const rest = text.slice(lastImport.end, newline < 0 ? text.length : newline);
    const at = /^[ \t]*(?:\/\/.*)?\r?$/.test(rest) && newline >= 0 ? newline - (text[newline - 1] === "\r" ? 1 : 0) : lastImport.end;
    return { start: at, end: at, text: `${eol}${line}` };
  }
  const directive = ast.program.directives?.at(-1);
  if (directive) return { start: directive.end, end: directive.end, text: `${eol}${line}` };
  return { start: 0, end: 0, text: `${line}${eol}` };
}

/** Identifiers named typographyStyles outside import declarations (its uses, typeof included). */
function typographyReferences(ast) {
  const imports = ast.program.body.filter((statement) => statement.type === "ImportDeclaration");
  let count = 0;
  walk(ast.program, (node) => {
    if (node.type === "ImportDeclaration") return false;
    if (node.type === "Identifier" && node.name === "typographyStyles" && !imports.some((statement) => statement.start <= node.start && node.end <= statement.end)) count += 1;
    return true;
  });
  return count;
}

/** The edit that drops the typographyStyles import (its specifier, or the whole import line when it is the only one), or null. */
function typographyImportRemoval(ast, text) {
  const statement = ast.program.body.find((item) => item.type === "ImportDeclaration" && item.importKind !== "type" && item.specifiers.some((specifier) => specifier.type === "ImportSpecifier" && specifier.local.name === "typographyStyles"));
  if (!statement) return null;
  const specifiers = statement.specifiers;
  const specifier = specifiers.find((item) => item.type === "ImportSpecifier" && item.local.name === "typographyStyles");
  if (specifiers.length > 1) {
    const position = specifiers.indexOf(specifier);
    return position < specifiers.length - 1
      ? { start: specifier.start, end: specifiers[position + 1].start, text: "" }
      : { start: specifiers[position - 1].end, end: specifier.end, text: "" };
  }
  const lineStart = lineStartOf(text, statement.start);
  const newline = text.indexOf("\n", statement.end);
  if (/^[ \t]*$/.test(text.slice(lineStart, statement.start)) && newline >= 0 && /^[ \t]*\r?$/.test(text.slice(statement.end, newline))) return { start: lineStart, end: newline + 1, text: "" };
  return { start: statement.start, end: statement.end, text: "" };
}

/** Applies non-overlapping edits back to front; inserts at one position keep their op order; overlapping deletions merge. */
function applyEdits(text, edits) {
  const sorted = edits.map((edit, order) => ({ ...edit, order })).sort((a, b) => a.start - b.start || (a.end - a.start) - (b.end - b.start) || a.order - b.order);
  let out = "";
  let position = 0;
  let deleting = false;
  for (const edit of sorted) {
    if (edit.start < position) {
      if (deleting && edit.text === "") { position = Math.max(position, edit.end); continue; }
      throw new EditError("invalid", "Two ops change the same code");
    }
    out += text.slice(position, edit.start) + edit.text;
    position = edit.end;
    deleting = edit.text === "" && edit.end > edit.start;
  }
  return out + text.slice(position);
}

/** 1-based inclusive line range of `after` that differs from `before` (a pure deletion marks the line after it). */
export function changedRange(before, after) {
  const a = before.split(/\r?\n/);
  const b = after.split(/\r?\n/);
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < a.length - prefix && suffix < b.length - prefix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) suffix += 1;
  const from = Math.min(prefix + 1, b.length);
  return { from, to: Math.max(from, Math.min(b.length - suffix, b.length)) };
}

/* ── example snippets ────────────────────────────────────────────────────────────────────────────────────────────── */

const propertyName = (key) => (key.type === "Identifier" ? key.name : key.type === "StringLiteral" ? key.value : null);

/** The hand-written example snippets: template literals that are the value of a `code` property, by literal. */
export function snippetLiterals(ast) {
  const out = [];
  walk(ast, (node) => {
    if (node.type === "ObjectProperty" && !node.computed && propertyName(node.key) === "code" && node.value.type === "TemplateLiteral") out.push(node.value);
    return true;
  });
  return out;
}

const isFunction = (node) => node && (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression" || node.type === "FunctionDeclaration");

/** The module-level declaration that holds `node` (`node`: it, or its declarator), with its name when it is a function or a const. */
function enclosingTopLevel(ast, node) {
  for (const statement of ast.program.body) {
    const declaration = statement.type === "ExportNamedDeclaration" || statement.type === "ExportDefaultDeclaration" ? statement.declaration ?? statement : statement;
    if (!declaration || declaration.start > node.start || declaration.end < node.end) continue;
    if (declaration.type === "FunctionDeclaration") return { name: declaration.id?.name ?? null, node: declaration };
    if (declaration.type === "VariableDeclaration") {
      for (const declarator of declaration.declarations) {
        if (declarator.start <= node.start && declarator.end >= node.end) return { name: declarator.id?.type === "Identifier" ? declarator.id.name : null, node: declarator };
      }
    }
    return { name: null, node: declaration };
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

/** JSX element names a function body renders directly. */
function renderedNames(fn) {
  const names = new Set();
  walk(fn, (node) => {
    if (node.type === "JSXOpeningElement") names.add(jsxName(node.name));
    return true;
  });
  return names;
}

/**
 * The one snippet that shows `element`: the `code` of the example whose render holds the element, or renders the
 * component that holds it. Null with a reason when no example (or more than one) does. `scope`: the code the snippet
 * stands for (that render, or that component), where snippetCopyOf counts the element's namesakes.
 */
function snippetFor(ast, element) {
  const examples = exampleObjects(ast);
  if (!examples.length) return { literal: null, reason: null };
  const inline = examples.filter((example) => example.render.start <= element.start && example.render.end >= element.end);
  if (inline.length === 1) return { literal: inline[0].code, reason: null, scope: inline[0].render };
  const owner = enclosingTopLevel(ast, element);
  if (!owner?.name) return { literal: null, reason: "no example snippet shows this code" };
  const rendering = examples.filter((example) => renderedNames(example.render).has(owner.name));
  if (rendering.length === 1) return { literal: rendering[0].code, reason: null, scope: owner.node };
  return { literal: null, reason: rendering.length ? `more than one example renders <${owner.name}>` : "no example snippet shows this code" };
}

/** JSX elements named `name` inside `node` (the node itself included). */
function elementsNamed(node, name) {
  const out = [];
  walk(node, (inner) => {
    if (inner.type === "JSXElement" && jsxName(inner.openingElement.name) === name) out.push(inner);
    return true;
  });
  return out;
}

/**
 * An opening tag's attributes as one whitespace-insensitive string, `key` left out (a wrap moves it to the wrapper):
 * `<Card  title="x"\n>` and `<Card key={id} title="x">` read the same.
 */
const tagText = (text, opening) => opening.attributes.filter((attr) => attrName(attr) !== "key").map((attr) => text.slice(attr.start, attr.end).replace(/\s+/g, " ")).join(" ");

/**
 * The snippet's own copy of `element` when its whole code is not in the snippet (a snippet that leaves out a handler,
 * the data or some children): the snippet parsed as JSX (as written, in a fragment, or as a function body), and the one
 * element of that name whose opening tag reads like the element's, else the only element of that name when the code the
 * snippet stands for (`owner.scope`) also has only one. Only a snippet with no ${…} and no escapes (offsets stay 1:1).
 * { quasi, variant (the parsed text), prefix, suffix (what was added around the snippet), node, startsLine, comments }.
 */
function snippetCopyOf(text, ast, owner, element, name) {
  if (!element || owner.literal.quasis.length !== 1) return null;
  const quasi = owner.literal.quasis[0];
  const raw = text.slice(quasi.start, quasi.end);
  if (raw.includes("\\")) return null;
  for (const [head, tail] of [["", ""], ["<>", "</>"], ["function Snippet() {", "}"]]) {
    const variant = `${head}${raw}${tail}`;
    const parsed = parseSource(variant);
    if (!parsed || parsed.errors.length) continue;
    const named = elementsNamed(parsed.program, name);
    const own = tagText(text, element.openingElement);
    const alike = named.filter((node) => tagText(variant, node.openingElement) === own);
    // No copy alike: the namesakes pair up by order when the snippet has as many as the code (snippets follow the JSX).
    const scoped = owner.scope ? elementsNamed(owner.scope, name) : [];
    const place = scoped.findIndex((node) => node.start === element.start);
    const node = alike.length === 1 ? alike[0] : alike.length === 0 && named.length === scoped.length && place >= 0 ? named[place] : null;
    if (!node) return null;
    // Its own line in the snippet (the snippet's first line starts after the backtick).
    const lineStart = Math.max(lineStartOf(variant, node.start), head.length);
    const startsLine = /^[ \t]*$/.test(variant.slice(lineStart, node.start));
    const comments = new Set((parsed.comments ?? []).filter((comment) => comment.type === "CommentLine").map((comment) => comment.end));
    return { quasi, variant, prefix: head.length, suffix: tail.length, node, startsLine, comments };
  }
  return null;
}

/** Raw text as it reads inside a template literal: \ ` and ${ escaped. */
const templateRaw = (value) => value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const countLines = (value) => (value.match(/\r\n|\n|\r/g) ?? []).length;
const indentAt = (text, index) => /^[ \t]*/.exec(text.slice(lineStartOf(text, index)))[0];

/** Old code → a whitespace-tolerant pattern: its tokens joined by \s+, not glued to a neighbouring word. */
function tolerantPattern(raw) {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return null;
  const head = /^[\w$]/.test(tokens[0]) ? "(?<![\\w$])" : "";
  const tail = /[\w$]$/.test(tokens.at(-1)) ? "(?![\\w$])" : "";
  return new RegExp(head + tokens.map(escapeRegExp).join("\\s+") + tail, "g");
}

/**
 * The same change, made inside a snippet's copy of the code: `matched` holds `before` with other whitespace (the
 * tolerant pattern guarantees the same non-space characters in the same order). Only the characters that differ
 * between `before` and `after` are replaced, so the snippet keeps its own line breaks and indentation. Null when the
 * copies do not line up.
 */
function transplant(before, after, matched, indentOf) {
  const solid = (text) => { const out = []; for (let i = 0; i < text.length; i += 1) if (!/\s/.test(text[i])) out.push(i); return out; };
  const a = solid(before);
  const m = solid(matched);
  if (a.length !== m.length || a.some((index, k) => before[index] !== matched[m[k]])) return null;
  let prefix = 0;
  const max = Math.min(before.length, after.length);
  while (prefix < max && before[prefix] === after[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < max - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix += 1;
  // A position in `before` → the same position in `matched` (a space maps to just after the previous solid char).
  const at = (position) => {
    if (position >= before.length) return matched.length;
    let count = 0;
    while (count < a.length && a[count] < position) count += 1;
    if (count < a.length && a[count] === position) return m[count];
    return count === 0 ? 0 : m[count - 1] + 1;
  };
  const start = at(prefix);
  const end = Math.max(start, at(before.length - suffix));
  let middle = after.slice(prefix, after.length - suffix);
  // A pure removal of whole attributes/lines: drop the same whole lines in the snippet, so a `>` or `/>` on its own
  // line stays there (mapping by characters would pull it up onto the previous attribute).
  if (!middle.trim()) {
    const removed = [];
    a.forEach((position, k) => { if (position >= prefix && position < before.length - suffix) removed.push(k); });
    if (removed.length) {
      const first = m[removed[0]];
      const last = m[removed[removed.length - 1]];
      const lineStart = matched.lastIndexOf("\n", first - 1) + 1;
      const newline = matched.indexOf("\n", last);
      const lineEnd = newline < 0 ? matched.length : newline + 1;
      if (lineStart > 0 && newline >= 0 && /^[ \t]*$/.test(matched.slice(lineStart, first)) && /^[ \t]*\r?\n$/.test(matched.slice(last + 1, lineEnd))) {
        return matched.slice(0, lineStart) + matched.slice(lineEnd);
      }
    }
  }
  if (!/[\r\n]/.test(matched)) middle = middle.replace(/[ \t]*(?:\r\n|\n|\r)[ \t]*/g, " ");
  else middle = middle.replace(/(\r\n|\n|\r)[ \t]*/g, (_, eol) => eol + indentOf(start));
  return matched.slice(0, start) + middle + matched.slice(end);
}

/**
 * After an edit, the same change in the file's example snippets: each changed piece (an opening tag, a text) whose old
 * code occurs exactly once in exactly one `code` template literal is replaced there (one line when the snippet had it on
 * one line, else re-indented to the snippet). All pieces or none. Null when the file has no snippets.
 */
function syncSnippets(text, ast, pieces, eol, element) {
  if (!snippetLiterals(ast).length || !pieces.length) return null;
  const owner = snippetFor(ast, element);
  if (!owner.literal) return owner.reason ? { replacements: [], snippet: { synced: false, reason: owner.reason } } : null;
  const literals = [owner.literal];
  const replacements = [];
  for (const piece of pieces) {
    const pattern = tolerantPattern(templateRaw(piece.before));
    if (!pattern) continue;
    const hits = [];
    for (const literal of literals) {
      for (const quasi of literal.quasis) {
        const raw = text.slice(quasi.start, quasi.end);
        for (const match of raw.matchAll(pattern)) {
          // A text change only lands in the same element's JSX text: right after its opening tag or right before its
          // closing tag (never in an attribute, a comment, code, or another element that holds the same words).
          if (piece.text) {
            const name = escapeRegExp(piece.name);
            const opensBefore = new RegExp("<" + name + "(?:\\s[^<>]*)?>\\s*$").test(raw.slice(0, match.index));
            const closesAfter = new RegExp("^\\s*</" + name + "\\s*>").test(raw.slice(match.index + match[0].length));
            if (!opensBefore && !closesAfter) continue;
          }
          hits.push({ literal, start: quasi.start + match.index, end: quasi.start + match.index + match[0].length, matched: match[0] });
        }
      }
    }
    if (!hits.length) return { replacements: [], snippet: { synced: false, reason: `the example snippet does not show this code (${piece.what})` } };
    if (new Set(hits.map((hit) => hit.literal)).size > 1) return { replacements: [], snippet: { synced: false, reason: `this code appears in more than one snippet (${piece.what})` } };
    if (hits.length > 1) return { replacements: [], snippet: { synced: false, reason: `this code appears more than once in the snippet (${piece.what})` } };
    const [hit] = hits;
    // Indentation for a new line inside the snippet: the line the change starts on (an attribute line keeps its own).
    const next = transplant(templateRaw(piece.before), templateRaw(piece.after), hit.matched, (offset) => indentAt(text, hit.start + offset));
    if (next === null) return { replacements: [], snippet: { synced: false, reason: `the snippet's copy of ${piece.what} differs` } };
    replacements.push({ start: hit.start, end: hit.end, text: next });
  }
  if (!replacements.length) return null;
  replacements.sort((a, b) => a.start - b.start);
  for (let i = 1; i < replacements.length; i += 1) {
    if (replacements[i].start < replacements[i - 1].end) return { replacements: [], snippet: { synced: false, reason: "the changes overlap in the snippet" } };
  }
  return { replacements, snippet: { synced: true } };
}

const fail = (code, error) => ({ error, code });

/**
 * Applies Studio edit ops to the element at `loc` (which must be named `name`). Returns the new text (BOM and line
 * endings kept), the changed line range of the element and, when the file has example snippets, whether they were
 * updated too; or an error code. Unchanged text = a no-op (changed = the element's line). `snippets: false` leaves the
 * snippets alone. `typographyKeys` (a Set or array of typographyStyles keys) validates setTextStyle (required for a
 * non-null value) and setTypography; `file` (the repo-relative path) is where a new typographyStyles import points from.
 */
export function applyOps(code, loc, name, ops, { snippets = true, typographyKeys: knownKeys, file, componentCss, componentModules, requiredChildren, requiredProps, hash, base, shared = false } = {}) {
  // Slot ops (slots.mjs) restructure an instance's slot content; each is alone in its request (one undo record).
  const slotOp = Array.isArray(ops) ? ops.find((op) => SLOT_OPS.has(op?.op)) : undefined;
  if (slotOp) {
    if (ops.length !== 1) return fail("invalid", `${slotOp.op} cannot be combined with other ops`);
    return applySlotOp(code, loc, name, slotOp, { snippets, file, componentModules, requiredChildren, requiredProps, hash, base, shared });
  }
  // Wrapping and unwrapping restructure too: in shared code they wait for the person's confirmation (plan WP-B2).
  if (Array.isArray(ops) && ops.some((op) => op?.op === "wrap" || op?.op === "unwrap") && isSharedFile(file) && !shared) return sharedRefusal(file);
  const bom = code.startsWith(BOM) ? BOM : "";
  const text = bom ? code.slice(1) : code;
  const target = parseLoc(loc);
  if (!target) return fail("invalid", `Bad loc "${loc}" (expected "<line>:<column>")`);
  if (!Array.isArray(ops) || ops.length === 0) return fail("invalid", "No ops");
  const ast = parseSource(text);
  if (!ast) return fail("invalid", "The file does not parse");
  const element = findElement(ast, target);
  if (!element) return fail("not-found", `No JSX element starts at ${loc}`);
  const actual = jsxName(element.openingElement.name);
  if (actual !== name) return fail("stale", `Expected <${name}> at ${loc}, found <${actual}>`);
  if (text.includes(CHROME_MARK) && insideAny(chromeFunctions(ast), element)) return fail("forbidden", `<${actual}> at ${loc} is docs chrome (zen-studio-chrome); edit it in the code`);
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lineCommentEnds = new Set((ast.comments ?? []).filter((comment) => comment.type === "CommentLine").map((comment) => comment.end));
  const keys = knownKeys instanceof Set ? knownKeys : Array.isArray(knownKeys) ? new Set(knownKeys) : null;
  if (ops.some((op) => op?.op === "detach")) return applyDetach(code, bom, text, ast, element, ops, { snippets, keys, file, eol, componentCss });
  if (ops.some((op) => op?.op === "wrap")) return applyWrap(code, bom, text, ast, element, ops, { snippets, file, eol, lineCommentEnds });
  if (ops.some((op) => op?.op === "unwrap")) return applyUnwrap(code, bom, text, ast, element, ops, { snippets, file, eol });
  let next;
  let edits;
  // A setTextStyle that adds the file's first typographyStyles use imports it; one that removes the last use drops the
  // import (an edit above the element, not part of the element's change).
  let importEdit = null;
  try {
    edits = [];
    let addsUse = false;
    let removedUses = 0;
    for (const op of ops) {
      if (op?.op === "setProp") edits.push(...setPropEdits(element, text, op, eol, true));
      else if (op?.op === "removeProp") edits.push(...removePropEdits(element, text, op, lineCommentEnds));
      else if (op?.op === "setStateInit") edits.push(...setStateInitEdits(ast, element, text, op));
      else if (op?.op === "setField") edits.push(...setFieldEdits(element, text, op, eol, ast));
      else if (op?.op === "setText") edits.push(...setTextEdits(element, text, op));
      else if (op?.op === "setTypography") edits.push(...setTypographyEdits(element, text, op, keys));
      else if (op?.op === "setTextStyle") {
        const result = setTextStyleEdits(element, text, op, keys, eol, lineCommentEnds);
        edits.push(...result.edits);
        addsUse ||= result.addsUse;
        removedUses = Math.max(removedUses, result.removedUses ?? 0);
      } else throw new EditError("invalid", `Unknown op ${JSON.stringify(op?.op)}`);
    }
    if (addsUse) importEdit = typographyImportEdit(ast, text, eol, file);
    else if (removedUses && typographyReferences(ast) === removedUses) importEdit = typographyImportRemoval(ast, text);
    next = applyEdits(text, importEdit ? [...edits, importEdit] : edits);
  } catch (error) {
    if (error instanceof EditError) return fail(error.code, error.message);
    throw error;
  }
  const line = element.loc.start.line;
  if (next === text) return { code, changed: { from: line, to: line } };
  // Never hand back a file that parses worse than before.
  const after = parseSource(next);
  if (!after || after.errors.length > ast.errors.length) return fail("invalid", "The edit would break the file's syntax");
  // The element's lines (an added import above it is not part of the change it reports).
  const changed = changedRange(importEdit ? applyEdits(text, [importEdit]) : text, next);
  if (!snippets) return { code: bom + next, changed };

  // The same change in the file's hand-written example snippets.
  const pieces = [];
  const opening = element.openingElement;
  const moved = importEdit && importEdit.end <= element.start ? countLines(importEdit.text) - countLines(text.slice(importEdit.start, importEdit.end)) : 0;
  const newElement = findElement(after, { line: target.line + moved, column: target.column });
  const newOpening = newElement?.openingElement;
  const indent = indentAt(text, element.start);
  if (newOpening && text.slice(opening.start, opening.end) !== next.slice(newOpening.start, newOpening.end)) {
    pieces.push({ what: `<${actual}>`, before: text.slice(opening.start, opening.end), after: next.slice(newOpening.start, newOpening.end), indent });
  }
  for (const edit of edits) {
    if (edit.kind === "text") pieces.push({ what: `the text of <${actual}>`, before: text.slice(edit.start, edit.end), after: edit.text, indent, text: true, name: actual });
    // The snippet's copy of the state declaration (`[agree, setAgree] = useState(false)`) follows the new initial state.
    if (edit.kind === "state") pieces.push({ what: `the initial state of ${edit.name}`, before: edit.before, after: edit.after, indent: indentAt(text, edit.start) });
  }
  const sync = syncSnippets(next, after, pieces, eol, newElement ?? element);
  if (!sync) return { code: bom + next, changed };
  if (!sync.replacements.length) return { code: bom + next, changed, snippet: sync.snippet };
  const synced = applyEdits(next, sync.replacements);
  const reparsed = parseSource(synced);
  if (!reparsed || reparsed.errors.length > after.errors.length) return { code: bom + next, changed, snippet: { synced: false, reason: "updating the snippet would break the file's syntax" } };
  // Snippets above the element move its lines.
  const shift = sync.replacements.filter((rep) => rep.end <= (newElement ?? element).start).reduce((sum, rep) => sum + countLines(rep.text) - countLines(next.slice(rep.start, rep.end)), 0);
  return { code: bom + synced, changed: { from: changed.from + shift, to: changed.to + shift }, snippet: sync.snippet };
}

/**
 * Op "detach" (it cannot be combined with other ops): the element becomes Zen primitives (detach.mjs), with the
 * imports the output needs. `detached.loc` is the new root element's opening tag in the new text (the detached
 * branch of a `.map` row conditional). The hand-written example snippets are not rewritten (`snippet` says so).
 */
/** detach.mjs detachEdits, registered when detach.mjs loads (the browser engine leaves it out: no Detach on builder pages). */
let detachEdits = null;
export function registerDetach(edits) {
  detachEdits = edits;
}

function applyDetach(code, bom, text, ast, element, ops, { snippets, keys, file, eol, componentCss }) {
  if (!detachEdits) return fail("forbidden", "Detach is not available here (the detach recipes are not loaded)");
  if (ops.length !== 1) return fail("invalid", "detach cannot be combined with other ops");
  const op = ops[0];
  if (op.measured !== undefined && (op.measured === null || typeof op.measured !== "object" || Array.isArray(op.measured))) return fail("invalid", "detach `measured` must be an object of token keys");
  if (op.instance !== undefined && !(Number.isInteger(op.instance) && op.instance >= 0)) return fail("invalid", "detach `instance` must be a row index (0 or more)");
  let result;
  let next;
  try {
    result = detachEdits(text, element, ast, { measured: op.measured, instance: op.instance, file, eol, typographyKeys: keys, componentCss });
    next = applyEdits(text, result.edits);
  } catch (error) {
    if (error instanceof EditError) return fail(error.code, error.message);
    throw error;
  }
  const after = parseSource(next);
  if (!after || after.errors.length > ast.errors.length) return fail("invalid", "The edit would break the file's syntax");
  const head = next.slice(0, result.rootOffset);
  const breaks = head.match(/\r\n|[\n\r\u2028\u2029]/g) ?? [];
  const lastBreak = Math.max(head.lastIndexOf("\n"), head.lastIndexOf("\r"), head.lastIndexOf("\u2028"), head.lastIndexOf("\u2029"));
  const target = { line: breaks.length + 1, column: result.rootOffset - (lastBreak + 1) };
  const root = findElement(after, target);
  if (!root || jsxName(root.openingElement.name) !== result.rootTag) return fail("invalid", "The detached element could not be located after the edit (a recipe bug); nothing was written.");
  // The element's lines (and the .map callback's new index parameter); import changes are not part of the change.
  const changed = changedRange(applyEdits(text, result.edits.filter((edit) => edit.isImport)), next);
  const detached = { component: result.component, loc: `${target.line}:${target.column}`, approximations: result.approximations };
  const response = { code: bom + next, changed, detached };
  if (snippets && snippetLiterals(after).length) {
    const owner = snippetFor(ast, element);
    if (owner.literal || owner.reason) response.snippet = { synced: false, reason: owner.literal ? "a detach is not copied into the example snippet; update it by hand if it should show the primitives" : owner.reason };
  }
  return response;
}

/* ── wrap (op "wrap": Figma's Frame selection, ⌥⌘G) ─────────────────────────────────────────────────────────────── */

/** Layout primitives an element can be wrapped in (all exported by src/components/Layout; each renders a <div>). */
const WRAP_TAGS = ["Box", "Stack", "Grid"];
/** Host elements the HTML parser keeps only inside their table or select: a <div> around them breaks the markup. */
const CONTEXT_BOUND = new Set(["caption", "col", "colgroup", "tbody", "td", "tfoot", "th", "thead", "tr", "option", "optgroup"]);
/** Host parents that hold only table or select parts: the parser moves or drops a <div> inside them. */
const CONTEXT_PARENTS = new Set(["table", "thead", "tbody", "tfoot", "tr", "colgroup", "select", "optgroup", "option", "datalist"]);
/** Phrasing elements that may stand between the wrapper and a paragraph (a <div> there still breaks the <p>). */
const PHRASING = new Set(["span", "a", "abbr", "b", "cite", "code", "em", "i", "label", "mark", "q", "s", "small", "strong", "sub", "sup", "time", "u"]);

/** What a JSX element renders when the source says so: a host tag as written, <Text> by its `as` (default p), else null. */
function renderedTag(node) {
  const name = jsxName(node.openingElement.name);
  if (/^[a-z]/.test(name) && !name.includes(".")) return name;
  if (name !== "Text") return null;
  const as = node.openingElement.attributes.findLast((attr) => attrName(attr) === "as");
  if (!as) return "p";
  return as.value?.type === "StringLiteral" ? as.value.value : null;
}

/**
 * A wrapper is a <div>: refused where the HTML parser would not keep it (React reports these as DOM-nesting errors):
 * around a table or select part, directly inside a table or select, inside a paragraph (<p>, <Text> as p, through
 * phrasing elements such as <span> or <strong>); and inside an <svg> (below any <foreignObject>), where a <div> does
 * not render. Inside an attribute value nothing is known, so nothing is refused (the value itself only when the
 * cloning list names that prop: wrapCloned).
 */
function wrapNesting(element, nodePath) {
  for (let i = nodePath.length - 2; i >= 0; i -= 1) {
    const node = nodePath[i];
    if (node.type === "JSXAttribute") break;
    if (node.type !== "JSXElement") continue;
    const tag = renderedTag(node);
    if (tag === "foreignObject") break;
    if (tag === "svg") throw new EditError("invalid", "It sits inside an <svg>: a <div> wrapper does not render there. Wrap the <svg> instead.");
  }
  const own = renderedTag(element);
  if (own && CONTEXT_BOUND.has(own)) throw new EditError("invalid", `<${own}> only renders inside its <${["option", "optgroup"].includes(own) ? "select" : "table"}>: a <div> around it would break the markup. Wrap its content (or the whole ${["option", "optgroup"].includes(own) ? "select" : "table"}) instead.`);
  let first = true;
  for (let i = nodePath.length - 2; i >= 0; i -= 1) {
    const node = nodePath[i];
    if (node.type === "JSXAttribute") return;
    if (node.type !== "JSXElement") continue;
    const tag = renderedTag(node);
    const where = jsxName(node.openingElement.name) === "Text" ? `<Text${tag === "p" ? "" : ` as="${tag}"`}>` : `<${tag}>`;
    if (first && tag && CONTEXT_PARENTS.has(tag)) throw new EditError("invalid", `It sits directly inside ${where}, which holds only ${tag === "select" || tag === "optgroup" || tag === "option" || tag === "datalist" ? "options" : "table parts"}: a <div> there would break the markup.`);
    first = false;
    if (tag === "p") throw new EditError("invalid", `It sits inside a paragraph (${where}): the wrapper is a <div>, which a <p> cannot hold. Give the text as="div", or wrap the paragraph instead.`);
    if (!tag || !PHRASING.has(tag)) return;
  }
}

/**
 * Elements a component clones or checks by type: one list, src/platform/studio/cloning.json (shared with the Studio
 * client; each entry says why, from a grep of src/components). A wrapper there would take the cloned props (id, ARIA,
 * ref, handlers, size) or fail the type check, so wrap refuses the element, with the entry's reason:
 *   - CLONED_PROPS ("Owner.prop"): the element is that attribute's value (Menu `trigger`, AppShell `sidebar` and
 *     `aside`). Any other attribute's value is wrapped (inline in the value).
 *   - CLONING_PARENTS ("Owner"): the element is the owner's child (Tooltip, FormField, FormActions, ChatMessage);
 *     `only` = the child components it clones; `through` = how it still reaches a child further in: "fragment"
 *     (<>…</>, <Fragment>), "array" (an [ … ] item or a .map callback's result; FormActions: Children.map into
 *     Fragments). A child with a sibling (rendersAsChild) reaches the owner as an array too, so an entry without
 *     "array" (Tooltip, FormField, ChatMessage: they clone or read a sole child) refuses only a sole child.
 *   - ANYWHERE: a parents entry with `anywhere` (and `only`): those children are only ever the owner's child
 *     (ChatMessage's ChatPhotos / ChatCall), refused in any position, also where a helper returns them outside the
 *     owner's JSX (chat.tsx bodyOf()). Without it, a helper's result is guarded by the Studio client only (it reads
 *     the React fibers; the source cannot see where the result renders).
 * Always through {…}, ( ), a ?: branch, either side of || and ??, the right of &&, a TS cast. Names match the JSX
 * name's last segment (`Zen.Menu` is Menu). describeElement reports the same verdict (`wrap`).
 */
const CLONED_PROPS = cloning.props;
const CLONING_PARENTS = cloning.parents;
const ANYWHERE = Object.values(CLONING_PARENTS).filter((entry) => entry.anywhere === true && Array.isArray(entry.only));
const FRAGMENTS = new Set(["Fragment", "React.Fragment"]);

/**
 * Whether a JSX child renders as a child (React's children prop): JSX drops whitespace-only text that holds a line
 * break (any Unicode whitespace, as Vite's oxc and esbuild drop it; whitespace on the tag's own line stays a " " child) and an
 * empty {…} ({/* a comment *\/}).
 */
function rendersAsChild(node) {
  if (node.type === "JSXText") return !(/[\r\n\u2028\u2029]/.test(node.value) && /^\s*$/.test(node.value));
  if (node.type === "JSXExpressionContainer") return node.expression.type !== "JSXEmptyExpression";
  return true;
}

/** Whether `child` (one of `parent`'s JSX children: an element's or a fragment's) has a sibling that renders. */
const hasSibling = (parent, child) => parent.children.some((other) => other !== child && rendersAsChild(other));

const lastSegment = (name) => name.slice(name.lastIndexOf(".") + 1);
const entryOf = (list, key) => (Object.hasOwn(list, key) ? list[key] : null);

/** Whether `parent` hands `child` on as its value: {…}, ( ), a ?: branch, either side of || / ??, the right of &&, a TS cast. */
function passesOn(parent, child) {
  switch (parent.type) {
    case "JSXExpressionContainer":
    case "ParenthesizedExpression":
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "TSNonNullExpression": return parent.expression === child;
    case "ConditionalExpression": return parent.consequent === child || parent.alternate === child;
    case "LogicalExpression": return parent.right === child || (parent.operator !== "&&" && parent.left === child);
    default: return false;
  }
}

const isFragment = (node) => node.type === "JSXFragment" || (node.type === "JSXElement" && FRAGMENTS.has(jsxName(node.openingElement.name)));
const CALLBACKS = new Set(["ArrowFunctionExpression", "FunctionExpression"]);

/**
 * The index in nodePath of the `.map(…)` / `.flatMap(…)` call whose callback returns `child` (nodePath[i] is child's
 * parent: the arrow whose body it is, or a `return` in the callback's own body), or -1.
 */
function mapCallIndex(nodePath, i, child) {
  let fn = i;
  if (nodePath[i]?.type === "ReturnStatement" && nodePath[i].argument === child) {
    while (fn >= 0 && !FUNCTION_TYPES.has(nodePath[fn].type)) fn -= 1;
  } else if (!(CALLBACKS.has(nodePath[i]?.type) && nodePath[i].body === child)) return -1;
  const callback = nodePath[fn];
  const call = nodePath[fn - 1];
  if (!callback || !CALLBACKS.has(callback.type) || !call || (call.type !== "CallExpression" && call.type !== "OptionalCallExpression") || call.arguments[0] !== callback) return -1;
  const callee = call.callee;
  const method = (callee.type === "MemberExpression" || callee.type === "OptionalMemberExpression") && !callee.computed && callee.property.type === "Identifier" ? callee.property.name : "";
  return method === "map" || method === "flatMap" ? fn - 1 : -1;
}

/** Refuses an element that a component clones or checks by type (cloning.json: an attribute value, a child, or anywhere: one that is only ever its child). */
function wrapCloned(element, nodePath) {
  const name = jsxName(element.openingElement.name);
  let child = element;
  let i = nodePath.length - 2;
  const through = new Set();
  while (i >= 0) {
    const parent = nodePath[i];
    if (passesOn(parent, child)) { child = parent; i -= 1; continue; }
    if (isFragment(parent)) {
      through.add("fragment");
      if (hasSibling(parent, child)) through.add("array");
      child = parent;
      i -= 1;
      continue;
    }
    if (parent.type === "ArrayExpression" && parent.elements.includes(child)) { through.add("array"); child = parent; i -= 1; continue; }
    const call = mapCallIndex(nodePath, i, child);
    if (call < 0) break;
    through.add("array");
    child = nodePath[call];
    i = call - 1;
  }
  const parent = nodePath[i];
  const reaches = (entry) => [...through].every((way) => entry.through?.includes(way));
  let entry = null;
  if (parent?.type === "JSXAttribute") {
    entry = entryOf(CLONED_PROPS, `${lastSegment(jsxName(nodePath[i - 1]?.name))}.${attrName(parent)}`);
  } else if (parent?.type === "JSXElement") {
    if (hasSibling(parent, child)) through.add("array");
    entry = entryOf(CLONING_PARENTS, lastSegment(jsxName(parent.openingElement.name)));
    if (entry?.only && !entry.only.includes(lastSegment(name))) entry = null;
  }
  if (entry && !reaches(entry)) entry = null;
  entry ??= ANYWHERE.find((candidate) => candidate.only.includes(lastSegment(name))) ?? null;
  if (entry) throw new EditError("invalid", entry.reason.replaceAll("{element}", `<${name}>`));
}

/**
 * Parent/child contracts of Zen's compound components and HTML lists (2026-10-08): parents whose children must be
 * their parts directly (a <div> between breaks the markup or the ARIA ownership the parent's keyboard and screen reader
 * support rely on), and the parts that only render directly inside them. From a read of src/components: List renders
 * <ul> (ListItem an <li> unless `as`), DescriptionList a <dl> of DescriptionItem groups, Menu a role="menu" list,
 * Popover's children sit in its role="listbox", FileUpload's UploaderFileItem is an <li>.
 */
const PART_PARENTS = new Map([
  ["ul", "a list (<ul>), which holds only list items"], ["ol", "a list (<ol>), which holds only list items"],
  ["dl", "a description list (<dl>), which holds only its terms and descriptions"], ["menu", "a <menu>, which holds only list items"],
  ["List", "a List (<ul>), which holds only ListItems"], ["DescriptionList", "a DescriptionList (<dl>), which holds only DescriptionItems"],
  ["Menu", "a Menu (role=\"menu\"), which owns its items directly"], ["Popover", "a Popover's list (role=\"listbox\"), which owns its options directly"],
]);
/** Parts by what they render: host list parts as written, the Zen parts by name (ListItem only when it is an <li>). */
const PART_OF = { li: "its list", dt: "its <dl>", dd: "its <dl>", ListItem: "its List", UploaderFileItem: "its FileUpload list", DescriptionItem: "its DescriptionList", MenuItem: "its Menu", MenuGroup: "its Menu", MenuSeparator: "its Menu", PopoverItem: "its Popover", TabItem: "its Tabs" };

/** Refuses a wrap that would put a <div> between a compound parent and its parts (PART_PARENTS / PART_OF). */
function wrapContract(element, nodePath) {
  const name = lastSegment(jsxName(element.openingElement.name));
  const as = element.openingElement.attributes.findLast((attr) => attrName(attr) === "as");
  const asTag = as?.value?.type === "StringLiteral" ? as.value.value : as ? null : undefined;
  const part = name === "ListItem" ? (asTag === undefined || asTag === "li" ? PART_OF.ListItem : null) : Object.hasOwn(PART_OF, name) ? PART_OF[name] : null;
  if (part) throw new EditError("invalid", `<${name}> only works directly inside ${part}: a <div> around it would break that list's markup and keyboard order. Wrap ${part.replace(/^its /, "the ")} instead.`);
  for (let i = nodePath.length - 2; i >= 0; i -= 1) {
    const node = nodePath[i];
    if (node.type === "JSXAttribute") return;
    if (node.type !== "JSXElement") continue;
    const parent = lastSegment(jsxName(node.openingElement.name));
    if (PART_PARENTS.has(parent)) throw new EditError("invalid", `It sits directly inside ${PART_PARENTS.get(parent)}: a <div> there would break it. Wrap the ${parent} instead.`);
    return;
  }
}

/** The place checks of op "wrap" (docs chrome aside): a cloned element (wrapCloned), the HTML nesting (wrapNesting), then
 * compound parents and their parts (wrapContract). */
function wrapPlace(element, nodePath) {
  wrapCloned(element, nodePath);
  wrapNesting(element, nodePath);
  wrapContract(element, nodePath);
}

/** describeElement's `wrap`: whether op "wrap" takes the element where it sits (not its tag, props or the file's Box). */
function wrapVerdict(text, ast, element) {
  if (text.includes(CHROME_MARK) && insideAny(chromeFunctions(ast), element)) return { ok: false, reason: "It is docs chrome (zen-studio-chrome); edit it in the code." };
  const nodePath = pathTo(ast.program, element);
  if (!nodePath) return { ok: false, reason: "The element is not in the file's tree" };
  try {
    wrapPlace(element, nodePath);
    return { ok: true };
  } catch (error) {
    if (error instanceof EditError) return { ok: false, reason: error.message };
    throw error;
  }
}

/**
 * The edits that put `element` (a JSXElement of `text`) inside `<tag attrs>`. The element's `key` moves to the wrapper
 * (a .map row keeps its key on the element the callback returns). `startsLine` (only spaces before the element on its
 * line): the wrapper's tags get lines of their own and the element moves one level deeper (lines inside a string or a
 * template literal, blank lines and lines the key removal deletes keep theirs); else both tags go around it inline.
 */
function wrapEdits(text, element, { tag, attrs, eol, lineCommentEnds, startsLine }) {
  const edits = [];
  const props = [...attrs];
  const key = element.openingElement.attributes.findLast((attr) => attrName(attr) === "key");
  let removal = null;
  if (key) {
    removal = removeAttrEdit(key, text, lineCommentEnds);
    edits.push(removal);
    props.unshift(text.slice(key.start, key.end));
  }
  if (!startsLine) {
    edits.push({ start: element.start, end: element.start, text: `<${tag}${props.map((prop) => ` ${prop}`).join("")}>` });
    edits.push({ start: element.end, end: element.end, text: `</${tag}>` });
    return edits;
  }
  const base = indentAt(text, element.start);
  const inner = base + UNIT;
  const flat = props.every((prop) => !/[\r\n]/.test(prop)) && base.length + tag.length + 3 + props.join(" ").length <= 110;
  const open = !props.length ? `<${tag}>` : flat ? `<${tag} ${props.join(" ")}>` : `<${tag}${props.map((prop) => eol + inner + prop).join("")}${eol}${base}>`;
  edits.push({ start: element.start, end: element.start, text: `${open}${eol}${inner}` });
  const { protect } = piece(text, element);
  const src = text.slice(element.start, element.end);
  const starts = [];
  for (const match of src.matchAll(/\r\n|\n|\r/g)) starts.push(element.start + match.index + match[0].length);
  starts.forEach((at, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : element.end;
    if (protect.has(i + 1) || !text.slice(at, end).trim()) return;
    if (removal && removal.start <= at && at < removal.end) return;
    edits.push({ start: at, end: at, text: UNIT });
  });
  edits.push({ start: element.end, end: element.end, text: `${eol}${base}</${tag}>` });
  return edits;
}

/** templateRaw's inverse (\\ → \, \` → `, \${ → ${): a snippet's copy of the code as the code itself. */
const untemplateRaw = (value) => value.replace(/\\(\\|`|\$(?=\{))/g, "$1");

/** Line and column (Babel's: 1-based, 0-based) of an offset of `text`. */
function locAt(text, offset) {
  const head = text.slice(0, offset);
  const breaks = head.match(/\r\n|[\n\r\u2028\u2029]/g) ?? [];
  const lastBreak = Math.max(head.lastIndexOf("\n"), head.lastIndexOf("\r"), head.lastIndexOf("\u2028"), head.lastIndexOf("\u2029"));
  return { line: breaks.length + 1, column: offset - (lastBreak + 1) };
}

/**
 * The same wrap in the example snippet that shows the element (snippetFor): the element's old code must occur exactly
 * once in it (whitespace-tolerant). The snippet's copy is wrapped by the same rules, on its own lines and indentation.
 * Null when the file has no snippets (or no example shows this code); else { replacements, snippet }.
 */
function wrapSnippet(text, ast, box, before, { tag, attrs, eol, name }) {
  if (!snippetLiterals(ast).length) return null;
  const owner = snippetFor(ast, box);
  if (!owner.literal) return owner.reason ? { replacements: [], snippet: { synced: false, reason: owner.reason } } : null;
  const notSynced = (reason) => ({ replacements: [], snippet: { synced: false, reason } });
  const what = `<${name}>`;
  const pattern = tolerantPattern(templateRaw(before));
  const hits = [];
  for (const quasi of owner.literal.quasis) {
    const raw = text.slice(quasi.start, quasi.end);
    for (const match of raw.matchAll(pattern)) hits.push({ start: quasi.start + match.index, end: quasi.start + match.index + match[0].length, matched: match[0] });
  }
  if (!hits.length) {
    // Hand-written snippets often leave out handlers, data or children, so the element's whole code is not there: the
    // snippet's own copy of the element (snippetCopyOf) is wrapped instead.
    const copy = snippetCopyOf(text, ast, owner, box.children.find((child) => child.type === "JSXElement"), name);
    if (!copy) return notSynced(`the example snippet does not show this code (${what})`);
    const wrapped = applyEdits(copy.variant, wrapEdits(copy.variant, copy.node, { tag, attrs, eol, lineCommentEnds: copy.comments, startsLine: copy.startsLine }));
    return { replacements: [{ start: copy.quasi.start, end: copy.quasi.end, text: wrapped.slice(copy.prefix, wrapped.length - copy.suffix) }], snippet: { synced: true } };
  }
  if (hits.length > 1) return notSynced(`this code appears more than once in the snippet (${what})`);
  const [hit] = hits;
  // The copy's line inside the snippet (its first line starts after the backtick).
  const lineStart = Math.max(lineStartOf(text, hit.start), owner.literal.start + 1);
  const lead = text.slice(lineStart, hit.start);
  const startsLine = /^[ \t]*$/.test(lead);
  const prefix = startsLine ? lead : "";
  const copy = `${prefix}${untemplateRaw(hit.matched)}`;
  const parsed = parseSource(copy);
  const statement = parsed?.program.body.length === 1 ? parsed.program.body[0] : null;
  const node = statement?.type === "ExpressionStatement" ? statement.expression : null;
  if (!node || parsed.errors.length || node.type !== "JSXElement" || node.start !== prefix.length || node.end !== copy.length) return notSynced(`the snippet's copy of ${what} differs`);
  const copyComments = new Set((parsed.comments ?? []).filter((comment) => comment.type === "CommentLine").map((comment) => comment.end));
  const wrapped = applyEdits(copy, wrapEdits(copy, node, { tag, attrs, eol, lineCommentEnds: copyComments, startsLine })).slice(prefix.length);
  return { replacements: [{ start: hit.start, end: hit.end, text: templateRaw(wrapped) }], snippet: { synced: true } };
}

/**
 * Op "wrap" { tag, props } (it cannot be combined with other ops): the element goes inside `<tag …props>` (Box, Stack
 * or Grid; props formatted like setProp, never `key` or `children`), the element's `key` moving to the wrapper; `tag`
 * joins the file's Layout import (merged into an import of the Layout folder or "@zen/design-system", else a new
 * import line, as detach writes them). `wrapped.loc` = the wrapper's opening tag in the new text (the element's old
 * position, moved by an import line above it). The example snippet that shows the element is wrapped too when its copy
 * is found once (else `snippet: { synced: false, reason }`). Refused (`invalid`) where a component clones the element
 * (wrapCloned) or the HTML parser would drop the <div> (wrapNesting). With `with` (sibling locs): applyWrapMany.
 */
function applyWrap(code, bom, text, ast, element, ops, { snippets, file, eol, lineCommentEnds }) {
  if (ops.length !== 1) return fail("invalid", "wrap cannot be combined with other ops");
  const op = ops[0];
  const tag = op.tag ?? "Box";
  if (!WRAP_TAGS.includes(tag)) return fail("invalid", `wrap puts the element in ${WRAP_TAGS.join(", ")} (not ${JSON.stringify(op.tag)})`);
  const props = op.props ?? {};
  if (props === null || typeof props !== "object" || Array.isArray(props)) return fail("invalid", "wrap `props` must be an object of { name: EditValue }");
  if (op.with !== undefined) return applyWrapMany(code, bom, text, ast, element, op, { tag, props, snippets, file, eol, lineCommentEnds });
  const name = jsxName(element.openingElement.name);
  let attrs;
  let edits;
  let next;
  let offset;
  try {
    attrs = wrapAttrs(props);
    const nodePath = pathTo(ast.program, element);
    if (!nodePath) throw new EditError("not-found", "The element is not in the file's tree");
    wrapPlace(element, nodePath);
    const startsLine = /^[ \t]*$/.test(text.slice(lineStartOf(text, element.start), element.start));
    const imports = importEdits(ast, text, eol, file, [tag], [], { action: "wrapping", looseTarget: true }).map((edit) => ({ ...edit, isImport: true }));
    edits = [...wrapEdits(text, element, { tag, attrs, eol, lineCommentEnds, startsLine }), ...imports];
    next = applyEdits(text, edits);
    // The wrapper starts where the element did, moved by the import edits above it.
    offset = element.start + imports.filter((edit) => edit.end <= element.start).reduce((sum, edit) => sum + edit.text.length - (edit.end - edit.start), 0);
  } catch (error) {
    if (error instanceof EditError) return fail(error.code, error.message);
    throw error;
  }
  const after = parseSource(next);
  if (!after || after.errors.length > ast.errors.length) return fail("invalid", "The edit would break the file's syntax");
  const at = locAt(next, offset);
  const box = findElement(after, at);
  if (!box || jsxName(box.openingElement.name) !== tag || box.children.filter((child) => child.type === "JSXElement").length !== 1) return fail("invalid", "The wrapper could not be located after the edit (a bug); nothing was written.");
  // The wrapped element's lines; the import change is not part of it.
  const changed = changedRange(applyEdits(text, edits.filter((edit) => edit.isImport)), next);
  const result = { code: bom + next, changed, wrapped: { loc: `${at.line}:${at.column}` } };
  if (!snippets) return result;
  const sync = wrapSnippet(next, after, box, text.slice(element.start, element.end), { tag, attrs, eol, name });
  if (!sync) return result;
  if (!sync.replacements.length) return { ...result, snippet: sync.snippet };
  const synced = applyEdits(next, sync.replacements);
  const reparsed = parseSource(synced);
  if (!reparsed || reparsed.errors.length > after.errors.length) return { ...result, snippet: { synced: false, reason: "updating the snippet would break the file's syntax" } };
  // A snippet above the wrapper moves it (and its lines).
  const above = sync.replacements.filter((rep) => rep.end <= box.start);
  const moved = locAt(synced, offset + above.reduce((sum, rep) => sum + rep.text.length - (rep.end - rep.start), 0));
  const shift = above.reduce((sum, rep) => sum + countLines(rep.text) - countLines(next.slice(rep.start, rep.end)), 0);
  const check = findElement(reparsed, moved);
  if (!check || jsxName(check.openingElement.name) !== tag) return { ...result, snippet: { synced: false, reason: "updating the snippet would move the wrapper (a bug)" } };
  return { code: bom + synced, changed: { from: changed.from + shift, to: changed.to + shift }, wrapped: { loc: `${moved.line}:${moved.column}` }, snippet: sync.snippet };
}

/** A wrap's props as attributes (formatted like setProp); `key` and `children` are refused. Throws EditError. */
function wrapAttrs(props) {
  return Object.entries(props).map(([prop, value]) => {
    if (prop === "children") throw new EditError("invalid", "\"children\" cannot be a wrap prop (the element is the wrapper's child)");
    if (prop === "key") throw new EditError("invalid", "\"key\" cannot be a wrap prop (the element's key moves to the wrapper by itself)");
    return formatAttr(prop, value);
  });
}

/* ── unwrap (op "unwrap": a one-layer wrap undone; the Studio's Ignore auto layout off on a floating Box) ──────────── */

/** The one JSXElement `box` holds when everything else in it is blank text, else null. */
function onlyChild(box) {
  const elements = box.children.filter((child) => child.type === "JSXElement");
  const blank = box.children.every((child) => child.type === "JSXElement" || (child.type === "JSXText" && !child.value.trim()));
  return elements.length === 1 && blank ? elements[0] : null;
}

/**
 * The edits that put `child` where `box` (its only layer) is: the wrapper's tags and the blank text around the child go;
 * when the child starts a line, its later lines move out by the indentation it had over the wrapper (lines inside a
 * string or a template literal keep theirs); the wrapper's `key` goes back onto the child when it has none (wrap moved
 * it there).
 */
function unwrapEdits(text, box, child) {
  const edits = [{ start: box.start, end: child.start, text: "" }, { start: child.end, end: box.end, text: "" }];
  const key = box.openingElement.attributes.findLast((attr) => attrName(attr) === "key");
  if (key && !child.openingElement.attributes.some((attr) => attrName(attr) === "key")) {
    const at = child.openingElement.name.end;
    edits.push({ start: at, end: at, text: ` ${text.slice(key.start, key.end)}` });
  }
  if (!/^[ \t]*$/.test(text.slice(lineStartOf(text, child.start), child.start))) return edits;
  const base = indentAt(text, box.start);
  const own = indentAt(text, child.start);
  const extra = own.startsWith(base) ? own.length - base.length : 0;
  if (!extra) return edits;
  const { protect } = piece(text, child);
  const src = text.slice(child.start, child.end);
  const starts = [];
  for (const match of src.matchAll(/\r\n|\n|\r/g)) starts.push(child.start + match.index + match[0].length);
  starts.forEach((at, i) => {
    if (protect.has(i + 1)) return;
    const cut = Math.min(extra, /^[ \t]*/.exec(text.slice(at))[0].length);
    if (cut) edits.push({ start: at, end: at + cut, text: "" });
  });
  return edits;
}

/** Whether the file still reads `name` (a JSX tag or an identifier) outside its imports. */
function readsName(ast, name) {
  let found = false;
  walk(ast.program, (node) => {
    if (found || node.type === "ImportDeclaration") return false;
    if ((node.type === "JSXIdentifier" || node.type === "Identifier") && node.name === name) found = true;
    return !found;
  });
  return found;
}

/** The same unwrap in the example snippet that shows the code (as wrapSnippet): null when the file has no snippets. */
function unwrapSnippet(text, ast, child, before, { name, tag }) {
  if (!snippetLiterals(ast).length) return null;
  const owner = snippetFor(ast, child);
  if (!owner.literal) return owner.reason ? { replacements: [], snippet: { synced: false, reason: owner.reason } } : null;
  const notSynced = (reason) => ({ replacements: [], snippet: { synced: false, reason } });
  const what = `<${tag}>`;
  const pattern = tolerantPattern(templateRaw(before));
  const hits = [];
  for (const quasi of owner.literal.quasis) {
    const raw = text.slice(quasi.start, quasi.end);
    for (const match of raw.matchAll(pattern)) hits.push({ start: quasi.start + match.index, end: quasi.start + match.index + match[0].length, matched: match[0] });
  }
  if (!hits.length) return notSynced(`the example snippet does not show this code (${what} around <${name}>)`);
  if (hits.length > 1) return notSynced(`this code appears more than once in the snippet (${what} around <${name}>)`);
  const [hit] = hits;
  const lineStart = Math.max(lineStartOf(text, hit.start), owner.literal.start + 1);
  const lead = text.slice(lineStart, hit.start);
  const prefix = /^[ \t]*$/.test(lead) ? lead : "";
  const copy = `${prefix}${untemplateRaw(hit.matched)}`;
  const parsed = parseSource(copy);
  const statement = parsed?.program.body.length === 1 ? parsed.program.body[0] : null;
  const node = statement?.type === "ExpressionStatement" ? statement.expression : null;
  const inner = node?.type === "JSXElement" ? onlyChild(node) : null;
  if (!node || !inner || parsed.errors.length || node.start !== prefix.length || node.end !== copy.length) return notSynced(`the snippet's copy of ${what} differs`);
  const unwrapped = applyEdits(copy, unwrapEdits(copy, node, inner)).slice(prefix.length);
  return { replacements: [{ start: hit.start, end: hit.end, text: templateRaw(unwrapped) }], snippet: { synced: true } };
}

/**
 * Op "unwrap" (alone): a Box, Stack or Grid that holds exactly one element (and blank text) is replaced by that element,
 * which moves out one level; the wrapper's props go with it (the Studio sends it for a Box it made float, whose props
 * are only position props), its `key` back onto the element when that has none. The file's import of the tag goes when
 * nothing else reads it. `unwrapped.loc` = the element's opening tag in the new text (the wrapper's old place, moved by
 * an import line removed above it). The example snippet that shows the wrapper is unwrapped too when its copy is found
 * once (else `snippet: { synced: false, reason }`).
 */
function applyUnwrap(code, bom, text, ast, element, ops, { snippets, file, eol }) {
  if (ops.length !== 1) return fail("invalid", "unwrap cannot be combined with other ops");
  const tag = jsxName(element.openingElement.name);
  if (!WRAP_TAGS.includes(tag)) return fail("invalid", `Only a ${WRAP_TAGS.join(", ")} can be unwrapped (not <${tag}>)`);
  const child = onlyChild(element);
  if (!child) return fail("invalid", `<${tag}> holds ${element.children.some((node) => node.type === "JSXElement") ? "more than its one layer" : "no layer"}; only a wrapper of one element can be unwrapped`);
  const name = jsxName(child.openingElement.name);
  let edits;
  let next;
  let offset;
  try {
    const own = unwrapEdits(text, element, child);
    const draft = parseSource(applyEdits(text, own));
    const imports = draft && !readsName(draft, tag) ? importEdits(ast, text, eol, file, [], [tag], { action: "unwrapping" }).map((edit) => ({ ...edit, isImport: true })) : [];
    edits = [...own, ...imports];
    next = applyEdits(text, edits);
    // The element starts where the wrapper did, moved by the import edits above it.
    offset = element.start + imports.filter((edit) => edit.end <= element.start).reduce((sum, edit) => sum + edit.text.length - (edit.end - edit.start), 0);
  } catch (error) {
    if (error instanceof EditError) return fail(error.code, error.message);
    throw error;
  }
  const after = parseSource(next);
  if (!after || after.errors.length > ast.errors.length) return fail("invalid", "The edit would break the file's syntax");
  const at = locAt(next, offset);
  const placed = findElement(after, at);
  if (!placed || jsxName(placed.openingElement.name) !== name) return fail("invalid", "The element could not be located after the edit (a bug); nothing was written.");
  const changed = changedRange(applyEdits(text, edits.filter((edit) => edit.isImport)), next);
  const result = { code: bom + next, changed, unwrapped: { loc: `${at.line}:${at.column}` } };
  if (!snippets) return result;
  const sync = unwrapSnippet(next, after, placed, text.slice(element.start, element.end), { name, tag });
  if (!sync) return result;
  if (!sync.replacements.length) return { ...result, snippet: sync.snippet };
  const synced = applyEdits(next, sync.replacements);
  const reparsed = parseSource(synced);
  if (!reparsed || reparsed.errors.length > after.errors.length) return { ...result, snippet: { synced: false, reason: "updating the snippet would break the file's syntax" } };
  const above = sync.replacements.filter((rep) => rep.end <= placed.start);
  const moved = locAt(synced, offset + above.reduce((sum, rep) => sum + rep.text.length - (rep.end - rep.start), 0));
  const shift = above.reduce((sum, rep) => sum + countLines(rep.text) - countLines(next.slice(rep.start, rep.end)), 0);
  const check = findElement(reparsed, moved);
  if (!check || jsxName(check.openingElement.name) !== name) return { ...result, snippet: { synced: false, reason: "updating the snippet would move the element (a bug)" } };
  return { code: bom + synced, changed: { from: changed.from + shift, to: changed.to + shift }, unwrapped: { loc: `${moved.line}:${moved.column}` }, snippet: sync.snippet };
}

/* ── wrap with siblings (op "wrap" + `with`: Frame selection / Add auto layout on a multi-selection) ─────────────── */

/** At most this many elements in `with` (a selection, not a whole list). */
const WRAP_MANY_MAX = 100;

/** A child that only spaces its siblings: whitespace text or an empty {…} ({/* a comment *\/}). */
const isSpacing = (node) => (node.type === "JSXText" && /^\s*$/.test(node.value)) || (node.type === "JSXExpressionContainer" && node.expression.type === "JSXEmptyExpression");

/** Offset just after the line break that ends the line holding `index` (the text's end when there is none). */
function lineEndAfter(text, index) {
  const newline = text.indexOf("\n", index);
  return newline < 0 ? text.length : newline + 1;
}

/** Only spaces before `node` on its first line and after it on its last line. */
const standsAlone = (text, node) => /^[ \t]*$/.test(text.slice(lineStartOf(text, node.start), node.start)) && /^[ \t]*\r?\n?$/.test(text.slice(node.end, lineEndAfter(text, node.end)));

/**
 * Where a selected element sits among its parent's children: the child node that holds it (itself, or the {…} around
 * it through ( ), a condition and TS casts: passesOn) and that parent (an element or a fragment). A `.map` row, an
 * array item, a prop's value or what code returns has no siblings to wrap with (`invalid`).
 */
function childSlotOf(element, nodePath, name) {
  let node = element;
  let i = nodePath.length - 2;
  while (i >= 0 && passesOn(nodePath[i], node)) { node = nodePath[i]; i -= 1; }
  const parent = nodePath[i];
  if ((parent?.type === "JSXElement" || parent?.type === "JSXFragment") && parent.children.includes(node)) return { node, parent };
  if (i >= 0 && mapCallIndex(nodePath, i, node) >= 0) throw new EditError("invalid", `<${name}> is a row of a list (.map): its rows are wrapped one by one — select one row alone, or the element around the list`);
  if (parent?.type === "JSXAttribute") throw new EditError("invalid", `<${name}> is the value of ${attrName(parent)}, not among siblings: wrap it alone`);
  throw new EditError("invalid", `<${name}> is not among a parent's children (an array item, or what code returns): wrap it alone`);
}

/** How many of `nodes` (sorted children of `parent`) follow the first one with only spacing between them. */
function adjacentRun(parent, nodes) {
  let run = 1;
  for (let k = parent.children.indexOf(nodes[0]) + 1; k < parent.children.length && run < nodes.length; k += 1) {
    const child = parent.children[k];
    if (child === nodes[run]) run += 1;
    else if (!isSpacing(child)) break;
  }
  return run;
}

/**
 * The checks a non-adjacent selection needs: the nodes after the first run move up into the wrapper, so the first run
 * and each moved node must stand on lines of their own (nothing else of the code shares them). Throws EditError.
 */
function checkMovable(text, nodes, run, names) {
  const first = nodes[0];
  const last = nodes[run - 1];
  if (!/^[ \t]*$/.test(text.slice(lineStartOf(text, first.start), first.start)) || !/^[ \t]*\r?\n?$/.test(text.slice(last.end, lineEndAfter(text, last.end)))) {
    throw new EditError("invalid", `The layers are not next to each other and <${names.get(first)}> shares its line with other code: select the layers between them too, or put them on lines of their own`);
  }
  for (const node of nodes.slice(run)) {
    if (!standsAlone(text, node)) throw new EditError("invalid", `<${names.get(node)}> shares its line with other code, so it cannot move next to <${names.get(first)}>: select the layers between them too, or put it on a line of its own`);
  }
}

/** A node's text with its continuation lines moved from its own indentation to `to` (string and template lines kept). */
function reindented(text, node, to, eol) {
  const { src, base, protect } = piece(text, node);
  return src.split(/\r\n|\n|\r/).map((line, i) => {
    if (i === 0 || protect.has(i)) return line;
    if (!line.trim()) return "";
    let k = 0;
    while (k < base.length && k < line.length && (line[k] === " " || line[k] === "\t")) k += 1;
    return to + line.slice(k);
  }).join(eol);
}

/**
 * The edits that put `nodes` (sorted children of one parent; the first `run` adjacent) inside `<tag attrs>`. The run is
 * wrapped where it stands: when its first node starts its line, the tags get lines of their own and the run moves one
 * level deeper (lines inside a string or template literal and blank lines keep theirs; checkMovable has passed when
 * nodes follow the run); else both tags go around it inline. The other nodes move up into the wrapper after the run, in
 * source order, each with its lines (their line breaks go with them); what sat between them stays where it was.
 */
function wrapManyEdits(text, nodes, run, { tag, attrs, eol, startsLine }) {
  const first = nodes[0];
  const last = nodes[run - 1];
  if (!startsLine && run < nodes.length) throw new EditError("invalid", "Only adjacent layers are wrapped inline");
  if (!startsLine) return [{ start: first.start, end: first.start, text: `<${tag}${attrs.map((attr) => ` ${attr}`).join("")}>` }, { start: last.end, end: last.end, text: `</${tag}>` }];
  const edits = [];
  const base = indentAt(text, first.start);
  const inner = base + UNIT;
  const flat = attrs.every((attr) => !/[\r\n]/.test(attr)) && base.length + tag.length + 3 + attrs.join(" ").length <= 110;
  const open = !attrs.length ? `<${tag}>` : flat ? `<${tag} ${attrs.join(" ")}>` : `<${tag}${attrs.map((attr) => eol + inner + attr).join("")}${eol}${base}>`;
  edits.push({ start: first.start, end: first.start, text: `${open}${eol}${inner}` });
  // The run's lines, one level deeper: a range node over its children keeps string and template lines as they are.
  const range = { type: "WrapRange", start: first.start, end: last.end, children: nodes.slice(0, run) };
  const { protect } = piece(text, range);
  const src = text.slice(first.start, last.end);
  const starts = [];
  for (const match of src.matchAll(/\r\n|\n|\r/g)) starts.push(first.start + match.index + match[0].length);
  starts.forEach((at, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : last.end;
    if (protect.has(i + 1) || !text.slice(at, end).trim()) return;
    edits.push({ start: at, end: at, text: UNIT });
  });
  const moved = nodes.slice(run);
  for (const node of moved) edits.push({ start: lineStartOf(text, node.start), end: lineEndAfter(text, node.end), text: "" });
  edits.push({ start: last.end, end: last.end, text: `${moved.map((node) => `${eol}${inner}${reindented(text, node, inner, eol)}`).join("")}${eol}${base}</${tag}>` });
  return edits;
}

/**
 * The same wrap in the example snippet that shows the code: the region from the first selected node to the last (what
 * sits between included) must occur exactly once in it (whitespace-tolerant), with the same children in the same order.
 * The snippet's copy is wrapped by the same rules, on its own lines and indentation. Null when the file has no snippets
 * (or no example shows this code); else { replacements, snippet }.
 */
function wrapManySnippet(text, ast, box, { region, items, picked, tag, attrs, eol, what }) {
  if (!snippetLiterals(ast).length) return null;
  const owner = snippetFor(ast, box);
  if (!owner.literal) return owner.reason ? { replacements: [], snippet: { synced: false, reason: owner.reason } } : null;
  const notSynced = (reason) => ({ replacements: [], snippet: { synced: false, reason } });
  const pattern = tolerantPattern(templateRaw(region));
  const hits = [];
  for (const quasi of owner.literal.quasis) {
    const raw = text.slice(quasi.start, quasi.end);
    for (const match of raw.matchAll(pattern)) hits.push({ start: quasi.start + match.index, end: quasi.start + match.index + match[0].length, matched: match[0] });
  }
  if (!hits.length) return notSynced(`the example snippet does not show this code (${what})`);
  if (hits.length > 1) return notSynced(`this code appears more than once in the snippet (${what})`);
  const [hit] = hits;
  const lineStart = Math.max(lineStartOf(text, hit.start), owner.literal.start + 1);
  const lead = text.slice(lineStart, hit.start);
  const startsLine = /^[ \t]*$/.test(lead);
  const prefix = startsLine ? lead : "";
  // The copy as a fragment's children, on lines of its own between `<>` and `</>`.
  const head = `<>${eol}${prefix}`;
  const copy = `${head}${untemplateRaw(hit.matched)}${eol}</>`;
  const parsed = parseSource(copy);
  const statement = parsed?.program.body.length === 1 ? parsed.program.body[0] : null;
  const fragment = statement?.type === "ExpressionStatement" ? statement.expression : null;
  if (!fragment || parsed.errors.length || fragment.type !== "JSXFragment") return notSynced(`the snippet's copy of ${what} differs`);
  const copied = fragment.children.filter((child) => !isSpacing(child));
  const kindOf = (node) => (node.type === "JSXElement" ? jsxName(node.openingElement.name) : node.type);
  if (copied.length !== items.length || copied.some((node, k) => kindOf(node) !== kindOf(items[k]))) return notSynced(`the snippet's copy of ${what} differs`);
  const nodes = picked.map((k) => copied[k]);
  const run = adjacentRun(fragment, nodes);
  let wrapped;
  try {
    if (run < nodes.length) checkMovable(copy, nodes, run, new Map(nodes.map((node) => [node, kindOf(node)])));
    wrapped = applyEdits(copy, wrapManyEdits(copy, nodes, run, { tag, attrs, eol, startsLine }));
  } catch (error) {
    if (error instanceof EditError) return notSynced(`the snippet's copy of ${what} is laid out differently`);
    throw error;
  }
  if (!wrapped.startsWith(head) || !wrapped.endsWith(`${eol}</>`)) return notSynced(`the snippet's copy of ${what} differs`);
  const body = wrapped.slice(head.length, wrapped.length - eol.length - 3);
  return { replacements: [{ start: hit.start, end: hit.end, text: templateRaw(body) }], snippet: { synced: true } };
}

/**
 * Op "wrap" { tag, props, with } (Figma's Frame selection / Add auto layout on a multi-selection): the element and the
 * elements whose opening tags start at the `with` locs ("<line>:<column>", same file) go into one `<tag …props>`. Each
 * must be a child of one JSX parent (an element's or a fragment's): itself, or inside its {…} through ( ), a condition
 * (`&&`, `||`, `??`, `?:` — the whole condition moves) or a TS cast. Refused (`invalid`): a `.map` row, an array item, a
 * prop's value, what code returns, layers of different parents, one layer inside another, and every refusal of a single
 * wrap for any of them (wrapPlace: cloned elements, HTML nesting; docs chrome: `forbidden`). In source order: adjacent
 * layers (only whitespace and {/* comments *\/} between) are wrapped where they stand; others move up into the
 * wrapper after them (each must stand on lines of its own), and what sat between stays. Keys stay on their elements.
 * `with` empty (or naming only the element) is a single wrap. `wrapped.loc` = the wrapper (the first layer's old place,
 * moved by an import line above it); the example snippet follows as for a single wrap.
 */
function applyWrapMany(code, bom, text, ast, element, op, { tag, props, snippets, file, eol, lineCommentEnds }) {
  const locs = op.with;
  if (!Array.isArray(locs) || locs.some((loc) => typeof loc !== "string")) return fail("invalid", "wrap `with` must be a list of \"<line>:<column>\" locs");
  if (locs.length > WRAP_MANY_MAX) return fail("invalid", `wrap \`with\` takes at most ${WRAP_MANY_MAX} elements`);
  const elements = [element];
  for (const loc of locs) {
    const target = parseLoc(loc);
    if (!target) return fail("invalid", `Bad loc "${loc}" in \`with\` (expected "<line>:<column>")`);
    const other = findElement(ast, target);
    if (!other) return fail("not-found", `No JSX element starts at ${loc} (with)`);
    if (!elements.includes(other)) elements.push(other);
  }
  if (elements.length === 1) return applyWrap(code, bom, text, ast, element, [{ op: "wrap", tag, props }], { snippets, file, eol, lineCommentEnds });
  const nameOf = (node) => jsxName(node.openingElement.name);
  if (text.includes(CHROME_MARK)) {
    const chrome = chromeFunctions(ast);
    const inChrome = elements.find((other) => insideAny(chrome, other));
    if (inChrome) return fail("forbidden", `<${nameOf(inChrome)}> is docs chrome (zen-studio-chrome); edit it in the code`);
  }
  for (const outer of elements) {
    const inner = elements.find((other) => other !== outer && outer.start <= other.start && other.end <= outer.end);
    if (inner) return fail("invalid", `<${nameOf(inner)}> is inside <${nameOf(outer)}>: select one of them`);
  }
  let attrs;
  let nodes;
  let parent;
  let run;
  let edits;
  let imports;
  let next;
  let offset;
  /* The name each child node is reported by (its element's). */
  const names = new Map();
  try {
    attrs = wrapAttrs(props);
    const slots = elements.map((other) => {
      const nodePath = pathTo(ast.program, other);
      if (!nodePath) throw new EditError("not-found", `<${nameOf(other)}> is not in the file's tree`);
      const slot = childSlotOf(other, nodePath, nameOf(other));
      wrapPlace(other, nodePath);
      if (!names.has(slot.node)) names.set(slot.node, nameOf(other));
      return slot;
    });
    parent = slots[0].parent;
    const stray = slots.find((slot) => slot.parent !== parent);
    if (stray) throw new EditError("invalid", `<${names.get(stray.node)}> and <${names.get(slots[0].node)}> sit in different parents: select layers that share one parent`);
    // A condition holding two selected layers (both branches of a ?:) moves once.
    nodes = [...new Set(slots.map((slot) => slot.node))].sort((a, b) => a.start - b.start);
    run = adjacentRun(parent, nodes);
    if (run < nodes.length) checkMovable(text, nodes, run, names);
    const startsLine = /^[ \t]*$/.test(text.slice(lineStartOf(text, nodes[0].start), nodes[0].start));
    imports = importEdits(ast, text, eol, file, [tag], [], { action: "wrapping", looseTarget: true }).map((edit) => ({ ...edit, isImport: true }));
    edits = [...wrapManyEdits(text, nodes, run, { tag, attrs, eol, startsLine }), ...imports];
    next = applyEdits(text, edits);
    offset = nodes[0].start + imports.filter((edit) => edit.end <= nodes[0].start).reduce((sum, edit) => sum + edit.text.length - (edit.end - edit.start), 0);
  } catch (error) {
    if (error instanceof EditError) return fail(error.code, error.message);
    throw error;
  }
  const after = parseSource(next);
  if (!after || after.errors.length > ast.errors.length) return fail("invalid", "The edit would break the file's syntax");
  const at = locAt(next, offset);
  const box = findElement(after, at);
  if (!box || jsxName(box.openingElement.name) !== tag || box.children.filter((child) => !isSpacing(child)).length !== nodes.length) return fail("invalid", "The wrapper could not be located after the edit (a bug); nothing was written.");
  const changed = changedRange(applyEdits(text, imports), next);
  const result = { code: bom + next, changed, wrapped: { loc: `${at.line}:${at.column}` } };
  if (!snippets) return result;
  const first = nodes[0];
  const last = nodes.at(-1);
  const items = parent.children.filter((child) => child.start >= first.start && child.end <= last.end && !isSpacing(child));
  const what = nodes.map((node) => `<${names.get(node)}>`).join(", ");
  const sync = wrapManySnippet(next, after, box, { region: text.slice(first.start, last.end), items, picked: nodes.map((node) => items.indexOf(node)), tag, attrs, eol, what });
  if (!sync) return result;
  if (!sync.replacements.length) return { ...result, snippet: sync.snippet };
  const synced = applyEdits(next, sync.replacements);
  const reparsed = parseSource(synced);
  if (!reparsed || reparsed.errors.length > after.errors.length) return { ...result, snippet: { synced: false, reason: "updating the snippet would break the file's syntax" } };
  // A snippet above the wrapper moves it (and its lines).
  const above = sync.replacements.filter((rep) => rep.end <= box.start);
  const moved = locAt(synced, offset + above.reduce((sum, rep) => sum + rep.text.length - (rep.end - rep.start), 0));
  const shift = above.reduce((sum, rep) => sum + countLines(rep.text) - countLines(next.slice(rep.start, rep.end)), 0);
  const check = findElement(reparsed, moved);
  if (!check || jsxName(check.openingElement.name) !== tag) return { ...result, snippet: { synced: false, reason: "updating the snippet would move the wrapper (a bug)" } };
  return { code: bom + synced, changed: { from: changed.from + shift, to: changed.to + shift }, wrapped: { loc: `${moved.line}:${moved.column}` }, snippet: sync.snippet };
}

export { CHROME_MARK, EditError, applyEdits, describeAttr, findElement, insideAny, staticString, walk };
