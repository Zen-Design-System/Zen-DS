import { type HTMLAttributes, type ReactNode, type Ref } from "react";
import { Icon, type IconName } from "../Icon";
import { useIconTooltip } from "../Tooltip";
import { renderIcon } from "../_shared/icon";
import { scaleKey } from "../_shared/scale";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./badge.css";
import "../Icon/core";

export const badgeSizes = ["xsmall", "small", "medium"] as const;
export const badgeThemes = ["accent", "neutral", "yellow", "orange", "red", "crimson", "pink", "plum", "purple", "violet", "indigo", "blue", "cyan", "teal", "green", "brown", "inverse", "on-color", "sky", "mint", "bronze", "golden"] as const;
/** CSS / Figma key (the `data-size` value). */
type BadgeSizeKey = (typeof badgeSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type BadgeSize = "xs" | "sm" | "md" | "xsmall" | "small" | "medium";
export type BadgeTheme = (typeof badgeThemes)[number];
export type BadgeBackground = "solid" | "subtle";

/** Standard HTML attributes (`id`, `data-*`, `aria-*`, `style`…) go to the root `<span>`. */
export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
  /** The root `<span>`. */
  ref?: Ref<HTMLSpanElement>;
  children?: ReactNode;
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: BadgeSize;
  theme?: BadgeTheme;
  /** @deprecated Use theme (same values). */
  color?: BadgeTheme;
  background?: BadgeBackground;
  /** Leading icon: an icon name (`"icon-check-line"`) or a node; replaces the default dot. */
  leading?: IconName | ReactNode;
  leadingIcon?: boolean;
  /** Shows the remove button (icon-x-circle-solid), named "Remove <label>" from a text label (the locale's `removeItem`). */
  remove?: boolean;
  onRemove?: () => void;
  /**
   * Name of the remove button. Default: "Remove" and the badge text from the locale's labels ("Remove Design"); pass it
   * when the label is not plain text (a node, an icon, a number) so the button still says what it removes.
   */
  removeLabel?: string;
  className?: string;
}

/** Figma Badge (260:4825): Size × Theme × Background, a leading dot or icon, and an optional remove button. */
export function Badge({ ref, children, size: sizeProp = "md", theme: themeProp, color, background = "solid", leading, leadingIcon = true, remove = false, onRemove, removeLabel, className, ...rest }: BadgeProps) {
  const theme = themeProp ?? color ?? "neutral";
  const t = useZenLabels();
  const size = scaleKey(sizeProp, badgeSizes);
  const leadingContent = renderIcon(leading) ?? (leadingIcon ? <Icon name="icon-circle-small-solid" decorative /> : null);
  const textStyle = size === "xsmall" ? typographyStyles["Caption/Medium"] : size === "small" ? typographyStyles["Body/Small/Medium"] : typographyStyles["Body/Base/Medium"];
  // Like Tag: the remove button names what it removes ("Remove Design"); removeLabel names it for a non-text label, which
  // otherwise falls back to "Remove".
  const removeName = removeLabel ?? (typeof children === "string" || typeof children === "number" ? t.removeItem(String(children)) : t.remove);
  const removeTip = useIconTooltip(remove ? removeName : false);
  return <span {...rest} ref={ref} className={["zen-badge", className].filter(Boolean).join(" ")} data-size={size} data-tone={theme} data-background={background}>
    {leadingContent ? <span className="zen-badge__leading">{leadingContent}</span> : null}
    <span className={`zen-badge__text ${textStyle}`}>{children}</span>
    {remove ? <button className="zen-badge__remove" type="button" aria-label={removeName} {...removeTip.bind({ onClick: onRemove })}><Icon name="icon-x-circle-solid" decorative />{removeTip.tooltip}</button> : null}
  </span>;
}

export interface BadgeCounterProps extends Omit<BadgeProps, "remove" | "onRemove" | "removeLabel" | "leading"> {
  value?: ReactNode;
}

export function BadgeCounter({ value, children, size: sizeProp = "sm", className, ...props }: BadgeCounterProps) {
  const size = scaleKey(sizeProp, badgeSizes);
  return <Badge {...props} className={["zen-badge--counter", className].filter(Boolean).join(" ")} leadingIcon={false} size={size}><span aria-label={typeof value === "string" || typeof value === "number" ? `${value}` : undefined}>{value ?? children}</span></Badge>;
}
