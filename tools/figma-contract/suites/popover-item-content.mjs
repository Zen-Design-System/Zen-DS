// .Primitives/Popover/Item/Content (829:20006) themes, rendered inside PopoverItem (8px Container padding).
const themes = { Icon: "icon", "Text-Only": "text-only", "Avatar Small": "avatar-small", "Photo Small": "photo-small", "Avatar Big": "avatar-big", "Photo Big": "photo-big" };
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "829:20006",
  kind: "itemContent",
  root: ".zen-popover__item",
  cases: (vp) => (themes[vp.Theme] && vp.Function === "Default" ? { theme: themes[vp.Theme] } : null),
  // Offsets are measured from the Item edge, so Figma values get the 8px Container padding (dx/dy).
  map: [
    { figma: "Icon|Avatar|Photo", dom: ".zen-popover__item-leading", check: ["size"], when: (vp) => vp.Theme !== "Text-Only" },
    { figma: "Content", dom: ".zen-popover__item-content", check: ["h"] },
    { figma: "Content/Label", dom: ".zen-popover__item-label", check: ["h", "text"] },
  ],
};
