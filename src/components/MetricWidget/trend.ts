/*
 * Figma .Primitives/Metrics/Metric-Trend (595:55134, re-synced 2026-10-26): the badge holds the change alone and the
 * Sub-Label beside it says what it is measured against. A one-string label written before the split ("+9% vs. August")
 * still reads that way: MetricTrend and Zen Studio's Figma push (tools/studio/figma-metric.mjs) cut it here, so the page
 * and Figma show the same badge and Sub-Label (the user approved splitting old labels, 2026-10-26).
 */

/** A leading figure: an optional sign and currency, the number, then an optional %, k·M·B or unit word ("12 h"). */
const FIGURE = /^([+\-−]?)((?:[$€£¥₫]\s?)?\d[\d.,]*(?:\s?%|[kKMB]\b|\s(?:h|min|pts?|pp)\b)?)(?:\s+([\s\S]*))?$/;

/**
 * A one-string trend label as Figma's badge and Sub-Label: the leading figure (`label`) and the words after it
 * (`subLabel`, "" when none). The sign the arrow already shows is dropped (+ on positive, − or - on negative); one that
 * disagrees stays ("-6%" on positive), and a normal trend, which has no arrow, keeps its sign. `null` when the label does
 * not start with a figure ("Same as August"): the whole label is the badge.
 */
export function trendParts(direction: string, text: string): { label: string; subLabel: string } | null {
  const match = FIGURE.exec(text.trim());
  if (!match) return null;
  const [, sign, figure, rest = ""] = match;
  const shown = (sign === "+" && direction === "positive") || ((sign === "-" || sign === "−") && direction === "negative");
  return { label: shown ? figure : sign + figure, subLabel: rest.trim() };
}
