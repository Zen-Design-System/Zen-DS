// Figma Chip/Number-Only (1536:26687).
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "1536:26687",
  kind: "chip",
  cases: (vp) => ({ variant: "number-only", label: "0", value: 0, size: vp.Size.toLowerCase(), level: vp.Level.toLowerCase(), state: vp.State.toLowerCase(), select: vp.Select === "Yes" }),
  map: [
    { figma: "", dom: ":root", check: ["size", "fill", "radius", "fx"] },
    { figma: "", dom: ".zen-chip::after", check: ["stroke"], strokeVia: "after" },
    { figma: "Focus-Ring", dom: ".zen-chip::before", check: ["size", "x", "y", "stroke", "radius"], when: (vp) => vp.State === "Focused" },
    { figma: "Label", dom: ".zen-chip__value", check: ["size", "x", "y", "text"] },
  ],
};
