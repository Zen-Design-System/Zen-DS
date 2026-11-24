import type { ParitySpec } from "../../../parity";

const trend = { direction: "positive", label: "9%", subLabel: "vs. August" };

export default {
  Metric: {
    base: { label: "Revenue", value: "$1,680.68", trend },
    // MetricCard is the card around a Metric: it waits for Card (wave 2).
    notPorted: { hint: "an info icon in a Tooltip: Tooltip comes with wave 3 (P4)" },
    slots: ["action", "custom"],
    cases: [
      { trend: { direction: "negative", label: "-21%", subLabel: "vs. last week" } },
      { trend: { direction: "normal", label: "Same as August" } },
      { trend: { direction: "positive", label: "+9% vs. August" }, $label: "a one-string label split into badge and Sub-Label" },
      { trend: undefined, icon: false },
      { iconEmoji: "🙂", size: "md" },
      { iconTheme: "blue", iconBackground: "solid", size: "sm" },
      { metricColor: true, counter: 3, size: "lg" },
      { metricColor: "var(--zen-color-background-support-blue-solid)", size: "xs" },
      { variant: "title-highlight", labelIcon: "icon-calendar-line", action: { $: "IconButton", icon: "icon-chevron-right-line-small", "aria-label": "Open the breakdown", size: "xs" } },
      { variant: "title-highlight", size: "sm", metricColor: true },
      { variant: "title-highlight", iconSize: "lg", custom: { $: "ProgressBar", value: 40, "aria-label": "Goal" } },
      { variant: "title-highlight", iconEmoji: "🎯", size: "md" },
      { label: { $: "strong", children: "Revenue" }, value: { $: "span", children: "$1.6k" } },
      { class: "kpi", "data-testid": "metric", id: "dropped" },
    ],
  },
  MetricTrend: {
    base: { children: "9%" },
    cases: [
      { trend: "positive", children: "+9%" },
      { trend: "negative", children: "−4%", subLabel: "vs. last week" },
      { trend: "positive", children: "+24% vs. last year" },
      { trend: "normal", children: "1", content: "inverse" },
      { trend: "negative", children: "Same as August", content: "on-color" },
      { trend: "positive", children: { $: "strong", children: "12" }, subLabel: { $: "em", children: "new" } },
      { trend: "positive", children: "9%", subLabel: "invoice", "data-testid": "trend" },
    ],
  },
} satisfies ParitySpec;
