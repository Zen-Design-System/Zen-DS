// Figma Chart/Stack-Bar-Chart 15930:4271 (docs/figma-contracts/chart-stack-bar.json): Sector 4 · 6 · 7 · 12 × Color
// Primary · Secondary, a StackBarChart (`palette`) in a Chart Card: Elements › Heading · FILL Segmented · Metric · the
// stack plot (the Line-Chart's 14-row Trend grid) · a centred Legend that wraps. Five series stack bottom-up in the Color
// Chart Sector order (Primary, Secondary, Support Cyan, Violet, Yellow Solid; the first two swapped under Secondary) in
// columns that run edge to edge Spacing/Gap/XSmall apart, Corner-Radius/Small on the top corners over a flat base.
import { at, cardMap, cardProps, child, legendMap, paletteOf, textOf } from "./_chart-shared.mjs";
import { trendMap, xLabelExceptions } from "./_chart-trend.mjs";

const PLOTS = [4, 6, 7, 12].map((n) => `Chart/Stack-Chart/Comparison-Stack/Specifics/${n}-Sectors`);
const T = `Elements > ${PLOTS.join("|")}`;
const plotOf = (spec) => child(spec, "Elements").c.find((node) => PLOTS.includes(node.n));
const COLUMN = `${T} > Visual-Grid > Chart-Visual > .Primitives/Chart/Column/Stack-Bar/Single`;
const SEGMENTS = (k) => `${COLUMN}#${k} > Container > Value > Segments`;
export default {
  contract: "docs/figma-contracts/chart-stack-bar.json",
  setId: "15930:4271",
  kind: "chartCard",
  root: ".zen-chart-card__body",
  cases: (vp, { spec }) => {
    const plot = plotOf(spec);
    const sectors = child(plot, "Sectors").c;
    const legend = child(child(spec, "Elements"), "Legend").c.filter((item) => !item.hidden);
    const series = legend.map((item, index) => ({ id: `s${index}`, label: textOf(child(item, "Label")) }));
    // Totals under $25K that niceScale rounds to five $5K steps, as the six Figma labels; the first column the tallest.
    const data = sectors.map((sector, i) => ({
      label: textOf(at(sector, "Container > Wrapper")),
      values: Object.fromEntries(series.map((s, si) => [s.id, i === 0 ? 4800 : 1800 + ((i * 700 + si * 300) % 1600)])),
    }));
    return {
      ...cardProps(spec, "Elements"),
      chart: "stack",
      chartProps: { data, series, height: plot.h, format: "usdK", palette: paletteOf(vp), initialIndex: sectors.findIndex((sector) => /Selected/.test(sector.main)) },
    };
  },
  figmaExceptions: [
    ...xLabelExceptions(T, { cy: 274, vp: { Sector: "4-Sectors" } }),
    ...["6-Sectors", "7-Sectors", "12-Sectors"].flatMap((Sector) => xLabelExceptions(T, { cy: 294, vp: { Sector } })),
    // Figma-side slip: of a column's five segments only the fourth is the .Primitives/Chart/Column/Stack-Bar/Value-Sector
    // instance, and it carries Effect/Overlay; the other four are plain frames with no effect. Code draws no shadow on any.
    ...Array.from({ length: 12 }, (_, k) => ({ vp: {}, layer: `${SEGMENTS(k)} > .Primitives/Chart/Column/Stack-Bar/Value-Sector`, prop: "fx", code: "none",
      note: "Only the fourth segment (the Value-Sector instance) carries Effect/Overlay in Figma; the other segments and every other stack draw none." })),
    // Open question (QUESTIONS.md Charts (P2) (a), chart-parity-audit §2.2): code eases the columns that aren't active to
    // 88%; every Figma column is at 100%.
    ...Array.from({ length: 12 }, (_, k) => ({ vp: {}, layer: `${COLUMN}#${k} > Container > Value`, prop: "op", code: "0.88",
      note: "Columns that aren't active ease to 88% in code; Figma keeps them at 100% (QUESTIONS.md Charts (P2) (a))." })),
  ],
  map: [
    ...cardMap("Elements"),
    { figma: "Elements", dom: ":root", check: ["size"] },
    ...trendMap(T),
    ...legendMap("Elements > Legend", { items: 5, itemName: "Legend-Item", dotName: "Ellipse 2", itemY: true }),
    { figma: "Elements > Legend > Legend-Item#5", dom: ".zen-chart__legend > li:nth-child(6)", check: ["size"] },
    // One column per sector, Spacing/Gap/XSmall apart, the stack filling it (Corner-Radius/Small on top); the segments
    // bottom-up (Figma lists them top-down: Value#3 is the bottom one). Figma's column box runs from the plot's top to the
    // baseline while its segments have fixed heights, so only the columns' widths and places compare (the scale is the
    // gridlines': code's 100% is the top one, as Figma's $25K line).
    ...Array.from({ length: 12 }, (_, k) => {
      const has = (vp) => Number(vp.Sector.split("-")[0]) > k;
      const column = `.zen-chart__column:nth-child(${k + 1})`;
      return [
        { figma: `${COLUMN}#${k}`, dom: column, check: ["w", "x"], when: has },
        { figma: `${COLUMN}#${k} > Container > Value`, dom: `${column} > .zen-chart__stack`, check: ["w", "cx", "radius", "opacity"], when: has },
        ...[3, 2, 1].map((v, si) => ({ figma: `${SEGMENTS(k)} > Value#${v}`, dom: `${column} .zen-chart__segment:nth-child(${si + 1})`, check: ["w", "fill"], when: has })),
        { figma: `${SEGMENTS(k)} > .Primitives/Chart/Column/Stack-Bar/Value-Sector`, dom: `${column} .zen-chart__segment:nth-child(4)`, check: ["w", "fill", "fx"], when: has },
        { figma: `${SEGMENTS(k)} > Value#0`, dom: `${column} .zen-chart__segment:nth-child(5)`, check: ["w", "fill"], when: has },
      ];
    }).flat(),
    { figma: `${T} > Average`, dom: ".zen-chart__average", check: ["size"] },
  ],
};
