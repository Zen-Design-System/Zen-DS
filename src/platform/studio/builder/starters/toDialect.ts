/*
 * Starters (Studio builder GĐ3b, spec docs/research/studio-builder-starters-spec-2026-10-07.md §3a): a snapshot of what a
 * frame renders (./snapshot.ts) written as a builder page (`*.zen.tsx`, tools/studio/dialect.mjs): one Screen holding the
 * snapshot, every prop a literal, so every prop stays editable. Pure (no DOM, no React), so `node toDialect.selftest.mjs`
 * imports it.
 */

export type SnapLiteral = string | number | boolean | null;
export type SnapValue =
  | { kind: "literal"; value: SnapLiteral }
  | { kind: "array"; items: SnapValue[] }
  | { kind: "object"; fields: Array<[string, SnapValue]> }
  | { kind: "element"; node: SnapNode }
  /** proto.<action>() (an overlay's own button closes it). */
  | { kind: "proto"; action: "close" };
export type SnapNode = { kind: "element"; name: string; props: Array<[string, SnapValue]>; children: SnapChild[] };
export type SnapChild = SnapNode | { kind: "text"; value: string };
export type PageDevice = "phone" | "tablet" | "desktop";

/** One level of indentation, as the Studio's edits write it. */
const UNIT = "  ";
/** The longest line a tag, an object or an array stays on before it breaks into one item per line. */
const WIDTH = 110;
const BUILDER_PACKAGE = "@zen/design-system/builder";
const PACKAGE = "@zen/design-system";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
/** A JSX attribute string written as is: no quote, backslash, entity or line break (Babel would read those differently). */
const PLAIN_ATTR = /^[^"\\&\r\n\u2028\u2029]*$/;
/** JSX text written as is: none of { } < > &, no line break, no space at either end (JSX would trim or read it). */
const PLAIN_TEXT = /^[^{}<>&\s\u2028\u2029](?:[^{}<>&\r\n\u2028\u2029]*[^{}<>&\s\u2028\u2029])?$/;

const json = (value: string) => JSON.stringify(value).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

/** A JS literal: a number written finite, a string as JSON. */
function literal(value: SnapLiteral): string {
  if (typeof value === "string") return json(value);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "0";
  return String(value);
}

/** A value inside {…} (a prop's expression, an array item, an object field) at `indent`. */
function expression(value: SnapValue, indent: string): string {
  switch (value.kind) {
    case "literal": return literal(value.value);
    case "proto": return `proto.${value.action}()`;
    case "element": return element(value.node, indent);
    case "array": {
      if (!value.items.length) return "[]";
      const items = value.items.map((item) => expression(item, indent + UNIT));
      const flat = `[${items.join(", ")}]`;
      if (!flat.includes("\n") && indent.length + flat.length <= WIDTH) return flat;
      return `[\n${items.map((item) => `${indent}${UNIT}${item},`).join("\n")}\n${indent}]`;
    }
    case "object": {
      if (!value.fields.length) return "{}";
      const fields = value.fields.map(([key, field]) => `${IDENTIFIER.test(key) ? key : json(key)}: ${expression(field, indent + UNIT)}`);
      const flat = `{ ${fields.join(", ")} }`;
      if (!flat.includes("\n") && indent.length + flat.length <= WIDTH) return flat;
      return `{\n${fields.map((field) => `${indent}${UNIT}${field},`).join("\n")}\n${indent}}`;
    }
  }
}

/** One attribute: `name`, `name="text"` or `name={…}`. */
function attribute(name: string, value: SnapValue, indent: string): string {
  if (value.kind === "literal" && value.value === true) return name;
  if (value.kind === "literal" && typeof value.value === "string" && PLAIN_ATTR.test(value.value)) return `${name}="${value.value}"`;
  return `${name}={${expression(value, indent)}}`;
}

/** A child: an element, or text (as is when JSX keeps it exactly, else {"…"}). */
function child(node: SnapChild, indent: string): string {
  if (node.kind === "text") return PLAIN_TEXT.test(node.value) ? node.value : `{${json(node.value)}}`;
  return element(node, indent);
}

/** Adjacent text children as one (React renders them as one text run); empty text goes. */
export function mergeText(children: SnapChild[]): SnapChild[] {
  const out: SnapChild[] = [];
  for (const node of children) {
    const last = out[out.length - 1];
    if (node.kind === "text") {
      if (!node.value) continue;
      if (last?.kind === "text") out[out.length - 1] = { kind: "text", value: last.value + node.value };
      else out.push(node);
    } else out.push(node);
  }
  return out;
}

/** An element at `indent` (its first line carries no indentation: the caller places it). */
export function element(node: SnapNode, indent: string): string {
  const inner = indent + UNIT;
  const props = node.props.map(([name, value]) => attribute(name, value, inner));
  const oneLine = props.every((prop) => !prop.includes("\n")) && indent.length + node.name.length + 2 + props.join(" ").length <= WIDTH;
  const open = !props.length ? `<${node.name}` : oneLine ? `<${node.name} ${props.join(" ")}` : `<${node.name}\n${props.map((prop) => `${inner}${prop}`).join("\n")}\n${indent}`;
  const children = mergeText(node.children);
  if (!children.length) return oneLine ? `${open} />` : `${open}/>`;
  const kids = children.map((kid) => child(kid, inner));
  // One short child stays on the tag's line.
  if (oneLine && kids.length === 1 && children[0].kind === "text" && !kids[0].includes("\n") && indent.length + open.length + kids[0].length + node.name.length + 4 <= WIDTH) {
    return `${open}>${kids[0]}</${node.name}>`;
  }
  return `${open}>\n${kids.map((kid) => `${inner}${kid}`).join("\n")}\n${indent}</${node.name}>`;
}

/** The component names a tree uses (`Card.Header` counts as Card). */
export function componentsOf(nodes: SnapNode[]): Set<string> {
  const names = new Set<string>();
  const value = (entry: SnapValue) => {
    if (entry.kind === "element") visit(entry.node);
    else if (entry.kind === "array") entry.items.forEach(value);
    else if (entry.kind === "object") entry.fields.forEach(([, field]) => value(field));
  };
  const visit = (node: SnapNode) => {
    names.add(node.name.split(".")[0]);
    node.props.forEach(([, entry]) => value(entry));
    node.children.forEach((kid) => { if (kid.kind === "element") visit(kid); });
  };
  nodes.forEach(visit);
  return names;
}

/** "Example: Settings form" → "Settings form"; the page title a starter gets. */
export const starterTitle = (label: string) => label.replace(/^(Example|Template):\s*/, "").trim() || "Untitled";

/**
 * The text of a builder page whose one Screen holds `nodes` (several: in a Stack, as a blank page holds its content).
 * `overlays`: Overlay frames after the Screen (GĐ3b M3).
 */
export function starterPage({ title, device, nodes, overlays = [], padding }: { title: string; device: PageDevice; nodes: SnapNode[]; overlays?: Array<{ id: string; node: SnapNode }>; padding?: string | null }): string {
  // Several nodes, or one the frame showed with room around it (`padding`, a token key): in a padded Stack.
  const content: SnapNode[] = nodes.length === 1 && !padding ? nodes : [{
    kind: "element",
    name: "Stack",
    props: [["gap", { kind: "literal", value: "md" }], ["padding", { kind: "literal", value: padding ?? (device === "phone" ? "lg" : "xl") }]],
    children: nodes,
  }];
  const names = componentsOf([...content, ...overlays.map((overlay) => overlay.node)]);
  const body = "      ";
  const screen = [
    `${body}<Screen id="screen-1" ${attribute("title", { kind: "literal", value: title }, body)} device="${device}">`,
    ...content.map((node) => `${body}${UNIT}${element(node, body + UNIT)}`),
    `${body}</Screen>`,
  ];
  const frames = overlays.flatMap((overlay) => [
    `${body}<Overlay id="${overlay.id}">`,
    `${body}${UNIT}${element(overlay.node, body + UNIT)}`,
    `${body}</Overlay>`,
  ]);
  return [
    `// @zen-page ${JSON.stringify({ format: 1, title })}`,
    `import { Board, ${overlays.length ? "Overlay, " : ""}Screen, proto } from ${json(BUILDER_PACKAGE)};`,
    `import { ${[...names].sort().join(", ")} } from ${json(PACKAGE)};`,
    "",
    "export const mock = {};",
    "",
    "export default function Page() {",
    "  return (",
    "    <Board>",
    ...screen,
    ...frames,
    "    </Board>",
    "  );",
    "}",
    "",
  ].join("\n");
}
