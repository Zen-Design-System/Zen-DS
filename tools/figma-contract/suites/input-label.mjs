// Figma Primitives/Input/Label 387:3651 (docs/figma-contracts/input-search.json): State Default · Disabled →
// InputLabel in a 536px frame. Each variant renders as Figma's default (Optional, Tooltip-Icon and Action off: their
// layers hidden) and with all three on, whose text styles, colours and row place are read from the hidden layers. Their
// x follows the label's text (hidden layers also keep stale places), so only heights and y are compared there.
export default {
  contract: "docs/figma-contracts/input-search.json",
  setId: "387:3651",
  kind: "ipsLabel",
  root: ".zen-input-label",
  cases: (vp) => [false, true].map((extras) => ({ disabled: vp.State === "Disabled", extras })),
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    { figma: "Content", dom: ".zen-input-label__content", check: ["h", "x", "y"] },
    { figma: "Content", dom: ".zen-input-label__content", check: ["w"], when: (vp, props) => !props.extras },
    { figma: "Content > Label", dom: ".zen-input-label__text", check: ["text", "h", "x", "y"] },
    // Defaults: the optional layers are hidden, so code renders none of them.
    ...["Content > Optional", "Content > Icon-Tooltip", "Action"].map((figma, i) => (
      { figma, dom: [".zen-input-label__optional", ".zen-input-label__tooltip", ".zen-input-label__action"][i], check: ["h"], when: (vp, props) => !props.extras })),
    { figma: "Content > Optional", dom: ".zen-input-label__optional", check: ["text", "h", "y"], forceVisible: true, when: (vp, props) => props.extras },
    { figma: "Content > Icon-Tooltip", dom: ".zen-input-label__tooltip", check: ["size", "y"], forceVisible: true, when: (vp, props) => props.extras },
    { figma: "Content > Icon-Tooltip > Vector", dom: ".zen-input-label__tooltip", check: ["fill"], fillVia: "color", forceVisible: true, when: (vp, props) => props.extras },
    { figma: "Action", dom: ".zen-input-label__action", check: ["text", "h", "y"], forceVisible: true, when: (vp, props) => props.extras },
  ],
};
