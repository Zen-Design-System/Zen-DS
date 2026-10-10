// Zen Studio data-slot items: the items of a prop written as an array of objects (TopNavigation
// `trailing={[{ icon, label, onClick }]}`) or the one object of an object prop (`largeTitleAction={{ … }}`). Figma draws
// these as slots (Top-Trailing's Trailing-Slot holds Action instances); the code takes data, so the Studio adds, removes,
// duplicates and reorders the objects instead of JSX. slots.mjs applySlotOp runs these ops with the slot rules (example
// pages and templates only, the file's hash required, docs chrome and playgrounds refused) and hands in its helpers.
// User, 2026-10-04 ("Slot dữ liệu trong Studio").
//
//   op "insertItem" { prop, code, index?, single?, requires? }   on the host: `code` is one object literal (lines after
//        the first indented from column 0). It goes into the array literal at `index` (omitted: last); an absent or
//        nullish prop becomes `prop={[code]}`, or `prop={code}` with `single` (an object prop). With `list` (a prop that
//        takes one object or a list, TopNavigation `largeTitleAction`) one object written there becomes `[object, code]`
//        (`index` 0: `[code, object]`). `requires: ["toast"]`: the enclosing component gets `const { toast } = useToast();`
//        unless a toast binding is in scope.
//   op "removeItem" { prop, index? }      the index-th item goes with its comma; the only item, or an object prop,
//        takes the attribute with it (a required prop keeps `[]`). A useToast() hook left unused goes too. `all`: every
//        item goes, the attribute with them (a Figma boolean switched off with 2+ items, the layer hidden).
//   op "duplicateItem" { prop, index, list? }   a copy right after it; a string `id`, `value` or `key` field gets a fresh
//        value (`"a"` → `"a-2"`), so list keys stay unique. With `list`, one object becomes `[object, copy]`.
//   op "moveItem" { prop, index, to, regroup? }     the item goes to position `to`; the items in between shift by one.
//        `regroup` (items with a `group` field, TopNavigation `trailing`): "drop" = a drag: the item joins the group it
//        lands inside (both neighbours share it), keeps its own while a neighbour shares it, else leaves it; "tidy" = an
//        arrow move: the groups stay as written. Both then tidy: a group left with one item loses its `group` field.
//   op "groupItem" { prop, index, with }   a drop onto another item: the item moves next to `with` (on the side it came
//        from, beside the whole group `with` is in) and both take one `group`: the one `with` has, else a new one named
//        after its label ("Audio call" → "audio-call"). Then tidy (the group the item left).
//   op "ungroupItem" { prop, index }   the item leaves its group, its `group` field removed: in place at either end of the
//        group, else (the middle of three or more) right after the group; tidy.
//   removeItem tidies too: a group left with one item loses its `group` field.
//   The answer's `item` = { prop, index }: where the item is now (removeItem: where it was).
//   op "setItems" { prop, code }   the whole list at once (Sidebar Body-Content: titles and rows reordered, merged or
//        removed as freely as Figma's slot, 2026-10-10): `code` is one array literal (lines after the first indented from
//        column 0), written in place of the prop's value at its indent; null removes the prop (a required one keeps `[]`).
//   `nest` { index, key } on any op: the list is the `key` of the prop's index-th object (Sidebar `sections[n].items`,
//        2026-10-10); `index` / `to` count in that list, and removing its last item leaves `key: []`.
//
// Items are counted as the array literal holds them; a spread or a hole cannot be acted on (its items come from code).
// Example snippets follow on the host's copy (the same edit at the same index), else `snippet: { synced: false }`.

import { parseExpression } from "@babel/parser";
import { jsxName, walk } from "./jsx-source.mjs";

export const ITEM_OPS = new Set(["insertItem", "removeItem", "duplicateItem", "moveItem", "groupItem", "ungroupItem", "setItems"]);

const PLUGINS = ["jsx", "typescript"];
const PROP = /^[A-Za-z_$][\w$]*$/;
/** Fields whose string value names an item among its siblings (React keys, Tabs/Segmented values). */
const UNIQUE_FIELDS = ["id", "value", "key"];

