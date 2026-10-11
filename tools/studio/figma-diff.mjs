// Pulling a Figma frame again (core rebuild M6, docs/research/studio-doc-engine-plan-2026-10-10.md §6: "ID Figma lưu
// trên node; lần sau có khác biệt thì hiện diff để chọn"). A page made by figma-pull.mjs names its frame in its header
// (`figma: { file, node }`) and gives every element a document id from its Figma layer (figmaDocId: "f…"); the Studio
// keeps those ids through every edit (doc.mjs). A new pull of the same frame is then compared three ways:
//   base      the page as the last pull made it (kept beside the page in this browser)
//   current   the page as it is now (the person may have edited it in the Studio)
//   incoming  the page the new pull makes
// What Figma changed is base → incoming; a change whose spot the Studio changed too (current ≠ base there) is a
// conflict, shown unticked. Without a base (another browser), current stands in for it and nothing is a conflict.
// Elements the Studio added (ids not from Figma) are never touched. Isomorphic, no imports.
//
//   figmaSource(header) → { file, node } | null
//   figmaChanges({ base, current, incoming }) → { changes, threeWay }
//   mergeFigma(current, incoming, changes) → { doc, skipped }    the chosen changes applied to a copy of `current`

/** The Figma frame a page was pulled from (its header's `figma`), or null. */
export function figmaSource(header) {
  const figma = header?.figma;
  return figma && typeof figma.node === "string" ? { file: typeof figma.file === "string" ? figma.file : null, node: figma.node } : null;
}

/** Whether two pages come from the same Figma frame. */
export const sameFigmaSource = (a, b) => Boolean(a && b && a.node === b.node && (a.file === b.file || !a.file || !b.file));

/** An element id figma-pull gave (from a Figma layer). */
export const isFigmaId = (id) => typeof id === "string" && /^f[I\d]/.test(id);

const clone = (value) => JSON.parse(JSON.stringify(value));

/** A prop value to compare: an element in it stands for its id (its own layers are compared as elements). */
function canon(value) {
  if (value === undefined) return "undefined";
  return JSON.stringify(value, (key, field) => {
    if (field && typeof field === "object" && field.kind === "element" && field.node) return { kind: "element", id: field.node.id };
    return field;
  });
}

/** An element's text (its text children joined), or null when it has none. */
function textOf(node) {
  const texts = node.children.filter((child) => child.kind === "text");
  return texts.length ? texts.map((child) => child.value).join("") : null;
}

/** Every element of a page by id: the node, its parent's id, and where it sits ("children" or the prop it is the value of). */
function indexDoc(doc) {
  const index = new Map();
  const visit = (node, parent, place) => {
    if (!node || index.has(node.id)) return;
    index.set(node.id, { node, parent, place });
    node.children.forEach((child) => { if (child.kind === "element") visit(child, node.id, "children"); else if (child.kind === "map") visit(child.node, node.id, "map"); });
    const visitValue = (value, prop) => {
      if (!value) return;
      if (value.kind === "element") visit(value.node, node.id, `prop:${prop}`);
      else if (value.kind === "array") value.items.forEach((item) => visitValue(item, prop));
      else if (value.kind === "object") Object.values(value.fields).forEach((field) => visitValue(field, prop));
    };
    for (const [prop, value] of Object.entries(node.props)) visitValue(value, prop);
  };
  if (doc?.board) visit(doc.board, null, "root");
  return index;
}

/** The ids of an element's element children, in order. */
const childIds = (node) => node.children.filter((child) => child.kind === "element").map((child) => child.id);

/** Layout elements: named by how many layers they hold (the first text inside one belongs to one of its layers). */
const LAYOUT = new Set(["Stack", "Grid", "Screen", "Board", "Box"]);

