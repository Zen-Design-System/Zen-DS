// Prints a Zen UI spec as the React the renderer would run: a TSX module importing from "@zen-ds/react". Two uses:
// the usage harness lints it (tools/ai-ui/lint.mjs, `checkSource` in app mode), and an app can keep the code (the same
// JSX, with `data`, `state`, `setState` and `actions` as props). Every element's opening tag sits on its own line, so
// `lines[line]` gives the node id a harness finding belongs to. Isomorphic, no imports beyond spec.mjs.
//
//   const { code, lines, components } = toJsx(spec, { catalog });
import { isNode, markerOf, splitPath } from "./spec.mjs";

const IDENT = /^[A-Za-z_$][\w$]*$/;
const PENDING_COMPONENT = { text: "SkeletonText", heading: "SkeletonHeading", shape: "SkeletonShape" };
const quote = (text) => JSON.stringify(String(text));
const member = (root, path) => splitPath(path).reduce((out, step) => (IDENT.test(step) ? `${out}.${step}` : `${out}[${quote(step)}]`), root);
const attributeName = (name) => (IDENT.test(name) || /^[a-z]+(-[a-z]+)+$/.test(name) ? name : null);
const escapeText = (text) => String(text).replace(/[{}<>]/g, (c) => `{${quote(c)}}`);

/**
 * @param {object} spec
 * @param {{ catalog?: object, componentName?: string, ids?: boolean }} [options]  catalog: binds controlled pairs as the
 *   renderer does (value + onValueChange) and prints the required handlers · ids: `data-ai-ui-id` on every element (default true)
 * @returns {{ code: string, lines: Record<number, string>, components: string[] }}
 */
