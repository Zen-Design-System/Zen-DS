import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import type { IconName } from "../Icon";
import { useIconTooltip } from "../Tooltip";
import { renderIcon } from "../_shared/icon";
import { scaleKey } from "../_shared/scale";
import "./button.css";

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
] as const;

export const buttonAppearances = ["main", "flat", "overlay"] as const;
export const buttonMainLevels = ["primary", "accent", "secondary", "tertiary", "danger", "danger-subtle", "positive", "positive-subtle", "surface"] as const;
export const buttonIconMainLevels = ["primary", "accent", "secondary", "tertiary", "danger", "danger-secondary", "positive", "positive-secondary", "surface"] as const;
export const buttonFlatLevels = ["primary", "accent"] as const;
export const buttonIconFlatLevels = ["primary", "secondary", "accent", "danger", "positive"] as const;
export const buttonOverlayLevels = ["inverse", "white", "white-overlay", "black-overlay"] as const;

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

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Canonical Figma prop. `variant` remains as a compatibility alias. */
  level?: ButtonLevel;
  /** @deprecated Use level. */
  variant?: ButtonVariant;
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: ButtonSize;
  /** Figma component set: Button/Main, Button/Flat or Button/Overlay. */
  appearance?: ButtonAppearance;
  /** Optional deterministic state for component matrices; native interaction states still work. */
  state?: ButtonState;
  /** Leading icon: an icon name (`"icon-plus-line"`) or a node; the slot sizes it to the button. */
  startIcon?: IconName | ReactNode;
  /** Trailing icon: an icon name (`"icon-chevron-right-line-small"`) or a node; the slot sizes it to the button. */
  endIcon?: IconName | ReactNode;
  /** @deprecated Use startIcon (same values). */
  leftIcon?: IconName | ReactNode;
  /** @deprecated Use endIcon (same values). */
  rightIcon?: IconName | ReactNode;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    level,
    variant,
    size: sizeProp = "md",
    state,
    appearance = "main",
    startIcon: startIconProp,
    endIcon: endIconProp,
    leftIcon,
    rightIcon,
    children,
    className,
    type = "button",
    ...buttonProps
  },
  ref,
) {
  const size = scaleKey(sizeProp, buttonSizes);
  const startIcon = startIconProp ?? leftIcon;
  const endIcon = endIconProp ?? rightIcon;
  const resolvedLevel = level ?? variant ?? "primary";
  const resolvedState = state ?? (buttonProps.disabled ? "disabled" : undefined);
  return (
    <button
      {...buttonProps}
      ref={ref}
      type={type}
      disabled={buttonProps.disabled || resolvedState === "disabled"}
      className={["zen-button", className].filter(Boolean).join(" ")}
      data-size={size}
      data-appearance={appearance}
      data-level={resolvedLevel}
      data-variant={resolvedLevel}
      data-state={resolvedState}
    >
      {startIcon ? (
        <span className="zen-button__icon" aria-hidden="true">
          {renderIcon(startIcon)}
        </span>
      ) : null}
      <span className={`zen-button__label ${typographyStyles[labelStyleBySize[size]]}`}>
        {children}
      </span>
      {endIcon ? (
        <span className="zen-button__icon" aria-hidden="true">
          {renderIcon(endIcon)}
        </span>
      ) : null}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Figma Button/Icon-Main glyph: an icon name (`"icon-plus-line"`) or a node. The icon-only primitive is intentionally separate from Button/Main. */
  icon: IconName | ReactNode;
  /**
   * Default `tertiary` for Icon-Main (toolbar and row actions) and `primary` for Icon-Flat (close/dismiss in headers).
   * Accent is only for a promoted action (docs/guidelines/button.md).
   */
  level?: ButtonLevel;
  /**
   * Compatibility alias of `level`.
   * @deprecated Use level.
   */
  variant?: ButtonVariant;
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: ButtonSize;
  /** Figma component set: Button/Icon-Main, Button/Icon-Flat or Button/Icon-Overlay. */
  appearance?: ButtonAppearance;
  state?: ButtonState;
  /**
   * Zen rule: an icon-only button shows its name as a tooltip after 1s of hover (at once on keyboard focus).
   * Defaults to `aria-label`; pass text for a longer hint, or `false` only when a visible label already sits beside it.
   */
  tooltip?: ReactNode | false;
}

/**
 * Figma Button/Icon-Main: a square, icon-only action that reuses the Button
 * level/state tokens and the shared Icon primitive. Shows its name as a tooltip (see `tooltip`).
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    level,
    variant,
    size: sizeProp = "md",
    state,
    appearance = "main",
    className,
    type = "button",
    disabled,
    tooltip,
    ...buttonProps
  },
  ref,
) {
  const size = scaleKey(sizeProp, buttonSizes);
  // Guideline defaults: Tertiary for everyday icon actions, Flat Primary for close/dismiss (Overlay keeps its old default).
  const resolvedLevel = level ?? variant ?? (appearance === "flat" ? "primary" : appearance === "overlay" ? "accent" : "tertiary");
  const resolvedState = state ?? (disabled ? "disabled" : undefined);
  const tip = useIconTooltip(tooltip === undefined ? buttonProps["aria-label"] : tooltip);
  return (
    <>
      <button
        {...tip.bind(buttonProps)}
        ref={ref}
        type={type}
        disabled={disabled || resolvedState === "disabled"}
        className={["zen-button", "zen-button--icon-only", className].filter(Boolean).join(" ")}
        data-size={size}
        data-appearance={appearance}
        data-level={resolvedLevel}
        data-variant={resolvedLevel}
        data-state={resolvedState}
        aria-label={buttonProps["aria-label"]}
      >
        <span className="zen-button__icon" aria-hidden="true">{renderIcon(icon)}</span>
      </button>
      {tip.tooltip}
    </>
  );
});
