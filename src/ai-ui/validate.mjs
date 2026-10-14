// Validates a Zen UI spec against the catalog (docs/ai-ui/catalog.json): only catalogued components and props, values of
// the prop's type, markers where they belong, ids where the person interacts. Every problem carries the JSON path, a
// code and, where it helps, a hint the composing model can act on. Isomorphic, no imports beyond spec.mjs.
//
//   const { ok, errors, warnings } = validateSpec(spec, catalog, { chrome: false });
//   problem = { severity: "error" | "warn", code, path, message, hint?, id? }
import { PENDING_KINDS, isInteractive, isNode, markerOf, splitPath } from "./spec.mjs";

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const show = (value) => { const text = JSON.stringify(value); return text === undefined ? String(value) : text.length > 60 ? `${text.slice(0, 57)}…` : text; };

/** Levenshtein distance, capped (both strings lower-cased). */
function distance(a, b, cap = 4) {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return rows[a.length][b.length];
}
const fold = (text) => String(text).toLowerCase().replace(/[^a-z0-9]/g, "");

/** The candidate a misspelt `name` most likely meant (same letters ignoring case and punctuation, else a close edit), or null. */
export function nearest(name, candidates) {
  const key = fold(name);
  if (!key) return null;
  const exact = candidates.find((candidate) => fold(candidate) === key);
  if (exact) return exact;
  let best = null, bestDistance = Math.max(2, Math.floor(key.length / 3)) + 1;
  for (const candidate of candidates) {
    const d = distance(key, fold(candidate), bestDistance);
    if (d < bestDistance) { best = candidate; bestDistance = d; }
  }
  return best;
}

const DEFAULTS = { chrome: false, experimental: false, requireIds: "interactive", maxNodes: 400, maxDepth: 24, strictData: false };

/**
 * @param {object} spec      the spec document
 * @param {object} catalog   docs/ai-ui/catalog.json
 * @param {{ chrome?: boolean, experimental?: boolean, requireIds?: "interactive" | "all" | "none", maxNodes?: number, maxDepth?: number, strictData?: boolean }} [options]
 *   chrome: allow page chrome (AppShell, Sidebar…) · experimental: allow components marked so · requireIds: which nodes
 *   must carry an id (a warning) · strictData: a `$ref` must start with a key of `spec.data`, `state` or a map alias.
 */
