// Figma Divider 460:38361 (docs/figma-contracts/input-search-primitives.json): Color Default · Medium · High → Divider
// in a 356px frame: a 1px line whose INSIDE stroke binds Border/Neutral Pale · Subtle · Solid (code: border-top).
export default {
  contract: "docs/figma-contracts/input-search-primitives.json",
  setId: "460:38361",
  kind: "ipsDivider",
  root: ".zen-divider",
  cases: (vp) => ({ color: vp.Color.toLowerCase() }),
  map: [
    { figma: "", dom: ":root", check: ["size", "stroke", "fill"] },
  ],
};
