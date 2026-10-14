import type { CSSProperties, HTMLAttributes } from "react";
import { scaleKey } from "../_shared/scale";
import "./color-swatch.css";

export const colorSwatchSizes = ["small", "medium", "large"] as const;
type ColorSwatchSizeKey = (typeof colorSwatchSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type ColorSwatchSize = "sm" | "md" | "lg" | "small" | "medium" | "large";

export interface ColorSwatchProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color" | "children"> {
  /** The colour it shows: any CSS colour, usually the value of a colour field (`"#1F6FEB"`) or a token (`var(--zen-…)`). */
  color: string;
  /**
   * Follows the leading icon of the field it sits in: sm 16 (Small fields), md 20 (Medium and Large fields, default),
   * lg 24 (XLarge fields). Short or Figma spelling.
   */
  size?: ColorSwatchSize;
  /** Names the swatch for assistive technology (e.g. "Brand colour, #1F6FEB"). Without it the swatch is decorative. */
  "aria-label"?: string;
}

/**
 * Figma `.Primitives/Input/Color-Swatch` (15659:110090): the colour chip of a colour value, inside ColorField, an inline
 * colour field and ColorPicker. One shape: the value is the fill and an inside 1px Border/Neutral/Subtle keeps white or
 * canvas-coloured values visible. Size: Element-Size/Popular Small 16 · Base 20 · Medium 24. Radius is concentric with
 * the field around it: Corner-Radius/XSmall at sm (12 − 8), 2XSmall at md and lg (12 − 10, 16 − 14).
 * For picking one colour from a set use ColorSelector; this chip only shows a value.
 */
export function ColorSwatch({ color, size: sizeProp = "md", className, style, "aria-label": ariaLabel, ...rest }: ColorSwatchProps) {
  const size: ColorSwatchSizeKey = scaleKey(sizeProp, colorSwatchSizes);
  return (
    <span
      {...rest}
      className={["zen-swatch", className].filter(Boolean).join(" ")}
      data-size={size}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      style={{ ...style, "--zen-swatch-color": color } as CSSProperties}
    />
  );
}
