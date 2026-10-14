import { useId, type CSSProperties, type ReactNode, type Ref } from "react";
import { Icon } from "../Icon";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./progress.css";
import "../Icon/core";

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

export interface ProgressBarProps {
  /** 0–100. */
  value: number;
  theme?: ProgressBarTheme;
  /** Figma Layout: `inline` (default: the label trails the bar) · `stacked` (a Label · Value row above a full-width bar). */
  layout?: ProgressBarLayout;
  /** The label (Figma Text, shown with Label=Yes). Inline: trails the bar, and `true` shows the rounded percentage.
   *  Stacked: leads the row above the bar and names it; `true` leaves only the value. */
  label?: ReactNode | true;
  /** Stacked only: the text at the end of the row (Figma Value), such as "3 of 5 steps". Default: the rounded percentage. */
  valueLabel?: ReactNode;
  /** Accessible name when there is no visible label. */
  "aria-label"?: string;
  /** Status theme only: `quota` for usage against a limit (high = bad); default `completion`. */
  scale?: ProgressStatusScale;
  className?: string;
  /** Forwarded to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/** Figma Progress-Bar (1536:260): 8px Neutral/Subtle track, rounded, Active fill; Body/Base/Regular text, gap XSmall.
 * Layout=Inline puts the label after the bar; Layout=Stacked (15304:45…) puts a Header row (Label Body/Base/Bold fills,
 * Value Body/Base/Regular hugs, baseline-aligned) above the full-width track. */
export function ProgressBar({ value, theme = "neutral", layout = "inline", label, valueLabel, "aria-label": ariaLabel, scale = "completion", className, ref }: ProgressBarProps) {
  const t = useZenLabels();
  const labelId = useId();
  const v = clamp(value);
  const percent = `${Math.round(v)}%`;
  const stacked = layout === "stacked";
  const text = label === true ? (stacked ? undefined : percent) : label;
  const shown = text !== undefined && text !== null && text !== false;
  const end = stacked ? (valueLabel ?? percent) : undefined;
  const labelEl = shown ? <span id={stacked ? labelId : undefined} className={`zen-progress-bar__label ${typographyStyles[stacked ? "Body/Base/Bold" : "Body/Base/Regular"]}`}>{text}</span> : null;
  // Stacked: the label names the bar and the Value is its value text. Inline: the label is the value text.
  const name = ariaLabel ?? (stacked ? (shown ? undefined : t.progress) : (typeof text === "string" ? undefined : t.progress));
  const valueText = stacked ? (typeof end === "string" ? end : undefined) : (typeof text === "string" ? text : undefined);
  const track = (
    <div className="zen-progress-bar__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label={name} aria-labelledby={stacked && shown && !ariaLabel ? labelId : undefined} aria-valuetext={valueText}>
      <span className="zen-progress-bar__fill" style={{ width: `${v}%` }} hidden={v === 0} />
    </div>
  );
  return (
    <div ref={ref} className={["zen-progress-bar", className].filter(Boolean).join(" ")} data-layout={layout} data-tone={theme} data-status={theme === "status" ? progressStatus(v, scale) : undefined}>
      {stacked ? (
        <>
          <div className="zen-progress-bar__header">
            {labelEl}
            <span className={`zen-progress-bar__value ${typographyStyles["Body/Base/Regular"]}`}>{end}</span>
          </div>
          {track}
        </>
      ) : <>{track}{labelEl}</>}
    </div>
  );
}

export interface ProgressCircleProps {
  /** 0–100. 100 renders the Done state with a check. */
  value: number;
  theme?: ProgressCircleTheme;
  label?: ReactNode | true;
  "aria-label"?: string;
  className?: string;
  /** Forwarded to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/** Figma Progress-Circle (1531:13954) + Progress-Circle/Icon (6915:62964): 20px ring (2px Support/Subtle border on
 * Neutral/Subtle) with a 12px Support/Solid pie from 12 o'clock; Done = full solid disc (it covers the ring) + 12px
 * icon-check-solid. */
export function ProgressCircle({ value, theme = "accent", label, "aria-label": ariaLabel, className, ref }: ProgressCircleProps) {
  const t = useZenLabels();
  const v = clamp(value);
  const done = v >= 100;
  const text = label === true ? `${Math.round(v)}%` : label;
  return (
    <div ref={ref} className={["zen-progress-circle", className].filter(Boolean).join(" ")} data-tone={theme}>
      <span className="zen-progress-circle__icon" data-done={done ? "true" : "false"} style={{ "--zen-progress-value": v } as CSSProperties} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label={ariaLabel ?? (typeof text === "string" ? undefined : t.progress)} aria-valuetext={typeof text === "string" ? text : undefined}>
        {done ? <Icon name="icon-check-solid" decorative /> : null}
      </span>
      {text !== undefined && text !== false ? <span className={`zen-progress-circle__label ${typographyStyles["Body/Base/Regular"]}`}>{text}</span> : null}
    </div>
  );
}
