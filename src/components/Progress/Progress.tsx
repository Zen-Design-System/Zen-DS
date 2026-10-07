import type { CSSProperties, ReactNode } from "react";
import { Icon } from "../Icon";
import { typographyStyles } from "../../tokens/typography.generated";
import "./progress.css";
import "../Icon/core";

export const progressBarThemes = ["neutral", "accent", "status"] as const;
export const progressCircleThemes = ["neutral", "accent", "red", "orange", "yellow", "green", "blue"] as const;
export type ProgressBarTheme = (typeof progressBarThemes)[number];
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
  /** Trailing label (Figma Label=Yes). `true` shows the rounded percentage. */
  label?: ReactNode | true;
  /** Accessible name when there is no visible label. */
  "aria-label"?: string;
  /** Status theme only: `quota` for usage against a limit (high = bad); default `completion`. */
  scale?: ProgressStatusScale;
  className?: string;
}

/** Figma Progress-Bar (1536:260): 8px Neutral/Subtle track, rounded, Active fill; Body/Base/Regular label, gap 8. */
export function ProgressBar({ value, theme = "neutral", label, "aria-label": ariaLabel, scale = "completion", className }: ProgressBarProps) {
  const v = clamp(value);
  const text = label === true ? `${Math.round(v)}%` : label;
  return (
    <div className={["zen-progress-bar", className].filter(Boolean).join(" ")} data-tone={theme} data-status={theme === "status" ? progressStatus(v, scale) : undefined}>
      <div className="zen-progress-bar__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label={ariaLabel ?? (typeof text === "string" ? undefined : "Progress")} aria-valuetext={typeof text === "string" ? text : undefined}>
        <span className="zen-progress-bar__fill" style={{ width: `${v}%` }} hidden={v === 0} />
      </div>
      {text !== undefined && text !== false ? <span className={`zen-progress-bar__label ${typographyStyles["Body/Base/Regular"]}`}>{text}</span> : null}
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
}

/** Figma Progress-Circle (1531:13954) + Progress-Circle/Icon (6915:62964): 20px ring (2px Support/Subtle border on
 * Neutral/Subtle) with a 12px Support/Solid pie from 12 o'clock; Done = full solid disc + 12px icon-check-solid. */
export function ProgressCircle({ value, theme = "accent", label, "aria-label": ariaLabel, className }: ProgressCircleProps) {
  const v = clamp(value);
  const done = v >= 100;
  const text = label === true ? `${Math.round(v)}%` : label;
  return (
    <div className={["zen-progress-circle", className].filter(Boolean).join(" ")} data-tone={theme}>
      <span className="zen-progress-circle__icon" data-done={done ? "true" : "false"} style={{ "--zen-progress-value": v } as CSSProperties} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label={ariaLabel ?? (typeof text === "string" ? undefined : "Progress")} aria-valuetext={typeof text === "string" ? text : undefined}>
        {done ? <Icon name="icon-check-solid" decorative /> : null}
      </span>
      {text !== undefined && text !== false ? <span className={`zen-progress-circle__label ${typographyStyles["Body/Base/Regular"]}`}>{text}</span> : null}
    </div>
  );
}
