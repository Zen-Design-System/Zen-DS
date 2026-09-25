// .Chip/Trailing (333:82245): Single → icon-x-circle-solid 20/16; Multiple → Badge-Counter Small/XSmall.
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "333:82245",
  kind: "chip",
  root: ".zen-chip__trailing",
  cases: (vp) => ({
    variant: "advanced",
    label: "Chip",
    size: vp.Size === "Default" ? "medium" : "small",
    select: true,
    selectionMode: vp["Select Type"] === "Multiple" ? "multiple" : "single",
    selectionCount: vp["Select Type"] === "Multiple" ? 2 : undefined,
  }),
  map: [
    { figma: "", dom: ".zen-chip__trailing", check: ["size"] },
    { figma: "Icon", dom: ".zen-chip__remove > .zen-icon", check: ["size", "x", "y"], when: (vp) => vp["Select Type"] === "Single" },
    { figma: "Icon > Vector", dom: ".zen-chip__remove > .zen-icon", check: ["fill"], fillVia: "color", when: (vp) => vp["Select Type"] === "Single" },
    { figma: "Badge-Counter", dom: ".zen-chip__multi-count", check: ["size", "x", "y", "fill", "radius"], when: (vp) => vp["Select Type"] === "Multiple" },
    { figma: "Badge-Counter > Text-Wrapper > Label", dom: ".zen-chip__multi-count .zen-badge__text", check: ["h", "text"], when: (vp) => vp["Select Type"] === "Multiple" },
  ],
};
