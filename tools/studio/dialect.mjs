// The Studio builder's page dialect (`*.zen.tsx`; spec docs/research/studio-builder-pages-spec-2026-10-06.md §2): a real
// TSX module limited so every prop stays editable. Isomorphic (browser and Node, no Node imports).
//
//   parsePage(text, { components? }) → { header, mock, board, errors }   the neutral tree the renderer (and GĐ5 export) walk
//   validateDialect(text, { components? }) → errors [{ line, column, message }]
//   newPageText({ title, device, chrome, empty }) → the text of a blank page (`empty`: one Screen with nothing in it)
//   PAGE_DEVICES, SCREEN_STATES, SCREEN_CANVASES, SCREEN_LAYOUTS, SCREEN_CHROME, screenLayout(device, layout),
//   screenChromeCode(prop, title)
//   boardFrames(tree), freeFrameId(base, taken), frameCode({ kind, id, title, device }), protoCode(action, arg)   (M3)
//   FRAME_SIZE   free frames: x / y on a Board child, width / height on a Screen (2026-10-15)
//   SECTION_SIZE, boardSections(tree), sectionCode({ id, title, x, y, width, height })   Figma's sections (F4, 2026-10-19)
//   SLICE_SIZE, sliceCode({ id, title, x, y, width, height })   Figma's slices (an area exported as a picture, 2026-10-22)
//
// Tree: Node = { kind: "element", name, loc: "line:col", props: { [name]: Value }, children: Child[] }
//       Value = { kind: "literal", value } | { kind: "array", items } | { kind: "object", fields } | { kind: "element", node }
//             | { kind: "fragment", children: Child[] }   a slot prop holding several layers, written <>…</> (2026-10-16)
//             | { kind: "proto", action, args } | { kind: "ref", root, path }        (root "mock" or a .map item name)
//       Child = Node | { kind: "text", value } | { kind: "ref", root, path } | { kind: "map", source, item, node }
import { jsxName, parseSource } from "./jsx-source.mjs";
import { SCREEN_CHROME, SCREEN_LAYOUTS, screenChromeCode, screenFrameCode, screenHeaderCode, screenLayout } from "./screen-chrome.mjs";
import { NESTED_VALUE_KEY, instanceLayerPaths } from "./instance-paths.mjs";

export { SCREEN_CHROME, SCREEN_LAYOUTS, screenChromeCode, screenLayout };

export const PAGE_DEVICES = ["phone", "tablet", "desktop"];
/** A Screen's usual states. Any lowercase name is one (option C, 2026-10-23: "filtered", "step-2", a frame Navigate to
 *  leads to as Figma's lead to any frame). */
export const SCREEN_STATES = ["empty", "loading", "error"];
const SCREEN_STATE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
export const SCREEN_CANVASES = ["default", "alt", "flat"];
/** A Screen's drawn size (props `width`, `height`, world px); the max is the frame width's (board/frameLayout.ts). */
export const FRAME_SIZE = { min: 100, max: 4096 };
/** A frame's place on the board (props `x`, `y`, world px from the board's origin): far enough for any canvas. */
const FRAME_PLACE = 100000;
/** A Section's size (Figma's section: a named board area the frames inside it belong to; F4 2026-10-19). */
export const SECTION_SIZE = { min: 100, max: 40000 };
const BUILDER_NAMES = new Set(["Board", "Screen", "Overlay", "Section", "Slice", "proto", "Component", "ComponentSet", "Use"]);
/** A page-local main component's id (Figma's main component, Zen Studio 2026-10-17): lowercase letters, digits, dashes. */
const COMPONENT_ID = /^[a-z][a-z0-9-]*$/;
const PROTO_ACTIONS = new Set(["navigate", "open", "close", "back", "toast", "link", "filter", "step"]);
const PACKAGE = "@zen-ds/react";
const BUILDER_PACKAGE = "@zen-ds/react/builder";
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

/** Props one per line at `indent` (a multi-line component indented under its prop). */
const propLines = (entries, indent) => entries.map(([prop, code]) => `${indent}${prop}={${code.split("\n").map((line, index) => (index ? `${indent}${line}` : line)).join("\n")}}`);
const componentsOf = (codes) => codes.flatMap((code) => [...code.matchAll(/<([A-Z]\w*)/g)].map((match) => match[1]));
/** The parts a new Screen's master layout (its root AppShell, screen-frame.mjs) starts with: the Sidebar, and the header's Main
 *  row holding the Page header (Header/AppShell). */
const newFrame = (title) => [["sidebar", screenFrameCode("sidebar", title)], ["header", screenHeaderCode([["main", screenFrameCode("main", title)]])]];

/**
 * A new Screen's app frame (user, 2026-10-09; master layout 2026-10-15): the mobile layout's Top and Bottom Navigation as
 * the Screen's props, and on the desktop layout a root AppShell around the content. A phone or tablet in its mobile layout
 * starts without the AppShell: the Screen section adds it when the layout turns desktop. Returns the lines at `indent`
 * and the components they use.
 */
