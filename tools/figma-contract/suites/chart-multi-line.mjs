// Figma Chart/Multi-Line-Chart 15501:3054 (docs/figma-contracts/chart-multi-line.json): Sector 4 · 6 · 7 · 12, a LineChart
// with `compare` in a Chart Card: Heading · FILL Segmented · Metric · a start-aligned Legend over the Plot (the Line-Chart
// Trend plus a Compare layer: a 2px Border/Neutral/Solid line at 40% and its active dot).
// Figma shows two active periods: the selected sector (its rule, pill and Tooltip) and the Compare layer's Active frame
// (the comparison dot and a second Tooltip) on the last period. Code has one active period, so the case picks the
// selected sector and the Active frame's dot is checked for its look only (size, fill, ring), not its place.
import { at, cardMap, cardProps, child, legendMap, textOf, pickedSector } from "./_chart-shared.mjs";
import { trendMap, xLabelExceptions } from "./_chart-trend.mjs";

const T = "Plot > .Chart/Line-Chart/Trend";
const legendText = (spec, index) => textOf(child(child(spec, "Legend"), "Legend-Item", index));
export default {
  contract: "docs/figma-contracts/chart-multi-line.json",
  setId: "15501:3054",
  // The hover state (Hover off at rest) hides its parent layers (Tooltip-Anchor, Active), not the marks in them.
  inheritHidden: true,
  kind: "chartCard",
  root: ".zen-chart-card__body",
  cases: (vp, { spec }) => {
    const sectors = child(at(spec, T), "Sectors").c;
    // $0 … $25K, as the six Figma labels.
    const data = sectors.map((sector, index) => ({ label: textOf(at(sector, "Container > Wrapper")), value: 12000 + ((index * 5300) % 12000) }));
    data[0].value = 24000;
    return {
      ...cardProps(spec),
      chart: "line",
      chartProps: {
        data, label: legendText(spec, 0), compare: { label: legendText(spec, 1), values: data.map((d) => d.value * 0.8) },
        height: at(spec, T).h, format: "usdK", legendPosition: "top", ...pickedSector(sectors),
      },
    };
  },
  figmaExceptions: [
    ...xLabelExceptions(T, { cy: 380, vp: { Sector: "4-Sectors" } }),
    ...xLabelExceptions(T, { cy: 380, vp: { Sector: "6-Sectors" } }),
    ...xLabelExceptions(T, { cy: 444, vp: { Sector: "7-Sectors" } }),
    ...xLabelExceptions(T, { cy: 444, vp: { Sector: "12-Sectors" } }),
  ],
  map: [
    ...cardMap(),
    ...legendMap("Legend", { itemName: "Legend-Item" }),
    { figma: "Plot", dom: ".zen-chart", check: ["size", "x", "y"] },
    ...trendMap(T),
    // The area's fade: Background/Accent/Solid → Accent/Subtle at 30% (chartCore chartFades[0]).
    { figma: `${T} > Visual-Grid > Chart-Visual > Base#0`, dom: ".zen-chart__area", check: ["fill"], fillVia: "gradient" },
    { figma: `${T} > Visual-Grid > Chart-Visual > Base|Line#1`, dom: ".zen-chart__line:not([data-compare])", check: ["stroke"], strokeVia: "svg" },
    // The comparison: a 2px Border/Neutral/Solid line (Figma's 40% layer opacity is code's stroke-opacity .4, the same paint).
    { figma: "Plot > Compare > Compare-Grid > Line", dom: ".zen-chart__line[data-compare]", check: ["stroke"], strokeVia: "svg" },
    { figma: "Plot > Compare > Compare-Grid > Active > Dot", dom: ".zen-chart__dot[data-compare]", check: ["size", "fill", "stroke"] },
    { figma: "Plot > Average", dom: ".zen-chart__average", check: ["size"] },
  ],
};
