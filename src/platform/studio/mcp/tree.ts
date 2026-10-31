/*
 * The Studio MCP's view of a page (spec docs/research/studio-mcp-canvas-2026-10-15.md §5, M0): a page's document
 * (tools/studio/doc.mjs: the dialect tree with a stable id on every element) as a short indented outline an AI reads in
 * few tokens: one line per layer with its component, id, the props written on it and its text. Pure, no imports
 * (tree.selftest.mjs runs it in Node).
 */

export type DocValue =
  | { kind: "literal"; value: unknown }
  | { kind: "array"; items: DocValue[] }
  | { kind: "object"; fields: Record<string, DocValue> }
  | { kind: "element"; node: DocNode }
  | { kind: "fragment"; children: DocChild[] }
  | { kind: "proto"; action: string; args: unknown[] }
  | { kind: "ref"; root: string; path: string[] }
  | { kind: "expr"; op: string; args: unknown[] };

export type DocNode = { kind: "element"; id: string; name: string; props: Record<string, DocValue>; children: DocChild[] };

export type DocChild =
  | DocNode
  | { kind: "text"; value: string }
  | { kind: "ref"; root: string; path: string[] }
  | { kind: "map"; source: { root: string; path: string[] } | unknown; item: string; node: DocNode };

/** Layers a frame is made of on the Board (Figma's top-level frames). */
export const FRAME_NAMES = new Set(["Screen", "Overlay"]);

const MAX_STRING = 80;
const MAX_LINES = 600;

const clip = (text: string) => (text.length > MAX_STRING ? `${text.slice(0, MAX_STRING - 1)}…` : text);
const refText = (ref: { root: string; path: string[] }) => [ref.root, ...ref.path].join(".");

/** A prototype variable's operand (tools/studio/proto-vars.mjs): `vars.count + 1`, parentheses around each inner
 *  expression (the outline is read, not run). */
function operandText(operand: unknown): string {
  if (!operand || typeof operand !== "object") return JSON.stringify(operand);
  const value = operand as { kind?: string; root?: string; path?: string[]; op?: string; args?: unknown[] };
  if (value.kind === "ref") return refText(value as { root: string; path: string[] });
  if (value.kind !== "expr" || !value.args) return JSON.stringify(operand);
  const inner = (arg: unknown) => ((arg as { kind?: string })?.kind === "expr" ? `(${operandText(arg)})` : operandText(arg));
  return value.op === "!" ? `!${inner(value.args[0])}` : `${inner(value.args[0])} ${value.op} ${inner(value.args[1])}`;
}

/** An action as code: Set variable, Conditional and several actions hold operands and actions of their own (W-52 B). */
function protoText(value: { action: string; args: unknown[] }): string {
  const arg = (entry: unknown): string => {
    const kind = (entry as { kind?: string } | null)?.kind;
    if (kind === "proto") return protoText(entry as { action: string; args: unknown[] });
    if (kind === "ref" || kind === "expr") return operandText(entry);
    return JSON.stringify(entry);
  };
  return `proto.${value.action}(${value.args.map(arg).join(", ")})`;
}

/** A prop value as it reads in the outline: strings quoted, numbers and booleans bare, structures summarised. */
export function valueText(value: DocValue): string {
  switch (value.kind) {
    case "literal": {
      if (typeof value.value === "string") return JSON.stringify(clip(value.value));
      if (Array.isArray(value.value)) return `[${value.value.length} items]`;
      if (value.value && typeof value.value === "object") return `{${Object.keys(value.value).join(", ")}}`;
      return String(value.value);
    }
    case "array": return value.items.length <= 3 && value.items.every((item) => item.kind === "literal" && typeof item.value !== "object") ? `[${value.items.map(valueText).join(", ")}]` : `[${value.items.length} items]`;
    case "object": return `{${Object.keys(value.fields).join(", ")}}`;
    case "element": return `<${value.node.name} #${value.node.id}>`;
    case "fragment": return `[${value.children.length} layers]`;
    case "proto": return protoText(value);
    case "ref": return `{${refText(value)}}`;
    case "expr": return `{${operandText(value)}}`;
    default: return "…";
  }
}