function screenLines({ open, title, heading, device, layout, chrome, empty = false, indent }) {
  // Completely empty (user, 2026-10-16: "cho phép tạo trang frame trống hoàn toàn"): no app frame and no content, as
  // Figma's new frame; the person adds everything.
  if (empty) return { lines: [`${indent}${open} />`], components: [] };
  const inner = (depth) => indent + "  ".repeat(depth);
  const framed = chrome && screenLayout(device, layout) === "desktop";
  const depth = framed ? 2 : 1;
  const stack = [
    // Inside the master layout the AppShell's Body pads the page (Margin-Comfortable); a bare Screen pads itself.
    framed ? `${inner(depth)}<Stack gap="md">` : `${inner(depth)}<Stack gap="md" padding="${device === "phone" ? "lg" : "xl"}">`,
    chrome ? `${inner(depth + 1)}<Text tone="base">Start building here: add components from Assets.</Text>` : `${inner(depth + 1)}<Text textStyle="Heading/3">${heading}</Text>`,
    `${inner(depth)}</Stack>`,
  ];
  if (!chrome) return { lines: [`${indent}${open}>`, ...stack, `${indent}</Screen>`], components: ["Stack", "Text"] };
  const bars = SCREEN_CHROME.filter((part) => part.layout === "mobile").map((part) => [part.prop, screenChromeCode(part.prop, title)]);
  const frame = framed ? newFrame(title) : [];
  const attrs = propLines(bars, inner(1));
  const lines = [
    `${indent}${open}`,
    ...attrs.map((line, index) => (index === attrs.length - 1 ? `${line}>` : line)),
    ...(framed ? [`${inner(1)}<AppShell`, ...propLines(frame, inner(2)), `${inner(1)}>`] : []),
    ...stack,
    ...(framed ? [`${inner(1)}</AppShell>`] : []),
    `${indent}</Screen>`,
  ];
  return { lines, components: ["Stack", "Text", ...(framed ? ["AppShell"] : []), ...componentsOf([...bars, ...frame].map(([, code]) => code))] };
}

/**
 * A blank page: one Screen on `device` holding a padded Stack, ready to take components. With `chrome` (the default) the
 * Screen comes with its app frame (screenLines: the master layout's Sidebar + Page header, Top + Bottom Navigation; the
 * title is in the header, so the Stack starts with a line of body text); without it, the Stack starts with the title as
 * a heading. `empty`: the Screen holds nothing at all (no app frame, no Stack), as Figma's new frame.
 */
export function newPageText({ title = "Untitled", device = "desktop", layout, width, height, chrome = true, empty = false } = {}) {
  const screenDevice = PAGE_DEVICES.includes(device) ? device : "desktop";
  // A size and a tablet's layout from the device picked (tools/studio/screen-devices.mjs); none: the device's default.
  const open = `<Screen id="screen-1" title=${quote(title)} device="${screenDevice}"${layoutAttr(screenDevice, layout)}${placeAttrs({ width, height })}`;
  const screen = screenLines({ open, title, heading: title.replace(/[{}<>]/g, ""), device: screenDevice, layout, chrome: chrome && !empty, empty, indent: "      " });
  const names = [...new Set(screen.components)].sort((a, b) => a.localeCompare(b));
  return [
    `// @zen-page ${JSON.stringify({ format: 1, title })}`,
    `import { Board, Screen, proto } from ${quote(BUILDER_PACKAGE)};`,
    ...(names.length ? [`import { ${names.join(", ")} } from ${quote(PACKAGE)};`] : []),
    "",
    "export const mock = {};",
    "",
    "export default function Page() {",
    "  return (",
    "    <Board>",
    ...screen.lines,
    "    </Board>",
    "  );",
    "}",
    "",
  ].join("\n");
}

/* ── prototype (GĐ2 M3): frames on the Board and proto actions ─────────────────────────────────────────────────── */

/** The Board's Screens and Overlays: [{ kind: "screen" | "overlay", id, state?, title, device?, x?, y?, loc }] (a parsed page's tree). */
export function boardFrames(tree) {
  const literal = (node, name) => (node.props[name]?.kind === "literal" ? node.props[name].value : undefined);
  return (tree?.board?.children ?? []).filter((child) => child.kind === "element" && child.name !== "Section" && child.name !== "Slice").map((node) => {
    const id = String(literal(node, "id") ?? "");
    const x = literal(node, "x");
    const y = literal(node, "y");
    const place = typeof x === "number" && typeof y === "number" ? { x, y } : {};
    if (node.name === "Overlay") return { kind: "overlay", id, title: id, ...place, loc: node.loc };
    const state = literal(node, "state");
    return { kind: "screen", id, ...(typeof state === "string" ? { state } : {}), title: String(literal(node, "title") ?? id), device: literal(node, "device") ?? "desktop", ...place, loc: node.loc };
  });
}

/**
 * The Board's Sections (Figma's sections): [{ id, title, x, y, width, height, loc }]. A Section is a Board child beside
 * the frames, not around them: the frames whose middle lies inside its box are its frames (board/sections.ts), so a
 * frame dragged in or out needs no other write, and the page's frames stay the Board's children.
 */
