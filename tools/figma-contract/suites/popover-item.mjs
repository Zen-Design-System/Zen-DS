// Figma Primitives/Popover/Item (4031:26009) with the default Icon content.
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "4031:26009",
  kind: "popoverItem",
  root: ".zen-popover__item",
  cases: (vp) => ({ label: "Popover Item", leadingKind: "icon", state: vp.State === "Hover" ? "hover" : "default", selected: vp.State === "Single-Selected" }),
  map: [
    { figma: "Container", dom: ".zen-popover__item", check: ["size", "fill", "radius"] },
    { figma: "Container/Content/Item/Icon", dom: ".zen-popover__item-leading", check: ["size", "x", "y"] },
    { figma: "Container/Content/Item/Icon/Vector", dom: ".zen-popover__item-leading > .zen-icon", check: ["fill"], fillVia: "color" },
    { figma: "Container/Content/Item/Content/Label", dom: ".zen-popover__item-label", check: ["h", "x", "y", "text"] },
    { figma: "Container/icon-check-line", dom: ".zen-popover__item-check", check: ["size", "x", "y"], when: (vp) => vp.State === "Single-Selected" },
    { figma: "Container/icon-check-line/Vector", dom: ".zen-popover__item-check", check: ["fill"], fillVia: "color", when: (vp) => vp.State === "Single-Selected" },
  ],
};
