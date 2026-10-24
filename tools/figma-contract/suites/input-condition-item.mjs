// Figma Primitives/Input/Input-Conditions/Condition-Item 373:97437 (docs/figma-contracts/input-search.json): State
// Default · Success · Wrong → InputConditionItem, a 320px row: the state's 16px icon (minus · check · x-small) and the
// condition text in Body/Small/Regular, Gap/2XSmall apart, both in the state's colour.
const icon = "Content > icon-minus-line|icon-check-line|icon-x-small-line";
export default {
  contract: "docs/figma-contracts/input-search.json",
  setId: "373:97437",
  kind: "ipsConditionItem",
  root: ".zen-input-condition",
  // The item's text is read from the variant, so a Figma copy edit changes the case too.
  cases: (vp, variant) => ({ state: vp.State.toLowerCase(), label: variant.spec.c[0].c.find((node) => node.n === "Text").txt }),
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    { figma: "Content", dom: ":root", check: ["size", "x", "y"] },
    { figma: icon, dom: ".zen-input-condition > .zen-icon", check: ["size", "x", "y"] },
    { figma: `${icon} > Vector`, dom: ".zen-input-condition > .zen-icon", check: ["fill"], fillVia: "color" },
    { figma: "Content > Text", dom: ".zen-input-condition__text", check: ["text", "h", "x", "y"] },
  ],
};
