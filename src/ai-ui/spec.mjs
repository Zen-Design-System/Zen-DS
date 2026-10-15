// Zen UI spec — the JSON a model composes and the app renders (docs/ai-ui/README.md). Shared helpers for the
// validator (validate.mjs), the printer (print.mjs), the ops (ops.mjs) and the renderer (render.tsx): what is a node,
// what is a marker, walking a tree, paths. Isomorphic (browser and Node), no imports.
//
//   { "version": 1, "root": <node>, "data"?: {…}, "state"?: {…} }
//   node    { "type": "Button", "id"?: "save", "pending"?: true, "props"?: {…}, "children"?: [ … ] }
//   markers { "$ref": "slots" } · { "$state": "when.time" } · { "$action": "book", "args": {…} }
//           { "$map": "slots", "as": "slot", "node": <node> } · { "$pending": "text" | "heading" | "shape" }

export const SPEC_VERSION = 1;
export const MARKERS = ["$ref", "$state", "$action", "$map", "$pending"];
export const PENDING_KINDS = ["text", "heading", "shape"];

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/** The marker kind of a value ("ref" | "state" | "action" | "map" | "pending"), or null for a plain value or a node. */
export function markerOf(value) {
  if (!isObject(value)) return null;
  for (const marker of MARKERS) if (marker in value) return marker.slice(1);
  return null;
}

/** A component node: an object with a string `type` and no marker key. */
export const isNode = (value) => isObject(value) && typeof value.type === "string" && markerOf(value) === null;

/** `a.b.0` → ["a", "b", "0"]; an empty path is the root. */
export const splitPath = (path) => (typeof path === "string" && path.length ? path.split(".") : []);

/** Reads a dotted path from `base` (arrays by index); undefined when any step is missing. */
export function readPath(base, path) {
  let value = base;
  for (const step of Array.isArray(path) ? path : splitPath(path)) {
    if (value === null || value === undefined) return undefined;
    value = value[step];
  }
  return value;
}

/** A copy of `base` with `value` written at the dotted path (objects and arrays created on the way; "" sets the root). */
export function writePath(base, path, value) {
  const steps = Array.isArray(path) ? path : splitPath(path);
  if (!steps.length) return value;
  const [step, ...rest] = steps;
  const container = Array.isArray(base) ? [...base] : isObject(base) ? { ...base } : /^\d+$/.test(step) ? [] : {};
  container[step] = writePath(container[step], rest, value);
  return container;
}

/**
 * Visits every node of a tree (props' nodes before children, as rendered): visit(node, { path, parent, key, inMap }).
 * `path` is the JSON pointer-like location ("root.children.1.props.trailing"); returning false from `visit` skips the subtree.
 */
export function walkNodes(root, visit, context = { path: "root", parent: null, key: null, inMap: false }) {
  if (!isNode(root)) return;
  if (visit(root, context) === false) return;
  for (const [name, value] of Object.entries(root.props ?? {})) walkValue(value, `${context.path}.props.${name}`, root, visit, context.inMap);
  (root.children ?? []).forEach((child, index) => walkValue(child, `${context.path}.children.${index}`, root, visit, context.inMap));
}

function walkValue(value, path, parent, visit, inMap) {
  if (isNode(value)) return walkNodes(value, visit, { path, parent, key: path.split(".").pop(), inMap });
  if (Array.isArray(value)) return value.forEach((item, index) => walkValue(item, `${path}.${index}`, parent, visit, inMap));
  if (!isObject(value)) return;
  const marker = markerOf(value);
  if (marker === "map") return walkNodes(value.node, visit, { path: `${path}.node`, parent, key: "node", inMap: true });
  if (marker === "action") return walkValue(value.args, `${path}.args`, parent, visit, inMap);
  if (marker !== null) return;
  for (const [name, field] of Object.entries(value)) walkValue(field, `${path}.${name}`, parent, visit, inMap);
}

/** Every node id in a spec (or tree), in render order; nodes without an id are skipped. */
export function nodeIds(specOrNode) {
  const ids = [];
  walkNodes(specOrNode?.root ?? specOrNode, (node) => { if (typeof node.id === "string") ids.push(node.id); });
  return ids;
}

/** The node with `id`, its parent node and where it sits (a children index, or the prop path inside the parent); null when absent. */
export function findNode(specOrNode, id) {
  let found = null;
  walkNodes(specOrNode?.root ?? specOrNode, (node, context) => {
    if (found || node.id !== id) return;
    found = { node, parent: context.parent, path: context.path, inMap: context.inMap };
    return false;
  });
  return found;
}

/**
 * A copy of the spec where every node has an id: `<type in kebab-case>-<n>` for the ones that had none, unique in the
 * tree. Ids make nodes addressable by the conversation (ops.mjs) and keep their state across re-renders.
 */
export function assignIds(spec) {
  const taken = new Set(nodeIds(spec));
  const counters = new Map();
  const nextId = (type) => {
    const base = type.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    let n = counters.get(base) ?? 0;
    let id;
    do { n += 1; id = `${base}-${n}`; } while (taken.has(id));
    counters.set(base, n);
    taken.add(id);
    return id;
  };
  const fill = (value) => {
    if (isNode(value)) {
      const node = { ...value, id: typeof value.id === "string" ? value.id : nextId(value.type) };
      if (node.props) node.props = Object.fromEntries(Object.entries(node.props).map(([k, v]) => [k, fill(v)]));
      if (node.children) node.children = node.children.map(fill);
      return node;
    }
    if (Array.isArray(value)) return value.map(fill);
    if (!isObject(value)) return value;
    const marker = markerOf(value);
    if (marker === "map") return { ...value, node: fill(value.node) };
    if (marker === "action") return value.args ? { ...value, args: fill(value.args) } : value;
    if (marker !== null) return value;
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v)]));
  };
  return spec && isNode(spec.root) ? { ...spec, root: fill(spec.root) } : spec;
}

/** Nodes the person interacts with: an action anywhere in their props, a `$state` binding, or a catalog binding pair that the renderer will bind by id. */
export function isInteractive(node, catalogEntry) {
  let interactive = false;
  const scan = (value) => {
    if (interactive || value === null || typeof value !== "object" || isNode(value)) return;
    const marker = markerOf(value);
    if (marker === "action" || marker === "state") { interactive = true; return; }
    if (marker !== null) return;
    for (const item of Array.isArray(value) ? value : Object.values(value)) scan(item);
  };
  scan(node.props ?? {});
  if (!interactive && catalogEntry?.bindings?.length) interactive = catalogEntry.bindings.some((pair) => (pair.auto && node.props?.[pair.prop] === undefined && node.props?.[pair.handler] === undefined) || markerOf(node.props?.[pair.prop]) === "state");
  return interactive;
}
