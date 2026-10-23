// Figma Chart/Bullet-Chart 15968:130554 (docs/figma-contracts/chart-bullet.json): Color Primary · Secondary, a BulletChart
// (`palette`) in a Chart Card (Heading · Metric · Rows · Legend; the Segmented is hidden). Three goals Spacing/Gap/Medium
// apart; each its label (Body/Small/Medium · Strongest) and "actual of target" (Body/Small/Regular · Content/Neutral/Base)
// over a 16px Corner-Radius/Rounded track (Border/Neutral/Subtle/Pressed at 50%), Spacing/Gap/XSmall between them; the
// actual an 8px Color Chart Sector/Primary bar inset 4px, the target a 3px Sector/Secondary tick 4px past the track (the
// two swapped under Secondary); the legend leads at the start, Spacing/Gap/Small apart. Figma's bars are drawn by hand
// against no common scale, so each row's actual and target are read back from the bar and the tick on a 0 … 100 track.
import { cardMap, cardProps, child, legendMap, textOf } from "./_chart-shared.mjs";

const INSET = 4; // Spacing/Padding/2XSmall: the actual's inset, and the tick's travel starts there too.
const goal = (k) => `.zen-chart__bullet:nth-child(${k + 1})`;
export default {
  contract: "docs/figma-contracts/chart-bullet.json",
  setId: "15968:130554",
  kind: "chartCard",
  root: ".zen-chart-card__body",
  cases: (vp, { spec }) => {
    const data = child(spec, "Rows").c.map((row) => {
      const bullet = child(row, "Bullet");
      const inner = bullet.w - 2 * INSET;
      const target = child(bullet, "Target");
      return {
        label: textOf(child(row, "Label").c[0]),
        value: Math.round((child(bullet, "Actual").w / inner) * 1000) / 10,
        target: Math.round(((target.x + target.w / 2 - INSET) / inner) * 1000) / 10,
        max: 100,
      };
    });
    const legend = child(spec, "Legend").c.map((item) => textOf(child(item, "Label")));
    return { ...cardProps(spec), chart: "bullet", chartProps: { data, actualLabel: legend[0], targetLabel: legend[1], palette: vp.Color === "Secondary" ? "secondary" : "primary" } };
  },
  // Figma-side slip: Rows binds Spacing/Gap/Medium (16) but spreads its goals SPACE_BETWEEN inside a set FIXED at 294px,
  // 16px short of the goals and two 16px gaps, so they sit 8px apart. Code keeps the bound Gap/Medium (as the Funnel's
  // Stages, whose space-between height matches its Gap/XSmall exactly): goal k is 8k px lower, the legend 16.
  figmaExceptions: [
    { vp: {}, layer: "Rows", prop: "h", code: "152", note: "Bullet Rows: Gap/Medium bound, but SPACE_BETWEEN in a set fixed 16px short (goals 8px apart in Figma)." },
    { vp: {}, layer: "Legend", prop: "y", code: "294", note: "Bullet Rows: 16px taller in code (see Rows.h)." },
    ...[1, 2].flatMap((k) => [["", 174], [" > Label", 174], [" > Label > *#0", 174], [" > Label > *#1", 174], [" > Bullet", 198], [" > Bullet > Actual", 202], [" > Bullet > Target", 194]]
      .map(([layer, y]) => ({ vp: {}, layer: `Rows > Goal#${k}${layer}`, prop: "y", code: String(y + (k - 1) * 48 + 8 * k), note: "Bullet Rows: goals Gap/Medium apart in code, 8px in Figma (see Rows.h)." }))),
  ],
  map: [
    ...cardMap(),
    { figma: "Rows", dom: ".zen-chart__bullet-rows", check: ["size", "x", "y"] },
    ...[0, 1, 2].map((k) => [
      { figma: `Rows > Goal#${k}`, dom: goal(k), check: ["size", "x", "y"] },
      { figma: `Rows > Goal#${k} > Label`, dom: `${goal(k)} .zen-chart__bullet-head`, check: ["size", "x", "y"] },
      { figma: `Rows > Goal#${k} > Label > *#0`, dom: `${goal(k)} .zen-chart__bullet-name`, check: ["text", "h", "x", "y"] },
      { figma: `Rows > Goal#${k} > Label > *#1`, dom: `${goal(k)} .zen-chart__bullet-reading`, check: ["text", "h", "right", "y"] },
      { figma: `Rows > Goal#${k} > Bullet`, dom: `${goal(k)} .zen-chart__bullet-track`, check: ["size", "x", "y"] },
      { figma: `Rows > Goal#${k} > Bullet > Track`, dom: `${goal(k)} .zen-chart__bullet-track::before`, check: ["size", "fill", "radius", "opacity"] },
      { figma: `Rows > Goal#${k} > Bullet > Actual`, dom: `${goal(k)} .zen-chart__bullet-actual`, check: ["size", "x", "y", "fill", "radius"] },
      { figma: `Rows > Goal#${k} > Bullet > Target`, dom: `${goal(k)} .zen-chart__bullet-target`, check: ["size", "cx", "y", "fill"] },
    ]).flat(),
    ...legendMap("Legend"),
  ],
};
