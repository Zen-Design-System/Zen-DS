// Figma Primitives/Table/Cell/Dock-Icon-Cell 1603:5099 (docs/figma-contracts/table-cells.json): Bold × Subtext, a column
// with `content: "dock-icon"`. The Dock-Icon Neutral · Subtle (Background/Neutral/Subtle, Rounded) is XSmall 24 with a
// 12px glyph (Element-Size/Popular/XSmall) on one line and Small 32 with a 16px glyph (Popular/Small) over a Subtext, the
// glyph in Content/Neutral/Base (the variant's icon, icon-home-03-solid), centred on the Text-Cell, Spacing/Gap/Small
// before it. The Text-Cell's checks are shared (_table-shared.mjs).
import { at, mediaSuite } from "./_table-shared.mjs";

export default mediaSuite({
  setId: "1603:5099",
  content: "dock-icon",
  media: (spec) => at(spec, "01 > Content-Div > Dock-Icon > Icon > Icon").main,
  visual: [
    { figma: "Dock-Icon", dom: ".zen-dock-icon", check: ["size", "x", "y", "fill", "radius"] },
    { figma: "Dock-Icon > Icon", dom: ".zen-dock-icon > .zen-icon", check: ["size", "x", "y"] },
    { figma: "Dock-Icon > Icon > Icon > Vector", dom: ".zen-dock-icon > .zen-icon", check: ["fill"], fillVia: "color" },
  ],
});
