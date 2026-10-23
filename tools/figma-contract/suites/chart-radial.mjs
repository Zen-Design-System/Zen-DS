// Figma Chart/Radial-Chart 15325:1135 (docs/figma-contracts/chart-radial.json): Legend Bottom · End × Size Small 120 ·
// Medium 168 · Large 240 · XLarge 320 × Color Primary · Secondary, a RadialChart (`legendPosition`, `size`, `palette`) in a
// Chart Card (Heading · Metric with its description alone · Chart; the Segmented is hidden). Three concentric rings
// (10px with 8px between them; 6 and 4 at Small) in the Color Chart Sector order with round ends, each over a dotted 2px
// Border/Neutral/Subtle track, the outer ring's value and label in the hole (Small: the figure alone), and the legend
// under the rings (Spacing/Gap/Medium) or beside them (Spacing/Gap/Large).
import { cardMap, cardProps, child, legendMap, textOf } from "./_chart-shared.mjs";

const VALUES = [36, 72, 21];
const PX = { Small: 120, Medium: 168, Large: 240, XLarge: 320 };
const sized = (Size) => (vp) => vp.Size === Size;
export default {
  contract: "docs/figma-contracts/chart-radial.json",
  setId: "15325:1135",
  kind: "chartCard",
  root: ".zen-chart-card__body",
  cases: (vp, { spec }) => {
    const items = child(child(spec, "Chart"), "Legend").c.filter((item) => !item.hidden);
    const data = items.map((item, i) => ({ id: `s${i}`, label: textOf(child(item, "Label")), value: VALUES[i] }));
    return { ...cardProps(spec), chart: "radial", chartProps: { data, size: vp.Size.toLowerCase(), legendPosition: vp.Legend.toLowerCase(), palette: vp.Color === "Secondary" ? "secondary" : "primary" } };
  },
  figmaExceptions: [
    // Figma-side inconsistency: Radial Large sets its centre figure in Display/4 where Donut Large keeps Heading/4 (both
    // XLarge sets take Display/4, both Medium Heading/4). Code keeps one rule for both rings: Heading/4 up to Large.
    ...["Bottom", "End"].flatMap((Legend) => [
      { vp: { Legend, Size: "Large" }, layer: "Chart > Ring > Centre > Value", prop: "text", code: "Inter 600 20px/28px ls=-0.6px none", note: "Radial Large: Display/4 in Figma, Heading/4 in Donut Large and in code (asked in QUESTIONS.md Charts (P2) (e))." },
      { vp: { Legend, Size: "Large" }, layer: "Chart > Ring > Centre > Value", prop: "h", code: "28", note: "Radial Large: Display/4 in Figma (see text)." },
    ]),
    // Figma-side slip: the caption keeps Medium's FIXED 84px box at every size, so XLarge wraps "Online banking
    // redesign" in a 320px ring; code's caption spans the hole (inset 24%) and fits it on one line.
    ...["Bottom", "End"].map((Legend) => ({ vp: { Legend, Size: "XLarge" }, layer: "Chart > Ring > Centre > Caption", prop: "h", code: "16",
      note: "XLarge keeps Medium's fixed 84px caption box in Figma; code's caption spans the hole." })),
  ],
  map: [
    ...cardMap(),
    // Under the rings the three legend items fill 346 of 352px in Figma, so a rasteriser whose Inter runs a little wider
    // (CI's Linux) wraps them: the Bottom legend's height and the chart's are compared beside the rings only (End).
    { figma: "Chart", dom: ".zen-chart-round", check: ["size", "x", "y"], when: (vp) => vp.Legend === "End" },
    { figma: "Chart", dom: ".zen-chart-round", check: ["w", "x", "y"], when: (vp) => vp.Legend === "Bottom" },
    { figma: "Chart > Ring", dom: ".zen-chart__round", check: ["size", "x", "y"] },
    // Tracks and rings: SVG circles in viewBox units (100 = the diameter), so strokes scale by the ring's px / 100.
    ...Object.entries(PX).flatMap(([Size, px]) => [0, 1, 2].flatMap((i) => [
      { figma: `Chart > Ring > Track#${i}`, dom: `.zen-chart__ring-svg .zen-chart__track:nth-of-type(${i + 1})`, check: ["size", "x", "y", "stroke"], strokeVia: "svg", strokeScale: px / 100, when: sized(Size) },
      { figma: `Chart > Ring > Arc#${i}`, dom: `.zen-chart__ring-svg .zen-chart__arc:nth-of-type(${i + 4})`, check: ["stroke"], strokeVia: "svg", strokeScale: px / 100, when: sized(Size) },
    ])),
    { figma: "Chart > Ring > Centre", dom: ".zen-chart__centre", check: ["cx", "cy"] },
    { figma: "Chart > Ring > Centre > Value", dom: ".zen-chart__centre-value", check: ["text", "h", "cx"] },
    { figma: "Chart > Ring > Centre > Caption", dom: ".zen-chart__centre-label", check: ["text", "h", "cx"] },
    ...legendMap("Chart > Legend", { items: 3, itemName: "Legend-Item", itemY: true, when: (vp) => vp.Legend === "End" }),
    ...legendMap("Chart > Legend", { items: 3, itemName: "Legend-Item", check: ["w", "x", "y"], when: (vp) => vp.Legend === "Bottom" }),
  ],
};
