// Figma Primitives/Table/Cell/Trend-Cell 1603:14279 (docs/figma-contracts/table-cells.json): Trend Up · Down · Neutral, a
// column with `content: "trend"` (the sign of the row's value picks the trend; TableTrend draws the same Badge). One Badge
// Medium · Subtle: Up Green with icon-trend-up-01-line, Down Red with icon-trend-down-01-line, Neutral grey with
// icon-minus-line — the 16px icon in the theme's Light content, the label (Body/Base/Medium) in its Strongest; Remove
// hidden. The cell's root has no wrapper in code (the Badge is the cell's content), and its white fill is hidden in Figma.
import { at, cellCase, textOf } from "./_table-shared.mjs";

const sign = { Up: "", Down: "-", Neutral: "" };
export default {
  contract: "docs/figma-contracts/table-cells.json",
  setId: "1603:14279",
  kind: "tableCell",
  root: ".zen-badge",
  // Figma's Down label reads "20%"; the column needs the minus to draw a Down trend (labels' text is not compared).
  cases: (vp, { spec }) => cellCase(spec, { content: "trend", field: "change" }, { change: sign[vp.Trend] + textOf(at(spec, "Badge > Text-Wrapper > Label")) }),
  map: [
    { figma: "", dom: ":root", check: ["h"] },
    { figma: "Badge", dom: ":root", check: ["h", "x", "y", "fill", "radius"] },
    { figma: "Badge > Leading", dom: ".zen-badge__leading", check: ["size", "x", "y"] },
    { figma: "Badge > Leading > Vector", dom: ".zen-badge__leading", check: ["fill"], fillVia: "color" },
    { figma: "Badge > Text-Wrapper", dom: ".zen-badge__text", check: ["h", "x", "y"] },
    { figma: "Badge > Text-Wrapper > Label", dom: ".zen-badge__text", check: ["text"] },
    { figma: "Badge > Remove", dom: ".zen-badge__remove", check: [] },
  ],
};
