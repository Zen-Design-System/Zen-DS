// Libraries' project components, a live link (Zen Studio, 2026-10-22; spec docs/research/studio-libraries-spec-2026-10-22.md):
// another page's main written into this page (⌥⌘B Detach of an instance whose main is on another page) keeps naming
// that page's components: each `<Use>` in it without a `page` gets `page="<that page>"`, so it is still an instance
// there. Isomorphic (browser engine and Node); use-page.selftest.mjs runs it.
//
//   withUsePage(code, page, { own }) → code   (one JSX element, or several; a `<Use>` that names a page keeps its own,
//                                             except `own`, the page the code lands on: that `page` goes)
import { parseExpression } from "@babel/parser";

export function withUsePage(code, page, { own } = {}) {
  const source = String(code);
  const root = parseExpression(`<>${source}</>`, { plugins: ["jsx", "typescript"] });
  // Splices in the source (offsets less the `<>` the parse wraps it in): an insert, or a cut.
  const edits = [];
  const visit = (node) => {
    if (!node || typeof node.type !== "string") return;
    if (node.type === "JSXElement") {
      const open = node.openingElement;
      if (open.name.type === "JSXIdentifier" && open.name.name === "Use") {
        const named = open.attributes.find((attr) => attr.type === "JSXAttribute" && attr.name.name === "page");
        if (!named) edits.push({ at: open.name.end - 2, cut: 0, text: ` page=${JSON.stringify(page)}` });
        else if (own && named.value?.type === "StringLiteral" && named.value.value === own) edits.push({ at: named.start - 3, cut: named.end - named.start + 1, text: "" });
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "loc" || key === "start" || key === "end" || key === "extra") continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  };
  visit(root);
  let out = source;
  for (const { at, cut, text } of edits.sort((a, b) => b.at - a.at)) out = `${out.slice(0, at)}${text}${out.slice(at + cut)}`;
  return out;
}