/** "Card “Foundation”", "Grid (5 layers)": an element's name and the first text inside it, for the list of changes. */
export function describeNode(node) {
  if (LAYOUT.has(node.name)) {
    const count = node.children.filter((child) => child.kind === "element").length;
    return `${node.name} (${count} layer${count === 1 ? "" : "s"})`;
  }
  const first = (item) => {
    const own = textOf(item);
    if (own) return own;
    for (const key of ["label", "title", "aria-label"]) {
      const value = item.props[key];
      if (value?.kind === "literal" && typeof value.value === "string" && value.value) return value.value;
    }
    for (const child of item.children) if (child.kind === "element") { const found = first(child); if (found) return found; }
    return null;
  };
  const text = first(node);
  return text ? `${node.name} “${text.length > 32 ? `${text.slice(0, 31)}…` : text}”` : node.name;
}

/** A value as the list of changes shows it. */
export function showValue(value) {
  if (value === undefined) return "default";
  if (value.kind === "literal") return typeof value.value === "string" ? `“${value.value}”` : String(value.value);
  if (value.kind === "element") return `<${value.node.name}>`;
  if (value.kind === "array") return `${value.items.length} item${value.items.length === 1 ? "" : "s"}`;
  if (value.kind === "object") return "{…}";
  return value.kind;
}

/**
 * What Figma changed since the last pull, as changes the person ticks: { changes, threeWay }. Each change has a `key`,
 * a `kind` (prop · text · add · remove · order · move), the element `id`, a `label` and, three ways, `conflict` when the
 * Studio changed the same spot. Changes already in the page (current = incoming there) are left out.
 */
export function figmaChanges({ base, current, incoming }) {
  const threeWay = Boolean(base);
  const was = indexDoc(base ?? current);
  const now = indexDoc(current);
  const next = indexDoc(incoming);
  const changes = [];
  const add = (change) => changes.push({ ...change, key: `${change.kind}:${change.id}${change.name ? `:${change.name}` : ""}` });
  for (const [id, after] of next) {
    if (!isFigmaId(id)) continue;
    const before = was.get(id);
    const here = now.get(id);
    if (!before) {
      // New in Figma: one change for the topmost new layer (its own layers come with it), where its parent still is.
      if (here || (after.parent && !was.has(after.parent))) continue;
      if (after.place !== "children") continue;
      add({ kind: "add", id, parent: after.parent, label: `${describeNode(after.node)} added`, node: after.node });
      continue;
    }
    if (!here) continue;
    // Props.
    const names = new Set([...Object.keys(before.node.props), ...Object.keys(after.node.props)]);
    for (const name of names) {
      const from = before.node.props[name];
      const to = after.node.props[name];
      if (canon(from) === canon(to)) continue;
      const mine = here.node.props[name];
      if (canon(mine) === canon(to)) continue;
      add({ kind: "prop", id, name, before: from, after: to, current: mine, conflict: threeWay && canon(mine) !== canon(from), label: `${describeNode(after.node)} · ${name}: ${showValue(from)} → ${showValue(to)}` });
    }
    // Text.
    const fromText = textOf(before.node);
    const toText = textOf(after.node);
    if (fromText !== toText && textOf(here.node) !== toText) {
      add({ kind: "text", id, before: fromText, after: toText, current: textOf(here.node), conflict: threeWay && textOf(here.node) !== fromText, label: `${after.node.name}: “${fromText ?? ""}” → “${toText ?? ""}”` });
    }
    // Moved to another parent.
    if (after.place === "children" && before.parent !== after.parent && here.parent !== after.parent && now.has(after.parent)) {
      add({ kind: "move", id, parent: after.parent, conflict: threeWay && here.parent !== before.parent, label: `${describeNode(after.node)} moved into ${describeNode(next.get(after.parent).node)}` });
    }
    // The order of its Figma layers.
    const common = (node, other) => childIds(node).filter((child) => isFigmaId(child) && other.has(child) && next.get(child)?.parent === id);
    const fromOrder = common(before.node, next);
    const toOrder = childIds(after.node).filter((child) => isFigmaId(child) && was.has(child) && was.get(child).parent === id);
    const hereOrder = childIds(here.node).filter((child) => toOrder.includes(child));
    if (fromOrder.join() !== toOrder.join() && hereOrder.join() !== toOrder.join()) {
      add({ kind: "order", id, order: toOrder, conflict: threeWay && hereOrder.join() !== fromOrder.filter((child) => hereOrder.includes(child)).join(), label: `${describeNode(after.node)}: its layers in Figma's new order` });
    }
  }
  // Gone from Figma: one change for the topmost layer gone, while the page still has it.
  for (const [id, before] of was) {
    if (!isFigmaId(id) || next.has(id) || !now.has(id)) continue;
    if (before.parent && !next.has(before.parent) && was.has(before.parent) && isFigmaId(before.parent)) continue;
    if (before.place !== "children") continue;
    const here = now.get(id);
    add({ kind: "remove", id, conflict: threeWay && canon(here.node) !== canon(before.node), label: `${describeNode(before.node)} removed` });
  }
  return { changes, threeWay };
}

