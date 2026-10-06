import type { SourceAttr, SourceChild, SourceElement } from "../types";
import type { ContentSlot, SlotContentSummary } from "./registry";

/*
 * What a content slot holds in the source, as the inspector lists it (spec "Client", SlotsSection): its layers in
 * source order, a summary for insertTargetFor, and why the Studio cannot add to it when the source computes it.
 *
 * GET /element gains slot data later (spec "Source ops": `elements` per JSX attribute and expression child, `form`,
 * `selfClosing`). Until the server sends them they are read defensively: a prop slot's top-level JSX names are parsed
 * here for display only (no location), and an expression child stays one read-only row.
 * Pure: no React, no DOM, type-only imports, so a Node script can import it.
 */

/** A JSX element inside a slot that the server located (attribute values and expression children, flattened). */
export type SlotElementRef = { name: string; loc: string };

/** How an expression child renders its elements: a `.map`, `cond && <…/>`, `cond ? <…/> : …`, or anything else. */
export type SlotExpressionForm = "map" | "and" | "ternary" | "other";
/** How an attribute value holds its JSX (server describeSlots): one element, a fragment, or an expression form. */
export type SlotAttributeForm = SlotExpressionForm | "element" | "fragment";

/** GET /element with the server's slot additions (all optional: absent on a server that predates them). */
export type SlotSourceElement = SourceElement & {
  /** Written `<X … />`: an insert expands it. */
  selfClosing?: boolean;
  /** False when the element sits outside a function component (a lowercase helper, a `.map` callback root): no toast items. */
  canUseToast?: boolean;
  /**
   * The Modified flags, sent only while the file has a draft (compared with the saved file, indentation and blank lines
   * ignored). `childrenModified`: the children differ; `modifiedProps`: every prop slot that differs, one the draft
   * removed included (attributes holding JSX also carry `modified`); `newSinceSave`: the saved file has no such element.
   */
  childrenModified?: boolean;
  modifiedProps?: string[];
  newSinceSave?: true;
};

export type SlotLayer =
  /**
   * An element. `loc` when the source gives it (a child, or an element the server found in an attribute or expression);
   * null for a name parsed here (the inspector looks it up on the canvas). `via`: the expression it sits in.
   * `removable`: the server's removeElement takes it (a `.map` callback root is removed in its data instead).
   * `sibling`: its place among the JSX siblings the server's moveElement swaps it with (a direct child, or an element of
   * a prop's fragment), with how many there are; absent when it cannot move (one element, a `.map`, a condition).
   */
  | { kind: "element"; name: string; loc: string | null; via?: SlotExpressionForm; removable: boolean; reason?: string; sibling?: { index: number; count: number } }
  /** Text written directly in the slot (the Content section edits it). */
  | { kind: "text"; value: string }
  /** Content the source computes (a `.map`, a call, a variable) and the server did not resolve: read-only, with why. */
  | { kind: "expression"; code: string; form: SlotExpressionForm; reason: string };

export type SlotContent = {
  layers: SlotLayer[];
  /** For insertTargetFor (the only child's props are added by the caller when it reads that child). */
  summary: SlotContentSummary;
  /** The slot holds the docs' empty-slot marker (a playground's `<PlaygroundSlot>`): empty in the main component. */
  placeholder: boolean;
  /** Why nothing can be added here from the Studio ("Its content comes from {fields}"); the server refuses the same. */
  insertBlock?: string;
};

/* Docs scaffolding the canvas never shows as a layer (picker.ts transparentNames), PlaygroundSlot among them. */
const SCAFFOLDING = new Set(["ComponentPreview", "PlaygroundControls", "PlaygroundFilterChip", "PlaygroundToggle", "PlatformCode", "ExampleCard", "ExamplePage"]);
const PLACEHOLDER = "PlaygroundSlot";
/* What the server's insert treats as an empty prop (slots.mjs isNullish): `{true}` is not empty, it is refused. */
const EMPTY_VALUE = /^(null|undefined|false)$/;
/* A comment child (braces around a block comment): not a sibling the server swaps with. */
const COMMENT = /^\{\s*\/\*[\s\S]*\*\/\s*\}$/;