export function boardSections(tree) {
  const literal = (node, name) => (node.props[name]?.kind === "literal" ? node.props[name].value : undefined);
  return (tree?.board?.children ?? []).filter((child) => child.kind === "element" && child.name === "Section").map((node) => {
    const id = String(literal(node, "id") ?? "");
    return { id, title: String(literal(node, "title") ?? id), x: Number(literal(node, "x") ?? 0), y: Number(literal(node, "y") ?? 0), width: Number(literal(node, "width") ?? SECTION_SIZE.min), height: Number(literal(node, "height") ?? SECTION_SIZE.min), loc: node.loc };
  });
}

/** A Slice's size (Figma's slice: an area of the board exported as a picture; it draws nothing on the page). */
export const SLICE_SIZE = { min: 1, max: 40000 };

/** The code of a new Slice (inserted with insertChild at the Board's end: its outline draws above the frames). */
export function sliceCode({ id, title, x, y, width, height }) {
  const name = String(title ?? id).replace(/[{}<>]/g, "");
  return `<Slice id=${quote(id)} title=${quote(name)}${placeAttrs({ x, y, width, height })} />`;
}

/** The code of a new Section (inserted with insertChild on the Board, before the frames: it draws behind them). */
export function sectionCode({ id, title, x, y, width, height }) {
  const name = String(title ?? id).replace(/[{}<>]/g, "");
  return `<Section id=${quote(id)} title=${quote(name)}${placeAttrs({ x, y, width, height })} />`;
}

