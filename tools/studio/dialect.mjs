// The Studio builder's page dialect (`*.zen.tsx`; spec docs/research/studio-builder-pages-spec-2026-10-06.md §2): a real
// TSX module limited so every prop stays editable. Isomorphic (browser and Node, no Node imports).
//
//   parsePage(text, { components? }) → { header, mock, board, errors }   the neutral tree the renderer (and GĐ5 export) walk
//   validateDialect(text, { components? }) → errors [{ line, column, message }]
//   newPageText({ title, device, chrome }) → the text of a blank page
//   PAGE_DEVICES, SCREEN_STATES, SCREEN_CANVASES, SCREEN_LAYOUTS, SCREEN_CHROME, screenLayout(device, layout),
//   screenChromeCode(prop, title)
//   boardFrames(tree), freeFrameId(base, taken), frameCode({ kind, id, title, device }), protoCode(action, arg)   (M3)
//
// Tree: Node = { kind: "element", name, loc: "line:col", props: { [name]: Value }, children: Child[] }
//       Value = { kind: "literal", value } | { kind: "array", items } | { kind: "object", fields } | { kind: "element", node }
//             | { kind: "proto", action, args } | { kind: "ref", root, path }        (root "mock" or a .map item name)
//       Child = Node | { kind: "text", value } | { kind: "ref", root, path } | { kind: "map", source, item, node }
import { jsxName, parseSource } from "./jsx-source.mjs";
import { SCREEN_CHROME, SCREEN_LAYOUTS, screenChromeCode, screenLayout } from "./screen-chrome.mjs";

export { SCREEN_CHROME, SCREEN_LAYOUTS, screenChromeCode, screenLayout };

export const PAGE_DEVICES = ["phone", "tablet", "desktop"];
export const SCREEN_STATES = ["empty", "loading", "error"];
export const SCREEN_CANVASES = ["default", "alt", "flat"];
const BUILDER_NAMES = new Set(["Board", "Screen", "Overlay", "proto"]);
const PROTO_ACTIONS = new Set(["navigate", "open", "close", "back", "toast", "link"]);
const PACKAGE = "@zen/design-system";
const BUILDER_PACKAGE = "@zen/design-system/builder";
const HEADER = /^﻿?\/\/ @zen-page (\{.*\})[ \t]*\r?\n/;

