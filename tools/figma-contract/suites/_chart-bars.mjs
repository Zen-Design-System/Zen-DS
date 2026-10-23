// The frame Area, Grouped-Bar and Combo share in Figma (Chart › Y-Axis · Plot › Grid · X-Axis · Marks): a right-aligned
// Y-Axis Spacing/Padding/XSmall before the plot, the Grid (Line-1 … Line-5 dashed Border/Neutral/Pale over a solid
// Border/Active/Neutral/Subtle Baseline), the X-Axis with one Tick per period. Code draws it with chartCore PlotFrame
// (kind "bar"). Grouped-Bar and Combo show no active state in Figma, so Figma's grid starts 6px under the plot's top
// where code keeps its 36px Tooltip lane (QUESTIONS.md "Charts (P2)" (a), chart-parity-audit-2026-10-17 §2.5, §3): those
// suites keep Figma's grid height and compare the plot's insides from the Grid (`figmaRoot`), so the lane shows once.

const GRID = "Chart > Plot > Grid";
const LINES = ["Baseline", "Line-1", "Line-2", "Line-3", "Line-4", "Line-5"];

/** Grid, gridlines (bottom-up), the Y labels named by their text (bottom-up) and the X ticks, from the Grid. */
export function barFrameMap({ yLabels, count, axis = "Chart > Y-Axis", chartDom = ".zen-chart" }) {
  const fromGrid = { figmaRoot: GRID, root: ".zen-chart__grid" };
  return [
    { figma: "Chart", dom: chartDom, check: ["size", "x", "y"] },
    { figma: "Chart > Plot", dom: ".zen-chart__plot", check: ["size", "x", "y"] },
    { figma: GRID, dom: ".zen-chart__grid", check: ["size", "x", "y"] },
    // Centred strokes in Figma, code's border just above the line: half a pixel apart (tolerance 1).
    ...LINES.map((name, i) => ({ figma: `${GRID} > ${name}`, dom: `.zen-chart__grid > span:nth-child(${i + 1})`, check: ["w", "x", "cy", "stroke"], tolerance: 1, ...fromGrid })),
    ...yLabels.map((label, i) => ({ figma: `${axis} > ${label}`, dom: `.zen-chart > .zen-chart__y > span:nth-child(${i + 1})`, check: ["text", "right", "cy"], ...fromGrid })),
    ...Array.from({ length: 12 }, (_, k) => [
      { figma: `Chart > Plot > X-Axis > Tick#${k}`, dom: `.zen-chart__sector:nth-child(${k + 1})`, check: ["w", "x"], when: (vp) => count(vp) > k },
      { figma: `Chart > Plot > X-Axis > Tick#${k} > *`, dom: `.zen-chart__sector:nth-child(${k + 1}) .zen-chart__x`, check: ["text", "cx", "cy"], when: (vp) => count(vp) > k, ...fromGrid },
    ]).flat(),
  ];
}

/**
 * The open questions of this frame, pinned to the values code renders: `grid` is Figma's grid height (the case's too) and
 * `tooltipLane` whether code keeps its 36px Tooltip lane above it (Grouped-Bar, Combo) or Figma's 6px (Area).
 */
export function barFrameExceptions({ grid, tooltipLane, vp = {}, bodyY = 126 }) {
  const lane = tooltipLane ? "No active state in Figma, so its grid starts 6px under the plot's top; code keeps the 36px Tooltip lane (QUESTIONS.md Charts (P2) (a), chart-parity-audit §3)." : "";
  const out = [];
  const h = (tooltipLane ? 36 : 6) + grid + 28;
  if (tooltipLane) out.push({ vp, layer: GRID, prop: "y", code: String(bodyY + 36), note: lane });
  out.push(...["Chart", "Chart > Plot"].map((layer) => ({ vp, layer, prop: "h", code: String(h), note: `${lane} The X-label lane is 28px in code, 26 in Figma (QUESTIONS.md Charts (P2) (a)).`.trim() })));
  out.push(...Array.from({ length: 12 }, (_, k) => ({ vp, layer: `Chart > Plot > X-Axis > Tick#${k} > *`, prop: "cy", code: String(grid + 14),
    note: "X labels: a 20px pill Spacing/Gap/2XSmall above the plot's foot in code, plain text at the foot in Figma (QUESTIONS.md Charts (P2) (a))." })));
  // The active period's label (the last) is Content/Neutral/Strongest in code; Figma draws no selected label here.
  out.push(...Array.from({ length: 12 }, (_, k) => ["rgb(18, 18, 18)", "rgb(253, 253, 253)"].map((code) => ({ vp, layer: `Chart > Plot > X-Axis > Tick#${k} > *`, prop: "color", code,
    note: "The active X label is Content/Neutral/Strongest in code; this Figma set draws no selected label (chart-parity-audit §3)." }))).flat());
  return out;
}