/** The props of a layer on one line, element-valued props (slots) left to their own lines. */
function propsText(node: DocNode): string {
  const parts: string[] = [];
  for (const [name, value] of Object.entries(node.props)) {
    if (value.kind === "element" || value.kind === "fragment") continue;
    if (value.kind === "literal" && value.value === true) parts.push(name);
    else parts.push(`${name}=${valueText(value)}`);
  }
  return parts.join(" ");
}

/** A layer's own text: its text children joined (a Button's label, a Text's words). */
export function ownText(node: DocNode): string | null {
  const texts = node.children.filter((child): child is { kind: "text"; value: string } => child.kind === "text").map((child) => child.value);
  return texts.length ? texts.join(" ") : null;
}

const elementChildren = (node: DocNode): Array<{ node: DocNode; label?: string }> => {
  const out: Array<{ node: DocNode; label?: string }> = [];
  const childEntry = (child: DocChild, label?: string) => {
    if (child.kind === "element") out.push({ node: child, label });
    else if (child.kind === "map") out.push({ node: child.node, label: `${label ? `${label} ` : ""}each ${child.item} of ${typeof child.source === "object" && child.source && "root" in child.source ? refText(child.source as { root: string; path: string[] }) : "a list"}:` });
  };
  for (const [name, value] of Object.entries(node.props)) {
    if (value.kind === "element") out.push({ node: value.node, label: `${name}:` });
    // A slot holding several layers: each one under the slot's name, as Figma lists a slot's layers.
    else if (value.kind === "fragment") value.children.forEach((child) => childEntry(child, `${name}:`));
  }
  node.children.forEach((child) => childEntry(child));
  return out;
};

/** A layer's own children (its children, a list as its template row), not what its slot props hold. */
export const childLayers = (node: DocNode): DocNode[] => node.children.flatMap((child) => (child.kind === "element" ? [child] : child.kind === "map" ? [child.node] : []));

/** Every layer under `root` (itself first), depth first. */
export function layers(root: DocNode): DocNode[] {
  const out: DocNode[] = [];
  const walk = (node: DocNode) => { out.push(node); for (const child of elementChildren(node)) walk(child.node); };
  walk(root);
  return out;
}

/** The layer with id `id` and the layers above it (outermost first); null when it is not under `root`. */
export function findLayer(root: DocNode, id: string): { node: DocNode; ancestors: DocNode[] } | null {
  const path: DocNode[] = [];
  const walk = (node: DocNode): DocNode | null => {
    if (node.id === id) return node;
    path.push(node);
    for (const child of elementChildren(node)) {
      const found = walk(child.node);
      if (found) return found;
    }
    path.pop();
    return null;
  };
  const node = walk(root);
  return node ? { node, ancestors: path } : null;
}

/** The frame (Screen / Overlay) a layer is in, or the frame itself; null for the Board and what is outside frames. */
export function frameOf(root: DocNode, id: string): DocNode | null {
  const found = findLayer(root, id);
  if (!found) return null;
  if (FRAME_NAMES.has(found.node.name)) return found.node;
  return found.ancestors.find((node) => FRAME_NAMES.has(node.name)) ?? null;
}

/** One line for a layer: `Button #n… level="primary" — "Save"`. */
export function layerLine(node: DocNode): string {
  const props = propsText(node);
  const text = ownText(node);
  return `${node.name} #${node.id}${props ? ` ${props}` : ""}${text !== null ? ` — ${JSON.stringify(clip(text))}` : ""}`;
}

/** The outline of `root` and its layers `depth` levels down; deeper layers are counted, not listed. */
export function outline(root: DocNode, { depth = 8 }: { depth?: number } = {}): string {
  const lines: string[] = [];
  let cut = false;
  const walk = (node: DocNode, level: number, label?: string) => {
    if (lines.length >= MAX_LINES) { cut = true; return; }
    const indent = "  ".repeat(level);
    lines.push(`${indent}${label ? `${label} ` : ""}${layerLine(node)}`);
    const children = elementChildren(node);
    if (!children.length) return;
    if (level >= depth) {
      const count = layers(node).length - 1;
      lines.push(`${indent}  … ${count} layer${count === 1 ? "" : "s"} inside (get_tree id=${node.id})`);
      return;
    }
    for (const child of children) walk(child.node, level + 1, child.label);
  };
  walk(root, 0);
  if (cut) lines.push(`… cut at ${MAX_LINES} lines: ask for one frame or layer (get_tree id=…)`);
  return lines.join("\n");
}
