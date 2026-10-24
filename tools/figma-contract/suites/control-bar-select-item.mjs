// Figma Control-Bar/Select-Item 9021:27379 (docs/figma-contracts/input-search.json): Theme Subtle · Solid · Inverse ×
// State Default · Hover · Selected → ControlBarSelectItem: a Button/Size/Medium (40) square, Corner-Radius/Base, the
// 20px icon centred; the fill and icon colour per Theme × State (Selected: Active/Neutral/Subtle, Active/Neutral/Solid
// with Inverse/Strongest, Inverse/Solid). Hover is the forced `state="hover"`.
export default {
  contract: "docs/figma-contracts/input-search.json",
  setId: "9021:27379",
  kind: "ipsSelectItem",
  root: ".zen-control-bar-item",
  cases: (vp) => ({ theme: vp.Theme.toLowerCase(), state: vp.State.toLowerCase() }),
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    { figma: "Container", dom: ":root", check: ["size", "x", "y", "fill", "radius"] },
    { figma: "Container > Leading-Icon", dom: ".zen-control-bar-item > .zen-icon", check: ["size", "x", "y"] },
    { figma: "Container > Leading-Icon > Vector", dom: ".zen-control-bar-item > .zen-icon", check: ["fill"], fillVia: "color" },
  ],
};