const isIndex = (value) => Number.isInteger(value) && value >= 0;

/**
 * The host's `prop` as items: { attr, array } for an array literal, { attr, object } for an object literal, { attr:
 * null } when absent, { attr, empty } for null / undefined / false / {}; anything else is refused with where it comes from.
 */
function itemsOf(ctx, element, prop, h, nest) {
  const attr = element.openingElement.attributes.findLast((candidate) => h.attrName(candidate) === prop) ?? null;
  if (nest) {
    // A list one level down (Sidebar `sections[n].items`): the n-th object's `key`, which must be written in place.
    if (!attr || attr.value?.type !== "JSXExpressionContainer") h.refuse(`${prop} is not written in place; edit it in the code.`);
    const outer = h.unwrapTs(attr.value.expression);
    if (outer.type !== "ArrayExpression") h.refuse(`${prop} is not a list written in place; edit it in the code.`);
    const holder = outer.elements[nest.index];
    if (!holder || holder.type === "SpreadElement" || h.unwrapTs(holder).type !== "ObjectExpression") h.refuse(`${prop} has no item ${nest.index + 1} written in place (reload the element)`, "stale");
    const property = h.unwrapTs(holder).properties.findLast((candidate) => candidate.type !== "SpreadElement" && !candidate.computed && (candidate.key?.name ?? candidate.key?.value) === nest.key);
    if (!property || property.shorthand) h.refuse(`${prop} item ${nest.index + 1} has no ${nest.key} written in place; edit it in the code.`);
    const value = h.unwrapTs(property.value);
    if (value.type !== "ArrayExpression") h.refuse(`Its items come from ${h.short(ctx.text.slice(value.start, value.end))}; edit it in the code.`);
    return { attr, array: value, nested: true };
  }
  if (!attr) return { attr: null };
  if (!attr.value) h.refuse(`Its items come from \`${prop}\` (true); edit it in the code.`);
  if (attr.value.type !== "JSXExpressionContainer" || attr.value.expression.type === "JSXEmptyExpression") {
    if (attr.value.type === "JSXExpressionContainer") return { attr, empty: true };
    h.refuse(`Its items come from ${h.short(ctx.text.slice(attr.value.start, attr.value.end))}; edit it in the code.`);
  }
  const value = h.unwrapTs(attr.value.expression);
  if (h.isNullish(value)) return { attr, empty: true };
  if (value.type === "ArrayExpression") return { attr, array: value };
  if (value.type === "ObjectExpression") return { attr, object: value };
  h.refuse(`Its items come from ${h.short(ctx.text.slice(value.start, value.end))}; edit it in the code.`);
}

/** The index-th element of the array, refused when it is missing, a spread or a hole. */
function itemAt(items, index, prop, h) {
  if (!isIndex(index)) h.refuse("`index` must be an item position (0 or more)");
  const item = items.array.elements[index];
  if (index >= items.array.elements.length) h.refuse(`${prop} holds ${items.array.elements.length} item${items.array.elements.length === 1 ? "" : "s"}; there is no item ${index + 1} (reload the element)`, "stale");
  if (!item) h.refuse(`Item ${index + 1} of ${prop} is empty (a hole); edit it in the code.`);
  if (item.type === "SpreadElement") h.refuse(`Item ${index + 1} of ${prop} spreads ${h.short(h.text(item))}; edit it in the code.`);
  return item;
}

/**
 * The new item's code, checked: one object literal, no line separators, and no free names but `toast` and JS built-ins
 * (a handler's own parameters and names it declares are fine). `toast` says whether it calls toast.
 */
