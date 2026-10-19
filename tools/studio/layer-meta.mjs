// Layer names and locks on a builder page (plan docs/research/studio-figma-design-parity-2026-10-18.md, F1 and
// decision 4): Figma's layer data, written as two props any layer may carry.
//   data-name     the name the person gave the layer (Figma's rename): "Hero", "Price card". Exported with the code, pushed
//                 to Figma as the node's name and read back from it. Not `name`: form fields already take a `name`.
//   data-locked   Figma's lock (⇧⌘L): the canvas does not pick the layer or anything in it; Layers and the Inspector
//                 still select and change it. A Studio flag: export leaves it out, Figma push does not write it.
// A layer with no data-name shows its automatic name, as Figma names new layers: "Frame 1" for a frame (Box, Stack,
// Grid), "Rectangle 2" for a shape, a text layer by its words, an instance by its component. The numbers follow the
// page's order; nothing is written until the person renames.
// No imports: the Studio client, the renderer, compile and Figma push / pull read it.

export const NAME_PROP = "data-name";
export const LOCKED_PROP = "data-locked";

/** A prop's literal value (a dialect Value or a plain value). */
const literalOf = (value) => (value && typeof value === "object" && "kind" in value ? (value.kind === "literal" ? value.value : undefined) : value);

/** The name the person gave a layer (its `data-name`), or null. */
export function givenNameOf(node) {
  const value = literalOf(node?.props?.[NAME_PROP]);
  return typeof value === "string" && value.trim() ? value : null;
}

/** Whether a `data-locked` value locks (written bare, `{true}` or `"true"`). */
export function isLockedValue(value) {
  const plain = literalOf(value);
  return plain === true || plain === "true";
}

/** Figma's frame: a Zen layout primitive is a frame (with or without auto layout). */
export const FRAME_COMPONENTS = new Set(["Box", "Stack", "Grid"]);

/**
 * The layers whose data-name is their Figma name both ways (push writes it, pull reads it back): frames, shapes, text.
 * An instance's Figma name is its component's or carries its content (an icon button's label, a file icon's format,
 * an avatar's person), which pull reads as such: its data-name stays in the page.
 */
export const FIGMA_NAMED = new Set([...FRAME_COMPONENTS, "Shape", "Text"]);

/** A Shape's Figma node name by its type, as Figma's tools name what they draw. */
export const SHAPE_NAMES = { rectangle: "Rectangle", ellipse: "Ellipse", line: "Line", arrow: "Arrow", polygon: "Polygon", star: "Star", vector: "Vector" };

/** The words of a text layer (its literal text, one line), as Figma names a text layer; null when it has none. */
export function textWordsOf(node, max = 60) {
  const words = (node?.children ?? []).filter((child) => child.kind === "text").map((child) => child.value).join(" ").replace(/\s+/g, " ").trim();
  if (!words) return null;
  return words.length > max ? `${words.slice(0, max - 1).trimEnd()}…` : words;
}

/** The kind an automatic name counts in ("Frame", "Rectangle"…), or null for layers named otherwise. */
export function autoNameBase(node) {
  if (FRAME_COMPONENTS.has(node.name)) return "Frame";
  if (node.name === "Shape") return SHAPE_NAMES[String(literalOf(node.props?.type) ?? "rectangle")] ?? "Rectangle";
  return null;
}

/**
 * Every layer's automatic name on a page (`board`: parsePage's Board), by its `loc`: frames and shapes numbered per kind
 * in page order ("Frame 1", "Frame 2", "Ellipse 1"), text layers by their words. A layer that is named otherwise (an
 * instance by its component, a Screen by its title) is not in the map. A layer with a data-name still takes its number,
 * so renaming one never renumbers the others.
 */
export function autoLayerNames(board) {
  const names = new Map();
  const counts = new Map();
  const visit = (node) => {
    if (!node || node.kind !== "element") return;
    const base = autoNameBase(node);
    if (base) {
      const next = (counts.get(base) ?? 0) + 1;
      counts.set(base, next);
      names.set(node.loc, `${base} ${next}`);
    } else if (node.name === "Text" || node.name === "Heading") {
      const words = textWordsOf(node);
      if (words) names.set(node.loc, words);
    }
    for (const entry of Object.values(node.props ?? {})) value(entry);
    for (const child of node.children ?? []) {
      if (child.kind === "element") visit(child);
      else if (child.kind === "map") visit(child.node);
    }
  };
  const value = (entry) => {
    if (!entry) return;
    if (entry.kind === "element") visit(entry.node);
    else if (entry.kind === "fragment") entry.children.forEach((child) => (child.kind === "element" ? visit(child) : child.kind === "map" ? visit(child.node) : undefined));
    else if (entry.kind === "array") entry.items.forEach(value);
    else if (entry.kind === "object") Object.values(entry.fields).forEach(value);
  };
  for (const frame of board?.children ?? []) {
    if (frame.kind !== "element") continue;
    for (const entry of Object.values(frame.props ?? {})) value(entry);
    for (const child of frame.children ?? []) {
      if (child.kind === "element") visit(child);
      else if (child.kind === "map") visit(child.node);
    }
  }
  return names;
}

/**
 * Whether `name` is one Figma or the Studio gives a layer by itself ("Frame 3", "Rectangle", the layer's own words),
 * so Figma pull keeps no data-name for it.
 */
export function isAutomaticName(name, node) {
  if (typeof name !== "string" || !name.trim()) return true;
  if (/^(?:Frame|Group|Rectangle|Ellipse|Line|Arrow|Polygon|Star|Vector|Image|Section)(?: \d+)?$/.test(name.trim())) return true;
  const words = textWordsOf(node, Infinity);
  return words !== null && name.trim() === words;
}

/**
 * Figma's Rename layers (⌘R on several layers): each new name from `pattern` — `$&` the current name, `$n` a number
 * counting up from `start` (`$nn`, `$nnn`: padded), `$N` counting down to it. With `match`, only that part of each
 * current name is replaced.
 */
export function batchNames(currents, pattern, { match = "", start = 1 } = {}) {
  return currents.map((current, index) => {
    const up = start + index;
    const down = start + currents.length - 1 - index;
    const filled = pattern.replace(/\$(?:&|n+|N+)/g, (token) => (token === "$&" ? current : String(token[1] === "n" ? up : down).padStart(token.length - 1, "0")));
    return match ? current.split(match).join(filled) : filled;
  });
}
