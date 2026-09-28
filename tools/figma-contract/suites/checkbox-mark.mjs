// Figma Checkbox/Mark (311:47222): Type Default/Indeterminate × State × Select, rendered through Checkbox.
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "311:47222",
  kind: "checkbox",
  root: ".zen-checkbox__mark",
  cases: (vp) => ({ label: "Label", checked: vp.Select === "Yes", indeterminate: vp.Type === "Indeterminate", state: vp.State.toLowerCase() }),
  figmaExceptions: [
    { layer: "Container", prop: "fx", vp: { Select: "No" }, note: "house rule §9 (docs/component-usage-rules.md): the unselected mark sits on Neutral/Pale, so the code drops Figma\'s Shadow/Action/Basic" },
  ],
  map: [
    { figma: "Container", dom: ".zen-checkbox__box", check: ["size", "x", "y", "fill", "stroke", "radius", "fx"] },
    { figma: "Focus-Ring", dom: ".zen-checkbox__mark::before", check: ["size", "x", "y", "fill", "stroke", "radius"], when: (vp) => vp.State === "Hover" || vp.State === "Focus" },
    { figma: "Container/icon-check-line", dom: ".zen-checkbox__box > .zen-icon", check: ["size", "x", "y"], when: (vp) => vp.Select === "Yes" && vp.Type === "Default" },
    { figma: "Container/icon-minus-line", dom: ".zen-checkbox__box > .zen-icon", check: ["size", "x", "y"], when: (vp) => vp.Type === "Indeterminate" },
    { figma: "Container/icon-check-line/Vector", dom: ".zen-checkbox__box > .zen-icon", check: ["fill"], fillVia: "color", when: (vp) => vp.Select === "Yes" && vp.Type === "Default" },
    { figma: "Container/icon-minus-line/Vector", dom: ".zen-checkbox__box > .zen-icon", check: ["fill"], fillVia: "color", when: (vp) => vp.Type === "Indeterminate" },
  ],
};