function prepareItem(raw, h) {
  if (typeof raw !== "string" || !raw.trim()) h.refuse("insertItem needs `code`: one object literal");
  if (/[\u2028\u2029]/.test(raw)) h.refuse("The item holds a line separator (U+2028/U+2029); write it as \\u2028");
  let node;
  try {
    node = parseExpression(raw.trim(), { plugins: PLUGINS });
  } catch (error) {
    h.refuse(`The item is not one expression: ${error.message}`);
  }
  if (h.unwrapTs(node)?.type !== "ObjectExpression") h.refuse("The item must be an object literal ({ … })");
  const declared = new Set();
  const keys = new WeakSet();
  walk(node, (item) => {
    if ((item.type === "ObjectProperty" || item.type === "ObjectMethod") && !item.computed && !item.shorthand) keys.add(item.key);
    if ((item.type === "MemberExpression" || item.type === "OptionalMemberExpression") && !item.computed) keys.add(item.property);
    if (h.FUNCTION_TYPES.has(item.type)) for (const param of item.params) h.patternNames(param, declared);
    if (item.type === "VariableDeclarator") h.patternNames(item.id, declared);
    if (item.type === "JSXElement" || item.type === "JSXFragment") h.refuse("An item holds data, not JSX; use an icon name");
    return true;
  });
  let toast = false;
  walk(node, (item) => {
    if (item.type !== "Identifier" || keys.has(item) || declared.has(item.name) || item.name === "undefined") return true;
    if (item.name === "toast") toast = true;
    else if (!h.JS_GLOBALS.has(item.name)) h.refuse(`The item reads \`${item.name}\`, which is not defined here; only toast and JS built-ins can be used`);
    return true;
  });
  return { code: raw.trim(), toast };
}

/** `code` with its lines after the first moved from column 0 to `indent`. */
const indented = (code, indent, eol) => code.split(/\r\n|\n|\r/).map((line, i) => (i === 0 || !line.trim() ? line : indent + line)).join(eol);

/**
 * The edit that puts `code` into the array literal before element `at` (at === length: last), in the array's own
 * layout: one item per line (`code,` on a new line at the items' indent) or inline (`a, code`).
 */
function insertIntoArray(ctx, array, at, code, h) {
  const { text, eol } = ctx;
  const elements = array.elements.filter(Boolean);
  if (!elements.length) {
    const inner = text.slice(array.start + 1, array.end - 1);
    if (inner.trim()) h.refuse("The list holds only holes; edit it in the code.");
    return { start: array.start, end: array.end, text: `[${code}]` };
  }
  const ownLine = (node) => node.loc.start.line > array.loc.start.line && h.startsLine(text, node.start);
  if (at < array.elements.length) {
    const next = array.elements[at];
    if (!next) h.refuse(`Item ${at + 1} is empty (a hole); edit the list in the code.`);
    const { start } = h.valueRange(text, next);
    if (ownLine(next)) {
      const indent = h.indentAt(text, start);
      return { start, end: start, text: `${indented(code, indent, eol)},${eol}${indent}` };
    }
    return { start, end: start, text: `${code}, ` };
  }
  const last = array.elements.at(-1);
  if (!last) h.refuse("The list ends in a hole; edit it in the code.");
  const end = h.valueRange(text, last).end;
  const comma = /^\s*,/.exec(text.slice(end, array.end - 1));
  if (ownLine(last)) {
    const indent = h.indentAt(text, last.start);
    if (comma) {
      const at2 = end + comma[0].length;
      return { start: at2, end: at2, text: `${eol}${indent}${indented(code, indent, eol)},` };
    }
    return { start: end, end, text: `,${eol}${indent}${indented(code, indent, eol)}` };
  }
  return { start: end, end, text: `, ${code}` };
}

/** A new attribute `prop={value}` after the host's last attribute (on its own line when they are one per line). */
function newAttribute(ctx, element, prop, value, h) {
  const { text, eol } = ctx;
  const opening = element.openingElement;
  const last = opening.attributes.at(-1);
  const indent = last ? h.indentAt(text, last.start) : h.indentAt(text, element.start);
  const ownLine = last && last.loc.start.line > opening.loc.start.line && h.startsLine(text, last.start);
  const at = last ? last.end : (opening.typeArguments ?? opening.typeParameters ?? opening.name).end;
  return { start: at, end: at, text: `${ownLine ? `${eol}${indent}` : " "}${prop}={${indented(value, indent, eol)}}` };
}