/** The header's JSON (`// @zen-page {"format":1,…}` on line 1), or null. */
export function pageHeader(text) {
  const match = HEADER.exec(String(text ?? ""));
  if (!match) return null;
  try {
    const value = JSON.parse(match[1]);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

const quote = (value) => JSON.stringify(String(value));

/** The chrome props of a new Screen's opening tag, one per line at `indent` (multi-line components indented under it). */
const chromeAttrs = (title, indent) => SCREEN_CHROME.map((part) => {
  const code = screenChromeCode(part.prop, title).split("\n").map((line, index) => (index ? `${indent}${line}` : line)).join("\n");
  return `${indent}${part.prop}={${code}}`;
});
const CHROME_IMPORTS = SCREEN_CHROME.map((part) => part.component);

/**
 * A blank page: one Screen on `device` holding a padded Stack, ready to take components. With `chrome` (the default) the
 * Screen comes with its app frame (SCREEN_CHROME: Sidebar + Page Header, Top + Bottom Navigation; the title is in the
 * header, so the Stack starts with a line of body text); without it, the Stack starts with the title as a heading.
 */
export function newPageText({ title = "Untitled", device = "desktop", chrome = true } = {}) {
  const screenDevice = PAGE_DEVICES.includes(device) ? device : "desktop";
  const names = [...new Set(["Stack", "Text", ...(chrome ? CHROME_IMPORTS : [])])].sort((a, b) => a.localeCompare(b));
  const open = `      <Screen id="screen-1" title=${quote(title)} device="${screenDevice}"`;
  return [
    `// @zen-page ${JSON.stringify({ format: 1, title })}`,
    `import { Board, Screen, proto } from ${quote(BUILDER_PACKAGE)};`,
    `import { ${names.join(", ")} } from ${quote(PACKAGE)};`,
    "",
    "export const mock = {};",
    "",
    "export default function Page() {",
    "  return (",
    "    <Board>",
    ...(chrome ? [open, ...chromeAttrs(title, "        ").map((line, index, all) => (index === all.length - 1 ? `${line}>` : line))] : [`${open}>`]),
    `        <Stack gap="md" padding="${screenDevice === "phone" ? "lg" : "xl"}">`,
    chrome ? `          <Text tone="base">Start building here: add components from Assets.</Text>` : `          <Text textStyle="Heading/3">${title.replace(/[{}<>]/g, "")}</Text>`,
    "        </Stack>",
    "      </Screen>",
    "    </Board>",
    "  );",
    "}",
    "",
  ].join("\n");
}

/* ── prototype (GĐ2 M3): frames on the Board and proto actions ─────────────────────────────────────────────────── */

/** The Board's Screens and Overlays: [{ kind: "screen" | "overlay", id, state?, title, device?, loc }] (a parsed page's tree). */
export function boardFrames(tree) {
  const literal = (node, name) => (node.props[name]?.kind === "literal" ? node.props[name].value : undefined);
  return (tree?.board?.children ?? []).filter((child) => child.kind === "element").map((node) => {
    const id = String(literal(node, "id") ?? "");
    if (node.name === "Overlay") return { kind: "overlay", id, title: id, loc: node.loc };
    const state = literal(node, "state");
    return { kind: "screen", id, ...(typeof state === "string" ? { state } : {}), title: String(literal(node, "title") ?? id), device: literal(node, "device") ?? "desktop", loc: node.loc };
  });
}

/** `<base>-<n>`: the first id not in `taken` (a Set or an array). */
export function freeFrameId(base, taken) {
  const used = new Set(taken);
  for (let n = 1; ; n += 1) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}

/**
 * The code of a new Board child: a Screen (title heading in a padded Stack, on `device`) or an Overlay holding a Dialog
 * whose actions close it. Inserted with insertChild on the Board; slots.mjs adds the runtime and component imports.
 */
export function frameCode({ kind, id, title, device = "desktop", chrome = true }) {
  const name = String(title ?? id).replace(/[{}<>]/g, "");
  if (kind === "overlay") {
    return [
      `<Overlay id=${quote(id)}>`,
      `  <Dialog title=${quote(name)} description="Say what happens next." primaryAction={{ label: "Continue", onClick: proto.close() }} secondaryAction={{ label: "Cancel", onClick: proto.close() }} />`,
      "</Overlay>",
    ].join("\n");
  }
  const screenDevice = PAGE_DEVICES.includes(device) ? device : "desktop";
  // A new Screen comes with the app frame as a new page does (its title in the header).
  const open = `<Screen id=${quote(id)} title=${quote(name)} device="${screenDevice}"`;
  return [
    ...(chrome ? [open, ...chromeAttrs(name, "  ").map((line, index, all) => (index === all.length - 1 ? `${line}>` : line))] : [`${open}>`]),
    `  <Stack gap="md" padding="${screenDevice === "phone" ? "lg" : "xl"}">`,
    chrome ? `    <Text tone="base">Start building here: add components from Assets.</Text>` : `    <Text textStyle="Heading/3">${name}</Text>`,
    "  </Stack>",
    "</Screen>",
  ].join("\n");
}

/** A prop's proto action as code: navigate / open take a frame id, toast a title, link a URL; close and back nothing. */
export function protoCode(action, arg) {
  if (!PROTO_ACTIONS.has(action)) throw new Error(`proto.${action} is not an interaction`);
  if (action === "close" || action === "back") return `proto.${action}()`;
  if (action === "toast") return `proto.toast({ title: ${quote(String(arg ?? ""))} })`;
  return `proto.${action}(${quote(String(arg ?? ""))})`;
}

/* ── JSX text, as Babel's JSX transform cleans it (cleanJSXElementLiteralChild) ─────────────────────────────────── */

export function jsxText(value) {
  const lines = String(value).split(/\r\n|\n|\r/);
  let last = 0;
  lines.forEach((line, index) => { if (/[^ \t]/.test(line)) last = index; });
  let out = "";
  lines.forEach((line, index) => {
    let trimmed = line.replace(/\t/g, " ");
    if (index !== 0) trimmed = trimmed.replace(/^[ ]+/, "");
    if (index !== lines.length - 1) trimmed = trimmed.replace(/[ ]+$/, "");
    if (trimmed) out += index !== last ? `${trimmed} ` : trimmed;
  });
  return out;
}

/* ── parse ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

const locOf = (node) => `${node.loc.start.line}:${node.loc.start.column}`;
const unwrap = (node) => {
  let current = node;
  while (current && (current.type === "ParenthesizedExpression" || current.type === "TSAsExpression" || current.type === "TSSatisfiesExpression" || current.type === "TSNonNullExpression")) current = current.expression;
  return current;
};

/** A member chain `a.b.c` / `a["b"]` → { root, path }, or null. */
function chainOf(node) {
  const path = [];
  let current = unwrap(node);
  while (current?.type === "MemberExpression" || current?.type === "OptionalMemberExpression") {
    const key = current.computed ? (current.property.type === "StringLiteral" || current.property.type === "NumericLiteral" ? String(current.property.value) : null) : current.property.name;
    if (key === null) return null;
    path.unshift(key);
    current = unwrap(current.object);
  }
  return current?.type === "Identifier" ? { root: current.name, path } : null;
}

/** A JS value written as literals (the mock data): undefined when it is not one. */
function literalValue(node) {
  const value = unwrap(node);
  switch (value?.type) {
    case "StringLiteral": case "NumericLiteral": case "BooleanLiteral": return value.value;
    case "NullLiteral": return null;
    case "TemplateLiteral": return value.expressions.length ? undefined : value.quasis[0].value.cooked;
    case "UnaryExpression": return value.operator === "-" && value.argument.type === "NumericLiteral" ? -value.argument.value : undefined;
    case "ArrayExpression": {
      const items = value.elements.map((item) => (item && item.type !== "SpreadElement" ? literalValue(item) : undefined));
      return items.includes(undefined) ? undefined : items;
    }
    case "ObjectExpression": {
      const out = {};
      for (const prop of value.properties) {
        if (prop.type !== "ObjectProperty" || prop.computed || prop.shorthand) return undefined;
        const key = prop.key.type === "Identifier" ? prop.key.name : prop.key.type === "StringLiteral" ? prop.key.value : null;
        const field = key === null ? undefined : literalValue(prop.value);
        if (field === undefined) return undefined;
        out[key] = field;
      }
      return out;
    }
    default: return undefined;
  }
}

/**
 * The page's neutral tree and the dialect errors. `components`: the Zen component names allowed (a Set); without it any
 * name imported from @zen/design-system is.
 */
export function parsePage(text, { components } = {}) {
  const errors = [];
  const fail = (node, message) => { errors.push({ line: node?.loc?.start.line ?? 1, column: node?.loc?.start.column ?? 0, message }); return null; };
  const header = pageHeader(text);
  const ast = parseSource(String(text ?? "").replace(/^﻿/, ""));
  if (!ast) return { header, mock: {}, board: null, errors: [{ line: 1, column: 0, message: "The page does not parse as TSX" }] };
  if (!header) fail(null, "Line 1 must be the page header: // @zen-page {\"format\":1,\"title\":\"…\"}");
  else if (header.format !== 1) fail(null, `Unknown page format ${JSON.stringify(header.format)} (this Studio reads format 1)`);

  const imported = new Set();
  let mock = {};
  let page = null;
  for (const statement of ast.program.body) {
    if (statement.type === "ImportDeclaration") {
      const from = statement.source.value;
      if (from !== PACKAGE && from !== BUILDER_PACKAGE) { fail(statement, `Imports come from ${PACKAGE} and ${BUILDER_PACKAGE} only, not ${from}`); continue; }
      if (statement.importKind === "type") continue;
      for (const specifier of statement.specifiers) {
        if (specifier.type !== "ImportSpecifier") { fail(specifier, "Use named imports ({ Button })"); continue; }
        const name = specifier.local.name;
        if (from === BUILDER_PACKAGE && !BUILDER_NAMES.has(name)) fail(specifier, `${BUILDER_PACKAGE} exports Board, Screen, Overlay and proto, not ${name}`);
        else if (from === PACKAGE && components && !components.has(name)) fail(specifier, `${name} is not a Zen component`);
        imported.add(name);
      }
      continue;
    }
    if (statement.type === "ExportNamedDeclaration" && statement.declaration?.type === "VariableDeclaration" && statement.declaration.declarations.length === 1 && statement.declaration.declarations[0].id.name === "mock") {
      const value = literalValue(statement.declaration.declarations[0].init);
      if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) fail(statement, "`export const mock` holds an object of literals (text, numbers, lists, objects)");
      else mock = value;
      continue;
    }
    if (statement.type === "ExportDefaultDeclaration" && statement.declaration.type === "FunctionDeclaration") {
      if (page) fail(statement, "One page component per file");
      page = statement.declaration;
      continue;
    }
    if (statement.type === "EmptyStatement") continue;
    fail(statement, "A page holds imports, `export const mock` and `export default function Page()` only");
  }
  if (!page) {
    fail(null, "The page needs `export default function Page() { return (<Board>…</Board>); }`");
    return { header, mock, board: null, errors };
  }
  const body = page.body.body;
  const returned = body.length === 1 && body[0].type === "ReturnStatement" ? unwrap(body[0].argument) : null;
  if (!returned || returned.type !== "JSXElement") {
    fail(page, "The page component only returns its <Board> (no hooks, variables or conditions)");
    return { header, mock, board: null, errors };
  }

  /** A JSX element → Node; `items`: the .map item names in scope. */
  const element = (node, items) => {
    const name = jsxName(node.openingElement.name);
    const root = name.split(".")[0];
    if (/^[a-z]/.test(name)) return fail(node, `<${name}> is an HTML element: use a Zen component (Text, Stack, Box…)`);
    if (!imported.has(root)) return fail(node, `<${name}> is not imported from ${PACKAGE}`);
    const props = {};
    for (const attr of node.openingElement.attributes) {
      if (attr.type === "JSXSpreadAttribute") { fail(attr, "Spread props ({...rest}) cannot be edited: write each prop"); continue; }
      const prop = jsxName(attr.name);
      if (prop === "style" || prop === "className") { fail(attr, `${prop} is not part of a page: use the component's props and tokens`); continue; }
      if (prop === "key") continue;
      const value = !attr.value ? { kind: "literal", value: true }
        : attr.value.type === "StringLiteral" ? { kind: "literal", value: attr.value.value }
          : attr.value.type === "JSXExpressionContainer" ? expression(attr.value.expression, items)
            : attr.value.type === "JSXElement" ? wrapElement(attr.value, items) : fail(attr, `${prop}: this kind of value is not editable`);
      if (value) props[prop] = value;
    }
    const children = [];
    for (const child of node.children) {
      if (child.type === "JSXText") { const value = jsxText(child.value); if (value) children.push({ kind: "text", value }); continue; }
      if (child.type === "JSXElement") { const next = element(child, items); if (next) children.push(next); continue; }
      if (child.type === "JSXFragment") { fail(child, "Fragments (<>…</>) are not part of a page: put the children in a Stack"); continue; }
      if (child.type === "JSXExpressionContainer") {
        const value = unwrap(child.expression);
        if (value.type === "JSXEmptyExpression") continue;
        const map = mapOf(value, items);
        if (map) { children.push(map); continue; }
        if (map === null && value.type === "CallExpression") continue;
        const literal = literalValue(value);
        if (typeof literal === "string" || typeof literal === "number") { children.push({ kind: "text", value: String(literal) }); continue; }
        const chain = chainOf(value);
        if (chain && (chain.root === "mock" || items.includes(chain.root))) { children.push({ kind: "ref", ...chain }); continue; }
        fail(child, "A child is text, a component, a mock field or {mock.list.map((item) => <… />)}");
      }
    }
    return { kind: "element", name, loc: locOf(node), props, children };
  };
  const wrapElement = (node, items) => { const next = element(node, items); return next ? { kind: "element", node: next } : null; };

  /** `{mock.list.map((item) => <X … />)}` → map child; undefined when it is not a .map call; null after an error. */
  const mapOf = (node, items) => {
    if (node.type !== "CallExpression" || node.callee.type !== "MemberExpression" || node.callee.computed || node.callee.property.name !== "map") return undefined;
    const source = chainOf(node.callee.object);
    if (!source || !(source.root === "mock" || items.includes(source.root))) return fail(node, "Lists come from the mock data: {mock.items.map((item) => <… />)} (no filter or sort)");
    const fn = node.arguments[0];
    if (node.arguments.length !== 1 || fn?.type !== "ArrowFunctionExpression" || fn.params.length !== 1 || fn.params[0].type !== "Identifier") return fail(node, "Write the list as .map((item) => <… />): one item, no index");
    const body = unwrap(fn.body);
    if (body?.type !== "JSXElement") return fail(fn, "The list's callback returns one component");
    const item = fn.params[0].name;
    const template = element(body, [...items, item]);
    return template ? { kind: "map", source, item, node: template } : null;
  };

  /** An attribute's {expression} → Value. */
  const expression = (node, items) => {
    const value = unwrap(node);
    if (value.type === "JSXEmptyExpression") return fail(node, "Empty prop value");
    if (value.type === "JSXElement") return wrapElement(value, items);
    if (value.type === "CallExpression" && value.callee.type === "MemberExpression" && value.callee.object.type === "Identifier" && value.callee.object.name === "proto") {
      const action = value.callee.property.name;
      if (!PROTO_ACTIONS.has(action)) return fail(value, `proto.${action} is not an interaction (navigate, open, close, back, toast, link)`);
      const args = value.arguments.map(literalValue);
      if (args.includes(undefined)) return fail(value, `proto.${action}(…) takes literal arguments`);
      return { kind: "proto", action, args };
    }
    if (value.type === "ArrayExpression") {
      const list = value.elements.map((entry) => (entry && entry.type !== "SpreadElement" ? expression(entry, items) : fail(value, "Lists in props are written item by item")));
      return list.includes(null) ? null : { kind: "array", items: list };
    }
    if (value.type === "ObjectExpression") {
      const fields = {};
      for (const prop of value.properties) {
        if (prop.type !== "ObjectProperty" || prop.computed) return fail(prop, "Objects in props are written field by field (no spreads or methods)");
        const key = prop.key.type === "Identifier" ? prop.key.name : prop.key.type === "StringLiteral" ? prop.key.value : null;
        if (key === null) return fail(prop, "Object keys are names or strings");
        const field = prop.shorthand ? fail(prop, `Write ${key}: … in full`) : expression(prop.value, items);
        if (!field) return null;
        fields[key] = field;
      }
      return { kind: "object", fields };
    }
    const literal = literalValue(value);
    if (literal !== undefined) return { kind: "literal", value: literal };
    const chain = chainOf(value);
    if (chain && (chain.root === "mock" || items.includes(chain.root))) return { kind: "ref", ...chain };
    if (chain && imported.has(chain.root) && !BUILDER_NAMES.has(chain.root)) return fail(value, `${chain.root} is a component, not a value`);
    return fail(value, "A prop value is a literal, a mock field, a component or proto.*(…) (no code, conditions or functions)");
  };

  const board = element(returned, []);
  if (board && board.name !== "Board") fail(returned, "The page returns a <Board>");
  if (board) {
    for (const child of board.children) {
      if (child.kind !== "element" || (child.name !== "Screen" && child.name !== "Overlay")) { errors.push({ line: 1, column: 0, message: "A Board holds <Screen> and <Overlay> only" }); continue; }
      const id = child.props.id;
      if (id?.kind !== "literal" || typeof id.value !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(id.value)) errors.push({ line: Number(child.loc.split(":")[0]), column: Number(child.loc.split(":")[1]), message: `<${child.name}> needs an id of lowercase letters, digits and dashes` });
      if (child.name === "Screen") {
        const device = child.props.device;
        if (device && !(device.kind === "literal" && PAGE_DEVICES.includes(device.value))) errors.push({ line: Number(child.loc.split(":")[0]), column: 0, message: `device is ${PAGE_DEVICES.join(", ")}` });
        const layout = child.props.layout;
        if (layout && !(layout.kind === "literal" && SCREEN_LAYOUTS.includes(layout.value))) errors.push({ line: Number(child.loc.split(":")[0]), column: 0, message: `layout is ${SCREEN_LAYOUTS.join(", ")}` });
        for (const part of SCREEN_CHROME) {
          const value = child.props[part.prop];
          if (value && value.kind !== "element") errors.push({ line: Number(child.loc.split(":")[0]), column: 0, message: `${part.prop} holds one component (<${part.component} … />)` });
        }
        const canvas = child.props.canvas;
        if (canvas && !(canvas.kind === "literal" && SCREEN_CANVASES.includes(canvas.value))) errors.push({ line: Number(child.loc.split(":")[0]), column: 0, message: `canvas is ${SCREEN_CANVASES.join(", ")}` });
        const state = child.props.state;
        if (state && !(state.kind === "literal" && SCREEN_STATES.includes(state.value))) errors.push({ line: Number(child.loc.split(":")[0]), column: 0, message: `state is ${SCREEN_STATES.join(", ")} (no state = the default)` });
      }
    }
  }
  return { header, mock, board: board && board.name === "Board" ? board : null, errors };
}

/** The dialect errors of a page text (empty: the text is a valid page). */
export function validateDialect(text, options) {
  return parsePage(text, options).errors;
}
