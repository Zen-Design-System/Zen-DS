// Figma Popover/Manual-Add-New (4031:27929): Search (focused) + Label + Manual-Add-New item.
const c = "Popover/Manual-Add-New > Container";
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "4031:27929",
  kind: "manualAddNew",
  root: ".zen-popover",
  cases: () => ({ searchValue: "Input Value", createLabel: "Create" }),
  map: [
    { figma: c, dom: ".zen-popover", check: ["w", "fill", "radius", "fx"] },
    { figma: `${c} > Search`, dom: ".zen-popover__search", check: ["size", "x", "y"] },
    { figma: `${c} > Search > Search/Popover > Search/Default > Container`, dom: ".zen-popover__search .zen-input__control", check: ["size", "radius"] },
    { figma: `${c} > Label`, dom: ".zen-popover__label", check: ["size", "x", "y"] },
    { figma: `${c} > Label > Select an option or create one`, dom: ".zen-popover__label", check: ["text"] },
    { figma: `${c} > Container > Item-List > Item > Container`, dom: ".zen-popover__item[data-function='manual-add-new']", check: ["size", "x", "y", "radius"] },
    { figma: `${c} > Container > Item-List > Item > Container > Content > Item > Content > Action`, dom: ".zen-popover__item[data-function='manual-add-new'] .zen-popover__item-label", check: ["h", "x", "y", "text"] },
    { figma: `${c} > Container > Item-List > Item > Container > Content > Item > Badge`, dom: ".zen-popover__item[data-function='manual-add-new'] .zen-badge", check: ["h", "y", "fill", "radius"] },
    { figma: `${c} > Container > Item-List > Item > Container > Content > Item > Badge > Text-Wrapper > Label`, dom: ".zen-popover__item[data-function='manual-add-new'] .zen-badge__text", check: ["text"] },
  ],
};