/**
 * The edit that removes the attribute: as slots.mjs removes one, except an attribute alone on its line right before the
 * tag's end (`/>`, `>`) goes with the line break before it, so `trailing={…}\n  largeTitleAction={…} />` (what an
 * insert writes) comes back to `trailing={…} />`.
 */
function removeAttribute(ctx, element, attr, h) {
  const { text } = ctx;
  const lineStart = text.lastIndexOf("\n", attr.start - 1) + 1;
  const newline = text.indexOf("\n", attr.end);
  const rest = text.slice(attr.end, newline < 0 ? text.length : newline);
  if (h.startsLine(text, attr.start) && lineStart > 0 && /^[ \t]*\/?>/.test(rest)) {
    const attrs = element.openingElement.attributes;
    const index = attrs.indexOf(attr);
    const opening = element.openingElement;
    const before = index > 0 ? attrs[index - 1].end : (opening.typeArguments ?? opening.typeParameters ?? opening.name).end;
    if (!ctx.lineCommentEnds.has(before)) return { start: before, end: attr.end, text: "" };
  }
  return h.removeAttrEdit(attr, text, ctx.lineCommentEnds);
}

/** A copy of an item's source with fresh `id` / `value` / `key` strings (among the array's other items' values). */
function freshCopy(ctx, array, item, h) {
  const source = h.text(item);
  if (item.type !== "ObjectExpression") return source;
  const taken = new Map(UNIQUE_FIELDS.map((key) => [key, new Set()]));
  for (const element of array.elements) {
    if (element?.type !== "ObjectExpression") continue;
    for (const prop of element.properties) {
      const key = prop.type === "ObjectProperty" && !prop.computed ? prop.key.name ?? prop.key.value : null;
      if (taken.has(key) && prop.value.type === "StringLiteral") taken.get(key).add(prop.value.value);
    }
  }
  const replacements = [];
  for (const prop of item.properties) {
    const key = prop.type === "ObjectProperty" && !prop.computed ? prop.key.name ?? prop.key.value : null;
    if (!taken.has(key) || prop.value.type !== "StringLiteral") continue;
    const base = prop.value.value.replace(/-\d+$/, "");
    let n = 2;
    while (taken.get(key).has(`${base}-${n}`)) n += 1;
    const quote = ctx.text[prop.value.start];
    replacements.push({ start: prop.value.start - item.start, end: prop.value.end - item.start, text: `${quote}${base}-${n}${quote}` });
  }
  let out = source;
  for (const edit of replacements.sort((a, b) => b.start - a.start)) out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  return out;
}

/* ── groups: a `group` field (TopNavigation trailing: actions next to each other with one group share a pill) ────── */

const keyOf = (prop) => (prop.type === "ObjectProperty" && !prop.computed ? prop.key.name ?? prop.key.value : null);

/** The `group` property of an object literal: { prop, value } (value undefined when the code computes it), or null. */
function groupProp(node) {
  if (node?.type !== "ObjectExpression") return null;
  const prop = node.properties.findLast((candidate) => keyOf(candidate) === "group") ?? null;
  if (!prop) return null;
  const value = prop.value.type === "StringLiteral" ? prop.value.value
    : prop.value.type === "TemplateLiteral" && !prop.value.expressions.length ? prop.value.quasis[0].value.cooked : undefined;
  return { prop, value };
}

/** The [first, last] positions of the run of equal group keys around `at` (a key of null is a run of its own). */
function runAround(keys, at) {
  if (keys[at] === null) return [at, at];
  let first = at;
  let last = at;
  while (first > 0 && keys[first - 1] === keys[at]) first -= 1;
  while (last < keys.length - 1 && keys[last + 1] === keys[at]) last += 1;
  return [first, last];
}

/** A group name from the item's label ("Audio call" → "audio-call"), not one the list uses yet. */
function freshGroup(node, taken) {
  const label = node.properties.find((prop) => keyOf(prop) === "label")?.value;
  const base = (label?.type === "StringLiteral" ? label.value : "group").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "group";
  let name = base;
  for (let n = 2; taken.has(name); n += 1) name = `${base}-${n}`;
  return name;
}

