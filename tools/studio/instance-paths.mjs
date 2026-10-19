// Layers inside an instance of a page's own component (plan docs/research/studio-figma-design-parity-2026-10-18.md F7b,
// spec docs/research/studio-f7b-instance-overrides-spec-2026-10-19.md). Figma keeps an instance's changes as overrides of
// the layers inside it; a Studio page writes them on the `<Use>` as `overrides={{ "<layer path>": { <prop>: <literal> } }}`,
// the table library components take (src/components/_shared/nested.tsx). The canvas (renderPage.tsx), the dialect checks,
// the Studio's edits and the Figma push all name the layers by this one rule. Pure: no imports.

/** The layer attribute a person's own name is written in (layer-meta.mjs NAME_PROP). */
const NAME_PROP = "data-name";

/**
 * Each layer of a main by its path inside an instance of it: one segment per layer below the main's root — its given
 * name (data-name), a nested instance's component name (`useName`), else its tag — and `[i]` (from 0) on each of its
 * siblings with the same segment ("Text", "Row/Text[1]"). The root is the instance itself: it has no path. Elements in
 * props (slots) and list rows have none either. Returns node → path.
 */
export function instanceLayerPaths(root, useName = () => null) {
  const out = new Map();
  const segmentOf = (node) => {
    const given = node.props?.[NAME_PROP];
    if (given?.kind === "literal" && typeof given.value === "string" && given.value) return given.value;
    if (node.name === "Use") {
      const name = useName(node);
      if (typeof name === "string" && name) return name;
    }
    return node.name;
  };
  const visit = (node, path) => {
    const kids = (node.children ?? []).filter((child) => child.kind === "element");
    const segments = kids.map(segmentOf);
    kids.forEach((child, index) => {
      const same = segments.filter((segment) => segment === segments[index]).length;
      const before = segments.slice(0, index).filter((segment) => segment === segments[index]).length;
      const own = same > 1 ? `${segments[index]}[${before}]` : segments[index];
      const full = path ? `${path}/${own}` : own;
      out.set(child, full);
      visit(child, full);
    });
  };
  if (root) visit(root, "");
  return out;
}

/** The override keys that are not a layer prop: a Text's words, a nested instance's variant and property values. */
export const WORDS_KEY = "children";
export const nestedValueKey = (kind, name) => `${kind}.${name}`;
export const NESTED_VALUE_KEY = /^(variant|props)\.(.+)$/;
