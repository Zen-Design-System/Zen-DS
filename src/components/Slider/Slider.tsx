import { useId, useState, type CSSProperties, type ReactElement } from "react";
import type { IconName } from "../Icon";
import { renderIcon } from "../_shared/icon";
import { scaleKey } from "../_shared/scale";
import { typographyStyles } from "../../tokens/typography.generated";
import "./slider.css";
import "../Icon/core";

export const sliderThemes = ["neutral", "accent", "white"] as const;
export const sliderSizes = ["small", "medium", "large"] as const;
export type SliderTheme = (typeof sliderThemes)[number];
/** CSS / Figma key (the `data-size` value). */
type SliderSizeKey = (typeof sliderSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type SliderSize = "sm" | "md" | "lg" | "small" | "medium" | "large";

export interface SliderProps {
  value?: number;
  defaultValue?: number;
  /** Called with the new value while the thumb moves. */
  onValueChange?: (value: number) => void;
  /** @deprecated Use onValueChange (same arguments). */
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Figma Theme: Neutral · Accent · White (White has Medium/Large only). */
  theme?: SliderTheme;
  /** Figma Size: Small (10px rail, floating 16px dot) · Medium (24px) · Large (32px). Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: SliderSize;
  disabled?: boolean;
  /** Figma Icon (Medium/Large): the leading icon inside the filled track — an icon name or an icon element; `false` hides it. */
  icon?: IconName | ReactElement | false;
  /** Figma Value: the min/max labels under the rail. */
  showLimits?: boolean;
  /** Screen-reader text for the current value, e.g. "40%". */
  valueText?: (value: number) => string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
}

/**
 * Figma Slider/Horizontal (4010:35946): a rounded Neutral/Subtle rail with a filled track inset 1px that ends at the
 * thumb (.Primitives/Slider/Slide-Dot). A native range input on top provides keyboard, pointer and screen-reader support.
 */
export function Slider({ value, defaultValue = 50, onValueChange, onChange, min = 0, max = 100, step = 1, theme = "neutral", size: sizeProp = "md", disabled = false, icon = "icon-star-93-solid", showLimits = false, valueText, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, className }: SliderProps) {
  const size = scaleKey(sizeProp, sliderSizes);
  const [internal, setInternal] = useState(defaultValue);
  const current = Math.min(max, Math.max(min, value ?? internal));
  const ratio = max > min ? (current - min) / (max - min) : 0;
  const resolvedTheme = theme === "white" && size === "small" ? "neutral" : theme;
  const limitsId = useId();
  return (
    <div className={["zen-slider", className].filter(Boolean).join(" ")} data-tone={resolvedTheme} data-size={size} data-disabled={disabled ? "true" : undefined} style={{ "--zen-slider-ratio": ratio } as CSSProperties}>
      <div className="zen-slider__control">
        <input
          className="zen-slider__input"
          type="range"
          min={min}
          max={max}
          step={step}
          value={current}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-valuetext={valueText?.(current)}
          aria-describedby={showLimits ? limitsId : undefined}
          onChange={(event) => { const next = Number(event.target.value); if (value === undefined) setInternal(next); onValueChange?.(next); onChange?.(next); }}
        />
        <span className="zen-slider__rail" aria-hidden="true">
          <span className="zen-slider__fill">
            {icon && size !== "small" ? <span className="zen-slider__icon">{renderIcon(icon)}</span> : null}
            <span className="zen-slider__thumb"><span className="zen-slider__knob" /></span>
          </span>
        </span>
      </div>
      {showLimits ? (
        <span id={limitsId} className={`zen-slider__limits ${typographyStyles["Caption/Regular"]}`}>
          <span>{min}</span><span>{max}</span>
        </span>
      ) : null}
    </div>
  );
}