/** `<base>-<n>`: the first id not in `taken` (a Set or an array). */
export function freeFrameId(base, taken) {
  const used = new Set(taken);
  for (let n = 1; ; n += 1) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** ` layout="…"` for a tablet laid out as `layout` (a phone is always mobile, a desktop always desktop). */
const layoutAttr = (device, layout) => (device === "tablet" && SCREEN_LAYOUTS.includes(layout) ? ` layout="${layout}"` : "");

/** ` x={…} y={…}` (and ` width={…} height={…}`) for a new frame's opening tag: whole px, only what was given. */
const placeAttrs = (values) => Object.entries(values).filter(([, value]) => Number.isFinite(value)).map(([name, value]) => ` ${name}={${Math.round(value)}}`).join("");

/**
 * The code of a new Board child: a Screen (title heading in a padded Stack, on `device`) or an Overlay holding a Dialog
 * whose actions close it. Inserted with insertChild on the Board; slots.mjs adds the runtime and component imports.
 * `x` / `y` place it on the board (without them it joins the row of unplaced frames); a drawn Screen also has its
 * `width` / `height` (the device's width and height when left out).
 */
/** What a new Overlay holds (the Prototype tab's Add overlay): a Dialog, a Bottom Sheet or a Side Panel (they place
 *  themselves), or a Card the Overlay places (its position, 2026-10-15). */
export const OVERLAY_HOLDS = ["dialog", "sheet", "panel", "card"];
const OVERLAY_TITLES = { dialog: "Are you sure?", sheet: "Choose an option", panel: "Details", card: "Tip" };
const overlayContent = (holds, name) => {
  const body = '<Text tone="base">Say what happens next.</Text>';
  if (holds === "sheet") return [`  <BottomSheet title=${quote(name)} primaryAction={{ label: "Done", onClick: proto.close() }}>`, `    ${body}`, "  </BottomSheet>"];
  if (holds === "panel") return [`  <SidePanel type="modal" title=${quote(name)} primaryAction={{ label: "Save", onClick: proto.close() }} secondaryAction={{ label: "Cancel", onClick: proto.close() }}>`, `    ${body}`, "  </SidePanel>"];
  if (holds === "card") return ["  <Card>", '    <Stack gap="xs">', `      <Text textStyle="Body/Base/Bold">${name}</Text>`, `      ${body}`, "    </Stack>", "  </Card>"];
  return [`  <Dialog title=${quote(name)} description="Say what happens next." primaryAction={{ label: "Continue", onClick: proto.close() }} secondaryAction={{ label: "Cancel", onClick: proto.close() }} />`];
};

export function frameCode({ kind, id, title, device = "desktop", layout, chrome = true, empty = false, x, y, width, height, holds = "dialog" }) {
  const name = String(title ?? (kind === "overlay" ? OVERLAY_TITLES[holds] ?? OVERLAY_TITLES.dialog : id)).replace(/[{}<>]/g, "");
  const place = placeAttrs({ x, y });
  if (kind === "overlay") return [`<Overlay id=${quote(id)}${place}>`, ...overlayContent(OVERLAY_HOLDS.includes(holds) ? holds : "dialog", name), "</Overlay>"].join("\n");
  const screenDevice = PAGE_DEVICES.includes(device) ? device : "desktop";
  // A new Screen comes with the app frame as a new page does (its title in the header).
  const open = `<Screen id=${quote(id)} title=${quote(name)} device="${screenDevice}"${layoutAttr(screenDevice, layout)}${place}${placeAttrs({ width, height })}`;
  return screenLines({ open, title: name, heading: name, device: screenDevice, layout, chrome: chrome && !empty, empty, indent: "" }).lines.join("\n");
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
 * name imported from @zen-ds/react is.
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
        if (from === BUILDER_PACKAGE && !BUILDER_NAMES.has(name)) fail(specifier, `${BUILDER_PACKAGE} exports Board, Screen, Overlay, Section, Component, ComponentSet, Use and proto, not ${name}`);
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
            : attr.value.type === "JSXElement" ? wrapElement(attr.value, items)
              : attr.value.type === "JSXFragment" ? fragmentValue(attr.value, items) : fail(attr, `${prop}: this kind of value is not editable`);
      if (value) props[prop] = value;
    }
    return { kind: "element", name, loc: locOf(node), props, children: childrenOf(node, items) };
  };
  /** The children of an element or of a prop's fragment → Child[]. */
  const childrenOf = (node, items) => {
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
    return children;
  };
  const wrapElement = (node, items) => { const next = element(node, items); return next ? { kind: "element", node: next } : null; };
  /**
   * A slot prop holding several layers (user, 2026-10-16: "a prop holds several layers for real", as Figma's slot): the
   * layers sit straight in the slot, the component lays them out. Only components, text, mock fields and lists.
   */
  const fragmentValue = (node, items) => ({ kind: "fragment", children: childrenOf(node, items) });

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
    if (value.type === "JSXFragment") return fragmentValue(value, items);
    if (value.type === "CallExpression" && value.callee.type === "MemberExpression" && value.callee.object.type === "Identifier" && value.callee.object.name === "proto") {
      const action = value.callee.property.name;
      if (!PROTO_ACTIONS.has(action)) return fail(value, `proto.${action} is not an interaction (navigate, open, close, back, toast, link, filter, step)`);
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
      if (child.kind !== "element" || !["Screen", "Overlay", "Section", "Slice"].includes(child.name)) { errors.push({ line: 1, column: 0, message: "A Board holds <Screen>, <Overlay>, <Section> and <Slice> only" }); continue; }
      const id = child.props.id;
      if (id?.kind !== "literal" || typeof id.value !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(id.value)) errors.push({ line: Number(child.loc.split(":")[0]), column: Number(child.loc.split(":")[1]), message: `<${child.name}> needs an id of lowercase letters, digits and dashes` });
      // Free frames: a place on the board (both or neither), and a Screen's drawn size.
      const number = (name, min, max) => {
        const value = child.props[name];
        if (value && !(value.kind === "literal" && typeof value.value === "number" && Number.isFinite(value.value) && value.value >= min && value.value <= max)) errors.push({ line: Number(child.loc.split(":")[0]), column: 0, message: `${name} is a number from ${min} to ${max}` });
      };
      number("x", -FRAME_PLACE, FRAME_PLACE);
      number("y", -FRAME_PLACE, FRAME_PLACE);
      if (Boolean(child.props.x) !== Boolean(child.props.y)) errors.push({ line: Number(child.loc.split(":")[0]), column: 0, message: `<${child.name}> takes x and y together` });
      if (child.name === "Section" || child.name === "Slice") {
        // A named board area: its place and size, a title, no layers (a Section's frames sit on the Board; a Slice
        // only marks what to export).
        const line = Number(child.loc.split(":")[0]);
        const size = child.name === "Slice" ? SLICE_SIZE : SECTION_SIZE;
        for (const name of ["x", "y", "width", "height"]) if (!child.props[name]) errors.push({ line, column: 0, message: `<${child.name}> needs ${name}` });
        number("width", size.min, size.max);
        number("height", size.min, size.max);
        const title = child.props.title;
        if (title && !(title.kind === "literal" && typeof title.value === "string")) errors.push({ line, column: 0, message: `A ${child.name}'s title is text` });
        if (child.children.some((item) => item.kind !== "text" || item.value.trim())) errors.push({ line, column: 0, message: child.name === "Slice" ? "A Slice holds no layers: it marks an area of the board to export" : "A Section holds no layers: the frames inside it sit on the Board" });
        continue;
      }
      if (child.name === "Overlay" && (child.props.width || child.props.height)) errors.push({ line: Number(child.loc.split(":")[0]), column: 0, message: "An Overlay takes its dialog's size (no width or height)" });
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
        if (state && !(state.kind === "literal" && typeof state.value === "string" && SCREEN_STATE.test(state.value))) errors.push({ line: Number(child.loc.split(":")[0]), column: 0, message: `state is a lowercase name (${SCREEN_STATES.join(", ")}, filtered…; no state = the default)` });
        number("width", FRAME_SIZE.min, FRAME_SIZE.max);
        number("height", FRAME_SIZE.min, FRAME_SIZE.max);
      }
    }
  }
  if (board && board.name === "Board") checkComponents(board, errors);
  return { header, mock, board: board && board.name === "Board" ? board : null, errors };
}

/* ── page-local components (Figma's main components and instances, 2026-10-17) ─────────────────────────────────── */

/** Every element node of `node`'s subtree (itself first), through children, element props, fragments and .map rows. */
export function eachElement(node, visit, parents = []) {
  if (!node || node.kind !== "element") return;
  visit(node, parents);
  const inner = [...parents, node];
  const value = (entry) => {
    if (!entry) return;
    if (entry.kind === "element") eachElement(entry.node, visit, inner);
    else if (entry.kind === "fragment") entry.children.forEach(child);
    else if (entry.kind === "array") entry.items.forEach(value);
    else if (entry.kind === "object") Object.values(entry.fields).forEach(value);
  };
  const child = (entry) => {
    if (entry.kind === "element") eachElement(entry, visit, inner);
    else if (entry.kind === "map") eachElement(entry.node, visit, inner);
  };
  Object.values(node.props).forEach(value);
  node.children.forEach(child);
}