export function toJsx(spec, { catalog, componentName = "GeneratedUi", ids = true } = {}) {
  const components = new Set();
  const lines = {};
  const out = [];
  const entries = catalog?.components ?? {};
  let lineNumber = 0;

  const push = (text, id) => { out.push(text); lineNumber += 1; if (id && !lines[lineNumber]) lines[lineNumber] = id; };

  /** A value as the code inside `{…}` (nodes inline). */
  function expr(value, scope) {
    if (isNode(value)) return inlineNode(value, scope);
    if (Array.isArray(value)) return `[${value.map((item) => expr(item, scope)).join(", ")}]`;
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    switch (markerOf(value)) {
      case "ref": return refCode(value.$ref, scope);
      case "state": return member("state", value.$state);
      case "action": return actionCode(value, scope);
      case "map": return `${refCode(value.$map, scope)}.map((${value.as}, index) => ${inlineNode(value.node, new Set([...scope, value.as]), "index")})`;
      case "pending": return `<${pendingComponent(value.$pending)} />`;
      default: return `{ ${Object.entries(value).map(([key, field]) => `${IDENT.test(key) ? key : quote(key)}: ${expr(field, scope)}`).join(", ")} }`;
    }
  }
  const refCode = (path, scope) => { const [root, ...rest] = splitPath(path); return scope.has(root) || root === "state" ? member(root, rest.join(".")) : member("data", path); };
  function actionCode(action, scope) {
    if (action.$action === "setState") return `() => setState(${quote(action.path ?? "")}, ${expr(action.value ?? null, scope)})`;
    if (action.$action === "open" || action.$action === "close") return `() => setState(${quote(`${action.id ?? ""}.open`)}, ${action.$action === "open"})`;
    const args = action.args ? `, ${expr(action.args, scope)}` : "";
    return `(...event) => actions.run(${quote(action.$action)}${args}${args ? "" : ", {}"}, event)`;
  }
  const pendingComponent = (kind) => { const name = PENDING_COMPONENT[kind] ?? "SkeletonShape"; components.add(name); return name; };

  /** The attributes of a node, with the catalog's bindings and required handlers filled in as the renderer does. */
  function attributes(node, scope) {
    const entry = entries[node.type];
    const props = { ...(node.props ?? {}) };
    const parts = [];
    if (ids && node.id) parts.push(`data-ai-ui-id=${quote(node.id)}`);
    for (const pair of entry?.bindings ?? []) {
      const bound = markerOf(props[pair.prop]) === "state" ? props[pair.prop].$state : pair.auto && props[pair.prop] === undefined && node.id ? `${node.id}.${pair.prop}` : null;
      if (!bound || props[pair.handler] !== undefined) continue;
      if (props[pair.prop] === undefined) props[pair.prop] = { $state: bound };
      props[pair.handler] = { __code: `(next) => setState(${quote(bound)}, next)` };
    }
    for (const name of entry?.requiredActions ?? []) if (props[name] === undefined) props[name] = { __code: `(...event) => actions.run(${quote(name)}, { id: ${quote(node.id ?? "")} }, event)` };
    for (const [name, value] of Object.entries(props)) {
      if (name === "children") continue;
      const attr = attributeName(name);
      if (!attr) continue;
      if (value && typeof value === "object" && "__code" in value) { parts.push(`${attr}={${value.__code}}`); continue; }
      if (typeof value === "string" && !/["\\\n]/.test(value)) parts.push(`${attr}="${value}"`);
      else if (value === true) parts.push(attr);
      else parts.push(`${attr}={${expr(value, scope)}}`);
    }
    return parts.length ? ` ${parts.join(" ")}` : "";
  }

  function childCode(child, scope) {
    if (typeof child === "string") return escapeText(child);
    if (typeof child === "number") return String(child);
    if (isNode(child)) return inlineNode(child, scope);
    return `{${expr(child, scope)}}`;
  }

  /** A node on one line (inside a prop, a map or an array). */
  function inlineNode(node, scope, key) {
    const name = nodeName(node);
    const attrs = `${key ? ` key={${key}}` : ""}${attributes(node, scope)}`;
    const children = [...(node.children ?? []), ...(node.props?.children !== undefined ? [node.props.children] : [])];
    return children.length ? `<${name}${attrs}>${children.map((child) => childCode(child, scope)).join("")}</${name}>` : `<${name}${attrs} />`;
  }

  function nodeName(node) {
    if (node.pending) return pendingComponent(entries[node.type]?.props?.children?.["x-kind"] === "node" && /^(Text|Heading|Link)$/.test(node.type) ? (node.type === "Heading" ? "heading" : "text") : "shape");
    components.add(node.type.split(".")[0]);
    return node.type;
  }

  /** A node as lines (its element start on its own line, children indented). */
  function block(node, scope, indent, key) {
    const name = nodeName(node);
    const attrs = `${key ? ` key={${key}}` : ""}${attributes(node, scope)}`;
    const children = [...(node.children ?? []), ...(node.props?.children !== undefined ? [node.props.children] : [])];
    if (!children.length) return push(`${indent}<${name}${attrs} />`, node.id);
    push(`${indent}<${name}${attrs}>`, node.id);
    for (const child of children) childBlock(child, scope, `${indent}  `);
    push(`${indent}</${name}>`);
  }

  function childBlock(child, scope, indent) {
    if (isNode(child)) return block(child, scope, indent);
    if (typeof child === "string" || typeof child === "number") return push(`${indent}${childCode(child, scope)}`);
    if (markerOf(child) === "pending") return push(`${indent}<${pendingComponent(child.$pending)} />`);
    if (markerOf(child) === "map") {
      push(`${indent}{${refCode(child.$map, scope)}.map((${child.as}, index) => (`);
      block(child.node, new Set([...scope, child.as]), `${indent}  `, "index");
      return push(`${indent}))}`);
    }
    push(`${indent}{${expr(child, scope)}}`);
  }

  push("");
  push(`/** Generated from a Zen UI spec (docs/ai-ui/README.md). \`data\`, \`state\`, \`setState\` and \`actions.run\` come from the app. */`);
  push(`export function ${componentName}({ data, state, setState, actions }) {`);
  push("  return (");
  if (isNode(spec?.root)) block(spec.root, new Set(), "    ");
  else push("    null");
  push("  );");
  push("}");
  const names = [...components].sort();
  out[0] = `import { ${names.join(", ")} } from "@zen-ds/react";`;
  return { code: `${out.join("\n")}\n`, lines, components: names };
}
