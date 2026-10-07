// Zen Studio E2E: source-side assertions. Elements are found by their data-e2e="<id>" attribute in the CURRENT text,
// so an edit that moves lines never breaks a later row. Locs use the plugin's format: line 1-based, column 0-based,
// at the opening tag's "<" (jsx-source.mjs annotate).
import { describeElement, parseSource } from "../../jsx-source.mjs";

const SKIP = new Set(["loc", "start", "end", "extra", "range", "leadingComments", "trailingComments", "innerComments", "comments", "tokens", "errors"]);

function eachJsxElement(ast, visit) {
  const stack = [ast];
  while (stack.length) {
    const node = stack.pop();
    if (node.type === "JSXElement") visit(node);
    for (const key in node) {
      if (SKIP.has(key)) continue;
      const value = node[key];
      if (Array.isArray(value)) {
        for (let i = value.length - 1; i >= 0; i -= 1) if (value[i] && typeof value[i].type === "string") stack.push(value[i]);
      } else if (value && typeof value.type === "string") stack.push(value);
    }
  }
}

const nameOf = (node) => (node.type === "JSXIdentifier" ? node.name : node.type === "JSXMemberExpression" ? `${nameOf(node.object)}.${nameOf(node.property)}` : "");

/** data-e2e id → [{ loc, name }] in source order (duplicates after ⌘D share an id). */
export function e2eLocs(text) {
  const ast = parseSource(text);
  if (!ast) throw new Error("The fixture text does not parse");
  const found = new Map();
  eachJsxElement(ast, (element) => {
    const opening = element.openingElement;
    const attr = opening.attributes.find((a) => a.type === "JSXAttribute" && a.name?.name === "data-e2e");
    if (!attr || attr.value?.type !== "StringLiteral") return;
    const { line, column } = opening.loc.start;
    const list = found.get(attr.value.value) ?? [];
    list.push({ loc: `${line}:${column}`, name: nameOf(opening.name) });
    found.set(attr.value.value, list);
  });
  for (const list of found.values()) list.sort((a, b) => { const [al, ac] = a.loc.split(":").map(Number); const [bl, bc] = b.loc.split(":").map(Number); return al - bl || ac - bc; });
  return found;
}

/** The first (or `index`th) element with data-e2e="<id>": { loc, name }, or throws with the ids that exist. */
export function locOf(text, id, index = 0) {
  const all = e2eLocs(text);
  const hit = all.get(id)?.[index];
  if (!hit) throw new Error(`No element data-e2e="${id}"${index ? ` #${index}` : ""} in the fixture (have: ${[...all.keys()].join(", ")})`);
  return hit;
}

export const countOf = (text, id) => e2eLocs(text).get(id)?.length ?? 0;

/** describeElement of the element with data-e2e="<id>", plus attr(name) → its source value or undefined. */
export function element(text, file, id, index = 0) {
  const { loc } = locOf(text, id, index);
  const described = describeElement(text, file, loc);
  if (!described) throw new Error(`describeElement found nothing at ${file}:${loc}`);
  return {
    ...described,
    attr(name) {
      const hit = described.attributes.find((a) => a.name === name);
      // Shorthand `disabled` is kind "true" with no value; expressions come back wrapped: `{size}`.
      if (!hit) return undefined;
      if (hit.kind === "true") return "true";
      return hit.kind === "expression" ? `{${hit.value}}` : hit.value;
    },
    /** The element's own text children joined (trimmed). */
    text() {
      return described.children.filter((c) => c.kind === "text").map((c) => c.value).join("").trim();
    },
  };
}
