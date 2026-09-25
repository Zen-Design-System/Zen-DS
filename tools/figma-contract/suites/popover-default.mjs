// Figma Popover/Default (4031:26126): Container + Item-List with one Popover/Item.
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "4031:26126",
  kind: "popover",
  root: ".zen-popover",
  cases: () => ({ items: 1, scrollBar: false }),
  map: [
    { figma: "Container", dom: ".zen-popover", check: ["size", "fill", "radius", "fx"] },
    { figma: "Container", dom: ".zen-popover", check: ["stroke"], strokeVia: "outline" },
    { figma: "Container/Container/Item-List/Item/Container", dom: ".zen-popover__item", check: ["size", "x", "y", "fill", "radius"] },
    { figma: "Container/Search", dom: ".zen-popover__search", check: [] },
    { figma: "Container/Label", dom: ".zen-popover__label", check: [] },
  ],
};