export function validateSpec(spec, catalog, options = {}) {
  const opt = { ...DEFAULTS, ...options };
  const problems = [];
  const ids = new Map();
  let count = 0;
  const error = (code, path, message, extra) => problems.push({ severity: "error", code, path, message, ...extra });
  const warn = (code, path, message, extra) => problems.push({ severity: "warn", code, path, message, ...extra });
  const components = catalog?.components ?? {};
  const names = Object.keys(components);
  const defs = catalog?.$defs ?? {};

  if (!isObject(spec)) error("spec", "", "The spec must be a JSON object { version: 1, root: <node> }.");
  else {
    if (spec.version !== 1) error("version", "version", `Unsupported spec version ${show(spec.version)}; this runtime reads version 1.`, { hint: 'Set "version": 1.' });
    if ("data" in spec && !isObject(spec.data)) error("type", "data", "`data` must be an object keyed by data name.");
    if ("state" in spec && !isObject(spec.state)) error("type", "state", "`state` must be an object.");
    if (!isNode(spec.root)) error("root", "root", "`root` must be a component node { type, props?, children? }.");
    else checkNode(spec.root, "root", 0, { aliases: new Set(), dataKeys: new Set(Object.keys(spec.data ?? {})) }, null);
  }

  const errors = problems.filter((p) => p.severity === "error");
  const warnings = problems.filter((p) => p.severity === "warn");
  return { ok: errors.length === 0, errors, warnings, problems };

  function resolve(schema) {
    let current = schema;
    for (let hops = 0; current && current.$ref && hops < 8; hops++) current = defs[current.$ref.split("/").pop()];
    return current ?? {};
  }

  function checkNode(node, path, depth, scope, parentEntry) {
    count += 1;
    if (count > opt.maxNodes) { if (count === opt.maxNodes + 1) error("too-large", path, `More than ${opt.maxNodes} nodes; split the UI or drop decoration.`); return; }
    if (depth > opt.maxDepth) { error("too-large", path, `Deeper than ${opt.maxDepth} levels.`); return; }
    const type = node.type;
    const entry = components[type];
    if (!entry) {
      const hint = nearest(type, names);
      error("unknown-component", `${path}.type`, `"${type}" is not in the catalog.`, hint ? { hint: `Did you mean "${hint}"?` } : {});
      return;
    }
    if (entry.chrome && !opt.chrome) error("chrome-component", `${path}.type`, `${type} is page chrome; a generated UI inside a conversation does not frame a page.`, { hint: "Compose the content itself (Stack, Card, fields, Buttons)." });
    if (entry.status === "experimental" && !opt.experimental) error("experimental-component", `${path}.type`, `${type} is experimental and not in the runtime catalog.`);
    if ("id" in node) {
      if (typeof node.id !== "string" || !node.id) error("type", `${path}.id`, "`id` must be a non-empty string.");
      else if (ids.has(node.id)) error("duplicate-id", `${path}.id`, `Id "${node.id}" is already used at ${ids.get(node.id)}.`, { id: node.id });
      else ids.set(node.id, path);
    } else if (opt.requireIds === "all" || (opt.requireIds === "interactive" && isInteractive(node, entry))) {
      warn("missing-id", path, `${type} has no id; the conversation cannot address it (updates, state, actions).`, { hint: `Add "id": "<unique-name>".` });
    }
    if ("pending" in node && typeof node.pending !== "boolean") error("type", `${path}.pending`, "`pending` is true or false.");
    for (const key of Object.keys(node)) if (!["type", "id", "pending", "props", "children"].includes(key)) error("unknown-key", `${path}.${key}`, `A node has type, id, pending, props and children; "${key}" is not one of them.`, { hint: `Move "${key}" into props.` });

    const props = node.props ?? {};
    if ("props" in node && !isObject(node.props)) error("type", `${path}.props`, "`props` must be an object.");
    else {
      for (const [name, value] of Object.entries(props)) {
        const schema = entry.props[name];
        if (!schema) {
          const excluded = entry.excluded.find((item) => item.startsWith(`${name} (`)) ?? ((catalog.excludedPropNames ?? []).includes(name) ? `${name} (not for a generated UI)` : null);
          if (excluded) error("excluded-prop", `${path}.props.${name}`, `${type}.${name} is not available to a generated UI: ${excluded.slice(name.length + 2, -1)}.`, { hint: /deprecated: Use (\w+)/.exec(excluded) ? `Use "${/deprecated: Use (\w+)/.exec(excluded)[1]}".` : "Pick the look through the component's own props; the tokens do the rest." });
          else { const hint = nearest(name, Object.keys(entry.props)); error("unknown-prop", `${path}.props.${name}`, `${type} has no prop "${name}".`, hint ? { hint: `Did you mean "${hint}"?` } : { hint: `Props: ${Object.keys(entry.props).join(", ")}.` }); }
          continue;
        }
        if (name === "children" && Array.isArray(node.children) && node.children.length) error("children-twice", `${path}.props.children`, "Children are given twice (props.children and children).", { hint: "Keep the `children` array." });
        checkValue(value, schema, `${path}.props.${name}`, depth, scope, { prop: name, type });
      }
    }
    if (!node.pending) {
      for (const [name, schema] of Object.entries(entry.props)) {
        if (!schema["x-required"] || schema["x-kind"] === "action" || name in props) continue;
        if (name === "children" && Array.isArray(node.children) && node.children.length) continue;
        error("required-prop", `${path}.props.${name}`, `${type} needs "${name}".`, { hint: schema.description ? `${name}: ${schema.description}` : undefined });
      }
    }
    if ("children" in node) {
      if (!Array.isArray(node.children)) error("type", `${path}.children`, "`children` must be an array.");
      else {
        if (!entry.props.children) error("children-not-allowed", `${path}.children`, `${type} takes no children.`, { hint: `Its content props: ${Object.keys(entry.props).filter((p) => resolve(entry.props[p])["x-kind"] === "node").join(", ") || "none"}.` });
        node.children.forEach((child, index) => checkChild(child, `${path}.children.${index}`, depth + 1, scope, entry));
      }
    }
  }

  function checkChild(child, path, depth, scope, parentEntry) {
    if (typeof child === "string" || typeof child === "number") return;
    if (isNode(child)) return checkNode(child, path, depth, scope, parentEntry);
    const marker = markerOf(child);
    if (marker === "ref") return checkRef(child, path, scope);
    if (marker === "state") return checkStatePath(child, path);
    if (marker === "pending") { if (!PENDING_KINDS.includes(child.$pending)) error("enum", `${path}.$pending`, `$pending is one of ${PENDING_KINDS.join(", ")}.`); return; }
    if (marker === "map") return checkMap(child, path, depth, scope, parentEntry);
    error("invalid-child", path, `A child is text, a node, { "$ref" }, { "$map" } or { "$pending" }; got ${show(child)}.`);
  }

  function checkMap(map, path, depth, scope, parentEntry) {
    if (typeof map.$map !== "string" || !map.$map) error("type", `${path}.$map`, "`$map` names the data path of a list.");
    else checkRef({ $ref: map.$map }, `${path}.$map`, scope);
    if (typeof map.as !== "string" || !/^[A-Za-z_$][\w$]*$/.test(map.as)) error("type", `${path}.as`, "`as` is the identifier each item is read by inside the node (e.g. \"item\").");
    if (!isNode(map.node)) return error("type", `${path}.node`, "`node` is the component node repeated per item.");
    const inner = { ...scope, aliases: new Set([...scope.aliases, map.as]) };
    checkNode(map.node, `${path}.node`, depth, inner, parentEntry);
  }

  function checkRef(marker, path, scope) {
    if (typeof marker.$ref !== "string" || !marker.$ref) return error("type", path, "`$ref` is a dotted path into data (\"slots\", \"item.label\").");
    if (!opt.strictData) return;
    const [root] = splitPath(marker.$ref);
    if (root !== "state" && !scope.aliases.has(root) && !scope.dataKeys.has(root)) error("unknown-ref", path, `"${marker.$ref}" does not start with a data key (${[...scope.dataKeys].join(", ") || "none"}), "state" or a map alias (${[...scope.aliases].join(", ") || "none"}).`);
  }

  function checkStatePath(marker, path) {
    if (typeof marker.$state !== "string" || !marker.$state) error("type", path, "`$state` is a dotted path into the shared state (\"when.time\").");
  }

  function checkAction(marker, path, depth, scope) {
    if (typeof marker.$action !== "string" || !marker.$action) return error("type", `${path}.$action`, "`$action` names the action (\"book\", \"setState\", \"open\"…).");
    if (marker.$action === "setState" && typeof marker.path !== "string") error("type", `${path}.path`, `setState needs "path" (the state path to write) and "value".`);
    if ((marker.$action === "open" || marker.$action === "close") && typeof marker.id !== "string") error("type", `${path}.id`, `${marker.$action} needs "id": the overlay node it opens or closes.`);
    if ("args" in marker) {
      if (!isObject(marker.args)) error("type", `${path}.args`, "`args` is an object of values, { \"$ref\" } or { \"$state\" } markers.");
      else for (const [name, value] of Object.entries(marker.args)) checkValue(value, {}, `${path}.args.${name}`, depth, scope, { inArgs: true });
    }
    for (const key of Object.keys(marker)) if (!["$action", "args", "path", "value", "id"].includes(key)) error("unknown-key", `${path}.${key}`, `An action has $action, args, path, value and id; not "${key}".`);
  }

  function checkValue(value, rawSchema, path, depth, scope, ctx) {
    const schema = resolve(rawSchema);
    const kind = schema["x-kind"];
    const marker = markerOf(value);
    if (marker === "ref") return checkRef(value, path, scope);
    if (marker === "state") { if (kind === "action") error("type", path, `${ctx.type}.${ctx.prop} is a handler; bind state to a value prop and give the handler an action.`); return checkStatePath(value, path); }
    if (marker === "action") {
      if (kind !== "action" && !ctx.inArgs) return error("action-on-value", path, `${ctx.type ? `${ctx.type}.` : ""}${ctx.prop ?? "this value"} is a value, not a handler; an action goes on a handler prop (onClick, onSubmit, …Action.onClick).`);
      return checkAction(value, path, depth, scope);
    }
    if (marker === "map") return error("map-in-prop", path, "`$map` repeats children; for a list prop, pass the data with { \"$ref\": \"<list>\" }.");
    if (marker === "pending") return error("invalid-child", path, "`$pending` is a child placeholder, not a prop value.");
    if (kind === "action") return error("type", path, `${ctx.type}.${ctx.prop} is a handler: give it { "$action": "<name>" }.`, { hint: `Example: { "$action": "submit", "args": { "value": { "$state": "…" } } }` });
    if (value === null) { if (schema["x-nullable"] || schema.type === "null" || !Object.keys(schema).length) return; return error("type", path, `${ctx.prop ?? "value"} cannot be null.`); }
    if (isNode(value)) {
      if (kind === "node" || kind === "element" || !Object.keys(schema).length) return checkNode(value, path, depth + 1, scope, null);
      return error("node-not-allowed", path, `${ctx.type ? `${ctx.type}.` : ""}${ctx.prop ?? "value"} takes ${describe(schema)}, not a component.`);
    }
    if (kind === "node") {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return;
      if (Array.isArray(value)) return value.forEach((child, index) => checkChild(child, `${path}.${index}`, depth + 1, scope, null));
      if (isObject(value) && !marker) return error("type", path, `${ctx.prop ?? "value"} is text, a component node or a list of them; got an object.`);
      return;
    }
    if (kind === "element") return error("type", path, `${ctx.prop ?? "value"} must be a component node.`);
    if (kind === "icon") { if (typeof value !== "string" || !value.startsWith("icon-")) error("icon-name", path, `${ctx.prop ?? "value"} is an icon name such as "icon-plus-line".`); return; }
    if (kind === "date") { if (typeof value !== "string" || Number.isNaN(Date.parse(value))) error("type", path, `${ctx.prop ?? "value"} is an ISO date string ("2026-10-14" or "2026-10-14T09:00:00+07:00").`); return; }
    if (schema.enum) {
      if (schema.enum.includes(value)) return;
      const hint = typeof value === "string" ? nearest(value, schema.enum.filter((v) => typeof v === "string")) : null;
      return error("enum", path, `${ctx.type ? `${ctx.type}.` : ""}${ctx.prop ?? "value"} is one of ${schema.enum.map(show).join(", ")}; got ${show(value)}.`, hint ? { hint: `Did you mean ${show(hint)}?` } : {});
    }
    if (schema.anyOf) {
      let best = null;
      for (const branch of schema.anyOf) {
        const before = problems.length;
        checkValue(value, branch, path, depth, scope, ctx);
        const added = problems.splice(before);
        if (!added.length) return;
        if (!best || added.length < best.length) best = added;
      }
      if (best) problems.push(...(best.length === 1 ? best : [{ severity: "error", code: "type", path, message: `${ctx.prop ?? "value"} is ${describe(schema)}; got ${show(value)}.` }]));
      return;
    }
    if (schema.type === "array") {
      if (!Array.isArray(value)) return error("type", path, `${ctx.prop ?? "value"} is a list of ${describe(schema.items)}; got ${show(value)}.`);
      return value.forEach((item, index) => checkValue(item, schema.items ?? {}, `${path}.${index}`, depth, scope, { ...ctx, prop: `${ctx.prop}[${index}]` }));
    }
    if (schema.type === "object") {
      if (!isObject(value)) return error("type", path, `${ctx.prop ?? "value"} is an object { ${Object.keys(schema.properties ?? {}).join(", ")} }; got ${show(value)}.`);
      const properties = schema.properties ?? {};
      for (const [field, item] of Object.entries(value)) {
        if (properties[field]) { checkValue(item, properties[field], `${path}.${field}`, depth, scope, { ...ctx, prop: field, inArgs: false }); continue; }
        if (schema.additionalProperties && schema.additionalProperties !== true) { checkValue(item, schema.additionalProperties, `${path}.${field}`, depth, scope, { ...ctx, prop: field }); continue; }
        if (schema.additionalProperties === false) { const hint = nearest(field, Object.keys(properties)); error("unknown-field", `${path}.${field}`, `"${field}" is not a field of ${ctx.prop ?? "this object"} (${Object.keys(properties).join(", ")}).`, hint ? { hint: `Did you mean "${hint}"?` } : {}); }
        else checkValue(item, {}, `${path}.${field}`, depth, scope, { ...ctx, prop: field });
      }
      // A required handler field (TableBulkAction.onClick) is filled by the renderer, which reports it as an action.
      for (const field of schema.required ?? []) if (!(field in value) && resolve(properties[field])["x-kind"] !== "action") error("required-field", `${path}.${field}`, `${ctx.prop ?? "this object"} needs "${field}".`);
      return;
    }
    if (schema.type === "string" || schema.type === "number" || schema.type === "boolean") {
      if (typeof value !== schema.type) error("type", path, `${ctx.type ? `${ctx.type}.` : ""}${ctx.prop ?? "value"} is a ${schema.type}; got ${show(value)}.`);
      return;
    }
    if (schema.type === "null") return error("type", path, `${ctx.prop ?? "value"} must be null.`);
    // An open type ({}): accept anything, but what is inside still has to be valid.
    if (Array.isArray(value)) return value.forEach((item, index) => checkValue(item, {}, `${path}.${index}`, depth, scope, { ...ctx, prop: `${ctx.prop}[${index}]` }));
    if (isObject(value)) for (const [field, item] of Object.entries(value)) checkValue(item, {}, `${path}.${field}`, depth, scope, { ...ctx, prop: field });
  }

  function describe(schema) {
    const s = resolve(schema);
    if (s["x-kind"]) return { node: "text or a component", element: "a component", icon: "an icon name", date: "an ISO date", action: "an action" }[s["x-kind"]];
    if (s.enum) return `one of ${s.enum.map(show).join(", ")}`;
    if (s.anyOf) return s.anyOf.map(describe).join(" or ");
    if (s.type === "array") return `a list of ${describe(s.items ?? {})}`;
    if (s.type === "object") return `an object { ${Object.keys(s.properties ?? {}).join(", ")} }`;
    return s.type ? `a ${s.type}` : "any JSON";
  }
}
