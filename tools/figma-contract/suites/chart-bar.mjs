// Figma Chart/Bar-Chart 15321:84071 (docs/figma-contracts/chart-bar.json): Orientation Vertical · Horizontal × Sector
// 4 · 6 · 7 · 12 × Color Primary · Secondary, a BarChart (`orientation`, `palette`) in a Chart Card (Heading · Metric ·
// Chart; the Segmented is hidden).
//  - Vertical: a right-aligned Y-Axis Spacing/Padding/XSmall before the Plot (Grid Line-1 baseline … Line-6, one Column
//    per sector with a 40px Corner-Radius/Small bar in Color Chart Sector/Primary, the active one Sector/Secondary, the
//    periods after it projected: Support/Neutral/Pale under the .Chart/Hatch), the X-Axis pills and the Tooltip on top.
//  - Horizontal: end-aligned category pills · 24px tracks Spacing/Gap/Medium apart (a hatched target and the bar) on
//    dashed vertical Ticks with their labels under them · the value column, the active row's pill and value Strongest.
import { cardMap, cardProps, child, textOf } from "./_chart-shared.mjs";

const vertical = (vp) => vp.Orientation === "Vertical";
const horizontal = (vp) => vp.Orientation === "Horizontal";
const count = (vp) => Number(vp.Sector.split("-")[0]);
const PALE = "Color/Background/Support/Neutral/Pale";
const fillOf = (node) => node?.fill?.find((paint) => !paint.hidden)?.v;
const has = (k, orientation) => (vp) => orientation(vp) && count(vp) > k;
const row = (k, column) => `.zen-chart__hrows > :nth-child(${3 * k + column})`;

function verticalCase(spec) {
  const plot = child(child(spec, "Chart"), "Plot");
  const bars = child(plot, "Bars").c.map((column) => child(child(column, "Lane"), "Bar"));
  const ticks = child(plot, "X-Axis").c;
  // $0 … $125K (six labels): each bar's height on the 146px grid is its value.
  const data = bars.map((bar, i) => ({ label: textOf(ticks[i]), value: Math.round(((bar.h / child(plot, "Grid").h) * 125000) / 100) * 100, ...(fillOf(bar) === PALE ? { projected: true } : null) }));
  return { data, height: child(spec, "Chart").h, format: "usdK", initialIndex: data.reduce((last, d, i) => (d.projected ? last : i), 0) };
}

function horizontalCase(spec) {
  const chart = child(spec, "Chart");
  const plot = child(chart, "Plot");
  const tracks = child(plot, "Bars").c;
  const labels = child(chart, "Categories").c.map(textOf);
  const values = child(chart, "Values").c.map((value) => Number(textOf(value).replace(/[^\d]/g, "")));
  // 0 … 3,000 h (four ticks): each target's width on the plot is its value.
  const data = tracks.map((track, i) => ({ label: labels[i], value: values[i], target: Math.round(((child(track, "Target").w / plot.w) * 3000) / 10) * 10 }));
  return { data, orientation: "horizontal", format: "hours", initialIndex: data.length - 1 };
}

