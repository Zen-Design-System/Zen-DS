// .Primitives/Checkbox/Content (309:46789): Label only (Regular / Bold).
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "309:46789",
  kind: "checkbox",
  root: ".zen-checkbox__content",
  cases: (vp) => ({ label: "Checkbox content label", bold: vp.Bold === "Yes" }),
  map: [{ figma: "Label", dom: ".zen-checkbox__label", check: ["h", "x", "y", "text"] }],
};
