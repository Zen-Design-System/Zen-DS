// Libraries' project components, a live link (Zen Studio, 2026-10-22; spec docs/research/studio-libraries-spec-2026-10-22.md):
// another page's main written into this page (⌥⌘B Detach of an instance whose main is on another page) keeps naming
// that page's components: each `<Use>` in it without a `page` gets `page="<that page>"`, so it is still an instance
// there. Isomorphic (browser engine and Node); use-page.selftest.mjs runs it.
//
//   withUsePage(code, page) → code   (one JSX element, or several; a `<Use>` that names a page keeps its own)
import { parseExpression } from "@babel/parser";

export function withUsePage(code, page) {
  const source = String(code);
  const root = parseExpression(`<>${source}</>`, { plugins: ["jsx", "typescript"] });
  const at = [];
  const visit = (node) => {
    if (!node || typeof node.type !== "string") return;
    if (node.type === "JSXElement") {
      const open = node.openingElement;
      if (open.name.type === "JSXIdentifier" && open.name.name === "Use" && !open.attributes.some((attr) => attr.type === "JSXAttribute" && attr.name.name === "page")) at.push(open.name.end - 2);
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "loc" || key === "start" || key === "end" || key === "extra") continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  };
  visit(root);
  let out = source;
  for (const offset of at.sort((a, b) => b - a)) out = `${out.slice(0, offset)} page=${JSON.stringify(page)}${out.slice(offset)}`;
  return out;
}
