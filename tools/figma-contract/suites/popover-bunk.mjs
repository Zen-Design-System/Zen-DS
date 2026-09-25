// Figma Popover/Bunk-Action (9021:28726).
export default {
  contract: "docs/figma-contracts/checkbox-radio-chip-popover.json",
  setId: "9021:28726",
  kind: "bunkAction",
  root: ".zen-popover",
  cases: () => ({}),
  map: [
    { figma: "", dom: ".zen-popover", check: ["size", "fill", "radius", "fx"] },
    { figma: "", dom: ".zen-popover", check: ["stroke"], strokeVia: "outline" },
    { figma: "Item-List", dom: ".zen-popover__bunk-list", check: ["size", "x", "y"] },
    { figma: "Item-List/Redo-Undo", dom: ".zen-popover__bunk-group:nth-child(1)", check: ["size", "x", "y"] },
    { figma: "Item-List/Block#0", dom: ".zen-popover__bunk-group:nth-child(3)", check: ["size", "x", "y"] },
    { figma: "Item-List/Block#1", dom: ".zen-popover__bunk-group:nth-child(5)", check: ["size", "x", "y"] },
    { figma: "Item-List > Redo-Undo > Button/Icon-Flat", dom: ".zen-popover__bunk-group:nth-child(1) > .zen-button", check: ["size", "x", "y"] },
  ],
};