// Open designer questions (QUESTIONS.md "Charts (P2)" (a), chart-parity-audit-2026-10-17 §2.5); code keeps the chart
// family spec until they are answered, and each exception pins the value code renders.
//  - Vertical lanes: Figma's grid starts 38px under the plot's top with a 26px lane under it, code's 36 / 28, so the
//    grid, its lines and the Y labels sit 2px higher in code and the X pills 1px.
//  - Horizontal axis: Figma's tick labels sit Spacing/Gap/XSmall (8) under the tracks, code's Spacing/Gap/Medium (16, the
//    rows' gap), so the axis labels and the chart's foot are 8px lower in code.
const lanes = "Bar lanes 36 / 28 in code (spec family), 38 / 26 in Figma (QUESTIONS.md Charts (P2) (a)).";
const axisGap = "Horizontal bars: the value axis Spacing/Gap/Medium under the tracks in code, Spacing/Gap/XSmall in Figma (QUESTIONS.md Charts (P2) (a)).";
const V = { Orientation: "Vertical" };
const LANE_PINS = [
  ["Chart > Plot > Grid", "y", "162"],
  ...["307.5", "278.31", "249.11", "219.91", "190.7", "161.5"].map((code, i) => [`Chart > Plot > Grid > Line-${i + 1}`, "cy", code]),
  ...["162", "191.2", "220.41", "249.61", "278.81", "308"].map((code, i) => [`Chart > Y-Axis > Label#${i}`, "cy", code]),
  ...Array.from({ length: 12 }, (_, k) => [`Chart > Plot > X-Axis > Tick#${k} > Wrapper`, "cy", "322"]),
];
const AXIS_PINS = [["4-Sectors", 164], ["6-Sectors", 244], ["7-Sectors", 284], ["12-Sectors", 484]].flatMap(([Sector, h]) => [
  { vp: { Orientation: "Horizontal", Sector }, layer: "Chart", prop: "h", code: String(h + 8), note: axisGap },
  ...[0, 1, 2, 3].map((k) => ({ vp: { Orientation: "Horizontal", Sector }, layer: `Chart > Plot > Grid > Tick#${k} > Label`, prop: "y", code: String(126 + h - 4), note: axisGap })),
]);
export default {
  contract: "docs/figma-contracts/chart-bar.json",
  setId: "15321:84071",
  kind: "chartCard",
  root: ".zen-chart-card__body",
  cases: (vp, { spec }) => ({ ...cardProps(spec), chart: "bar", chartProps: { ...(vertical(vp) ? verticalCase(spec) : horizontalCase(spec)), palette: vp.Color === "Secondary" ? "secondary" : "primary" } }),
  figmaExceptions: [...LANE_PINS.map(([layer, prop, code]) => ({ vp: V, layer, prop, code, note: lanes })), ...AXIS_PINS],
  map: [
    ...cardMap(),
    { figma: "Chart", dom: ".zen-chart", check: ["size", "x", "y"] },
    { figma: "Average-Lane", dom: ".zen-chart__hplot[data-average]", check: ["size"], when: horizontal },
    // ── Vertical ──
    ...Array.from({ length: 6 }, (_, i) => ({ figma: `Chart > Y-Axis > Label#${i}`, dom: `.zen-chart__y > span:nth-child(${6 - i})`, check: ["text", "right", "cy"], when: vertical })),
    { figma: "Chart > Plot", dom: ".zen-chart__plot", check: ["size", "x", "y"], when: vertical },
    { figma: "Chart > Plot > Grid", dom: ".zen-chart__grid", check: ["size", "x", "y"], when: vertical },
    ...[1, 2, 3, 4, 5, 6].map((k) => ({ figma: `Chart > Plot > Grid > Line-${k}`, dom: `.zen-chart__grid > span:nth-child(${k})`, check: ["w", "x", "cy", "stroke"], tolerance: 1, when: vertical })),
    { figma: "Chart > Plot > Rule", dom: ".zen-chart__sector[data-active]", check: ["stroke"], strokeVia: "before", strokeSide: "left", when: vertical },
    ...Array.from({ length: 12 }, (_, k) => [
      { figma: `Chart > Plot > Bars > Column#${k}`, dom: `.zen-chart__column:nth-child(${k + 1})`, check: ["w", "x"], when: has(k, vertical) },
      { figma: `Chart > Plot > Bars > Column#${k} > Lane > Bar`, dom: `.zen-chart__column:nth-child(${k + 1}) > .zen-chart__bar`, check: ["w", "h", "cx", "fill", "radius"], when: has(k, vertical) },
      { figma: `Chart > Plot > X-Axis > Tick#${k}`, dom: `.zen-chart__sector:nth-child(${k + 1})`, check: ["w", "x"], when: has(k, vertical) },
      { figma: `Chart > Plot > X-Axis > Tick#${k} > Wrapper`, dom: `.zen-chart__sector:nth-child(${k + 1}) .zen-chart__x`, check: ["h", "cx", "cy", "fill", "radius"], when: has(k, vertical) },
      { figma: `Chart > Plot > X-Axis > Tick#${k} > Wrapper > Label`, dom: `.zen-chart__sector:nth-child(${k + 1}) .zen-chart__x`, check: ["text"], when: has(k, vertical) },
    ]).flat(),
    { figma: "Chart > Plot > Tooltip-Anchor > Tooltip", dom: ".zen-chart__sector[data-active] .zen-chart__tooltip", check: ["cx"], when: vertical },
    { figma: "Chart > Plot > Tooltip-Anchor > Tooltip > Container", dom: ".zen-chart__sector[data-active] .zen-tooltip", check: ["h", "fill", "radius"], when: vertical },
    { figma: "Chart > Plot > Tooltip-Anchor > Tooltip > Container > Slot > Text > Contents > Info", dom: ".zen-chart__sector[data-active] .zen-tooltip__label", check: ["text"], when: vertical },
    { figma: "Chart > Plot > Average", dom: ".zen-chart__average", check: ["size"], when: vertical },
    // ── Horizontal ──
    { figma: "Chart > Plot > Bars", dom: ".zen-chart__hgrid", check: ["size", "x", "y"], when: horizontal },
    ...[0, 1, 2, 3].map((k) => [
      { figma: `Chart > Plot > Grid > Tick#${k} > Line-${k + 1}`, dom: `.zen-chart__hgrid > span:nth-child(${k + 1})`, check: ["h", "cx", "y", "stroke"], strokeSide: "left", when: horizontal },
      // Figma centres a tick label on its 1px line, code on the line's start edge: half a pixel apart (tolerance 1).
      { figma: `Chart > Plot > Grid > Tick#${k} > Label`, dom: `.zen-chart__haxis > span:nth-child(${k + 1})`, check: ["text", "cx", "y"], tolerance: 1, when: horizontal },
    ]).flat(),
    ...Array.from({ length: 12 }, (_, k) => [
      { figma: `Chart > Categories > Category#${k} > Wrapper`, dom: row(k, 1), check: ["h", "right", "cy", "fill", "radius"], when: has(k, horizontal) },
      { figma: `Chart > Categories > Category#${k} > Wrapper > Label`, dom: row(k, 1), check: ["text"], when: has(k, horizontal) },
      { figma: `Chart > Plot > Bars > Track#${k}`, dom: row(k, 2), check: ["size", "x", "y"], when: has(k, horizontal) },
      { figma: `Chart > Plot > Bars > Track#${k} > Target`, dom: `${row(k, 2)} > .zen-chart__target`, check: ["w", "h", "x", "fill", "radius"], tolerance: 1, when: has(k, horizontal) },
      { figma: `Chart > Plot > Bars > Track#${k} > Bar`, dom: `${row(k, 2)} > .zen-chart__bar`, check: ["w", "h", "x", "fill", "radius"], tolerance: 1, when: has(k, horizontal) },
      { figma: `Chart > Values > Value#${k} > Label`, dom: row(k, 3), check: ["text", "right", "cy"], when: has(k, horizontal) },
    ]).flat(),
    { figma: "Chart > Plot > Average", dom: ".zen-chart__hgrid > .zen-chart__average", check: ["size"], when: horizontal },
  ],
};
