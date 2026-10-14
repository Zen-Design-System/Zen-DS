// Edits to a Zen UI spec by node id: what the conversation says next ("make it 4 pm", "add a note field") becomes one
// or more ops on the spec that is already on screen, instead of a new spec (the person's state and the ids stay).
// Pure: `applyOps` returns a new spec and leaves the given one as it was. Isomorphic, no imports beyond spec.mjs.
//
//   applyOps(spec, [{ op: "setProp", id: "book", name: "level", value: "accent" }])
//   ops: setProp · removeProp · setText · setChildren · insertChild · removeNode · replaceNode · moveNode · setData · setState
//   An op that cannot apply throws an OpError { code: "unknown-op" | "invalid-op" | "unknown-id" | "not-a-node" | "cycle" | "map-template" }.
import { isNode, markerOf, writePath } from "./spec.mjs";

export class OpError extends Error {
  constructor(code, message, op) { super(message); this.name = "OpError"; this.code = code; this.op = op; }
}

const OPS = ["setProp", "removeProp", "setText", "setChildren", "insertChild", "removeNode", "replaceNode", "moveNode", "setData", "setState"];
const clone = (value) => (typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

/** Where a node with `id` sits in a (mutable) tree: the node and its container (an array + index, or an object + key). */
function locate(root, id) {
  let found = null;
  const visitNode = (node, container, key) => {
    if (found) return;
    if (node.id === id) { found = { node, container, key }; return; }
    for (const [name, value] of Object.entries(node.props ?? {})) visitValue(value, node.props, name);
    (node.children ?? []).forEach((child, index) => visitValue(child, node.children, index));
  };
  const visitValue = (value, container, key) => {
    if (found || value === null || typeof value !== "object") return;
    if (isNode(value)) return visitNode(value, container, key);
    if (Array.isArray(value)) return value.forEach((item, index) => visitValue(item, value, index));
    const marker = markerOf(value);
    if (marker === "map") return visitValue(value.node, value, "node");
    if (marker === "action") return visitValue(value.args, value, "args");
    if (marker !== null) return;
    for (const [name, field] of Object.entries(value)) visitValue(field, value, name);
  };
  visitNode(root, null, null);
  return found;
}

const contains = (node, id) => Boolean(locate(node, id));
const requireNode = (root, id, op) => { const place = locate(root, id); if (!place) throw new OpError("unknown-id", `No node with id "${id}".`, op); return place; };
const requireString = (value, name, op) => { if (typeof value !== "string" || !value) throw new OpError("invalid-op", `${op.op} needs "${name}" (a string).`, op); return value; };

/**
 * @param {object} spec
 * @param {object[]} ops
 * @returns {object} a new spec with every op applied, in order
 */
export function applyOps(spec, ops) {
  if (!spec || !isNode(spec.root)) throw new OpError("not-a-node", "The spec has no root node.", null);
  const next = clone(spec);
  for (const op of Array.isArray(ops) ? ops : [ops]) applyOne(next, op);
  return next;
}

function applyOne(spec, op) {
  if (!op || typeof op !== "object" || !OPS.includes(op.op)) throw new OpError("unknown-op", `Unknown op ${JSON.stringify(op?.op)}; one of ${OPS.join(", ")}.`, op);
  const root = spec.root;
  switch (op.op) {
    case "setProp": {
      const { node } = requireNode(root, requireString(op.id, "id", op), op);
      requireString(op.name, "name", op);
      if (op.name === "children") { node.children = Array.isArray(op.value) ? clone(op.value) : [clone(op.value)]; return; }
      node.props = { ...(node.props ?? {}), [op.name]: clone(op.value) };
      return;
    }
    case "removeProp": {
      const { node } = requireNode(root, requireString(op.id, "id", op), op);
      if (node.props) delete node.props[requireString(op.name, "name", op)];
      return;
    }
    case "setText": {
      const { node } = requireNode(root, requireString(op.id, "id", op), op);
      if (typeof op.text !== "string" && typeof op.text !== "number") throw new OpError("invalid-op", "setText needs \"text\".", op);
      node.children = [op.text];
      if (node.props) delete node.props.children;
      return;
    }
    case "setChildren": {
      const { node } = requireNode(root, requireString(op.id, "id", op), op);
      if (!Array.isArray(op.children)) throw new OpError("invalid-op", "setChildren needs \"children\" (an array).", op);
      node.children = clone(op.children);
      if (node.props) delete node.props.children;
      return;
    }
    case "insertChild": {
      const { node: parent } = requireNode(root, requireString(op.parent, "parent", op), op);
      if (!isNode(op.node) && typeof op.node !== "string" && markerOf(op.node) === null) throw new OpError("not-a-node", "insertChild needs \"node\": a component node, text or a child marker.", op);
      if (isNode(op.node) && op.node.id && locate(root, op.node.id)) throw new OpError("invalid-op", `Id "${op.node.id}" is already in the spec.`, op);
      parent.children ??= [];
      const index = Number.isInteger(op.index) ? Math.max(0, Math.min(op.index, parent.children.length)) : parent.children.length;
      parent.children.splice(index, 0, clone(op.node));
      return;
    }
    case "removeNode": {
      const id = requireString(op.id, "id", op);
      if (root.id === id) throw new OpError("invalid-op", "The root cannot be removed; replace it.", op);
      const { container, key } = requireNode(root, id, op);
      if (Array.isArray(container)) container.splice(key, 1);
      else if (markerOf(container) === "map") throw new OpError("map-template", `"${id}" is the node a $map repeats; replace it instead.`, op);
      else delete container[key];
      return;
    }
    case "replaceNode": {
      const id = requireString(op.id, "id", op);
      if (!isNode(op.node)) throw new OpError("not-a-node", "replaceNode needs \"node\".", op);
      if (root.id === id) { spec.root = clone(op.node); return; }
      const { container, key } = requireNode(root, id, op);
      container[key] = clone(op.node);
      return;
    }
    case "moveNode": {
      const id = requireString(op.id, "id", op);
      const parentId = requireString(op.parent, "parent", op);
      if (root.id === id) throw new OpError("invalid-op", "The root cannot be moved.", op);
      const place = requireNode(root, id, op);
      if (contains(place.node, parentId)) throw new OpError("cycle", `"${parentId}" is inside "${id}".`, op);
      if (!Array.isArray(place.container)) throw new OpError("invalid-op", `"${id}" is a prop value, not a child; use setProp / removeProp.`, op);
      place.container.splice(place.key, 1);
      const { node: parent } = requireNode(root, parentId, op);
      parent.children ??= [];
      const index = Number.isInteger(op.index) ? Math.max(0, Math.min(op.index, parent.children.length)) : parent.children.length;
      parent.children.splice(index, 0, place.node);
      return;
    }
    case "setData": spec.data = writePath(spec.data ?? {}, requireString(op.path, "path", op), clone(op.value)); return;
    case "setState": spec.state = writePath(spec.state ?? {}, requireString(op.path, "path", op), clone(op.value)); return;
    default: throw new OpError("unknown-op", `Unknown op ${op.op}.`, op);
  }
}
