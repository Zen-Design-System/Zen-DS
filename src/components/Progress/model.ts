import { typographyStyles } from "../../tokens/typography.generated";
import type { ZenLabels } from "../_shared/labels";

/*
 * Progress's framework-free part (the web core, src/core): themes, layouts, the Status theme's colour, and what the bar
 * and the circle render for a value and a label. React's ProgressBar and ProgressCircle and the Vue port all draw from
 * it (tools/code-languages/vue-parity.mjs). Labels may be nodes: the model passes them through as `Node` and only reads
 * plain strings.
 */

export const progressBarThemes = ["neutral", "accent", "status"] as const;
export const progressBarLayouts = ["inline", "stacked"] as const;
export const progressCircleThemes = ["neutral", "accent", "red", "orange", "yellow", "green", "blue"] as const;
export type ProgressBarTheme = (typeof progressBarThemes)[number];
export type ProgressBarLayout = (typeof progressBarLayouts)[number];
export type ProgressCircleTheme = (typeof progressCircleThemes)[number];

const clamp = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

/** Figma Theme=Status maps progress to a semantic colour: Low → Negative, Medium → Warning, Good/Done → Positive. */
/** How the Status theme reads a value: `completion` (towards a goal — low is red, done is green) or `quota`
 * (filling up a limit — storage, seats, API calls: green while there is room, Warning from 75%, Negative from 90%). */
export type ProgressStatusScale = "completion" | "quota";

export function progressStatus(value: number, scale: ProgressStatusScale = "completion"): "negative" | "warning" | "positive" {
  const v = clamp(value);
  if (scale === "quota") return v >= 90 ? "negative" : v >= 75 ? "warning" : "positive";
  return v < 33 ? "negative" : v < 66 ? "warning" : "positive";
}

export type ProgressBarModelInput<Node> = {
  value: number;
  theme: ProgressBarTheme;
  layout: ProgressBarLayout;
  label?: Node | true;
  valueLabel?: Node;
  ariaLabel?: string;
  scale: ProgressStatusScale;
};

/**
 * What the bar draws: the label's text (`shown` false: no label element), the stacked row's end text, the fill, the
 * root's `data-status` and the progressbar's name. Stacked: the label names the bar and the Value is its value text.
 * Inline: the label is the value text.
 */
export function progressBarModel<Node>({ value, theme, layout, label, valueLabel, ariaLabel, scale }: ProgressBarModelInput<Node>, labels: ZenLabels) {
  const v = clamp(value);
  const percent = `${Math.round(v)}%`;
  const stacked = layout === "stacked";
  const text: Node | string | undefined = label === true ? (stacked ? undefined : percent) : label;
  const shown = text !== undefined && text !== null && text !== false;
  const end: Node | string | undefined = stacked ? (valueLabel ?? percent) : undefined;
  return {
    value: v,
    now: Math.round(v),
    stacked,
    text,
    shown,
    end,
    status: theme === "status" ? progressStatus(v, scale) : undefined,
    labelClass: `zen-progress-bar__label ${typographyStyles[stacked ? "Body/Base/Bold" : "Body/Base/Regular"]}`,
    valueClass: `zen-progress-bar__value ${typographyStyles["Body/Base/Regular"]}`,
    ariaLabel: ariaLabel ?? (stacked ? (shown ? undefined : labels.progress) : (typeof text === "string" ? undefined : labels.progress)),
    labelledByLabel: stacked && shown && !ariaLabel,
    ariaValueText: stacked ? (typeof end === "string" ? end : undefined) : (typeof text === "string" ? text : undefined),
  };
}

export type ProgressCircleModelInput<Node> = { value: number; label?: Node | true; ariaLabel?: string; decorative: boolean };

/** What the circle draws: Done at 100, the label's text, and the ring's progressbar attributes (none when decorative). */
export function progressCircleModel<Node>({ value, label, ariaLabel, decorative }: ProgressCircleModelInput<Node>, labels: ZenLabels) {
  const v = clamp(value);
  const text: Node | string | undefined = label === true ? `${Math.round(v)}%` : label;
  return {
    value: v,
    done: v >= 100,
    text,
    shown: text !== undefined && text !== false,
    labelClass: `zen-progress-circle__label ${typographyStyles["Body/Base/Regular"]}`,
    ring: decorative
      ? { "aria-hidden": true as const }
      : { role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(v), "aria-label": ariaLabel ?? (typeof text === "string" ? undefined : labels.progress), "aria-valuetext": typeof text === "string" ? text : undefined },
  };
}
