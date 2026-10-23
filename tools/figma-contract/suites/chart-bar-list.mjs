// Figma Chart/Bar-List 15487:2473 (docs/figma-contracts/chart-bar-list.json): a BarList in a Chart Card (Heading · Metric ·
// Rows; the Segmented is hidden). Column labels (Caption/Medium · Content/Neutral/Light) over 32px rows Spacing/Gap/XSmall
// apart: a track whose Fill is its share of the leader (Color Chart Sector/Primary at 24%, the active row 48%,
// Corner-Radius/Small) with the name inside (Body/Small/Medium · Strongest, Spacing/Padding/Small in), then the 64px
// value column (right-aligned) Spacing/Gap/Small after it.
import { cardMap, cardProps, child, textOf } from "./_chart-shared.mjs";

const row = (k) => `.zen-chart__list-row:nth-child(${k + 1})`;
export default {
  contract: "docs/figma-contracts/chart-bar-list.json",
  setId: "15487:2473",
  kind: "chartCard",
  root: ".zen-chart-card__body",
  cases: (vp, { spec }) => {
    const rows = child(spec, "Rows");
    const [label, value] = child(rows, "Columns").c.map(textOf);
    const data = rows.c.filter((node) => node.n === "Row").map((r) => ({ label: textOf(child(r, "Bar").c[1]), value: Number(textOf(r.c[1]).replace(/[^\d]/g, "")) }));
    return { ...cardProps(spec), chart: "barList", chartProps: { data, headers: { label, value }, format: "usd", initialIndex: 0 } };
  },
  map: [
    ...cardMap(),
    { figma: "Rows", dom: ".zen-chart__list", check: ["size", "x", "y"] },
    { figma: "Rows > Columns", dom: ".zen-chart__list-head", check: ["size", "x", "y"] },
    { figma: "Rows > Columns > *#0", dom: ".zen-chart__list-head > :first-child", check: ["text", "x", "y"] },
    { figma: "Rows > Columns > *#1", dom: ".zen-chart__list-head > :last-child", check: ["text", "right", "y"] },
    ...[0, 1, 2, 3, 4].map((k) => [
      { figma: `Rows > Row#${k}`, dom: row(k), check: ["size", "x", "y"] },
      { figma: `Rows > Row#${k} > Bar`, dom: `${row(k)} .zen-chart__list-track`, check: ["size", "x", "y"] },
      { figma: `Rows > Row#${k} > Bar > Fill`, dom: `${row(k)} .zen-chart__list-bar`, check: ["size", "x", "y", "fill", "radius", "opacity"] },
      { figma: `Rows > Row#${k} > Bar > *#1`, dom: `${row(k)} .zen-chart__list-name`, check: ["text", "h", "cy"] },
      { figma: `Rows > Row#${k} > *#1`, dom: `${row(k)} .zen-chart__list-value`, check: ["text", "h", "right", "cy"] },
    ]).flat(),
  ],
};
