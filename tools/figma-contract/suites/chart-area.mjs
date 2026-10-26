// Figma Chart/Area-Chart 15484:2663 (docs/figma-contracts/chart-area.json): Type Area · Stacked × Sector 4 · 6 · 7 · 12 ×
// Color Primary · Secondary, an AreaChart (`type`, `palette`) in a Chart Card (Heading · Metric · Chart · the Stacked
// legend; the Segmented is hidden). The bar charts' frame: a right-aligned Y-Axis, the Grid (Line-1 … Line-5 dashed
// Border/Neutral/Pale over a solid Border/Active/Neutral/Subtle Baseline), the X-Axis, and the Marks: each series a 2px
// Color Chart Sector line over its area fading Solid → Subtle at 30% (Accent, Neutral, Support/Cyan; the first two
// swapped under Secondary). The active period (the rule from the dot down, the 12px dot and the Tooltip beside it) is the
// set's Hover, off at rest as code's (only under the pointer, the user 2026-10-26).
// The values are read back from the marks' bounds (the active point at the top, each series' lowest point at its foot),
// so every line and area box compares.
import { cardMap, cardProps, child, legendMap, textOf } from "./_chart-shared.mjs";

const SCALE = 2500; // 0 … 2.5K: the six Figma Y labels.
const GRID = 158; // Figma's grid height; code's plot is 6 + 158 + 28 tall (the lanes, below).
const stacked = (vp) => vp.Type === "Stacked";
const single = (vp) => vp.Type === "Area";
const count = (vp) => Number(vp.Sector.split("-")[0]);
const SERIES = ["Design", "Engineering", "Delivery"];
const valueAt = (y) => Math.round((SCALE * (1 - y / GRID)) * 10) / 10;

// A series' top line from its lowest to its highest point over `n` periods, rising to the last (the active one).
const rising = (low, high, n) => Array.from({ length: n }, (_, i) => low + ((high - low) * i) / (n - 1));

