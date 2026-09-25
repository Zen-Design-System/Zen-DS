// .Primitives/Popover/Search (846:38183): Search/Popover (Icon-Search=No) → Input Field-Only Small, Default state.
const field = "Search/Popover > Search/Default > Container";
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "846:38183",
  kind: "popover",
  root: ".zen-popover__search",
  cases: () => ({ items: 0, search: true, scrollBar: false }),
  map: [
    { figma: "", dom: ".zen-popover__search", check: ["size"] },
    { figma: field, dom: ".zen-popover__search .zen-input__control", check: ["size", "x", "y", "radius"] },
    { figma: field, dom: ".zen-popover__search .zen-input__control::before", check: ["fill"] },
    { figma: `${field} > Content > Text`, dom: ".zen-popover__search input", check: ["h", "x", "y"] },
  ],
};
