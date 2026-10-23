// Figma Chart/Gauge-Chart 15968:130382 (docs/figma-contracts/chart-gauge.json): Color Primary · Secondary, a GaugeChart
// (`palette`) in a Chart Card (Heading · Metric · Gauge · Legend; the Segmented is hidden). A 240px half ring a tenth of
// it thick: the Background/Neutral/Subtle track, the value in Color Chart Sector/Primary, a 3px Sector/Secondary target
// tick (the two swapped under Secondary); the reading in the hole (Heading/2 · Strongest over Body/Small/Regular ·
// Content/Neutral/Base), its foot Spacing/Gap/2XSmall under the ring's base; the scale's ends (Label/Small/Medium ·
// Content/Neutral/Light) under the ring's two ends; the legend Spacing/Gap/Small apart.
import { cardMap, cardProps, child, legendMap, textOf } from "./_chart-shared.mjs";

const SIZE = 240;
export default {
  contract: "docs/figma-contracts/chart-gauge.json",
  setId: "15968:130382",
  kind: "chartCard",
  root: ".zen-chart-card__body",
  cases: (vp, { spec }) => {
    const legend = child(spec, "Legend").c.map((item) => textOf(child(item, "Label")));
    return { ...cardProps(spec), chart: "gauge", chartProps: { value: 82, target: 85, actualLabel: legend[0], targetLabel: legend[1], size: SIZE, palette: vp.Color === "Secondary" ? "secondary" : "primary" } };
  },
  figmaExceptions: [
    // Figma-side slip: the Gauge frame is FIXED at 140px while its content ends at 138 (the ring's 120, the ends' 6px gap
    // and 12px line); code's gauge hugs its content, so the legend sits 2px higher.
    { vp: {}, layer: "Gauge", prop: "h", code: "138", note: "Figma's Gauge frame is fixed 2px taller than its content (the ends end at 138)." },
    { vp: {}, layer: "Legend", prop: "y", code: "280", note: "Figma's Gauge frame is fixed 2px taller than its content (see Gauge.h)." },
  ],
  map: [
    ...cardMap(),
    { figma: "Gauge", dom: ".zen-chart--gauge", check: ["size", "x", "y"] },
    // The half ring: Figma's ellipses (an arc of 240 × 240) span the dial's width; their fills are code's track fill and
    // value stroke.
    { figma: "Gauge > Track", dom: ".zen-chart__gauge-dial", check: ["w", "x", "y"] },
    { figma: "Gauge > Track", dom: ".zen-chart__gauge-track", check: ["fill"], fillVia: "fill" },
    { figma: "Gauge > Value", dom: ".zen-chart__gauge-value", check: ["fill"], fillVia: "stroke" },
    { figma: "Gauge > Target", dom: ".zen-chart__gauge-target", check: ["cx", "cy", "stroke"], strokeVia: "svg", strokeScale: SIZE / 100 },
    { figma: "Gauge > Readout", dom: ".zen-chart__gauge-readout", check: ["h", "cx", "y"] },
    { figma: "Gauge > Readout > 82%", dom: ".zen-chart__gauge-figure", check: ["text", "h", "cx", "y"] },
    { figma: "Gauge > Readout > Target 85%", dom: ".zen-chart__gauge-caption", check: ["text", "h", "cx", "y"] },
    { figma: "Gauge > 0%", dom: ".zen-chart__gauge-ends > span:first-child", check: ["text", "cx", "y"] },
    { figma: "Gauge > 100%", dom: ".zen-chart__gauge-ends > span:last-child", check: ["text", "cx", "y"] },
    ...legendMap("Legend"),
  ],
};
