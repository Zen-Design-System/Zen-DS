// Figma Chart/Donut-Chart 15324:80365 (docs/figma-contracts/chart-donut.json): Legend Start · Bottom · End × Total Centre
// · Start × Size Small 120 · Medium 168 · Large 240 · XLarge 320 × Color Primary · Secondary, a DonutChart (`legendPosition`,
// `totalPosition`, `size`, `palette`) in a Chart Card (Heading · FILL Segmented · Chart; the Metric is hidden). Five
// slices in the Color Chart Sector order (the first two swapped under Secondary) with a Surface/Default % pill
// (Label/Small/Medium) on each, the total in the hole (Small: the figure alone in Body/Base/Bold) or above the legend in
// a start column (Total=Start: Body/Small/Regular caption over the Display/4 figure, as the Chart Card's Metric), and the
// legend beside the ring (Spacing/Gap/Large apart) or under it (Spacing/Gap/Medium).
import { cardMap, cardProps, child, legendMap, textOf } from "./_chart-shared.mjs";

const TOTAL = 296800; // "$296.8K"
const SHARES = [30, 23, 18, 17, 12];
const centre = (vp) => vp.Total === "Centre";
const start = (vp) => vp.Total === "Start";
const pill = (i) => `.zen-chart__round > .zen-chart__pill:nth-of-type(${i + 1})`;
export default {
  contract: "docs/figma-contracts/chart-donut.json",
  setId: "15324:80365",
  kind: "chartCard",
  root: ".zen-chart-card__body",
  cases: (vp, { spec }) => {
    const chart = child(spec, "Chart");
    const legend = start(vp) ? child(child(chart, "Start"), "Legend") : child(chart, "Legend");
    const items = legend.c.filter((item) => !item.hidden);
    const data = items.map((item, i) => ({ id: `s${i}`, label: textOf(child(item, "Label")), value: (TOTAL * SHARES[i]) / 100 }));
    return {
      ...cardProps(spec),
      chart: "donut",
      chartProps: {
        data, size: vp.Size.toLowerCase(), format: "usdK", palette: vp.Color === "Secondary" ? "secondary" : "primary",
        ...(start(vp) ? { totalPosition: "start" } : { legendPosition: vp.Legend.toLowerCase() }),
      },
    };
  },
  figmaExceptions: [],
  map: [
    ...cardMap(),
    { figma: "Chart", dom: ".zen-chart-round", check: ["size", "x", "y"] },
    // Figma's Ring frame is the ring; code's ring box spans the row under a Bottom legend and centres the ring in it.
    { figma: "Chart > Ring", dom: ".zen-chart__round", check: ["size", "x", "y"] },
    { figma: "Chart > Ring > Ring-Slot", dom: ".zen-chart__round", check: ["size", "x", "y"] },
    ...SHARES.map((_, i) => [
      { figma: `Chart > Ring > Ring-Slot > Slice#${i}`, dom: `.zen-chart__ring-svg .zen-chart__slice:nth-of-type(${i + 1})`, check: ["fill"], fillVia: "fill" },
      { figma: `Chart > Ring > Ring-Slot > Pill#${i}`, dom: pill(i), check: ["h", "cx", "cy", "fill", "radius"] },
      { figma: `Chart > Ring > Ring-Slot > Pill#${i} > Label`, dom: pill(i), check: ["text"] },
    ]).flat(),
    // The total in the hole, centred on the ring.
    { figma: "Chart > Ring > Centre", dom: ".zen-chart__centre", check: ["cx", "cy"], when: centre },
    { figma: "Chart > Ring > Centre > Value", dom: ".zen-chart__centre-value", check: ["text", "h", "cx"], when: centre },
    { figma: "Chart > Ring > Centre > Caption", dom: ".zen-chart__centre-label", check: ["text", "h", "cx"], when: centre },
    ...legendMap("Chart > Legend", { items: 5, itemName: "Legend-Item", itemY: true, when: centre }),
    { figma: "Chart > Legend > Legend-Item#5", dom: ".zen-chart__legend > li:nth-child(6)", check: ["size"], when: centre },
    // Total=Start: the start column (the total over the legend), the ring at the end.
    { figma: "Chart > Start", dom: ".zen-chart__side", check: ["size", "x", "y"], when: start },
    { figma: "Chart > Start > Total", dom: ".zen-chart__total", check: ["size", "x", "y"], when: start },
    { figma: "Chart > Start > Total > Caption", dom: ".zen-chart__total-label", check: ["text", "size", "x", "y"], when: start },
    { figma: "Chart > Start > Total > Value", dom: ".zen-chart__total-value", check: ["text", "size", "x", "y"], when: start },
    // Figma's Legend frame starts at the total's foot and pads Spacing/Padding/Medium above its items; code's list
    // starts at its first item, Spacing/Gap/Medium under the total: the items compare.
    ...legendMap("Chart > Start > Legend", { items: 5, itemName: "Legend-Item", check: [], itemY: true, when: start }),
  ],
};