/** The chosen changes applied to a copy of `current`: { doc, skipped } (a change whose spot is gone is skipped). */
export function mergeFigma(current, incoming, changes) {
  const doc = clone(current);
  const next = indexDoc(incoming);
  const skipped = [];
  const indexOf = () => indexDoc(doc);
  // Where a layer goes under `parent`: after the nearest layer before it in Figma that the page has there.
  const insert = (index, parentId, node) => {
    const parent = index.get(parentId)?.node;
    if (!parent) return false;
    const order = next.get(parentId) ? childIds(next.get(parentId).node) : [];
    const before = order.slice(0, Math.max(0, order.indexOf(node.id))).reverse().find((id) => parent.children.some((child) => child.kind === "element" && child.id === id));
    const at = before ? parent.children.findIndex((child) => child.kind === "element" && child.id === before) + 1 : 0;
    parent.children.splice(at, 0, node);
    return true;
  };
  const detach = (index, id) => {
    const entry = index.get(id);
    if (!entry || entry.place !== "children") return null;
    const parent = index.get(entry.parent).node;
    const at = parent.children.findIndex((child) => child.kind === "element" && child.id === id);
    return at < 0 ? null : parent.children.splice(at, 1)[0];
  };
  // Removals and moves first (they free ids), then the rest.
  const ordered = [...changes].sort((a, b) => Number(!["remove", "move"].includes(a.kind)) - Number(!["remove", "move"].includes(b.kind)));
  for (const change of ordered) {
    const index = indexOf();
    const entry = index.get(change.id);
    let done = true;
    if (change.kind === "prop") {
      if (!entry) done = false;
      else if (change.after === undefined) delete entry.node.props[change.name];
      else entry.node.props[change.name] = clone(change.after);
    } else if (change.kind === "text") {
      if (!entry) done = false;
      else {
        const others = entry.node.children.filter((child) => child.kind !== "text");
        entry.node.children = change.after === null ? others : [{ kind: "text", value: change.after }, ...others];
      }
    } else if (change.kind === "add") {
      done = !entry && insert(index, change.parent, clone(change.node));
    } else if (change.kind === "remove") {
      done = Boolean(detach(index, change.id));
    } else if (change.kind === "move") {
      const node = detach(index, change.id);
      done = Boolean(node) && insert(indexOf(), change.parent, node);
    } else if (change.kind === "order") {
      if (!entry) done = false;
      else {
        // Figma's layers take Figma's order in the places they hold; the Studio's own layers stay where they are.
        const places = entry.node.children.map((child, at) => (child.kind === "element" && change.order.includes(child.id) ? at : -1)).filter((at) => at >= 0);
        const byId = new Map(entry.node.children.filter((child) => child.kind === "element").map((child) => [child.id, child]));
        const sorted = change.order.filter((id) => byId.has(id)).map((id) => byId.get(id));
        places.forEach((at, position) => { entry.node.children[at] = sorted[position]; });
      }
    }
    if (!done) skipped.push(change.key);
  }
  return { doc, skipped };
}