/** One line, at most `max` characters ("rows.map((row) => …"). */
export function shortCode(code: string, max = 32): string {
  const line = code.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

/** The expression form the server would report, guessed from the code (`{items.map(…)}`, `{open && …}`, `{a ? b : c}`). */
export function expressionForm(code: string): SlotExpressionForm {
  const body = code.trim().replace(/^\{|\}$/g, "").trim();
  if (/\.map\s*\(/.test(body)) return "map";
  if (/^[^?]*&&/.test(body)) return "and";
  if (/\?[\s\S]*:/.test(body)) return "ternary";
  return "other";
}

/** Why an expression's content is read-only here, in a few words. */
export function expressionReason(form: SlotExpressionForm, code: string): string {
  const body = shortCode(code.trim().replace(/^\{|\}$/g, ""), 28);
  if (form === "map") return "One per row: add or remove rows in its data";
  if (form === "and" || form === "ternary") return `Shown on a condition (${body})`;
  return `Its content comes from ${body}`;
}

const isRef = (value: unknown): value is SlotElementRef => {
  const ref = value as Partial<SlotElementRef> | null;
  return Boolean(ref) && typeof ref?.name === "string" && typeof ref.loc === "string" && /^\d+:\d+$/.test(ref.loc);
};

/** The server's `elements` of an attribute or expression child, or null while the server does not send them. */
export function locatedElements(entry: SourceAttr | SourceChild): SlotElementRef[] | null {
  const list = (entry as { elements?: unknown }).elements;
  return Array.isArray(list) ? list.filter(isRef) : null;
}

/** The server's `form` of an expression child, else the one read from its code. */
export function formOf(child: Extract<SourceChild, { kind: "expression" }>): SlotExpressionForm {
  const form = (child as { form?: unknown }).form;
  return form === "map" || form === "and" || form === "ternary" || form === "other" ? form : expressionForm(child.raw);
}

/** The server's `form` of an attribute that holds JSX, or null while the server does not send it. */
export function attributeFormOf(attr: SourceAttr): SlotAttributeForm | null {
  const form = (attr as { form?: unknown }).form;
  return form === "element" || form === "fragment" || form === "map" || form === "and" || form === "ternary" || form === "other" ? form : null;
}

/* The docs' empty-slot marker and scaffolding are never layers of a slot (the playground's slot reads as empty). */
const shown = (ref: SlotElementRef) => ref.name !== PLACEHOLDER && !SCAFFOLDING.has(ref.name);
const holdsPlaceholder = (refs: readonly SlotElementRef[] | null) => Boolean(refs?.some((ref) => ref.name === PLACEHOLDER));

/** Index past a quoted string or template literal that starts at `start`. */
function skipString(code: string, start: number): number {
  const quote = code[start];
  for (let index = start + 1; index < code.length; index++) {
    if (code[index] === "\\") { index += 1; continue; }
    if (code[index] === quote) return index + 1;
  }
  return code.length;
}

/** Index past the `{…}` expression that starts at `start` (strings inside it skipped). */
function skipBraces(code: string, start: number): number {
  let depth = 0;
  for (let index = start; index < code.length; index++) {
    const char = code[index];
    if (char === "\"" || char === "'" || char === "`") { index = skipString(code, index) - 1; continue; }
    if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return index + 1;
  }
  return code.length;
}

/** The end of the opening tag at `start` ("<Name …>" or "<Name … />"): index past it, and whether it closes itself. */
function openingTagEnd(code: string, start: number): { end: number; selfClosing: boolean } {
  for (let index = start + 1; index < code.length; index++) {
    const char = code[index];
    if (char === "\"" || char === "'") { index = skipString(code, index) - 1; continue; }
    if (char === "{") { index = skipBraces(code, index) - 1; continue; }
    if (char === ">") return { end: index + 1, selfClosing: code[index - 1] === "/" };
  }
  return { end: code.length, selfClosing: true };
}

/**
 * The names of the top-level JSX elements of an attribute value: `<A …/>` → ["A"], `<><A/><B>…</B></>` → ["A", "B"]
 * (a fragment is flattened, as the server does). Null when the value is not JSX (an identifier, a call, a condition):
 * then the slot's content comes from code. Display only: the server's `elements` give the locations.
 */
export function topLevelJsxNames(value: string): string[] | null {
  let code = value.trim();
  while (code.startsWith("(") && code.endsWith(")")) code = code.slice(1, -1).trim();
  if (!code.startsWith("<")) return null;
  const fragment = /^<(?:React\.)?(?:Fragment)?\s*>/.exec(code);
  if (!fragment) {
    const name = /^<([A-Za-z_$][\w$.-]*)/.exec(code)?.[1];
    return name ? [name] : null;
  }
  const names: string[] = [];
  let depth = 0;
  for (let index = fragment[0].length; index < code.length; index++) {
    const char = code[index];
    if (char === "{") { index = skipBraces(code, index) - 1; continue; }
    if (char !== "<") continue;
    if (code[index + 1] === "/") {
      if (depth === 0) break;
      depth -= 1;
      const close = code.indexOf(">", index);
      index = close < 0 ? code.length : close;
      continue;
    }
    const name = /^<([A-Za-z_$][\w$.-]*)/.exec(code.slice(index))?.[1];
    if (!name) continue;
    if (depth === 0) names.push(name);
    const tag = openingTagEnd(code, index);
    if (!tag.selfClosing) depth += 1;
    index = tag.end - 1;
  }
  return names;
}

/** The elements of an expression (a child, or a prop's value) as layers: a `.map` row is removed in its data (read-only). */
function locatedLayers(located: readonly SlotElementRef[], form: SlotExpressionForm, code: string): SlotLayer[] {
  // A `.map` callback root is removed in its data; `&&` and ternary branches are removed by the server.
  return located.filter(shown).map((ref) => (form === "map"
    ? { kind: "element", name: ref.name, loc: ref.loc, via: form, removable: false, reason: expressionReason(form, code) }
    : { kind: "element", name: ref.name, loc: ref.loc, via: form, removable: true }));
}

/** The layers an expression child shows: its located elements, else one read-only row. */
function expressionLayers(child: Extract<SourceChild, { kind: "expression" }>): SlotLayer[] {
  const form = formOf(child);
  const located = locatedElements(child);
  if (located?.length) return locatedLayers(located, form, child.raw);
  return [{ kind: "expression", code: child.raw.trim().replace(/^\{|\}$/g, "").trim(), form, reason: expressionReason(form, child.raw) }];
}

/** Why nothing can be added to a prop slot whose value the server's insert refuses (slots.mjs insertPlan). */
const comesFrom = (code: string) => `Its content comes from ${shortCode(code, 28)}`;

/**
 * A prop slot's layers from its attribute (absent, `null`, `undefined` or `false`: empty). The server's insert takes an
 * empty prop, one element (it becomes a fragment) or a fragment; anything else (a string, `true`, a condition, a `.map`,
 * a variable or a call) is refused with "Its content comes from …", so no "+" is offered there.
 */
function attributeLayers(attr: SourceAttr | undefined): { layers: SlotLayer[]; insertBlock?: string; placeholder?: boolean } {
  if (!attr) return { layers: [] };
  if (attr.kind === "true") return { layers: [], insertBlock: comesFrom(`${attr.name} (true)`) };
  if (attr.kind === "string") return { layers: attr.value ? [{ kind: "text", value: attr.value }] : [], insertBlock: comesFrom(JSON.stringify(attr.value ?? "")) };
  if (attr.kind !== "expression") return { layers: [] };
  const code = (attr.value ?? "").trim();
  if (!code || EMPTY_VALUE.test(code)) return { layers: [] };
  const located = locatedElements(attr);
  if (located?.length) {
    const placeholder = holdsPlaceholder(located);
    const form = attributeFormOf(attr) ?? (topLevelJsxNames(code) ? "fragment" : expressionForm(code));
    if (form === "element" || form === "fragment") {
      const elements = located.filter(shown);
      return {
        layers: elements.map((ref, index) => ({
          kind: "element", name: ref.name, loc: ref.loc, removable: true,
          // Elements of a fragment swap places (moveElement); a single element has nothing to pass.
          ...(form === "fragment" && elements.length > 1 ? { sibling: { index, count: elements.length } } : {}),
        })),
        placeholder,
      };
    }
    return { layers: locatedLayers(located, form, code), insertBlock: comesFrom(code), placeholder };
  }
  const names = topLevelJsxNames(code);
  if (names) return { layers: names.filter((name) => name !== PLACEHOLDER && !SCAFFOLDING.has(name)).map((name) => ({ kind: "element", name, loc: null, removable: true })), placeholder: names.includes(PLACEHOLDER) };
  const form = expressionForm(code);
  return {
    layers: [{ kind: "expression", code, form, reason: expressionReason(form, code) }],
    // The server refuses an insert into a prop that holds code (spec: "Its content comes from {expr}").
    insertBlock: comesFrom(code),
  };
}

/** The slot's content in the element's source. */
export function slotContentOf(element: SourceElement, slot: ContentSlot): SlotContent {
  let layers: SlotLayer[] = [];
  let placeholder = false;
  let insertBlock: string | undefined;
  if (slot.prop === "children") {
    // The JSX siblings moveElement swaps with: every child but text and comments.
    const siblings = element.children.filter((child) => child.kind === "element" || (child.kind === "expression" && !COMMENT.test(child.raw.trim())));
    for (const child of element.children) {
      if (child.kind === "text") {
        if (child.value.trim()) layers.push({ kind: "text", value: child.value.trim() });
      } else if (child.kind === "element") {
        if (child.name === PLACEHOLDER) placeholder = true;
        else if (!SCAFFOLDING.has(child.name)) {
          const index = siblings.indexOf(child);
          layers.push({ kind: "element", name: child.name || "Fragment", loc: child.loc, removable: true, ...(siblings.length > 1 ? { sibling: { index, count: siblings.length } } : {}) });
        }
      } else {
        if (holdsPlaceholder(locatedElements(child))) placeholder = true;
        layers.push(...expressionLayers(child));
      }
    }
  } else {
    const attr = element.attributes.find((candidate) => candidate.name === slot.prop && candidate.kind !== "spread");
    const read = attributeLayers(attr);
    ({ layers, insertBlock } = read);
    placeholder = Boolean(read.placeholder);
  }
  const first = layers[0];
  const summary: SlotContentSummary = {
    count: layers.length,
    ...(layers.length === 1 && first.kind === "element" ? { only: { name: first.name } } : {}),
  };
  return { layers, summary, placeholder, insertBlock };
}

/**
 * The layer that holds every other one when the slot's content is a single layout frame (Stack, Grid, Box) with a
 * location, written as the slot's own JSX: not one a `.map` or a condition renders (an insert "into" it would land in
 * every row, or only while the condition holds; the content is wrapped instead).
 */
export function onlyFrame(content: SlotContent): { name: string; loc: string } | null {
  const only = content.layers.length === 1 ? content.layers[0] : null;
  return only?.kind === "element" && only.loc && !only.via && /^(Stack|Grid|Box)$/.test(only.name) ? { name: only.name, loc: only.loc } : null;
}

/**
 * Whether the slot differs from the saved file (Figma's "Modified" tag, and what "Reset slot" restores), from GET
 * /element's flags: null when the server sent none (the file has no draft, the saved file does not parse, or a server
 * without them). A prop slot reads `modifiedProps`, the server's list of the props that differ (a prop the draft
 * removed has no attribute left to flag; a value that is a call or a variable, `leading={avatar("md")}`, is listed
 * too: slots.mjs describeSlots), else the attribute's own `modified` (sent only on attributes that hold JSX).
 */
export function slotModifiedOf(element: SourceElement, slot: ContentSlot): boolean | null {
  const flags = element as SlotSourceElement;
  if (slot.prop === "children") return typeof flags.childrenModified === "boolean" ? flags.childrenModified : null;
  if (Array.isArray(flags.modifiedProps)) return flags.modifiedProps.includes(slot.prop);
  const attr = element.attributes.find((candidate) => candidate.name === slot.prop && candidate.kind !== "spread");
  const modified = (attr as { modified?: unknown } | undefined)?.modified;
  if (typeof modified === "boolean") return modified;
  // No list and no flag on this prop: a value without JSX (a call, a variable, a string, or none) is not compared
  // there, so whether it changed is unknown (the server decides).
  return null;
}

/* A comment child as the inspector lists it (an expression row's code without its braces). */
const COMMENT_CODE = /^\/\*[\s\S]*\*\/$/;

/** The layers "Clear contents" removes: every row the slot lists but a comment (comments alone count as empty). */
export function clearedLayers(content: SlotContent): SlotLayer[] {
  return content.layers.filter((layer) => !(layer.kind === "expression" && COMMENT_CODE.test(layer.code.trim())));
}

/** How many layers "Clear contents" removes (clearedLayers). */
export const clearCountOf = (content: SlotContent): number => clearedLayers(content).length;

/** Lines as diff.ts and Babel count them. */
const splitLines = (text: string) => text.split(/\r\n|\n|\r/);

/** The tag name of the JSX element whose opening tag starts at `loc` ("line:column", column 0-based) in `text`. */
export function tagAt(text: string, loc: string): string | null {
  const [line, column] = loc.split(":").map(Number);
  const source = splitLines(text)[line - 1];
  return source === undefined ? null : /^<([A-Za-z_$][\w$.]*)/.exec(source.slice(column))?.[1] ?? null;
}

/** diff.ts mapLine: where line `line` of `before` sits in `after` (null: removed or changed). */
export type LineMapper = (before: string, after: string, line: number) => number | null;

/**
 * Where a slot's host starts ("line:column") after a write that emptied or reset that slot, from the write's texts; null
 * when that cannot be told. Its own line changes when the tag closes itself or opens again (`<Card …>` ↔ `<Card … />`),
 * and component imports above it go or come back, so the host is found as far below the nearest line above it that the
 * write left as it was, and checked by its tag name there. `mapLine` is diff.ts's (passed in: this module imports types
 * only).
 */
export function hostLocAfter(before: string, after: string, loc: string, name: string, mapLine: LineMapper): string | null {
  const [line, column] = loc.split(":").map(Number);
  if (!Number.isInteger(line) || !Number.isInteger(column)) return null;
  const at = (candidate: number | null) => (candidate !== null && tagAt(after, `${candidate}:${column}`) === name ? `${candidate}:${column}` : null);
  const own = at(mapLine(before, after, line));
  if (own) return own;
  for (let above = line - 1; above >= 1; above--) {
    const mapped = mapLine(before, after, above);
    if (mapped !== null) return at(mapped + (line - above));
  }
  return null;
}

/** The name of the last element layer (what an insert at the end lands after), for the palette's Divider rule. */
export function lastElementName(content: SlotContent): string | undefined {
  for (let index = content.layers.length - 1; index >= 0; index--) {
    const layer = content.layers[index];
    if (layer.kind === "element") return layer.name;
  }
  return undefined;
}
