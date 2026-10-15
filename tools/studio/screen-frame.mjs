// A builder Screen's master layout (user, 2026-10-15: "Khung Screen = Master-Layout đầy đủ"): on the desktop layout the
// app frame is one <AppShell> at the Screen's root (Figma ◇ Master-Layout: Sidebar, the top bar, the page header rows,
// a docked side panel, the floating action, a footer bar). The Screen section switches its parts on and off; a page made
// from a template already has this shape, so a switch edits that AppShell and never adds a second Sidebar beside it. The
// mobile layout keeps the Screen's own topNavigation and bottomNavigation (screen-chrome.mjs); a phone shows the
// AppShell's content without its frame (builder/proto/runtime.tsx Screen).
//
// Pure functions over a page's text (the browser engine and Node):
//   FRAME_PARTS, FRAME_PROPS, screenFrameCode(prop, title)   (from screen-chrome.mjs, which the Studio client reads)
//   rootAppShell(screenElement)               the Screen's one root <AppShell> (Babel JSXElement) or null
//   setScreenFramePart(text, loc, op, opts)   op { prop, on, code }: the part on the root AppShell (made when missing,
//                                             removed with its last part) → new text
//   migrateScreenFrame(text, opts)            the Screen's old `sidebar` / `header` props moved into the root AppShell,
//                                             a second Sidebar or Page header dropped → { text, changed, notes }
import { parse } from "@babel/parser";
import { UNIT, importEdits, indentAt, refuse } from "./source-helpers.mjs";
import { FRAME_PARTS, FRAME_PROPS, LEGACY_FRAME, screenFrameCode } from "./screen-chrome.mjs";

export { FRAME_PARTS, FRAME_PROPS, LEGACY_FRAME, screenFrameCode } from "./screen-chrome.mjs";

/* ── reading ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

const parseText = (text) => parse(text, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: false });
const nameOf = (element) => (element?.openingElement?.name?.type === "JSXIdentifier" ? element.openingElement.name.name : null);
const attrOf = (element, prop) => element.openingElement.attributes.find((attribute) => attribute.type === "JSXAttribute" && attribute.name.name === prop) ?? null;
const meaningful = (child) => !(child.type === "JSXText" && !child.value.trim()) && !(child.type === "JSXExpressionContainer" && child.expression.type === "JSXEmptyExpression");

function* elements(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { for (const item of node) yield* elements(item); return; }
  if (node.type === "JSXElement") yield node;
  for (const [key, value] of Object.entries(node)) if (key !== "loc" && key !== "start" && key !== "end" && value && typeof value === "object") yield* elements(value);
}

const locOf = (element) => `${element.loc.start.line}:${element.loc.start.column}`;

/** The Screen's one root <AppShell> (its only child, blank text aside), or null. */
export function rootAppShell(screen) {
  const kids = screen.children.filter(meaningful);
  return kids.length === 1 && kids[0].type === "JSXElement" && nameOf(kids[0]) === "AppShell" ? kids[0] : null;
}

/** The frame parts a root AppShell draws. */
const partsOf = (shell) => (shell ? shell.openingElement.attributes.filter((attribute) => attribute.type === "JSXAttribute" && FRAME_PROPS.has(attribute.name.name)).map((attribute) => attribute.name.name) : []);

