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
  /** A slot prop holding several layers, written <>…</> (the template's own fragment). */
  | { kind: "fragment"; children: SnapChild[] }
  /** proto.<action>() (an overlay's own button closes it), proto.open("<id>") (a button opens the overlay it is named for). */
  | { kind: "proto"; action: "close" }
  | { kind: "proto"; action: "open"; target: string };
/** `clicks`: the template's element took a click (its onClick, left out of the page): a button the starter can lead to
 *  the overlay named as it is (newPageFromFrame.ts linkOverlays). */
export type SnapNode = { kind: "element"; name: string; props: Array<[string, SnapValue]>; children: SnapChild[]; clicks?: boolean };
export type SnapChild = SnapNode | { kind: "text"; value: string };
export type PageDevice = "phone" | "tablet" | "desktop";

/** One level of indentation, as the Studio's edits write it. */
const UNIT = "  ";
/** The longest line a tag, an object or an array stays on before it breaks into one item per line. */
const WIDTH = 110;
const BUILDER_PACKAGE = "@zen-ds/react/builder";
const PACKAGE = "@zen-ds/react";

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
    case "proto": return value.action === "open" ? `proto.open(${json(value.target)})` : `proto.${value.action}()`;
    case "element": return element(value.node, indent);
    case "fragment": {
      const kids = mergeText(value.children).map((kid) => child(kid, indent + UNIT));
      return `<>\n${kids.map((kid) => `${indent}${UNIT}${kid}`).join("\n")}\n${indent}</>`;
    }
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
    else if (entry.kind === "fragment") entry.children.forEach((kid) => { if (kid.kind === "element") visit(kid); });
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

/** A name as words to compare: lower case, marks dropped, runs of anything else as one dash ("Đặt lịch" → "dat-lich"). */
const nameKey = (value: string) => value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** What a node reads as: its label props, else its text (deep). */
function wordsOf(node: SnapNode): string {
  for (const key of ["aria-label", "label", "title"]) {
    const value = node.props.find(([name]) => name === key)?.[1];
    if (value?.kind === "literal" && typeof value.value === "string" && value.value.trim()) return value.value;
  }
  const words: string[] = [];
  const walk = (children: SnapChild[]) => children.forEach((kid) => { if (kid.kind === "text") words.push(kid.value); else walk(kid.children); });
  walk(node.children);
  return words.join(" ");
}

/**
 * Leads the starter's buttons to the overlays they open (walk 2026-10-29 W-50: a template's overlays came unlinked): a
 * node that took a click in the template (`clicks`) and reads as an overlay's name — its title or id, the same words or
 * the start of them ("Invite members" → invite-members, "Date" → date-placed) — gets onClick proto.open("<id>"). Each
 * overlay and each button once, in reading order. The ids it linked.
 */
export function linkOverlays(nodes: SnapNode[], overlays: ReadonlyArray<{ id: string; node: SnapNode }>): string[] {
  const names = overlays.map((overlay) => ({ id: overlay.id, keys: [nameKey(overlay.id), nameKey(wordsOf({ ...overlay.node, children: [] }))].filter(Boolean) }));
  const buttons: SnapNode[] = [];
  const visit = (node: SnapNode) => {
    if (node.clicks) buttons.push(node);
    node.props.forEach(([, value]) => visitValue(value));
    node.children.forEach((kid) => { if (kid.kind === "element") visit(kid); });
  };
  const visitValue = (value: SnapValue) => {
    if (value.kind === "element") visit(value.node);
    else if (value.kind === "fragment") value.children.forEach((kid) => { if (kid.kind === "element") visit(kid); });
    else if (value.kind === "array") value.items.forEach(visitValue);
    else if (value.kind === "object") value.fields.forEach(([, field]) => visitValue(field));
  };
  nodes.forEach(visit);
  const linked: string[] = [];
  const taken = new Set<SnapNode>();
  for (const exact of [true, false]) {
    for (const overlay of names) {
      if (linked.includes(overlay.id)) continue;
      const button = buttons.find((node) => {
        if (taken.has(node)) return false;
        const key = nameKey(wordsOf(node));
        return Boolean(key) && overlay.keys.some((name) => (exact ? name === key : name.startsWith(`${key}-`) || key.startsWith(`${name}-`)));
      });
      if (!button) continue;
      taken.add(button);
      linked.push(overlay.id);
      button.props = [...button.props.filter(([name]) => name !== "onClick"), ["onClick", { kind: "proto", action: "open", target: overlay.id }]];
    }
  }
  return linked;
}

/** "Example: Settings form" → "Settings form"; the page title a starter gets. */
export const starterTitle = (label: string) => label.replace(/^(Example|Template):\s*/, "").trim() || "Untitled";

/**
 * The text of a builder page whose one Screen holds `nodes` (several: in a Stack, as a blank page holds its content).
 * `overlays`: Overlay frames after the Screen (GĐ3b M3).
 */
/** A Screen's content: its one node, or several (or one the frame showed with room around it: `padding`, a token key)
 *  in a padded Stack. */
function starterContent(nodes: SnapNode[], device: PageDevice, padding?: string | null): SnapNode[] {
  return nodes.length === 1 && !padding ? nodes : [{
    kind: "element",
    name: "Stack",
    props: [["gap", { kind: "literal", value: "md" }], ["padding", { kind: "literal", value: padding ?? (device === "phone" ? "lg" : "xl") }]],
    children: nodes,
  }];
}

/** A starter's Screen as code at column 0 (Add Screen › a template, walk 2026-10-29 W-49): inserted into a page's Board. */
export function starterScreen({ id, title, device, nodes, padding }: { id: string; title: string; device: PageDevice; nodes: SnapNode[]; padding?: string | null }): string {
  return [
    `<Screen id="${id}" ${attribute("title", { kind: "literal", value: title }, "")} device="${device}">`,
    ...starterContent(nodes, device, padding).map((node) => `${UNIT}${element(node, UNIT)}`),
    "</Screen>",
  ].join("\n");
}

/** A starter's overlay as an Overlay frame's code at column 0. */
export const starterOverlay = (overlay: { id: string; node: SnapNode }) => [`<Overlay id="${overlay.id}">`, `${UNIT}${element(overlay.node, UNIT)}`, "</Overlay>"].join("\n");

export function starterPage({ title, device, nodes, overlays = [], padding }: { title: string; device: PageDevice; nodes: SnapNode[]; overlays?: Array<{ id: string; node: SnapNode }>; padding?: string | null }): string {
  const content = starterContent(nodes, device, padding);
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
