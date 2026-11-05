import { autoNameBase, givenNameOf, textWordsOf } from "../../../../../tools/studio/layer-meta.mjs";
import type { PageChild, PageNode } from "../render/renderPage";

/*
 * Smart animate's matching (W-51b, docs/research/studio-prototype-variables-2026-10-31.md §5), as Figma matches layers
 * between two frames: the same layer name and the same parent names, from the frame's top-level layers down. A name is
 * the one Layers shows without its page-wide number: a given name (data-name) as written, a frame or shape by its kind
 * ("Frame", "Rectangle": a Screen duplicated with ⌘D keeps them, as Figma's duplicate keeps "Frame 12"), a text never
 * renamed by its words, an instance by its component (any variant: a Toggle off and on is one layer). Siblings sharing a
 * name pair in their order. Pure: Play (playSmart.ts) finds the pairs' elements and moves them.
 */

const TEXT_NAMES = new Set(["Text", "Heading"]);

const literal = (node: PageNode, prop: string): unknown => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };

/** A layer's name as Smart animate compares it. */
export function smartName(node: PageNode): string {
  const given = givenNameOf(node);
  if (given) return given;
  if (TEXT_NAMES.has(node.name)) return textWordsOf(node, Infinity) ?? node.name;
  if (node.name === "Use") return `Use:${String(literal(node, "of") ?? "")}`;
  return autoNameBase(node) ?? node.name;
}

/** The layers a frame holds (its slot props' and its children), each by its name path ("Frame#0/Avatar#0"). */
export function smartPaths(frame: PageNode): Map<string, string> {
  const out = new Map<string, string>();
  const layers = (node: PageNode): PageNode[] => {
    const list: PageNode[] = [];
    const add = (children: PageChild[]) => { for (const child of children) { if (child.kind === "element") list.push(child); else if (child.kind === "map") list.push(child.node); } };
    for (const value of Object.values(node.props)) {
      if (value.kind === "element") list.push(value.node);
      else if (value.kind === "fragment") add(value.children);
    }
    add(node.children);
    return list;
  };
  const visit = (node: PageNode, parent: string) => {
    const seen = new Map<string, number>();
    for (const child of layers(node)) {
      const name = smartName(child);
      const nth = seen.get(name) ?? 0;
      seen.set(name, nth + 1);
      const path = `${parent}${parent ? "/" : ""}${name}#${nth}`;
      out.set(path, child.loc);
      visit(child, path);
    }
  };
  visit(frame, "");
  return out;
}

/** The layers of `from` and `to` (two Screens) that match, by their locs, outer layers first. */
export function smartPairs(from: PageNode, to: PageNode): Array<{ from: string; to: string }> {
  const before = smartPaths(from);
  const pairs: Array<{ from: string; to: string }> = [];
  for (const [path, loc] of smartPaths(to)) {
    const was = before.get(path);
    if (was) pairs.push({ from: was, to: loc });
  }
  return pairs;
}
