// Figma Chart/Combo-Chart 15934:7580 (docs/figma-contracts/chart-combo.json): Sector 4 · 6 · 7 · 12 × Color Primary ·
// Secondary, a ComboChart (`palette`) in a Chart Card (Heading · Metric · Chart · Legend; the Segmented is hidden). Bars
// (Color Chart Sector/Primary, edge to edge Spacing/Gap/XSmall apart, Corner-Radius/XSmall on the top corners) on the
// start axis; a 2px Sector/Secondary line with an 8px dot on every period (Surface/Default, 2px ring) on the end axis
// (Y-Axis-End: left-aligned, Spacing/Padding/XSmall after the plot); the first two swapped under Secondary. Neither side
// draws an active state at rest (code: only under the pointer, the user 2026-10-26). Bar heights and dot centres are read
// back as values.
import { cardMap, cardProps, child, legendMap, textOf } from "./_chart-shared.mjs";
import { barFrameExceptions, barFrameMap } from "./_chart-bars.mjs";

const count = (vp) => Number(vp.Sector.split("-")[0]);
const GRID = 158;
const fromGrid = { figmaRoot: "Chart > Plot > Grid", root: ".zen-chart__grid" };
const has = (k) => (vp) => count(vp) > k;
const last = (k) => (vp) => count(vp) === k + 1;
export default {
  contract: "docs/figma-contracts/chart-combo.json",
  setId: "15934:7580",
  kind: "chartCard",
  root: ".zen-chart-card__body",
  cases: (vp, { spec }) => {
    const plot = child(child(spec, "Chart"), "Plot");
    const marks = child(plot, "Marks");
    const columns = child(marks, "Bars").c;
    const dots = marks.c.filter((node) => node.n === "Dot-Anchor");
    const legend = child(spec, "Legend").c.map((item) => textOf(child(item, "Label")));
    // $0 … $125K on the start axis, 0 … 50% on the end axis: a bar's height and a dot's centre are their values.
    const data = child(plot, "X-Axis").c.map((tick, i) => ({
      label: textOf(tick),
      bar: Math.round((child(child(child(columns[i], "Bars"), "Lane"), "Revenue").h / GRID) * 125000),
      line: Math.round(((GRID - (dots[i].y + 3)) / GRID) * 50 * 100) / 100,
    }));
    return {
      ...cardProps(spec),
      chart: "combo",
      chartProps: { data, barLabel: legend[0], lineLabel: legend[1], height: 36 + GRID + 28, format: "usdK", lineFormat: "pct", palette: vp.Color === "Secondary" ? "secondary" : "primary" },
    };
  },
  figmaExceptions: [
    ...barFrameExceptions({ grid: GRID, tooltipLane: true }).map((item) => (item.layer === "Chart" ? { ...item, code: "222" } : item)),
    { vp: {}, layer: "Legend", prop: "y", code: "364", note: "Code's 36 / 28 lanes (Figma 6 / 26, see Chart.h) move the legend 32px down." },
  ],
  map: [
    ...cardMap(),
    ...barFrameMap({ yLabels: ["$0", "$25K", "$50K", "$75K", "$100K", "$125K"], count, chartDom: ".zen-chart-combo" }),
    // The end axis: left-aligned Spacing/Padding/XSmall after the plot, on the same gridlines.
    { figma: "Chart > Y-Axis-End", dom: ".zen-chart__y-end", check: ["w", "x"] },
    ...["0%", "10%", "20%", "30%", "40%", "50%"].map((label, i) => ({ figma: `Chart > Y-Axis-End > ${label}`, dom: `.zen-chart__y-end > span:nth-child(${i + 1})`, check: ["text", "x", "cy"], ...fromGrid })),
    ...Array.from({ length: 12 }, (_, k) => [
      { figma: `Chart > Plot > Marks > Bars > Column#${k}`, dom: `.zen-chart__combo-column:nth-child(${k + 1})`, check: ["w", "x"], ...fromGrid, when: has(k) },
      { figma: `Chart > Plot > Marks > Bars > Column#${k} > Bars > Lane > Revenue`, dom: `.zen-chart__combo-column:nth-child(${k + 1}) > .zen-chart__combo-bar`, check: ["size", "x", "y", "fill", "radius", "opacity"], ...fromGrid, when: has(k) },
      { figma: `Chart > Plot > Marks > Dot-Anchor#${k} > Dot`, dom: `.zen-chart__marks > .zen-chart__combo-dot:nth-of-type(${k + 1})`, check: ["size", "cx", "cy", "fill", "stroke"], ...fromGrid, when: has(k) },
    ]).flat(),
    { figma: "Chart > Plot > Marks > Margin", dom: ".zen-chart__combo-line", check: ["size", "x", "y", "stroke"], strokeVia: "svg", ...fromGrid },
    ...legendMap("Legend"),
  ],
};
