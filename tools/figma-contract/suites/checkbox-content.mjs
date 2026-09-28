// .Primitives/Checkbox/Content (309:46789): Label (Regular / Bold) + optional Subtext (Body/Small/Regular, gap Spacing/Gap/3XSmall).
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "309:46789",
  kind: "checkbox",
  root: ".zen-checkbox__content",
  cases: (vp) => ({ label: "Checkbox content label", caption: "Please select this an option which matched with your need", bold: vp.Bold === "Yes" }),
  map: [
    { figma: "Label", dom: ".zen-checkbox__label", check: ["h", "x", "y", "text"] },
    { figma: "Subtext", dom: ".zen-checkbox__caption", check: ["x", "text"], forceVisible: true },
  ],
};