/* ── writing ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

const componentsIn = (code) => [...new Set([...code.matchAll(/<([A-Z]\w*)/g)].map((match) => match[1]))];
/** `code` with every line after the first moved right by `pad`. */
const indented = (code, pad) => code.split("\n").map((line, index) => (index && line ? pad + line : line)).join("\n");
/** An attribute's value code (the element inside `{…}`) with its later lines made relative to the attribute's line. */
function relativeValueCode(text, attribute) {
  const value = attribute.value;
  const code = value.type === "JSXExpressionContainer" ? text.slice(value.expression.start, value.expression.end) : text.slice(value.start, value.end);
  const base = indentAt(text, attribute.start);
  return code.split("\n").map((line, index) => (index && line.startsWith(base) ? line.slice(base.length) : line)).join("\n");
}
/** The removal of one attribute with the blank space before it. */
function attributeRemoval(text, attribute) {
  let start = attribute.start;
  while (start > 0 && /\s/.test(text[start - 1])) start -= 1;
  return { start, end: attribute.end, text: "" };
}
/** New attributes after an opening tag's last attribute (or its name), one per line at `pad`. */
function attributeInsertion(text, element, entries, pad, eol) {
  const opening = element.openingElement;
  const last = opening.attributes.at(-1);
  const at = last ? last.end : opening.name.end;
  return { start: at, end: at, text: entries.map(([prop, code]) => `${eol}${pad}${prop}={${indented(code, pad)}}`).join("") };
}
/** The children of `parent` (blank text aside), as written, every line moved right by `shift` spaces (or left). */
function childrenCode(text, parent, shift) {
  const kids = parent.children.filter(meaningful);
  if (!kids.length) return "";
  const start = kids[0].start;
  const code = text.slice(start, kids.at(-1).end);
  return code.split("\n").map((line, index) => {
    if (!index) return line;
    if (shift > 0) return line ? " ".repeat(shift) + line : line;
    return line.replace(new RegExp(`^ {0,${-shift}}`), "");
  }).join("\n");
}

function applyEdits(text, edits) {
  let next = text;
  for (const edit of [...edits].sort((a, b) => b.start - a.start || b.end - a.end)) next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
  return next;
}

const eolOf = (text) => (text.includes("\r\n") ? "\r\n" : "\n");

/** The import edits for the components a change adds (`needed`) and those it may leave unused (`maybeGone`). */
function importChanges(ast, text, after, file, needed, maybeGone, eol) {
  const declared = new Set();
  for (const statement of ast.program.body) if (statement.type === "ImportDeclaration") for (const specifier of statement.specifiers) declared.add(specifier.local.name);
  const add = needed.filter((name) => !declared.has(name));
  const remove = maybeGone.filter((name) => declared.has(name) && !new RegExp(`<${name}\\b`).test(after));
  return add.length || remove.length ? importEdits(ast, text, eol, file ?? "local:page.zen.tsx", add, remove, { action: "framing" }) : [];
}

/** The AppShell that wraps a Screen's children, with `entries` ([prop, code]) as its frame props. */
function wrapEdit(text, screen, entries, eol) {
  const kids = screen.children.filter(meaningful);
  const pad = indentAt(text, screen.start) + UNIT;
  const inner = pad + UNIT;
  const body = kids.length ? `${eol}${inner}${childrenCode(text, screen, UNIT.length)}` : "";
  const attrs = entries.map(([prop, code]) => `${eol}${inner}${prop}={${indented(code, inner)}}`).join("");
  const shell = `<AppShell${attrs}${eol}${pad}>${body}${eol}${pad}</AppShell>`;
  const open = screen.openingElement;
  const close = screen.closingElement;
  if (!close) {
    // <Screen … />: the self-closing tag opens and closes around the new AppShell.
    const slash = text.lastIndexOf("/", open.end - 1);
    return { start: slash, end: open.end, text: `>${eol}${pad}${shell}${eol}${indentAt(text, screen.start)}</Screen>` };
  }
  return { start: open.end, end: close.start, text: `${eol}${pad}${shell}${eol}${indentAt(text, screen.start)}` };
}

/** The root AppShell replaced by its children, one level out. */
function unwrapEdit(text, shell) {
  return { start: shell.start, end: shell.end, text: childrenCode(text, shell, -UNIT.length) };
}

function screenAt(ast, loc) {
  for (const element of elements(ast.program)) if (nameOf(element) === "Screen" && locOf(element) === loc) return element;
  return null;
}

/**
 * One frame part on or off (op { prop, on, code }). On: the root AppShell takes `prop={code}` (made around the Screen's
 * content when there is none). Off: the prop goes; an AppShell left without any part (and no other prop) is unwrapped.
 * The page's import follows (the new components in, the ones no longer read out).
 */