export default {
  contract: "docs/figma-contracts/chart-area.json",
  setId: "15484:2663",
  // The hover state (Hover off at rest) hides its parent layers (Tooltip-Anchor, Active), not the marks in them.
  inheritHidden: true,
  kind: "chartCard",
  root: ".zen-chart-card__body",
  cases: (vp, { spec }) => {
    const plot = child(child(spec, "Chart"), "Plot");
    const marks = child(plot, "Marks");
    const labels = child(plot, "X-Axis").c.map(textOf);
    const n = labels.length;
    // Each line's box: its top is the highest point, its foot the lowest (values on the 0 … 2.5K grid).
    const tops = (stacked(vp) ? SERIES.map((name) => child(marks, `${name}-Line`)) : [child(marks, "Line")])
      .map((line) => rising(valueAt(line.y + line.h), valueAt(line.y), n));
    const series = (stacked(vp) ? SERIES : ["Hours"]).map((label, i) => ({ id: `s${i}`, label }));
    const data = labels.map((label, i) => ({ label, values: Object.fromEntries(series.map((s, si) => [s.id, tops[si][i] - (si ? tops[si - 1][i] : 0)])) }));
    return {
      ...cardProps(spec),
      chart: "area",
      chartProps: { data, series, type: stacked(vp) ? "stacked" : "area", height: 6 + GRID + 28, palette: vp.Color === "Secondary" ? "secondary" : "primary" },
    };
  },
  figmaExceptions: [
    // Open question (QUESTIONS.md Charts (P2) (a), chart-parity-audit §2.5): the X-label lane is 28px in code (the bar
    // charts' lane, a 20px pill Spacing/Gap/2XSmall above the foot), 26px in Figma with plain labels at the foot. The case
    // keeps Figma's 158px grid, so the chart is 2px taller in code and its X labels sit 8px higher.
    ...["Chart", "Chart > Plot"].map((layer) => ({ vp: {}, layer, prop: "h", code: "192", note: "Area lanes: 6 / 28 in code, 6 / 26 in Figma (QUESTIONS.md Charts (P2) (a))." })),
    ...Array.from({ length: 12 }, (_, k) => ({ vp: {}, layer: `Chart > Plot > X-Axis > Tick#${k} > *`, prop: "cy", code: "304",
      note: "Area X labels: a 20px pill Spacing/Gap/2XSmall above the plot's foot in code, plain text at the foot in Figma (QUESTIONS.md Charts (P2) (a))." })),
    { vp: { Type: "Stacked" }, layer: "Legend", prop: "y", code: "334", note: "Area lanes: the chart is 2px taller in code (see Chart.h)." },
  ],
  map: [
    ...cardMap(),
    { figma: "Chart", dom: ".zen-chart", check: ["size", "x", "y"] },
    ...["0", "500", "1K", "1.5K", "2K", "2.5K"].map((label, i) => ({ figma: `Chart > Y-Axis > ${label}`, dom: `.zen-chart__y > span:nth-child(${i + 1})`, check: ["text", "right", "cy"] })),
    { figma: "Chart > Plot", dom: ".zen-chart__plot", check: ["size", "x", "y"] },
    { figma: "Chart > Plot > Grid", dom: ".zen-chart__grid", check: ["size", "x", "y"] },
    // Gridlines bottom-up: the Baseline is tick 0; centred strokes, code's border just above (tolerance 1, as the Trend).
    ...["Baseline", "Line-1", "Line-2", "Line-3", "Line-4", "Line-5"].map((name, i) => ({ figma: `Chart > Plot > Grid > ${name}`, dom: `.zen-chart__grid > span:nth-child(${i + 1})`, check: ["w", "x", "cy", "stroke", "dash"], tolerance: 1 })),
    ...Array.from({ length: 12 }, (_, k) => [
      { figma: `Chart > Plot > X-Axis > Tick#${k}`, dom: `.zen-chart__sector:nth-child(${k + 1})`, check: ["w", "x"], when: (vp) => count(vp) > k },
      { figma: `Chart > Plot > X-Axis > Tick#${k} > *`, dom: `.zen-chart__sector:nth-child(${k + 1}) .zen-chart__x`, check: ["text", "cx", "cy"], when: (vp) => count(vp) > k },
    ]).flat(),
    { figma: "Chart > Plot > Marks", dom: ".zen-chart__marks", check: ["size", "x", "y"] },
    // Type=Area: one line over its fade, the active period's rule, dot and Tooltip.
    { figma: "Chart > Plot > Marks > Area", dom: ".zen-chart__area-band", check: ["size", "x", "y", "fill"], fillVia: "gradient", when: single },
    { figma: "Chart > Plot > Marks > Line", dom: ".zen-chart__area-line", check: ["size", "x", "y", "stroke"], strokeVia: "svg", when: single },
    { figma: "Chart > Plot > Marks > Rule", dom: ".zen-chart__area-rule", check: ["h", "cx", "y", "stroke"], strokeSide: "left", when: single },
    { figma: "Chart > Plot > Marks > Dot-Anchor > Dot", dom: ".zen-chart__area-dot", check: ["size", "cx", "cy", "fill", "stroke"], when: single },
    // The Tooltip a dot's width before the point: Figma 5.5px from the dot, code 6 (tolerance 1).
    { figma: "Chart > Plot > Tooltip-Anchor > Tooltip", dom: ".zen-chart__point-tip", check: ["right", "cy"], tolerance: 1, when: single },
    { figma: "Chart > Plot > Tooltip-Anchor > Tooltip > Container", dom: ".zen-chart__point-tip .zen-tooltip", check: ["h", "fill", "radius"], when: single },
    { figma: "Chart > Plot > Tooltip-Anchor > Tooltip > Container > Slot > Text > Contents > Info", dom: ".zen-chart__point-tip .zen-tooltip__label", check: ["text"], when: single },
    // Type=Stacked: each band (its fade) and its top line, bottom-up.
    ...SERIES.map((name, si) => [
      { figma: `Chart > Plot > Marks > ${name}-Area`, dom: `.zen-chart__svg > g:nth-of-type(${si + 1}) > .zen-chart__area-band`, check: ["size", "x", "y", "fill"], fillVia: "gradient", when: stacked },
      { figma: `Chart > Plot > Marks > ${name}-Line`, dom: `.zen-chart__svg > g:nth-of-type(${si + 1}) > .zen-chart__area-line`, check: ["size", "x", "y", "stroke"], strokeVia: "svg", when: stacked },
    ]).flat(),
    ...legendMap("Legend", { items: 3, when: stacked }),
  ],
};