/** A literal prop's value, or undefined. */
const literalProp = (node, name) => (node.props[name]?.kind === "literal" ? node.props[name].value : undefined);
/** An object prop of literals (`variant={{ Size: "Small" }}`, `props={{ Label: "Cancel" }}`) as a plain object, or null. */
function literalObject(value) {
  if (value?.kind !== "object") return null;
  const out = {};
  for (const [key, field] of Object.entries(value.fields)) {
    if (field.kind !== "literal") return null;
    out[key] = field.value;
  }
  return out;
}

/** Figma's component property types a page's component takes (variant properties come from its variants). */
export const COMPONENT_PROPERTY_TYPES = ["text", "boolean", "swap", "slot"];
/** The layer attributes that bind a layer of a main to a component property: what each sets on an instance. */
export const PROPERTY_BINDINGS = { "data-prop-text": "text", "data-prop-visible": "boolean", "data-prop-swap": "swap", "data-prop-slot": "slot" };

/**
 * A component's or set's properties (`properties={{ Label: { type: "text", default: "Save" } }}`): [{ name, type,
 * default, preferred? }] in written order; malformed entries are left out (checkComponents names them).
 */
export function componentProperties(node) {
  const value = node?.props.properties;
  if (value?.kind !== "object") return [];
  return Object.entries(value.fields).flatMap(([name, field]) => {
    if (field.kind !== "object") return [];
    const type = field.fields.type?.kind === "literal" ? field.fields.type.value : null;
    if (!COMPONENT_PROPERTY_TYPES.includes(type)) return [];
    const preferred = field.fields.preferred?.kind === "array" ? field.fields.preferred.items.flatMap((item) => (item.kind === "literal" ? [item.value] : [])) : undefined;
    return [{ name, type, default: field.fields.default?.kind === "literal" ? field.fields.default.value : undefined, ...(preferred ? { preferred } : {}) }];
  });
}

/**
 * A variant's values when it writes none: Figma's Combine as variants names them "Property 1=Default", then
 * "Property 1=Variant2", "Variant3"… by their place in the set.
 */
export const defaultVariant = (index) => ({ "Property 1": index === 0 ? "Default" : `Variant${index + 1}` });

/** A variant's name as Figma writes it: "Size=Small, State=Default". */
export const variantName = (values) => Object.entries(values ?? {}).map(([key, value]) => `${key}=${value}`).join(", ");

/**
 * The page's main components: [{ id, name, loc, node, root, set, variant, properties, description, link }] in document
 * order. `<Component id name>` holds exactly one layer (`root`), the layer ⌥⌘K made a component, where it was (Figma
 * keeps a main component in place). A variant sits in a `<ComponentSet>` (`set`: its id) with its `variant` values; its
 * properties are the set's.
 */
export function localComponents(tree) {
  const out = [];
  eachElement(tree?.board ?? tree, (node, parents) => {
    if (node.name !== "Component") return;
    const id = literalProp(node, "id") ?? null;
    const parent = parents.at(-1);
    const set = parent?.name === "ComponentSet" ? parent : null;
    const place = set ? set.children.filter((child) => child.kind === "element" && child.name === "Component").indexOf(node) : -1;
    const variant = set ? (node.props.variant ? literalObject(node.props.variant) ?? {} : defaultVariant(place)) : null;
    // A variant's name is its values (Figma names a variant "Size=Small"); a name it still writes is kept for nothing.
    const name = set ? variantName(variant) : literalProp(node, "name") ?? id;
    const root = node.children.find((child) => child.kind === "element") ?? null;
    out.push({ id, name, loc: node.loc, node, root, set: set ? literalProp(set, "id") ?? null : null, variant, properties: componentProperties(set ?? node), description: literalProp(node, "description"), link: literalProp(node, "link") });
  });
  return out;
}

/**
 * The page's component sets (Figma's COMPONENT_SET, Combine as variants): [{ id, name, loc, node, variants, axes,
 * properties, description, link }]. `axes`: each variant property and its values in first-seen order.
 */
export function componentSets(tree) {
  const mains = localComponents(tree);
  const out = [];
  eachElement(tree?.board ?? tree, (node) => {
    if (node.name !== "ComponentSet") return;
    const id = literalProp(node, "id") ?? null;
    const variants = mains.filter((main) => main.set === id && node.children.includes(main.node));
    const axes = [];
    for (const main of variants) {
      for (const [key, value] of Object.entries(main.variant ?? {})) {
        let axis = axes.find((entry) => entry.name === key);
        if (!axis) axes.push((axis = { name: key, values: [] }));
        if (!axis.values.includes(value)) axis.values.push(value);
      }
    }
    out.push({ id, name: literalProp(node, "name") ?? id, loc: node.loc, node, variants, axes, properties: componentProperties(node), description: literalProp(node, "description"), link: literalProp(node, "link") });
  });
  return out;
}

