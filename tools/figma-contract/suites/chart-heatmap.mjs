// Figma Chart/Heatmap-Chart 15326:1043 (docs/figma-contracts/chart-heatmap.json): a HeatmapChart in a Chart Card (Heading ·
// Metric with its description alone · Chart; the Segmented is hidden). Column labels on top, row labels in a 40px start
// column (Label/Small/Medium · Content/Neutral/Light, Spacing/Padding/2XSmall before the cells), one 24px cell per row ×
// column (Element-Size/Popular/Medium, Corner-Radius/Small, Spacing/Gap/2XSmall apart) on the five Support/Brand steps
// (Pale · Soft · Solid · Rich · Deep), and the Less → More scale at the end (Caption/Regular, 12px Corner-Radius/XSmall
// steps). The active cell (its 2px ring and Tooltip) shows on hover or the arrow keys only, so the static case has none.
import { cardMap, cardProps, child, textOf } from "./_chart-shared.mjs";

const STEPS = ["Pale", "Soft", "Solid", "Rich", "Deep"];
const VALUE = { Pale: 0, Soft: 30, Solid: 50, Rich: 70, Deep: 90 }; // levelOf(v, 100): ⌊v / 100 × 5⌋
const rowsOf = (spec) => child(spec, "Chart").c.filter((node) => node.n === "Row");
const cellAt = (r, c) => `.zen-chart__cells > :nth-child(${r * 8 + c + 2})`;
// Figma-side slip: the rows FILL a 292px chart, 21.6px each, shorter than their FIXED 24px cells, which overflow by 1.2px
// on each side (so they sit 1.6px apart, not Spacing/Gap/2XSmall). Code keeps each row its cell's height: row r is
// 2.4r px lower, and the scale Spacing/Gap/Medium under the grid (QUESTIONS.md Charts (P2) (a), "heatmap axis gaps 8 vs
// 16") rather than the Chart's Gap/2XSmall plus the Scale's Padding/2XSmall.
const rowSlip = "Figma's rows are 21.6px, shorter than their 24px cells (Element-Size/Popular/Medium); code keeps a row as tall as its cell.";
const ROW_CY = (r) => 112 + 28 * r; // Chart at 84, the column labels 12 + Gap/2XSmall, then 24px rows 4px apart.
export default {
  contract: "docs/figma-contracts/chart-heatmap.json",
  setName: "Chart/Heatmap-Chart",
  setId: "15326:1043",
  kind: "chartCard",
  root: ".zen-chart-card__body",
  cases: (vp, { spec }) => {
    const rows = rowsOf(spec);
    return {
      ...cardProps(spec),
      chart: "heatmap",
      chartProps: {
        rows: rows.map((row) => textOf(child(row, "Row-Label"))),
        columns: child(child(spec, "Chart"), "Columns").c.filter((node) => node.n === "Label").map(textOf),
        values: rows.map((row) => row.c.filter((node) => node.n === "Cell").map((cell) => VALUE[cell.fill[0].v.split("/").pop()])),
        max: 100,
      },
    };
  },
  figmaExceptions: [
    { vp: {}, layer: "Chart", prop: "h", code: "324", note: `${rowSlip} The scale sits Spacing/Gap/Medium under the grid in code, 8px in Figma (QUESTIONS.md Charts (P2) (a)).` },
    ...Array.from({ length: 10 }, (_, r) => [
      { vp: {}, layer: `Chart > Row#${r} > Row-Label > Label`, prop: "cy", code: String(ROW_CY(r)), note: rowSlip },
      ...Array.from({ length: 7 }, (_, c) => ({ vp: {}, layer: `Chart > Row#${r} > Cell#${c}`, prop: "cy", code: String(ROW_CY(r)), note: rowSlip })),
    ]).flat(),
    // Figma shows an active cell (1 pm, Tue: the 2px ring and Tooltip) whose row and column labels light up to
    // Content/Neutral/Strongest; code's static case has no active cell, so those two labels stay Content/Neutral/Light.
    ...["Chart > Row#4 > Row-Label > Label", "Chart > Columns > Label#1"].flatMap((layer) => ["rgba(0, 0, 0, 0.486)", "rgba(255, 255, 255, 0.596)"].map((code) => ({ vp: {}, layer, prop: "color", code,
      note: "Figma's active cell lights its row and column labels; the static case has no active cell (hover or the arrow keys pick one)." }))),
    ...["Label#0", "Step#0", "Step#1", "Step#2", "Step#3", "Step#4", "Label#1"].map((layer) => ({ vp: {}, layer: `Chart > Scale > ${layer}`, prop: "cy", code: String(ROW_CY(9) + 12 + 16 + 8),
      note: "Heatmap scale: Spacing/Gap/Medium under the grid in code (the chart block's gap), 8px in Figma (QUESTIONS.md Charts (P2) (a)); the rows above are taller too (see Cell.cy)." })),
  ],
  map: [
    ...cardMap(),
    // The chart (the grid and the scale): code's chart block holds both, as Figma's Chart frame.
    { figma: "Chart", dom: ".zen-chart-block", check: ["size", "x", "y"] },
    ...Array.from({ length: 7 }, (_, c) => ({ figma: `Chart > Columns > Label#${c}`, dom: `.zen-chart__heat > .zen-chart__heat-label:nth-child(${c + 2})`, check: ["text", "cx", "y"] })),
    ...Array.from({ length: 10 }, (_, r) => [
      { figma: `Chart > Row#${r} > Row-Label > Label`, dom: `.zen-chart__cells > :nth-child(${r * 8 + 1})`, check: ["text", "cy"] },
      // The label column: 40px, the label end-aligned Spacing/Padding/2XSmall before the cells.
      { figma: `Chart > Row#${r} > Row-Label`, dom: `.zen-chart__cells > :nth-child(${r * 8 + 1})`, check: ["right"] },
      ...Array.from({ length: 7 }, (_, c) => ({ figma: `Chart > Row#${r} > Cell#${c}`, dom: cellAt(r, c), check: ["size", "x", "cy", "fill", "radius"] })),
    ]).flat(),
    // The scale at the end: More, the five steps and Less before it. "More"'s width differs by a pixel or two between
    // font rasterisers, so the steps and "Less" are placed from the first step.
    ...STEPS.map((_, i) => [
      { figma: `Chart > Scale > Step#${i}`, dom: `.zen-chart__scale > :nth-child(${i + 2})`, check: ["size", "cy", "fill", "radius"] },
      { figma: `Chart > Scale > Step#${i}`, dom: `.zen-chart__scale > :nth-child(${i + 2})`, check: ["x"], figmaRoot: "Chart > Scale > Step#0", root: ".zen-chart__scale > :nth-child(2)" },
    ]).flat(),
    { figma: "Chart > Scale > Label#0", dom: ".zen-chart__scale > :nth-child(1)", check: ["text", "cy"] },
    { figma: "Chart > Scale > Label#0", dom: ".zen-chart__scale > :nth-child(1)", check: ["right"], figmaRoot: "Chart > Scale > Step#0", root: ".zen-chart__scale > :nth-child(2)" },
    { figma: "Chart > Scale > Label#1", dom: ".zen-chart__scale > :nth-child(7)", check: ["text", "right", "cy"] },
  ],
};