/**
 * The item's source with its `group` field set to `value` (a string) or removed (null): the value replaced in place;
 * a new field right after `label` (else the last field), on its own line when the fields are one per line; a removed
 * field takes one comma and, alone on its line, the line.
 */
function groupedText(ctx, node, value, h) {
  if (node.type !== "ObjectExpression") h.refuse("Only an item written as an object ({ … }) joins or leaves a group; edit it in the code.");
  const { text, eol } = ctx;
  const range = h.valueRange(text, node);
  const source = text.slice(range.start, range.end);
  const edit = (start, end, insert) => source.slice(0, start - range.start) + insert + source.slice(end - range.start);
  const found = groupProp(node);
  if (value === null) {
    if (!found) return source;
    const { prop } = found;
    const index = node.properties.indexOf(prop);
    const comma = /^[ \t]*,/.exec(text.slice(prop.end));
    if (comma) {
      let start = prop.start;
      let end = prop.end + comma[0].length;
      const newline = /^[ \t]*(\r\n|\n|\r)/.exec(text.slice(end));
      if (h.startsLine(text, prop.start) && newline) {
        start = text.lastIndexOf("\n", prop.start - 1) + 1;
        end += newline[0].length;
      } else end += /^[ \t]*/.exec(text.slice(end))[0].length;
      return edit(start, end, "");
    }
    // The last field: the comma before it goes with it.
    return edit(index > 0 ? node.properties[index - 1].end : prop.start, prop.end, "");
  }
  const literal = JSON.stringify(value);
  if (found) return found.value === value ? source : edit(found.prop.value.start, found.prop.value.end, literal);
  const anchor = node.properties.find((prop) => keyOf(prop) === "label") ?? node.properties.at(-1);
  if (!anchor) return `{ group: ${literal} }`;
  const own = anchor.loc.start.line > node.loc.start.line && h.startsLine(text, anchor.start);
  return edit(anchor.end, anchor.end, own ? `,${eol}${h.indentAt(text, anchor.start)}group: ${literal}` : `, group: ${literal}`);
}

/**
 * groupItem / ungroupItem / moveItem with `regroup`, and the tidy after a removal: the new order of the array's items
 * and each item's group, written as one edit per place that changes (the item that lands there, its field updated).
 */