/**
 * What an instance draws (`<Use of variant props>`): the main whose variant matches — the one `of` names, or the set's
 * first variant, with `variant` values over it (a value no variant has keeps the nearest match) — and its property
 * values (each property's default, then `props`). Null when `of` names nothing.
 */
export function resolveInstance(tree, use, model) {
  const mains = model?.mains ?? localComponents(tree);
  const sets = model?.sets ?? componentSets(tree);
  const of = literalProp(use, "of");
  const asked = literalObject(use.props.variant) ?? {};
  const given = literalObject(use.props.props) ?? {};
  const set = sets.find((entry) => entry.id === of) ?? null;
  const named = mains.find((main) => main.id === of) ?? null;
  const pool = set ? set.variants : named?.set ? sets.find((entry) => entry.id === named.set)?.variants ?? [named] : named ? [named] : [];
  if (!pool.length) return null;
  const base = named && !set ? named.variant ?? {} : pool[0].variant ?? {};
  const wanted = { ...base, ...asked };
  const score = (main) => Object.entries(wanted).filter(([key, value]) => main.variant?.[key] === value).length;
  const main = pool.reduce((best, candidate) => (score(candidate) > score(best) ? candidate : best), named && !set ? named : pool[0]);
  const properties = main.properties ?? [];
  const values = Object.fromEntries(properties.map((property) => [property.name, Object.prototype.hasOwnProperty.call(given, property.name) ? given[property.name] : property.default]));
  return { main, set: set ?? (named?.set ? sets.find((entry) => entry.id === named.set) ?? null : null), variant: main.variant ?? {}, values };
}

/** What `<Use>` takes: its component, its variant and property values, its overrides, and the layer data any layer carries (layer-meta.mjs). */
const USE_PROPS = new Set(["of", "page", "variant", "props", "overrides", "slots", "data-name", "data-locked"]);
/** A page id (pages-folder.mjs PAGE_ID): `<Use page>` names another page of the project, whose component it shows. */
const USE_PAGE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const COMPONENT_PROPS = new Set(["id", "name", "variant", "properties", "description", "link"]);
const SET_PROPS = new Set(["id", "name", "properties", "description", "link"]);

