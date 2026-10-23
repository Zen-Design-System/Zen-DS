// Figma Chart/Funnel-Chart 15968:130460 (docs/figma-contracts/chart-funnel.json): Color Primary · Secondary, a FunnelChart
// (`palette`) in a Chart Card (Heading · Metric · Stages; the Segmented is hidden). One 32px row per stage, rows
// Spacing/Gap/XSmall apart and columns Spacing/Gap/Small: the name (Body/Small/Medium · Strongest) over its count
// (Caption/Regular · Content/Neutral/Base) in an 84px start column, the bar centred in its track as wide as its share of
// the first stage (Color Chart Sector/Primary, the last stage Sector/Secondary, swapped under Secondary;
// Corner-Radius/Small), the share in a 40px end column (Body/Small/Medium · Strongest, end-aligned).
import { cardMap, cardProps, child, textOf } from "./_chart-shared.mjs";

const stage = (k) => `.zen-chart__stage:nth-child(${k + 1})`;
export default {
  contract: "docs/figma-contracts/chart-funnel.json",
  setId: "15968:130460",
  kind: "chartCard",
  root: ".zen-chart-card__body",
  cases: (vp, { spec }) => {
    // Figma draws each bar at its rounded share (Negotiation 94 of 480 → 20% → 41px), so the values are read back from
    // the bars' widths (the first stage's count over its full track); the counts' text is not compared.
    const rows = child(spec, "Stages").c;
    const first = Number(textOf(child(rows[0], "Label").c[1]));
    const data = rows.map((row) => {
      const track = child(row, "Track");
      return { label: textOf(child(row, "Label").c[0]), value: Math.round((child(track, "Bar").w / track.w) * first * 10) / 10 };
    });
    return { ...cardProps(spec), chart: "funnel", chartProps: { data, palette: vp.Color === "Secondary" ? "secondary" : "primary" } };
  },
  map: [
    ...cardMap(),
    { figma: "Stages", dom: ".zen-chart__stages", check: ["size", "x", "y"] },
    ...[0, 1, 2, 3, 4].map((k) => [
      { figma: `Stages > Stage#${k}`, dom: stage(k), check: ["size", "x", "y"] },
      { figma: `Stages > Stage#${k} > Label`, dom: `${stage(k)} .zen-chart__stage-label`, check: ["size", "x", "y"] },
      { figma: `Stages > Stage#${k} > Label > *#0`, dom: `${stage(k)} .zen-chart__stage-name`, check: ["text", "h", "x", "y"] },
      { figma: `Stages > Stage#${k} > Label > *#1`, dom: `${stage(k)} .zen-chart__stage-count`, check: ["text", "h", "x", "y"] },
      { figma: `Stages > Stage#${k} > Track`, dom: `${stage(k)} .zen-chart__stage-track`, check: ["size", "x", "y"] },
      // Figma rounds each bar to whole pixels (65% of 204 = 132.6 → 133): tolerance 1.
      { figma: `Stages > Stage#${k} > Track > Bar`, dom: `${stage(k)} .zen-chart__stage-bar`, check: ["size", "cx", "y", "fill", "radius"], tolerance: 1 },
      { figma: `Stages > Stage#${k} > *#2`, dom: `${stage(k)} .zen-chart__stage-share`, check: ["text", "h", "right", "cy"] },
    ]).flat(),
  ],
};