function regroupEdits(ctx, items, op, h) {
  const { array } = items;
  const prop = op.prop;
  const elements = array.elements;
  // A group the code computes (`group: kind`) matches nothing and is never rewritten.
  const keys = elements.map((node, i) => {
    const found = groupProp(node);
    return found ? (found.value === undefined ? `\0${i}` : found.value) : null;
  });
  const written = (i) => keys[i] === null || !String(keys[i]).startsWith("\0");
  const computed = (i) => h.refuse(`Item ${i + 1} of ${prop} computes its group (${h.short(h.text(groupProp(elements[i]).prop.value))}); edit it in the code.`);
  const next = keys.slice();
  let order = elements.map((_, i) => i);
  const index = op.index;
  if (op.op !== "removeItem") itemAt(items, index, prop, h);

  if (op.op === "groupItem") {
    const other = op.with;
    itemAt(items, other, prop, h);
    if (other === index) h.refuse("An item cannot be grouped with itself");
    if (!written(index)) computed(index);
    if (!written(other)) computed(other);
    if (keys[index] !== null && keys[index] === keys[other]) return { edits: [], index };
    const [first, last] = runAround(keys, other);
    const id = keys[other] ?? freshGroup(elements[other], new Set(keys.filter((key) => key !== null)));
    order = order.filter((i) => i !== index);
    const members = order.filter((i) => i >= first && i <= last);
    order.splice(index < first ? order.indexOf(members[0]) : order.indexOf(members.at(-1)) + 1, 0, index);
    for (const i of [...members, index]) next[i] = id;
  } else if (op.op === "ungroupItem") {
    if (keys[index] === null) h.refuse(`Item ${index + 1} of ${prop} is in no group`);
    if (!written(index)) computed(index);
    // At either end of its group it stays where it is; from the middle it goes right after the group (which stays whole).
    const [first, last] = runAround(keys, index);
    if (index > first && index < last) {
      order = order.filter((i) => i !== index);
      order.splice(order.indexOf(last) + 1, 0, index);
    }
    next[index] = null;
  } else if (op.op === "moveItem") {
    const to = op.to;
    if (!isIndex(to) || to >= elements.length) h.refuse(`${prop} holds ${elements.length} items; position ${isIndex(to) ? to + 1 : to} is past its end`, "stale");
    order.splice(index, 1);
    order.splice(to, 0, index);
    if (op.regroup === "drop" && written(index)) {
      const left = order[to - 1];
      const right = order[to + 1];
      const before = left === undefined ? null : keys[left];
      const after = right === undefined ? null : keys[right];
      if (before !== null && before === after) next[index] = before;
      else if (keys[index] !== null && (keys[index] === before || keys[index] === after)) next[index] = keys[index];
      else next[index] = null;
    }
  } else order = order.filter((i) => i !== index);

  // Tidy: a written group left with one item is no group.
  const placed = order.map((i) => next[i]);
  order.forEach((i, at) => {
    if (next[i] !== null && written(i)) {
      const [first, last] = runAround(placed, at);
      if (first === last) next[i] = null;
    }
  });

  if (op.op === "removeItem") {
    // The removal is its own edit; the items left keep their places, only their fields change.
    return { edits: order.filter((i) => next[i] !== keys[i]).map((i) => ({ ...h.valueRange(ctx.text, itemAt(items, i, prop, h)), text: groupedText(ctx, elements[i], next[i], h) })), index };
  }
  const edits = [];
  order.forEach((from, at) => {
    const regroup = next[from] !== keys[from];
    if (from === at && !regroup) return;
    const place = itemAt(items, at, prop, h);
    const node = itemAt(items, from, prop, h);
    edits.push({ ...h.valueRange(ctx.text, place), text: regroup ? groupedText(ctx, node, next[from], h) : h.text(node) });
  });
  return { edits, index: order.indexOf(index) };
}

/**
 * The attribute edits of an item op on `element` (the host, in the file or in a snippet's copy of it), and where the
 * item is after it. No hooks or imports: the plan adds those to the file only.
 */
