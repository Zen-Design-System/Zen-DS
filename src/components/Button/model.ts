import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import { scaleKey } from "../_shared/scale";

/*
 * Button's framework-free part (the web core, src/core): its levels, sizes and states, and what its root and label
 * render for a set of props. React's Button and the Vue port both draw from it, so the two stay the same DOM
 * (tools/code-languages/vue-parity.mjs).
 */

/** Figma Button/Main levels. `surface` is present in the current official file. */
export const buttonLevels = [
  "primary",
  "accent",
  "secondary",
  "tertiary",
  "danger",
  "danger-subtle",
  "positive",
  "positive-subtle",
  "surface",
  "danger-secondary",
  "positive-secondary",
  "inverse",
  "white",
  "white-overlay",
  "black-overlay",
  "inverse-subtle",
] as const;

export const buttonAppearances = ["main", "flat", "overlay"] as const;
export const buttonMainLevels = ["primary", "accent", "secondary", "tertiary", "danger", "danger-subtle", "positive", "positive-subtle", "surface"] as const;
export const buttonIconMainLevels = ["primary", "accent", "secondary", "tertiary", "danger", "danger-secondary", "positive", "positive-secondary", "surface"] as const;
export const buttonFlatLevels = ["primary", "accent"] as const;
export const buttonIconFlatLevels = ["primary", "secondary", "accent", "danger", "positive"] as const;
export const buttonOverlayLevels = ["inverse", "white", "white-overlay", "black-overlay", "inverse-subtle"] as const;

/** Backwards-compatible name used by the original Storybook stories. */
export const buttonVariants = buttonLevels;

export const buttonSizes = ["2xs", "xs", "sm", "md", "lg", "xl"] as const;
export const buttonStates = ["default", "hover", "pressed", "focused", "disabled"] as const;

export type ButtonLevel = (typeof buttonLevels)[number];
export type ButtonAppearance = (typeof buttonAppearances)[number];
export type ButtonVariant = ButtonLevel;
/** CSS / Figma key (the `data-size` value). */
type ButtonSizeKey = (typeof buttonSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type ButtonSize = "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xsmall" | "xsmall" | "small" | "medium" | "large" | "xlarge";
export type ButtonState = (typeof buttonStates)[number];

const labelStyleBySize: Record<ButtonSizeKey, TypographyStyleName> = {
  "2xs": "Button-Label/XS",
  xs: "Button-Label/XS",
  sm: "Button-Label/S",
  md: "Button-Label/M",
  lg: "Button-Label/L",
  xl: "Button-Label/XL",
};

export type ButtonModelInput = { level?: ButtonLevel; variant?: ButtonVariant; size?: ButtonSize; state?: ButtonState; appearance?: ButtonAppearance; disabled?: boolean };

/** What a button's root renders: its `data-*` keys, whether it is disabled, and its label's class. */
export type ButtonModel = { size: ButtonSizeKey; level: ButtonLevel; state: ButtonState | undefined; disabled: boolean; labelClass: string };

const model = (level: ButtonLevel, size: ButtonSize, state: ButtonState | undefined, disabled: boolean | undefined): ButtonModel => {
  const key = scaleKey(size, buttonSizes);
  const resolvedState = state ?? (disabled ? "disabled" : undefined);
  return { size: key, level, state: resolvedState, disabled: Boolean(disabled) || resolvedState === "disabled", labelClass: `zen-button__label ${typographyStyles[labelStyleBySize[key]]}` };
};

/** Button/Main, Flat or Overlay with a label: Primary unless a level is given. */
export const buttonModel = ({ level, variant, size = "md", state, disabled }: ButtonModelInput): ButtonModel => model(level ?? variant ?? "primary", size, state, disabled);

/**
 * Button/Icon-Main, Icon-Flat or Icon-Overlay. Guideline defaults: Tertiary for everyday icon actions, Flat Primary for
 * close/dismiss (Overlay keeps its old default, Accent).
 */
export const iconButtonModel = ({ level, variant, size = "md", state, appearance = "main", disabled }: ButtonModelInput): ButtonModel =>
  model(level ?? variant ?? (appearance === "flat" ? "primary" : appearance === "overlay" ? "accent" : "tertiary"), size, state, disabled);