/** The ids a page's components and instances must follow; errors go to `errors` (parsePage's). */
function checkComponents(board, errors) {
  const at = (node, message) => errors.push({ line: Number(node.loc.split(":")[0]), column: Number(node.loc.split(":")[1]), message });
  const ids = new Map();
  const claim = (id, node, what) => {
    if (typeof id !== "string" || !COMPONENT_ID.test(id)) { at(node, `<${what}> needs an id of lowercase letters, digits and dashes`); return false; }
    if (ids.has(id)) at(node, `Two components share the id ${id}`);
    ids.set(id, node);
    return true;
  };
  const checkProperties = (node) => {
    const value = node.props.properties;
    if (value === undefined) return;
    if (value.kind !== "object") { at(node, "properties is an object: { Label: { type: \"text\", default: \"Save\" } }"); return; }
    for (const [name, field] of Object.entries(value.fields)) {
      const type = field.kind === "object" && field.fields.type?.kind === "literal" ? field.fields.type.value : null;
      if (!COMPONENT_PROPERTY_TYPES.includes(type)) { at(node, `Property ${name} needs a type: ${COMPONENT_PROPERTY_TYPES.join(", ")}`); continue; }
      const fallback = field.fields.default;
      if (type === "boolean" && fallback && !(fallback.kind === "literal" && typeof fallback.value === "boolean")) at(node, `Property ${name} (boolean) takes a true or false default`);
      if ((type === "text" || type === "swap") && fallback && !(fallback.kind === "literal" && typeof fallback.value === "string")) at(node, `Property ${name} (${type}) takes a text default`);
    }
  };
  const sets = componentSets(board);
  for (const set of sets) {
    claim(set.id, set.node, "ComponentSet");
    if (typeof set.name !== "string" || !String(set.name).trim()) at(set.node, "<ComponentSet> needs a name");
    for (const prop of Object.keys(set.node.props)) if (!SET_PROPS.has(prop)) at(set.node, `<ComponentSet> takes id, name, properties, description and link, not ${prop}`);
    const layers = set.node.children.filter((child) => child.kind !== "text" || child.value.trim());
    if (!layers.length || layers.some((child) => child.kind !== "element" || child.name !== "Component")) at(set.node, "<ComponentSet> holds its variants: <Component> layers only");
    checkProperties(set.node);
    const seen = new Set();
    for (const main of set.variants) {
      const key = variantName(main.variant);
      if (!key) at(main.node, "A variant needs its values: variant={{ Property: \"Value\" }}");
      else if (seen.has(key)) at(main.node, `Two variants are both ${key}`);
      seen.add(key);
      if (main.node.props.properties) at(main.node, "A variant's properties are its set's: write them on <ComponentSet>");
    }
  }
  const mains = localComponents(board);
  for (const main of mains) {
    if (!claim(main.id, main.node, "Component")) continue;
    if (!main.set && (typeof main.name !== "string" || !main.name.trim())) at(main.node, "<Component> needs a name");
    if (!main.set && main.node.props.variant) at(main.node, "variant is for a variant: put the component in a <ComponentSet>");
    if (main.node.props.variant && !literalObject(main.node.props.variant)) at(main.node, "variant takes text values: variant={{ Size: \"Small\" }}");
    const layers = main.node.children.filter((child) => child.kind !== "text" || child.value.trim());
    if (layers.length !== 1 || layers[0].kind !== "element") at(main.node, "<Component> holds exactly one layer (the one it makes a component)");
    for (const prop of Object.keys(main.node.props)) if (!COMPONENT_PROPS.has(prop)) at(main.node, `<Component> takes id, name, variant, properties, description and link, not ${prop}`);
    if (!main.set) checkProperties(main.node);
    // A layer bound to a property names one the component has, of its kind.
    if (main.root) eachElement(main.root, (node) => {
      for (const [attribute, type] of Object.entries(PROPERTY_BINDINGS)) {
        const name = literalProp(node, attribute);
        if (name === undefined) continue;
        const property = main.properties.find((entry) => entry.name === name);
        if (!property) at(node, `${attribute}="${name}" names no property of ${main.name}`);
        else if (property.type !== type) at(node, `${attribute}="${name}": ${name} is a ${property.type} property`);
      }
    });
  }
  const model = { mains, sets };
  eachElement(board, (node, parents) => {
    if (node.name !== "Use") return;
    const of = literalProp(node, "of") ?? null;
    // An instance of another page's component (Libraries' project components, live): this page cannot see that page, so
    // only its shape is checked here; the editor reads the main there.
    const foreign = node.props.page !== undefined;
    if (foreign) {
      const page = literalProp(node, "page");
      if (typeof page !== "string" || !USE_PAGE_ID.test(page)) { at(node, "<Use page=\"…\"> names a page of the project by its id"); return; }
      if (typeof of !== "string" || !COMPONENT_ID.test(of)) { at(node, `<Use of="${of ?? ""}"> names a component of page ${page}`); return; }
    } else if (typeof of !== "string" || !ids.has(of)) { at(node, `<Use of="${of ?? ""}"> names no component of this page`); return; }
    if (node.children.some((child) => child.kind !== "text" || child.value.trim())) at(node, "<Use> holds nothing: it shows its component");
    // An instance inside its own main (or its own set) would draw itself forever.
    if (!foreign && parents.some((parent) => (parent.name === "Component" || parent.name === "ComponentSet") && parent.props.id?.value === of)) at(node, `<Use of="${of}"> sits inside its own component`);
    // An instance may carry its own layer name and lock (tools/studio/layer-meta.mjs), as any layer does.
    for (const prop of Object.keys(node.props)) if (!USE_PROPS.has(prop)) at(node, `<Use> takes of, page, variant, props, overrides and slots only, not ${prop}`);
    if (foreign) {
      if (node.props.variant && !literalObject(node.props.variant)) at(node, "variant takes text values: variant={{ Size: \"Small\" }}");
      if (node.props.props && !literalObject(node.props.props)) at(node, "props takes literal values: props={{ Label: \"Cancel\" }}");
      if (node.props.slots && (node.props.slots.kind !== "object" || Object.values(node.props.slots.fields).some((content) => content.kind !== "element" && content.kind !== "fragment"))) at(node, "slots is an object of layers: slots={{ Content: <Text>Hi</Text> }}");
      const overrides = node.props.overrides;
      if (overrides && (overrides.kind !== "object" || Object.values(overrides.fields).some((layer) => layer.kind !== "object" || Object.values(layer.fields).some((value) => value.kind !== "literal")))) at(node, "overrides is an object of literal values: overrides={{ Text: { children: \"Done\" } }}");
      return;
    }
    const resolved = resolveInstance(board, node, model);
    if (!resolved) return;
    const set = resolved.set;
    const asked = literalObject(node.props.variant);
    if (node.props.variant && !asked) at(node, "variant takes text values: variant={{ Size: \"Small\" }}");
    for (const [key, value] of Object.entries(asked ?? {})) {
      const axis = set?.axes.find((entry) => entry.name === key);
      if (!axis) at(node, `${set ? set.name : resolved.main.name} has no variant property ${key}`);
      else if (!axis.values.includes(value)) at(node, `${key} is ${axis.values.join(", ")}, not ${value}`);
    }
    const given = literalObject(node.props.props);
    if (node.props.props && !given) at(node, "props takes literal values: props={{ Label: \"Cancel\" }}");
    for (const [key, value] of Object.entries(given ?? {})) {
      const property = resolved.main.properties.find((entry) => entry.name === key);
      if (!property) at(node, `${resolved.main.name} has no property ${key}`);
      else if (property.type === "boolean" && typeof value !== "boolean") at(node, `${key} is on or off: true or false`);
      else if ((property.type === "text" || property.type === "swap") && typeof value !== "string") at(node, `${key} takes text`);
    }
    // What it puts in its main's slots (F7b): layers for a slot property the main has.
    const slots = node.props.slots;
    if (slots !== undefined) {
      if (slots.kind !== "object") at(node, "slots is an object: slots={{ Content: <Text>Hi</Text> }}");
      else for (const [name, content] of Object.entries(slots.fields)) {
        const property = resolved.main.properties.find((entry) => entry.name === name);
        if (!property || property.type !== "slot") at(node, `${set?.name ?? resolved.main.name} has no slot ${name}`);
        if (content.kind !== "element" && content.kind !== "fragment") at(node, `slots.${name} takes layers: <Text>…</Text> or <>…</>`);
      }
    }
    // Its overrides (F7b): each names a layer of its main by its path, or a layer inside one (a nested component's own,
    // a nested instance's), with literal values.
    const overrides = node.props.overrides;
    if (overrides !== undefined) {
      if (overrides.kind !== "object") at(node, "overrides is an object: overrides={{ Text: { children: \"Done\" } }}");
      else {
        // A path below a layer is only one of a layer the main does not list itself: a component's own (a Badge's dot) or
        // a nested instance's (its main's layers).
        const layers = [...mainLayerPaths(resolved.main, model)].map(([layer, path]) => ({ path, leaf: opensInside(layer) }));
        const owner = set?.name ?? resolved.main.name;
        for (const [path, layer] of Object.entries(overrides.fields)) {
          if (!layers.some((known) => path === known.path || (known.leaf && path.startsWith(`${known.path}/`)))) at(node, `<Use> overrides no layer ${path} of ${owner}`);
          if (layer.kind !== "object" || Object.values(layer.fields).some((value) => value.kind !== "literal")) at(node, `overrides of ${path} take literal values`);
        }
      }
    }
  });
}