function attributeEdits(ctx, element, op, h) {
  const prop = op.prop;
  if (op.op === "setItems") {
    const attr = element.openingElement.attributes.findLast((candidate) => h.attrName(candidate) === prop) ?? null;
    if (op.code === null) {
      if (!attr) return { edits: [], index: 0 };
      if (ctx.requiredProps.get(jsxName(element.openingElement.name))?.has(prop)) return { edits: [{ ...h.valueRange(ctx.text, attr.value.expression), text: "[]" }], index: 0 };
      return { edits: [removeAttribute(ctx, element, attr, h)], index: 0 };
    }
    if (typeof op.code !== "string") h.refuse("setItems needs `code`: one array literal, or null");
    let parsed;
    try { parsed = parseExpression(op.code, { plugins: PLUGINS }); } catch { h.refuse("setItems `code` does not parse"); }
    if (parsed.type !== "ArrayExpression") h.refuse("setItems `code` is one array literal");
    if (!attr) return { edits: [newAttribute(ctx, element, prop, op.code, h)], index: 0 };
    if (attr.value?.type !== "JSXExpressionContainer" || attr.value.expression.type === "JSXEmptyExpression") h.refuse(`${prop} is not written in place; edit it in the code.`);
    const code = indented(op.code, h.indentAt(ctx.text, attr.start), ctx.eol);
    return { edits: [{ ...h.valueRange(ctx.text, attr.value.expression), text: code }], index: 0 };
  }
  if (op.nest !== undefined && !(op.nest && Number.isInteger(op.nest.index) && op.nest.index >= 0 && typeof op.nest.key === "string" && PROP.test(op.nest.key))) h.refuse("`nest` is { index, key }: the list in that item of the prop");
  const items = itemsOf(ctx, element, prop, h, op.nest);
  const name = `<${jsxName(element.openingElement.name)}>`;
  if (op.op === "insertItem") {
    const { code } = ctx.item;
    if (items.object && op.list) {
      // A prop that takes one object or a list: the object and the new item become a list, in order.
      const own = h.text(items.object);
      const added = indented(code, h.indentAt(ctx.text, items.attr.start), ctx.eol);
      const first = op.index === 0;
      return { edits: [{ ...h.valueRange(ctx.text, items.object), text: first ? `[${added}, ${own}]` : `[${own}, ${added}]` }], index: first ? 0 : 1 };
    }
    if (items.object) h.refuse(`${prop} holds one item already (${name}); remove it first, or edit its fields.`);
    if (op.single) {
      if (items.array) h.refuse(`${prop} is a list (${name}); add to it without \`single\`.`);
      if (!items.attr) return { edits: [newAttribute(ctx, element, prop, code, h)], index: 0 };
      const range = h.valueRange(ctx.text, items.attr.value.expression);
      return { edits: [items.attr.value.expression.type === "JSXEmptyExpression" ? { start: items.attr.value.start + 1, end: items.attr.value.end - 1, text: code } : { ...range, text: indented(code, h.indentAt(ctx.text, items.attr.start), ctx.eol) }], index: 0 };
    }
    if (!items.attr) return { edits: [newAttribute(ctx, element, prop, `[${code}]`, h)], index: 0 };
    if (items.empty) {
      const expression = items.attr.value.expression;
      const edit = expression.type === "JSXEmptyExpression" ? { start: items.attr.value.start + 1, end: items.attr.value.end - 1, text: `[${code}]` } : { ...h.valueRange(ctx.text, expression), text: `[${indented(code, h.indentAt(ctx.text, items.attr.start), ctx.eol)}]` };
      return { edits: [edit], index: 0 };
    }
    const length = items.array.elements.length;
    const at = op.index === undefined || op.index === null ? length : op.index;
    if (!isIndex(at) || at > length) h.refuse(`${prop} holds ${length} item${length === 1 ? "" : "s"}; position ${at} is past its end (reload the element)`, "stale");
    return { edits: [insertIntoArray(ctx, items.array, at, code, h)], index: at };
  }

  if (!items.attr || items.empty) h.refuse(`Nothing to ${op.op === "removeItem" ? "remove" : op.op === "duplicateItem" ? "duplicate" : op.op === "groupItem" ? "group" : op.op === "ungroupItem" ? "ungroup" : "move"}: ${name} has no ${prop}.`);
  if (items.object) {
    if (op.op === "duplicateItem" && op.list) {
      if (op.index !== undefined && op.index !== null && op.index !== 0) h.refuse(`${prop} holds one item; there is no item ${op.index + 1}`, "stale");
      const own = h.text(items.object);
      return { edits: [{ ...h.valueRange(ctx.text, items.object), text: `[${own}, ${own}]` }], index: 1 };
    }
    if (op.op !== "removeItem") h.refuse(`${prop} holds one item (${name}); it has nothing to ${op.op === "moveItem" ? "move past" : op.op === "duplicateItem" ? "sit beside" : "group with"}.`);
    if (op.index !== undefined && op.index !== null && op.index !== 0) h.refuse(`${prop} holds one item; there is no item ${op.index + 1}`, "stale");
    if (ctx.requiredProps.get(jsxName(element.openingElement.name))?.has(prop)) h.refuse(`${name} requires ${prop}; edit its fields instead of removing it.`);
    return { edits: [removeAttribute(ctx, element, items.attr, h)], index: 0 };
  }

  const array = items.array;
  const index = op.index ?? 0;
  const item = itemAt(items, index, prop, h);
  if (op.op === "removeItem") {
    // A nested list keeps its key: its last item leaves `[]` (the group stays, as in Figma's slot).
    if (items.nested && (array.elements.length === 1 || op.all === true)) return { edits: [{ start: array.start, end: array.end, text: "[]" }], index };
    if (array.elements.length === 1 || op.all === true) {
      // The only item: the attribute goes (`[]` says nothing more), unless the component requires it.
      if (ctx.requiredProps.get(jsxName(element.openingElement.name))?.has(prop)) return { edits: [{ start: array.start, end: array.end, text: "[]" }], index };
      return { edits: [removeAttribute(ctx, element, items.attr, h)], index };
    }
    // A group left with one item loses its `group` field (the other items' own edits).
    return { edits: [...h.removeArrayItem(ctx, array, item).edits, ...regroupEdits(ctx, items, op, h).edits], index };
  }
  if (op.op === "groupItem" || op.op === "ungroupItem" || (op.op === "moveItem" && op.regroup !== undefined)) {
    if (op.op === "moveItem" && op.regroup !== "drop" && op.regroup !== "tidy") h.refuse('`regroup` is "drop" (a drag) or "tidy" (an arrow move)');
    if (op.op === "groupItem" && !isIndex(op.with)) h.refuse("groupItem needs `with`: the position of the item it joins");
    return regroupEdits(ctx, items, op, h);
  }
  if (op.op === "duplicateItem") return { edits: [insertIntoArray(ctx, array, index + 1, freshCopy(ctx, array, item, h), h)], index: index + 1 };

  // moveItem: each position from `index` to `to` takes the item that lands there; commas and line breaks stay.
  const to = op.to;
  if (!isIndex(to) || to >= array.elements.length) h.refuse(`${prop} holds ${array.elements.length} items; position ${isIndex(to) ? to + 1 : to} is past its end`, "stale");
  if (to === index) return { edits: [], index };
  const low = Math.min(index, to);
  const high = Math.max(index, to);
  for (let i = low; i <= high; i += 1) itemAt(items, i, prop, h);
  const order = array.elements.slice(low, high + 1);
  const moved = order.splice(index - low, 1)[0];
  order.splice(to - low, 0, moved);
  const edits = order.map((source, k) => {
    const place = array.elements[low + k];
    return { ...h.valueRange(ctx.text, place), text: h.text(source) };
  }).filter((edit, k) => order[k] !== array.elements[low + k]);
  return { edits, index: to };
}

