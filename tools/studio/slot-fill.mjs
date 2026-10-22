// Zen Studio · what a page's own instance puts in its main's slot (F7c; docs/research/studio-f7b-instance-overrides-spec-
// 2026-10-19.md §3 "Slots"): `<Use of="panel" slots={{ Content: … }} />`, written by a drop on the canvas (ops moveTo and
// pasteCode with `slot`, arrange.mjs) and emptied by a drag out of it.
//
// - One layer is written `Content: <X />`, several `Content: <>…</>` (as figma-pull writes them). A drop writes the
//   instance's `slots` prop again, its other slots as they were.
// - A slot the instance puts nothing in yet shows its main's own layers (the children of the layer bound with
//   data-prop-slot): the first drop keeps them, as Figma keeps a slot's default content, with the new layer at `index`
//   among them.
// - The last layer taken out of a slot takes its entry away (`slots` too when nothing is left): the slot shows its main's
//   layers again.

import { applyEdits, findElement, jsxName, parseLoc } from "./jsx-source.mjs";
import { indentAt, piece } from "./source-helpers.mjs";

const isNode = (value) => value !== null && typeof value === "object" && typeof value.type === "string";
const SKIP = new Set(["loc", "start", "end", "extra", "range", "leadingComments", "trailingComments", "innerComments", "comments"]);

