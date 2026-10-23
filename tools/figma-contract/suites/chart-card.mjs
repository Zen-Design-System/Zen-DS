// Figma Chart/Chart-Card 6643:63528 (docs/figma-contracts/chart-card.json): a Card (Theme Default, Spacing Medium:
// Card-padding-medium, Corner-Radius/2XLarge, Surface/Default) whose Content slot holds a Chart/Line-Chart Sector=4-Sectors
// instance. ChartCard draws the same: the Card, then its body (Heading · Segmented · Metric) and the chart. The
// Line-Chart set has its own suite (chart-line.mjs); this one checks the card around it and the instance as placed.
import { at, cardMap, cardProps, child, textOf } from "./_chart-shared.mjs";
import { trendMap, xLabelExceptions } from "./_chart-trend.mjs";

const C = "Card > Content > Chart/Line-Chart";
const T = `${C} > .Chart/Line-Chart/Trend`;
export default {
  contract: "docs/figma-contracts/chart-card.json",
  setId: "6643:63528",
  kind: "chartCard",
  root: ".zen-chart-card",
  cases: (vp, { spec }) => {
    const sectors = child(at(spec, T), "Sectors").c;
    const data = sectors.map((sector, index) => ({ label: textOf(at(sector, "Container > Wrapper")), value: 12000 + ((index * 5300) % 12000) }));
    data[0].value = 24000;
    return {
      ...cardProps(spec, C),
      width: spec.w,
      chart: "line",
      chartProps: { data, height: at(spec, T).h, format: "usdK", initialIndex: sectors.findIndex((sector) => /Selected/.test(sector.main)) },
    };
  },
  figmaExceptions: xLabelExceptions(T, { cy: 350 }),
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    { figma: "Card", dom: ":root", check: ["size", "fill", "stroke", "radius", "fx"] },
    { figma: "Card > Content", dom: ".zen-chart-card__body", check: ["size", "x", "y"] },
    { figma: C, dom: ".zen-chart-card__body", check: ["size", "x", "y"] },
    { figma: "Card > Sub-Action", dom: ".zen-card__sub-action", check: ["size"] },
    ...cardMap(C).filter((entry) => entry.figma !== ""),
    ...trendMap(T, { count: () => 4 }),
    { figma: `${T} > Visual-Grid > Chart-Visual > Base#0`, dom: ".zen-chart__area", check: ["fill"], fillVia: "gradient" },
    { figma: `${T} > Visual-Grid > Chart-Visual > Base#1`, dom: ".zen-chart__line", check: ["stroke"], strokeVia: "svg" },
  ],
};
