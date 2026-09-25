// Figma Chip/Advanced (512:7659): Size × Theme × State (Default/Hover/Press/Focused/Placeholder) × Select.
// Select=Yes nests .Chip/Trailing (Single = icon-x-circle-solid); Select=No shows the dropdown chevron.
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "512:7659",
  kind: "chip",
  cases: (vp) => ({
    variant: "advanced",
    label: "Chip",
    size: vp.Size.toLowerCase(),
    state: vp.State.toLowerCase(),
    select: vp.Select === "Yes",
    leadingKind: vp.Theme === "Leading-Icon" ? "icon" : vp.Theme === "Leading-Photo" ? "photo" : undefined,
  }),
  map: [
    { figma: "", dom: ":root", check: ["h", "fill", "radius", "fx"] },
    { figma: "", dom: ".zen-chip::after", check: ["stroke"], strokeVia: "after" },
    { figma: "Focus-Ring", dom: ".zen-chip::before", check: ["h", "x", "y", "stroke", "radius"], when: (vp) => vp.State === "Focused" },
    { figma: "Label", dom: ".zen-chip__label", check: ["h", "x", "y", "text"] },
    { figma: "Leading", dom: ".zen-chip__slot:not(.zen-chip__trailing) > .zen-icon", check: ["size", "x", "y"], when: (vp) => vp.Theme === "Leading-Icon" },
    { figma: "Leading/Vector", dom: ".zen-chip__slot:not(.zen-chip__trailing) > .zen-icon", check: ["fill"], fillVia: "color", when: (vp) => vp.Theme === "Leading-Icon" },
    { figma: "Leading", dom: ".zen-chip__slot .zen-avatar", check: ["size", "x", "y"], when: (vp) => vp.Theme === "Leading-Photo" },
    { figma: "Trailing", dom: ".zen-chip__trailing > .zen-icon", check: ["size", "y"], when: (vp) => vp.Select === "No" && vp.State !== "Press" },
    { figma: "Trailing > Vector", dom: ".zen-chip__trailing > .zen-icon", check: ["fill"], fillVia: "color", when: (vp) => vp.Select === "No" },
    { figma: ".Chip/Trailing|Trailing", dom: ".zen-chip__trailing .zen-icon", check: ["size", "y"], when: (vp) => vp.Select === "Yes" },
    { figma: ".Chip/Trailing|Trailing > Icon > Vector", dom: ".zen-chip__trailing .zen-icon", check: ["fill"], fillVia: "color", when: (vp) => vp.Select === "Yes" },
  ],
};
