// Figma Chart/Grouped-Bar-Chart 15933:120083 (docs/figma-contracts/chart-grouped-bar.json): Sector 4 · 6 · 7 · 12 × Color
// Primary · Secondary, a GroupedBarChart (`palette`) in a Chart Card (Heading · Metric · Chart · Legend; the Segmented is
// hidden). Per period a group of bars Spacing/Gap/2XSmall apart, centred in the column (70% of it, 12px a bar at least
// until the column can't hold them), each in its series' Color Chart Sector style with Corner-Radius/XSmall on the top
// corners. Neither side draws an active state at rest (code: only under the pointer, the user 2026-10-26). Bar heights
// are read back as values.
import { cardMap, cardProps, child, legendMap, textOf } from "./_chart-shared.mjs";
import { barFrameExceptions, barFrameMap } from "./_chart-bars.mjs";

const count = (vp) => Number(vp.Sector.split("-")[0]);
const Y = ["$0", "$25K", "$50K", "$75K", "$100K", "$125K"];
const group = (k) => `.zen-chart__group:nth-child(${k + 1})`;
export default {
  contract: "docs/figma-contracts/chart-grouped-bar.json",
  setId: "15933:120083",
  kind: "chartCard",
  root: ".zen-chart-card__body",
  cases: (vp, { spec }) => {
    const plot = child(child(spec, "Chart"), "Plot");
    const grid = child(plot, "Grid").h;
    const groups = child(plot, "Marks").c;
    const legend = child(spec, "Legend").c;
    const series = legend.map((item, i) => ({ id: `s${i}`, label: textOf(child(item, "Label")) }));
    const data = child(plot, "X-Axis").c.map((tick, i) => ({
      label: textOf(tick),
      values: Object.fromEntries(child(groups[i], "Bars").c.map((lane, si) => [series[si].id, Math.round((lane.c[0].h / grid) * 125000)])),
    }));
    return { ...cardProps(spec), chart: "grouped", chartProps: { data, series, height: 36 + grid + 28, format: "usdK", palette: vp.Color === "Secondary" ? "secondary" : "primary" } };
  },
  figmaExceptions: [
    ...barFrameExceptions({ grid: 180, tooltipLane: true, vp: { Sector: "4-Sectors" } }),
    ...["6-Sectors", "7-Sectors", "12-Sectors"].flatMap((Sector) => barFrameExceptions({ grid: 244, tooltipLane: true, vp: { Sector } })),
    // Code's lanes (36 / 28 around Figma's grid, Figma 6 / 26) put the legend 32px lower.
    { vp: { Sector: "4-Sectors" }, layer: "Legend", prop: "y", code: "386", note: "Code's 36 / 28 lanes (Figma 6 / 26, see Chart.h) move the legend 32px down." },
    ...["6-Sectors", "7-Sectors", "12-Sectors"].map((Sector) => ({ vp: { Sector }, layer: "Legend", prop: "y", code: "450", note: "Code's 36 / 28 lanes (Figma 6 / 26, see Chart.h) move the legend 32px down." })),
    // Figma-side inconsistency: 6-Sectors sizes its groups at 70% of the whole 52.67px column (36.87, bars 16.43), where
    // 4-Sectors and 7-Sectors take 70% of the column inside its 2px padding (52.5 → 24.3, 28.8 → 12.4), as code does
    // (48.67 → bars 15.03, the group centred 7.3px in).
    ...Array.from({ length: 6 }, (_, k) => [0, 1].map((b) => [
      { vp: { Sector: "6-Sectors" }, layer: `Chart > Plot > Marks > Group#${k} > Bars > Lane#${b} > *`, prop: "w", code: (0.7 * (316 / 6 - 4) - 4) / 2,
        note: "6-Sectors groups take 70% of the whole column; 4- and 7-Sectors (and code) 70% of it inside its 2px padding." },
      { vp: { Sector: "6-Sectors" }, layer: `Chart > Plot > Marks > Group#${k} > Bars > Lane#${b} > *`, prop: "x", code: (k * 316) / 6 + 2 + 7.3 + b * ((0.7 * (316 / 6 - 4) - 4) / 2 + 4),
        note: "6-Sectors groups take 70% of the whole column (see w), so their bars start 1.4px further out." },
    ]).flat()).flat(),
  ],
  map: [
    ...cardMap(),
    ...barFrameMap({ yLabels: Y, count }),
    ...Array.from({ length: 12 }, (_, k) => [
      { figma: `Chart > Plot > Marks > Group#${k}`, dom: group(k), check: ["size", "x"], figmaRoot: "Chart > Plot > Grid", root: ".zen-chart__grid", when: (vp) => count(vp) > k },
      ...[0, 1].map((b) => ({ figma: `Chart > Plot > Marks > Group#${k} > Bars > Lane#${b} > *`, dom: `${group(k)} > .zen-chart__group-bar:nth-child(${b + 1})`, check: ["size", "x", "y", "fill", "radius", "opacity"],
        figmaRoot: "Chart > Plot > Grid", root: ".zen-chart__grid", when: (vp) => count(vp) > k })),
    ]).flat(),
    ...legendMap("Legend"),
  ],
};