export function setScreenFramePart(text, loc, op, { file } = {}) {
  if (!FRAME_PARTS.some((part) => part.prop === op?.prop)) refuse(`${op?.prop} is not a frame part (${FRAME_PARTS.map((part) => part.prop).join(", ")})`);
  const ast = parseText(text);
  const screen = screenAt(ast, loc);
  if (!screen) refuse(`No <Screen> starts at ${loc}`);
  const eol = eolOf(text);
  const shell = rootAppShell(screen);
  const code = typeof op.code === "string" && op.code.trim() ? op.code.trim() : screenFrameCode(op.prop, null);
  const edits = [];
  let removedCode = "";
  if (op.on) {
    if (shell && attrOf(shell, op.prop)) return text;
    if (shell) edits.push(attributeInsertion(text, shell, [[op.prop, code]], indentAt(text, shell.start) + UNIT, eol));
    else edits.push(wrapEdit(text, screen, [[op.prop, code]], eol));
  } else {
    const attribute = shell ? attrOf(shell, op.prop) : null;
    if (!attribute) return text;
    removedCode = text.slice(attribute.start, attribute.end);
    // The engine's print carries data-zen-id on every element: it does not keep an AppShell.
    const others = shell.openingElement.attributes.filter((other) => other !== attribute && !(other.type === "JSXAttribute" && other.name.name === "data-zen-id"));
    if (!others.length) edits.push(unwrapEdit(text, shell));
    else edits.push(attributeRemoval(text, attribute));
  }
  const draft = applyEdits(text, edits);
  const needed = op.on ? [...(shell ? [] : ["AppShell"]), ...componentsIn(code)] : [];
  const maybeGone = op.on ? [] : ["AppShell", ...componentsIn(removedCode)];
  return applyEdits(text, [...edits, ...importChanges(ast, text, draft, file, needed, maybeGone, eol)]);
}

/**
 * Pages made before the master layout kept the desktop frame as the Screen's own props (`sidebar`, `header` with a
 * PageHeader) and drew it beside a template's AppShell, so a page from a template could show two Sidebars. Each Screen's
 * `sidebar` and `header` move into its root AppShell (made when missing): the Sidebar unless the AppShell has one, the
 * header as the AppShell's `sections` unless it has them or its content already starts with a PageHeader. Returns
 * { text, changed, notes } (notes: what was dropped as a duplicate).
 */
export function migrateScreenFrame(text, { file } = {}) {
  // A quick look first (a prop's component may hold ">", so the props are not matched inside the Screen's tag here).
  if (!LEGACY_FRAME.test(text)) return { text, changed: false, notes: [] };
  let ast;
  try { ast = parseText(text); } catch { return { text, changed: false, notes: [] }; }
  const eol = eolOf(text);
  const edits = [];
  const notes = [];
  const needed = new Set();
  for (const screen of elements(ast.program)) {
    if (nameOf(screen) !== "Screen") continue;
    const sidebar = attrOf(screen, "sidebar");
    const header = attrOf(screen, "header");
    if (!sidebar && !header) continue;
    const shell = rootAppShell(screen);
    const has = new Set(partsOf(shell));
    const content = shell ? text.slice(shell.openingElement.end, shell.closingElement?.start ?? shell.end) : text.slice(screen.openingElement.end, screen.closingElement?.start ?? screen.end);
    const entries = [];
    if (sidebar) {
      edits.push(attributeRemoval(text, sidebar));
      if (has.has("sidebar")) notes.push("a second Sidebar (the Screen's) was dropped: the page's AppShell has its own");
      else entries.push(["sidebar", relativeValueCode(text, sidebar)]);
    }
    if (header) {
      edits.push(attributeRemoval(text, header));
      if (has.has("sections") || /<PageHeader\b/.test(content)) notes.push("a second Page header (the Screen's) was dropped: the page has its own");
      else entries.push(["sections", relativeValueCode(text, header)]);
    }
    if (!entries.length) continue;
    if (shell) edits.push(attributeInsertion(text, shell, entries, indentAt(text, shell.start) + UNIT, eol));
    else { needed.add("AppShell"); edits.push(wrapEdit(text, screen, entries, eol)); }
  }
  if (!edits.length) return { text, changed: false, notes };
  const draft = applyEdits(text, edits);
  const gone = ["Sidebar", "SidebarMenuItem", "PageHeader"];
  const next = applyEdits(text, [...edits, ...importChanges(ast, text, draft, file, [...needed], gone, eol)]);
  return { text: next, changed: next !== text, notes };
}
