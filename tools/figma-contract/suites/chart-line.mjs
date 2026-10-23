// Figma Chart/Line-Chart 15929:120139 (docs/figma-contracts/chart-line.json): Sector 4 · 6 · 7 · 12, a LineChart in a
// Chart Card (Heading · FILL Segmented · Metric · Trend). The Trend grid: 14 equal rows, a 32px Y-label column, six
// gridlines on rows 2 … 12 (the baseline solid), one sector per X value with its label under the baseline and, on the
// selected one, an Active/Accent/Solid rule and the Tooltip; the 2px Border/Accent/Solid line.
import { at, cardMap, cardProps, child, textOf } from "./_chart-shared.mjs";
import { trendMap, xLabelExceptions } from "./_chart-trend.mjs";

const T = ".Chart/Line-Chart/Trend";
const trend = (spec) => at(spec, T);
export default {
  contract: "docs/figma-contracts/chart-line.json",
  setId: "15929:120139",
  kind: "chartCard",
  root: ".zen-chart-card__body",
  cases: (vp, { spec }) => {
    const sectors = child(trend(spec), "Sectors").c;
    // $0 … $25K: a top under 25K that niceScale rounds to five $5K steps, as the six Figma labels.
    const data = sectors.map((sector, index) => ({ label: textOf(at(sector, "Container > Wrapper")), value: 12000 + ((index * 5300) % 12000) }));
    data[0].value = 24000;
    return {
      ...cardProps(spec),
      chart: "line",
      chartProps: { data, height: trend(spec).h, format: "usdK", initialIndex: sectors.findIndex((sector) => /Selected/.test(sector.main)) },
    };
  },
  figmaExceptions: xLabelExceptions(T, { cy: 326 }),
  map: [
    ...cardMap(),
    ...trendMap(T),
    // The 2px line: the second Base (the first is the area), named Line in the 12-Sectors variant.
    // The area's fade: Background/Accent/Solid → Accent/Subtle at 30% (chartCore chartFades[0]).
    { figma: `${T} > Visual-Grid > Chart-Visual > Base#0`, dom: ".zen-chart__area", check: ["fill"], fillVia: "gradient" },
    { figma: `${T} > Visual-Grid > Chart-Visual > Base|Line#1`, dom: ".zen-chart__line:not([data-compare])", check: ["stroke"], strokeVia: "svg" },
    { figma: "Average", dom: ".zen-chart__average", check: ["size"] },
  ],
};