/** Every JSX element under `root` named one of `names`, in source order. */
function elementsNamed(root, names) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (node.type === "JSXElement" && names.has(jsxName(node.openingElement.name))) out.push(node);
    for (const key in node) {
      if (SKIP.has(key)) continue;
      const value = node[key];
      if (Array.isArray(value)) for (let i = value.length - 1; i >= 0; i -= 1) { if (isNode(value[i])) stack.push(value[i]); }
      else if (isNode(value)) stack.push(value);
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

const attrOf = (element, name) => element.openingElement.attributes.find((attr) => attr.type === "JSXAttribute" && jsxName(attr.name) === name) ?? null;

/** The string an attribute holds (`id="panel"`, `id={"panel"}`), or undefined. */
function stringAttr(element, name) {
  const value = attrOf(element, name)?.value;
  if (value?.type === "StringLiteral") return value.value;
  if (value?.type === "JSXExpressionContainer" && value.expression.type === "StringLiteral") return value.expression.value;
  return undefined;
}

/** A property's key as a name (`Content`, `"Main area"`), or null. */
export const keyOf = (property) => (property?.type !== "ObjectProperty" || property.computed ? null : property.key.type === "Identifier" ? property.key.name : property.key.type === "StringLiteral" ? property.key.value : null);

/** The object literal an attribute holds (`variant={{ Size: "Large" }}`), or null. */
function objectAttr(element, name) {
  const value = attrOf(element, name)?.value;
  return value?.type === "JSXExpressionContainer" && value.expression.type === "ObjectExpression" ? value.expression : null;
}

/** An object literal's string values by key. */
function stringsOf(object) {
  const out = {};
  for (const property of object?.properties ?? []) {
    const key = keyOf(property);
    if (key !== null && property.value.type === "StringLiteral") out[key] = property.value.value;
  }
  return out;
}

/** A slot property's layers: its element, or its fragment's elements and other children (whitespace left out). */
export const layersOf = (value) => (value.type === "JSXFragment" ? value.children.filter((child) => !(child.type === "JSXText" && !child.value.trim()) && !(child.type === "JSXExpressionContainer" && child.expression.type === "JSXEmptyExpression")) : [value]);

/** `<Use>`'s `slots` attribute and its object literal ({ attr, object }; object null when it is not a literal), or null. */
export function slotsOf(use) {
  const attr = attrOf(use, "slots");
  if (!attr) return null;
  return { attr, object: attr.value?.type === "JSXExpressionContainer" && attr.value.expression.type === "ObjectExpression" ? attr.value.expression : null };
}

/**
 * Where the element at the end of `nodePath` sits in an instance's slot content, or null: the `<Use>`, its `slots` object,
 * the slot's property and name, and the slot's layers (the element among them, at `index`).
 */
export function slotItemOf(nodePath) {
  const k = nodePath.length - 1;
  const element = nodePath[k];
  if (element?.type !== "JSXElement") return null;
  // Its property: the value itself, or the fragment the value is.
  let at = k - 1;
  if (nodePath[at]?.type === "JSXFragment") at -= 1;
  const property = nodePath[at];
  if (property?.type !== "ObjectProperty" || (property.value !== element && property.value !== nodePath[at + 1])) return null;
  const [object, container, attr, opening, use] = [nodePath[at - 1], nodePath[at - 2], nodePath[at - 3], nodePath[at - 4], nodePath[at - 5]];
  if (object?.type !== "ObjectExpression" || container?.type !== "JSXExpressionContainer" || attr?.type !== "JSXAttribute" || jsxName(attr.name) !== "slots") return null;
  if (opening?.type !== "JSXOpeningElement" || use?.type !== "JSXElement" || jsxName(use.openingElement.name) !== "Use") return null;
  const name = keyOf(property);
  if (name === null) return null;
  const layers = layersOf(property.value);
  return { use, attr, object, property, name, layers, index: layers.indexOf(element) };
}

/**
 * The main an instance shows and its owner: a set's variant whose `variant` values match the instance's (else the set's
 * first), or the lone main. Null when `of` names no component of the file.
 */
export function shownMain(ast, use) {
  const of = stringAttr(use, "of");
  if (!of) return null;
  const owner = elementsNamed(ast.program, new Set(["Component", "ComponentSet"])).find((node) => stringAttr(node, "id") === of);
  if (!owner) return null;
  if (jsxName(owner.openingElement.name) === "Component") return { owner, main: owner, name: stringAttr(owner, "name") ?? of };
  const variants = owner.children.filter((child) => child.type === "JSXElement" && jsxName(child.openingElement.name) === "Component");
  const wanted = Object.entries(stringsOf(objectAttr(use, "variant")));
  const main = variants.find((variant) => { const values = stringsOf(objectAttr(variant, "variant")); return wanted.every(([key, value]) => values[key] === value); }) ?? variants[0];
  return main ? { owner, main, name: stringAttr(owner, "name") ?? of } : null;
}

/** Whether a main's owner (the set, or the lone main) has a slot property `name`: `properties={{ Content: { type: "slot" } }}`. */
export function declaresSlot(owner, name) {
  const property = objectAttr(owner, "properties")?.properties.find((entry) => keyOf(entry) === name);
  return property?.value.type === "ObjectExpression" && stringsOf(property.value).type === "slot";
}

/** The layer of `main` bound to slot `name` (`data-prop-slot="Content"`), or null. */
export function slotLayerOf(main, name) {
  return elementsNamed(main, ANY).find((node) => node !== main && stringAttr(node, "data-prop-slot") === name) ?? null;
}
const ANY = { has: () => true };

/** A layer's code with the removals that fall inside it applied (the layer a move takes out of it), as a piece. */
function pieceOf(text, node, removals) {
  const inside = removals.filter((edit) => edit.start >= node.start && edit.end <= node.end && !(edit.start === node.start && edit.end === node.end));
  if (!inside.length) return piece(text, node);
  const src = applyEdits(text.slice(node.start, node.end), inside.map((edit) => ({ ...edit, start: edit.start - node.start, end: edit.end - node.start })));
  return { src, base: indentAt(text, node.start), protect: new Set() };
}

/**
 * The edits that put `code` into slot `name` of `use` (moveTo with `slot`, pasteCode with `slot`):
 *
 * - `place`: `index` among the slot's layers (its main's own while the instance puts none there), or `before` / `after`
 *   the layer at a loc; neither: last.
 * - `code`: { part (a piece), name (the first element's), count (elements in it), element (one element: true) }.
 * - `own`: the moved layer when it is among this instance's slot layers ({ name, index }): it leaves its place.
 * - `removals`: the edits that take the moved layer away elsewhere. Those inside this instance's `slots` are applied to
 *   the layers they fall in (`folded`, left out of the edits by the caller); those inside the main's slot layer also to
 *   the copy of its layers.
 *
 * Returns { edit, within, folded }: the one edit that writes `slots` and where the new layer starts in its text.
 */
export function slotWrite(ctx, h, { use, name, place, code, own = null, removals = [] }) {
  const { text, eol, unit } = ctx;
  const shown = shownMain(ctx.ast, use);
  const layer = shown ? slotLayerOf(shown.main, name) : null;
  const slots = slotsOf(use);
  if (slots && !slots.object) h.refuse("<Use>'s slots is not an object literal; edit it in the code.");
  // The slots as written, each with its layers as pieces (a removal inside one applied to it).
  const entries = (slots?.object.properties ?? []).map((property) => {
    const key = keyOf(property);
    if (key === null || (property.value.type !== "JSXElement" && property.value.type !== "JSXFragment")) h.refuse("<Use>'s slots hold layers only (Content: <X /> or <>…</>); edit it in the code.");
    return { key, raw: text.slice(property.key.start, property.key.end), layers: layersOf(property.value).map((node) => ({ node, part: pieceOf(text, node, removals), element: node.type === "JSXElement" })) };
  });
  const folded = removals.filter((edit) => slots && edit.start >= slots.attr.start && edit.end <= slots.attr.end);
  for (const edit of folded) {
    if (!entries.some((entry) => entry.layers.some(({ node }) => edit.start >= node.start && edit.end <= node.end))) h.refuse(`<${code.name}> cannot be dropped there (inside the code it leaves).`);
  }
  let target = entries.find((entry) => entry.key === name);
  let defaults = false;
  if (!target) {
    // Nothing there yet: the main's own layers of the slot, kept (a layer this move takes from them is left out).
    const kept = layer ? layersOf({ type: "JSXFragment", children: layer.children }).filter((node) => !(own === null && removals.some((edit) => edit.start <= node.start && node.end <= edit.end))) : [];
    target = { key: name, raw: /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name), layers: kept.map((node) => ({ node, part: pieceOf(text, node, removals), element: node.type === "JSXElement" })) };
    entries.push(target);
    defaults = true;
  }
  // Where among the slot's layers.
  let at = target.layers.length;
  if (place.before || place.after) {
    if (defaults) h.refuse("The slot holds its main's layers: drop by `index`");
    const loc = place.before ?? place.after;
    const inner = parseLoc(loc) ? findElement(ctx.ast, parseLoc(loc)) : null;
    const k = inner ? target.layers.findIndex(({ node }) => node.start <= inner.start && inner.end <= node.end) : -1;
    if (k < 0) h.refuse(`The slot ${name} has no layer at ${loc}; select the layer again`, "stale");
    at = place.after ? k + 1 : k;
  } else if (place.index !== undefined && place.index !== null) {
    if (!Number.isInteger(place.index) || place.index < 0) h.refuse("`index` must be a whole number from 0");
    at = Math.min(place.index, target.layers.length);
  }
  // The moved layer leaves its place first (in this slot: the places after it move up one).
  if (own) {
    const from = entries.find((entry) => entry.key === own.name);
    if (from === target && (at === own.index || at === own.index + 1)) h.refuse(`<${code.name}> is already there.`);
    from.layers.splice(own.index, 1);
    if (from === target && at > own.index) at -= 1;
  }
  const NEW = Symbol("new");
  target.layers.splice(at, 0, { node: NEW, part: code.part, element: code.element, count: code.count });
  // Written again: the slots left with layers, in their order; the Use's line gives the indentation.
  const base = indentAt(text, use.start);
  const inner = base + unit;
  let within = -1;
  let out = "";
  const write = (chunk, layerNode = null) => {
    if (layerNode === NEW) within = out.length + Math.max(0, chunk.indexOf(`<${code.name}`));
    out += chunk;
  };
  const kept = entries.filter((entry) => entry.layers.length);
  kept.forEach((entry, k) => {
    if (k) write(", ");
    write(`${entry.raw}: `);
    const single = entry.layers.length === 1 && entry.layers[0].element && (entry.layers[0].count ?? 1) === 1;
    if (single) { write(h.reindent(entry.layers[0].part, base, eol, unit), entry.layers[0].node); return; }
    write(`<>${eol}`);
    for (const one of entry.layers) write(`${inner}${h.reindent(one.part, inner, eol, unit)}${eol}`, one.node);
    write(`${base}</>`);
  });
  const value = kept.length ? `slots={{ ${out} }}` : "";
  const shift = 9; // "slots={{ "
  if (slots) return { edit: { start: slots.attr.start, end: slots.attr.end, text: value }, within: within + shift, folded };
  // No slots yet: after the instance's last attribute.
  const last = use.openingElement.attributes.at(-1);
  const end = last ? last.end : use.openingElement.name.end;
  return { edit: { start: end, end, text: ` ${value}` }, within: within + shift + 1, folded };
}

/**
 * The edit that takes the slot layer `item` (slotItemOf) away when it is the slot's only one: the slot's entry, and
 * `slots` with it when that was its only entry (the slot shows its main's layers again). Null when other layers stay
 * (the fragment loses one child, as any child goes).
 */
export function slotRemoval(ctx, item) {
  const { text } = ctx;
  if (item.layers.length > 1) return null;
  const properties = item.object.properties;
  if (properties.length === 1) {
    let start = item.attr.start;
    while (start > 0 && /\s/.test(text[start - 1])) start -= 1;
    return { start, end: item.attr.end, text: "" };
  }
  const k = properties.indexOf(item.property);
  return k < properties.length - 1 ? { start: item.property.start, end: properties[k + 1].start, text: "" } : { start: properties[k - 1].end, end: item.property.end, text: "" };
}
