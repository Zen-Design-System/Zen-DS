// Figma Chip/Normal (512:6843): Size × Level × Theme × State × Select.
// Text widths depend on the Inter build Figma renders with (±1–4px vs Inter 4.001), so
// text-hugging widths are not asserted; heights, offsets, paints and bindings are.
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "512:6843",
  kind: "chip",
  cases: (vp) => ({
    variant: "normal",
    label: "Chip",
    size: vp.Size.toLowerCase(),
    level: vp.Level.toLowerCase(),
    state: vp.State.toLowerCase(),
    select: vp.Select === "Yes",
    leadingKind: vp.Theme === "Leading-Icon" ? "icon" : vp.Theme === "Leading-Photo" ? "photo" : undefined,
  }),
  figmaExceptions: [
    {
      vp: { Size: "Medium", Level: "Primary", Theme: "Leading-Icon", State: "Focused", Select: "No" },
      layer: "Leading/Vector",
      prop: "fill",
      note: "Only this Focused variant binds Content/Neutral/Strongest; all 11 other Focused variants bind Neutral/Light.",
    },
  ],
  map: [
    { figma: "", dom: ":root", check: ["h", "fill", "radius", "fx"] },
    { figma: "", dom: ".zen-chip::after", check: ["stroke"], strokeVia: "after" },
    { figma: "Focus-Ring", dom: ".zen-chip::before", check: ["h", "x", "y", "stroke", "radius"], when: (vp) => vp.State === "Focused" },
    { figma: "Label", dom: ".zen-chip__label", check: ["h", "x", "y", "text"] },
    { figma: "Leading", dom: ".zen-chip__slot > .zen-icon", check: ["size", "x", "y"], when: (vp) => vp.Theme === "Leading-Icon" },
    { figma: "Leading/Vector", dom: ".zen-chip__slot > .zen-icon", check: ["fill"], fillVia: "color", when: (vp) => vp.Theme === "Leading-Icon" },
    { figma: "Avatar/Single|Leading", dom: ".zen-chip__slot .zen-avatar", check: ["size", "x", "y", "fill", "radius"], when: (vp) => vp.Theme === "Leading-Photo" },
    { figma: "Avatar/Single|Leading > Image", dom: ".zen-chip__slot .zen-avatar__inner::after", check: ["size", "stroke"], strokeVia: "border", when: (vp) => vp.Theme === "Leading-Photo" },
  ],
};
