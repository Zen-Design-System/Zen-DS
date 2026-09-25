// Figma Radio-Button/Radio-Mark (373:96225), rendered through RadioButton.
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "373:96225",
  kind: "radio",
  root: ".zen-radio-button__mark",
  cases: (vp) => ({ label: "Label", checked: vp.Select === "Yes", state: vp.State.toLowerCase() }),
  map: [
    { figma: "Container", dom: ".zen-radio-button__ring", check: ["size", "x", "y", "fill", "stroke", "radius", "fx"] },
    { figma: "Focus-Ring", dom: ".zen-radio-button__mark::before", check: ["size", "x", "y", "fill", "stroke", "radius"], when: (vp) => vp.State === "Hover" || vp.State === "Focus" },
    { figma: "Container/icon-circle-small-solid", dom: ".zen-radio-button__ring > .zen-icon", check: ["size", "x", "y"], when: (vp) => vp.Select === "Yes" },
    { figma: "Container/icon-circle-small-solid/Vector", dom: ".zen-radio-button__ring > .zen-icon", check: ["fill"], fillVia: "color", when: (vp) => vp.Select === "Yes" },
  ],
};
