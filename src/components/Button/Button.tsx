import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
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
export type ButtonSize = (typeof buttonSizes)[number];
export type ButtonState = (typeof buttonStates)[number];

const labelStyleBySize: Record<ButtonSize, TypographyStyleName> = {
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
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Figma component set: Button/Main, Button/Flat or Button/Overlay. */
  appearance?: ButtonAppearance;
  /** Optional deterministic state for component matrices; native interaction states still work. */
  state?: ButtonState;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    level,
    variant,
    size = "md",
    state,
    appearance = "main",
    startIcon,
    endIcon,
    children,
    className,
    type = "button",
    ...buttonProps
  },
  ref,
) {
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
          {startIcon}
        </span>
      ) : null}
      <span className={`zen-button__label ${typographyStyles[labelStyleBySize[size]]}`}>
        {children}
      </span>
      {endIcon ? (
        <span className="zen-button__icon" aria-hidden="true">
          {endIcon}
        </span>
      ) : null}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Figma Button/Icon-Main glyph. The icon-only primitive is intentionally separate from Button/Main. */
  icon: ReactNode;
  level?: ButtonLevel;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Figma component set: Button/Icon-Main, Button/Icon-Flat or Button/Icon-Overlay. */
  appearance?: ButtonAppearance;
  state?: ButtonState;
}

/**
 * Figma Button/Icon-Main: a square, icon-only action that reuses the Button
 * level/state tokens and the shared Icon primitive.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    level,
    variant,
    size = "md",
    state,
    appearance = "main",
    className,
    type = "button",
    disabled,
    ...buttonProps
  },
  ref,
) {
  const resolvedLevel = level ?? variant ?? "accent";
  const resolvedState = state ?? (disabled ? "disabled" : undefined);
  return (
    <button
      {...buttonProps}
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
      <span className="zen-button__icon" aria-hidden="true">{icon}</span>
    </button>
  );
});