/**
 * The plan of an item op on the host (slots.mjs applySlotOp): the attribute edits, the toast hook and useToast import an
 * inserted handler needs, the answer `item` and the snippet's copy of the same edit.
 */
export function itemPlan(ctx, nodePath, op, h) {
  if (typeof op.prop !== "string" || !PROP.test(op.prop) || op.prop === "children" || op.prop === "key" || /^on[A-Z]/.test(op.prop)) h.refuse(`"${op.prop}" is not a prop that holds items`);
  if (op.op === "insertItem") {
    if (op.requires !== undefined && (!Array.isArray(op.requires) || op.requires.some((item) => item !== "toast"))) h.refuse('`requires` lists what the item needs: "toast"');
    ctx.item = prepareItem(op.code, h);
  }
  const helpers = { ...h, text: (node) => ctx.text.slice(h.valueRange(ctx.text, node).start, h.valueRange(ctx.text, node).end) };
  const { edits, index } = attributeEdits(ctx, ctx.element, op, helpers);
  const all = [...edits];
  if (op.op === "insertItem" && ctx.item.toast) {
    const hooks = h.hookEdits(ctx, nodePath, { toast: true, statements: [] });
    all.push(...hooks.edits);
    if (hooks.useToast) {
      if (!ctx.folders.has("useToast")) h.refuse("useToast is not exported by a src/components folder");
      all.push(...h.importChanges(ctx.ast, ctx.text, ctx.eol, ctx.file, ["useToast"], [], ctx.folders));
    }
  }
  return {
    edits: all,
    focus: null,
    answer: op.op === "removeItem" ? "removed" : "updated",
    item: { prop: op.prop, index },
    snippet: (literal) => h.hostSnippet(ctx, literal, (copy, host) => attributeEdits(copy, host, op, { ...h, text: (node) => copy.text.slice(h.valueRange(copy.text, node).start, h.valueRange(copy.text, node).end) }).edits),
  };
}