/** Layers whose inside is only what the page writes in them (frames, texts, shapes). */
const PAGE_DRAWN = new Set(["Stack", "Grid", "Box", "Text", "Heading", "Shape", "Component", "ComponentSet"]);
/** Whether an override path may go on below this layer of a main: a nested instance (its main's layers), a Zen
 *  component (its own nest() layers, even when the page puts content in it: Card/Sub-Action), or a layer with none. */
const opensInside = (layer) => layer.name === "Use" || !PAGE_DRAWN.has(layer.name) || !layer.children.some((child) => child.kind === "element");

/** The name a nested instance's layer takes inside an outer instance: its set's name, else its main's. */
function useNameOf(use, model) {
  const of = literalProp(use, "of");
  const set = model.sets.find((entry) => entry.id === of);
  if (set) return set.name;
  const main = model.mains.find((entry) => entry.id === of);
  if (!main) return null;
  return (main.set ? model.sets.find((entry) => entry.id === main.set)?.name : null) ?? main.name;
}

/**
 * The layers of a main by their paths inside an instance of it (F7b; instance-paths.mjs): node → path. `model`:
 * `{ mains, sets }` of the page (localComponents, componentSets).
 */
export function mainLayerPaths(main, model) {
  return instanceLayerPaths(main?.root ?? null, (use) => useNameOf(use, model));
}

/**
 * A layer of a main by its path inside an instance of it, through nested instances of the page's own components
 * ("Chip/Text": the Chip instance in this main, then the Text in the Chip's main). A nested instance is drawn in the
 * variant its own values and the outer instance's overrides pick (`{ Chip: { "variant.Size": "Large" } }`, as the canvas
 * draws it). `table`: the outer instance's overrides, path → plain values. Returns the steps outermost first
 * (`{ main, layer }`, the last one's layer the one the path names; on a Zen component, `inner` is the path on inside
 * its own layers, nest() names: "Badge/Dot" → the Badge, inner "Dot"), or null: no such layer.
 */
export function layerChain(tree, main, path, model, table = {}) {
  const byPath = new Map([...mainLayerPaths(main, model)].map(([layer, at]) => [at, layer]));
  const exact = byPath.get(path);
  if (exact) return [{ main, layer: exact }];
  const parts = path.split("/");
  for (let cut = parts.length - 1; cut >= 1; cut--) {
    const prefix = parts.slice(0, cut).join("/");
    const use = byPath.get(prefix);
    if (!use) continue;
    // A layer with layers of its own the main does not list (a Zen component's nest() layers, Card/Sub-Action): the path
    // goes on inside it.
    if (use.name !== "Use") return opensInside(use) ? [{ main, layer: use, inner: parts.slice(cut).join("/") }] : null;
    const asked = {};
    for (const [key, value] of Object.entries(table[prefix] ?? {})) {
      const nested = NESTED_VALUE_KEY.exec(key);
      if (nested?.[1] === "variant") asked[nested[2]] = { kind: "literal", value };
    }
    const fields = use.props.variant?.kind === "object" ? use.props.variant.fields : {};
    const shown = Object.keys(asked).length ? { ...use, props: { ...use.props, variant: { kind: "object", fields: { ...fields, ...asked } } } } : use;
    const nestedMain = resolveInstance(tree, shown, model)?.main;
    if (!nestedMain) return null;
    const inner = Object.fromEntries(Object.entries(table).flatMap(([key, value]) => (key.startsWith(`${prefix}/`) ? [[key.slice(prefix.length + 1), value]] : [])));
    const rest = layerChain(tree, nestedMain, parts.slice(cut).join("/"), model, inner);
    return rest ? [{ main, layer: use }, ...rest] : null;
  }
  return null;
}

/** The dialect errors of a page text (empty: the text is a valid page). */
export function validateDialect(text, options) {
  return parsePage(text, options).errors;
}
