/**
 * Zen's size scale. New components take the short spelling (`sm`, `md`, `2xl`) and also accept the long Figma one
 * (`small`, `medium`, `2xlarge`, `2-xlarge`), so both habits type-check. Phase 3 applies the same scale to the older
 * components.
 */
export const zenScale = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"] as const;
export type ZenScale = (typeof zenScale)[number];
export type ZenScaleLong = "3xsmall" | "2xsmall" | "xsmall" | "small" | "medium" | "large" | "xlarge" | "2xlarge" | "3xlarge";
export type ZenScaleInput = ZenScale | ZenScaleLong;

const longToShort: Record<string, ZenScale> = {
  "3xsmall": "3xs", "3-xsmall": "3xs",
  "2xsmall": "2xs", "2-xsmall": "2xs",
  xsmall: "xs",
  small: "sm",
  medium: "md", base: "md",
  large: "lg",
  xlarge: "xl",
  "2xlarge": "2xl", "2-xlarge": "2xl",
  "3xlarge": "3xl", "3-xlarge": "3xl",
};

/** `small` → `sm`, `sm` → `sm`; values outside the scale (e.g. `none`, `giant`) pass through unchanged. */
export function normalizeScale<T extends string>(value: T | ZenScaleInput): ZenScale | T;
export function normalizeScale<T extends string>(value: T | ZenScaleInput | undefined): ZenScale | T | undefined;
export function normalizeScale<T extends string>(value: T | ZenScaleInput | undefined): ZenScale | T | undefined {
  if (value === undefined) return undefined;
  return (longToShort[value] ?? value) as ZenScale | T;
}

/**
 * A size in either spelling, resolved to the spelling a component's own size list uses (its `data-size` / CSS keys):
 * `scaleKey("sm", ["small", "medium"])` → `"small"`, `scaleKey("small", ["sm", "md"])` → `"sm"`. Every component with a
 * size prop accepts both spellings this way; values outside the list pass through unchanged.
 */
export function scaleKey<T extends string>(value: string, sizes: readonly T[]): T {
  if ((sizes as readonly string[]).includes(value)) return value as T;
  const step = normalizeScale(value as ZenScaleInput);
  return (sizes.find((size) => normalizeScale(size as ZenScaleInput) === step) ?? value) as T;
}

/** Figma variable suffix for a scale step: `2xs` → `2-xsmall`, `md` → `medium`. */
export const scaleTokenSuffix: Record<ZenScale, string> = {
  "3xs": "3-xsmall",
  "2xs": "2-xsmall",
  xs: "xsmall",
  sm: "small",
  md: "medium",
  lg: "large",
  xl: "xlarge",
  "2xl": "2-xlarge",
  "3xl": "3-xlarge",
};

/**
 * Spacing between items (Figma Spacing/Gap): 3xs 2 · 2xs 4 · xs 8 · sm 12 · md 16 · lg 24 · xl 32 · 2xl 40 · 3xl 48 ·
 * giant 64 · xgiant 88 · 2xgiant 144 (px at compact density; comfortable scales them).
 */
export type ZenGap = "none" | ZenScaleInput | "giant" | "xgiant" | "2xgiant";
/** Space inside a box (Figma Spacing/Padding): 3xs 2 · 2xs 4 · xs 8 · sm 12 · md 16 · lg 20 · xl 24 · 2xl 32 · 3xl 40 · 4xl 48. */
export type ZenPadding = "none" | ZenScaleInput | "4xl";
/** Corner radius (Figma Corner-Radius, follows the radius mode): 2xs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 20 · 2xl 24 · 3xl 28 · full. */
export type ZenCornerRadius = "none" | Exclude<ZenScaleInput, "3xs" | "3xsmall"> | "full";

export function gapValue(gap: ZenGap | undefined): string | undefined {
  if (gap === undefined) return undefined;
  if (gap === "none") return "0";
  const step = normalizeScale(gap);
  const suffix = step === "giant" || step === "xgiant" ? step : step === "2xgiant" ? "2-xgiant" : scaleTokenSuffix[step as ZenScale];
  return `var(--zen-spacing-gap-${suffix})`;
}

export function paddingValue(padding: ZenPadding | undefined): string | undefined {
  if (padding === undefined) return undefined;
  if (padding === "none") return "0";
  const step = normalizeScale(padding);
  return `var(--zen-spacing-padding-${step === "4xl" ? "4-xlarge" : scaleTokenSuffix[step as ZenScale]})`;
}

export function radiusValue(radius: ZenCornerRadius | undefined): string | undefined {
  if (radius === undefined) return undefined;
  if (radius === "none") return "0";
  if (radius === "full") return "var(--zen-corner-radius-rounded)";
  const step = normalizeScale(radius);
  return `var(--zen-corner-radius-${step === "md" ? "base" : scaleTokenSuffix[step as ZenScale]})`;
}
