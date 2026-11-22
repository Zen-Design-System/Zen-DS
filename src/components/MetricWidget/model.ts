import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import type { IconName } from "../../icons/generated/names";
// The icons it names draw at once: the core set registers them (npm run icons:check).
import "../Icon/core";
import { scaleKey } from "../_shared/scale";
import { trendParts } from "./trend";

/*
 * Metric's and MetricTrend's framework-free part (the web core, src/core): sizes, text styles, the trend badge's look
 * and how a one-string trend label splits. React's Metric and the Vue port both draw from it
 * (tools/code-languages/vue-parity.mjs).
 */

export { trendParts } from "./trend";

export const metricSizes = ["xsmall", "small", "medium", "large", "xlarge"] as const;
/** CSS / Figma key (the `data-size` value). */
type MetricSizeKey = (typeof metricSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type MetricSize = "xs" | "sm" | "md" | "lg" | "xl" | "xsmall" | "small" | "medium" | "large" | "xlarge";
export type MetricTrendDirection = "positive" | "negative" | "normal";
/** Figma Metric-Trend Content: the badge's family on the fill under it. */
export type MetricTrendContent = "default" | "inverse" | "on-color";
/** The content family a Solid card's fill asks of its parts (Card's card-content.ts). */
type CardContentFamily = "inverse" | "on-accent" | "on-color" | "on-bright";

/** Figma Metric-Inline label and number text styles per Size. */
const labelStyle: Record<MetricSizeKey, TypographyStyleName> = { xlarge: "Body/Base/Regular", large: "Body/Base/Regular", medium: "Body/Small/Regular", small: "Body/Small/Regular", xsmall: "Caption/Regular" };
const valueStyle: Record<MetricSizeKey, TypographyStyleName> = { xlarge: "Display/4", large: "Heading/1", medium: "Heading/3", small: "Heading/4", xsmall: "Heading/Subheading" };

/** A Metric's size key and its layout: XLarge/Large stack the icon above the text, Medium–XSmall put it on the left. */
export function metricModel(size: MetricSize) {
  const key = scaleKey(size, metricSizes);
  const stacked = key === "xlarge" || key === "large";
  return {
    size: key,
    stacked,
    /** Title-Highlight draws a title row at XLarge–Medium, the Caption label inside the content at Small/XSmall. */
    titled: stacked || key === "medium",
    labelClass: `zen-metric__label ${typographyStyles[labelStyle[key]]}`,
    valueClass: `zen-metric__value ${typographyStyles[valueStyle[key]]}`,
  };
}

/** Title-Highlight's Dock-Icon size: `iconSize` when given, else Large at XLarge/Large and Medium below. */
export const metricDockSize = (iconSize: string | undefined, stacked: boolean): "large" | "medium" =>
  iconSize ? (iconSize === "lg" || iconSize === "large" ? "large" : "medium") : stacked ? "large" : "medium";

export const metricTitleClass = `zen-metric__title ${typographyStyles["Body/Extra/Medium"]}`;
export const metricCaptionLabelClass = `zen-metric__label ${typographyStyles["Caption/Regular"]}`;
export const metricTrendSubLabelClass = `zen-metric-trend__sub-label ${typographyStyles["Body/Small/Regular"]}`;

/**
 * The trend badge's look: its Content (the enclosing Solid card's family unless `content` is set), theme, background
 * and arrow.
 */
export function metricTrendModel(trend: MetricTrendDirection, content: MetricTrendContent | undefined, card: CardContentFamily | null) {
  const family: MetricTrendContent = content ?? (card === "inverse" ? "inverse" : card ? "on-color" : "default");
  const icon: IconName | null = trend === "positive" ? "icon-arrow-circle-up-solid" : trend === "negative" ? "icon-arrow-circle-down-solid" : null;
  return {
    content: family,
    theme: family !== "default" ? family : trend === "positive" ? ("green" as const) : trend === "negative" ? ("red" as const) : ("neutral" as const),
    background: family === "default" && trend === "normal" ? ("subtle" as const) : ("solid" as const),
    icon,
    /** The wrapper's `data-content`: only outside a Solid card, which re-points the Sub-Label's ink itself. */
    dataContent: !card && family !== "default" ? family : undefined,
  };
}

/**
 * The badge's figure and the Sub-Label: `subLabel` when given; else a text label starting with a figure is split
 * ("+9% vs. August" → 9% · vs. August). `signed`: the figure carries its own sign, so the arrow stays unnamed.
 */
export function metricTrendText<Node>(trend: MetricTrendDirection, label: Node | string, subLabel: Node | undefined, text: string | undefined) {
  const given = subLabel !== undefined && subLabel !== null && (subLabel as unknown) !== false && (subLabel as unknown) !== "";
  const parts = !given && text !== undefined ? trendParts(trend, text) : null;
  const figure = parts ? parts.label : label;
  const words = given ? subLabel : parts?.subLabel || null;
  return { figure, words, signed: typeof figure === "string" && /^[+\-−]/.test(figure.trim()) };
}
