// Figma .Primitives/Metrics/Metric-Trend (595:55134, re-synced 2026-10-26; docs/figma-contracts/metric-trend.json):
// Trend Normal · Positive · Negative × Content Default · Inverse · On-Color, 9 variants. A row hugging a Small Badge
// that holds the change alone, then the Sub-Label (Body/Small/Regular: Content/Neutral/Light · Inverse/Light ·
// On-Colors), Spacing/Gap/2XSmall apart, centred. Default Positive / Negative are Green / Red Solid with their arrow,
// Normal Neutral Subtle with no arrow (its badge layer is named .Primitives/Metrics/Metrics-Trend/Normal); Inverse and
// On-Color are Inverse / On-Color Solid whatever the direction. The variant's own white fill is hidden. Checks the row,
// the badge (height, place, fill, pill radius), its arrow (size, place, colour), its label's text style and colour, and
// the Sub-Label's line, text style and colour. The badge hugs its label, whose width differs a pixel or two between
// macOS and CI's Linux, so no width is asserted, nor the Sub-Label's x after it.
import { at, textOf } from "./_chart-shared.mjs";

const BADGE = "Badge|.Primitives/Metrics/Metrics-Trend/Normal";
const arrow = (vp) => vp.Trend !== "Normal";
const badgeOf = (spec) => at(spec, "Badge") ?? at(spec, ".Primitives/Metrics/Metrics-Trend/Normal");

export default {
  contract: "docs/figma-contracts/metric-trend.json",
  setId: "595:55134",
  kind: "metricTrend",
  root: ".zen-metric-trend",
  cases: (vp, { spec }) => ({
    trend: vp.Trend.toLowerCase(),
    content: vp.Content.toLowerCase(),
    label: textOf(at(badgeOf(spec), "Text-Wrapper > Label")),
    subLabel: textOf(at(spec, "Sub-Label")),
  }),
  map: [
    { figma: "", dom: ":root", check: ["h", "fill"] },
    { figma: BADGE, dom: ".zen-badge", check: ["h", "x", "y", "fill", "radius"] },
    { figma: `${BADGE} > Leading`, dom: ".zen-badge__leading", check: ["size", "x", "y"], when: arrow },
    { figma: `${BADGE} > Leading > Vector`, dom: ".zen-badge__leading > .zen-icon", check: ["fill"], fillVia: "color", when: arrow },
    { figma: `${BADGE} > Text-Wrapper`, dom: ".zen-badge__text", check: ["h", "y"] },
    { figma: `${BADGE} > Text-Wrapper > Label`, dom: ".zen-badge__text", check: ["text"] },
    { figma: "Sub-Label", dom: ".zen-metric-trend__sub-label", check: ["h", "y", "text"] },
  ],
};
