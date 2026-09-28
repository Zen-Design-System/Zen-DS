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
export const badgeThemes = ["accent", "neutral", "yellow", "orange", "red", "crimson", "pink", "plum", "purple", "violet", "indigo", "blue", "cyan", "teal", "green", "brown", "inverse", "on-color"] as const;
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
  remove?: boolean;
  onRemove?: () => void;
  className?: string;
}

export function Badge({ ref, children, size: sizeProp = "md", theme: themeProp, color, background = "solid", leading, leadingIcon = true, remove = false, onRemove, className, ...rest }: BadgeProps) {
  const theme = themeProp ?? color ?? "neutral";
  const t = useZenLabels();
  const size = scaleKey(sizeProp, badgeSizes);
  const leadingContent = renderIcon(leading) ?? (leadingIcon ? <Icon name="icon-circle-small-solid" decorative /> : null);
  const textStyle = size === "xsmall" ? typographyStyles["Caption/Medium"] : size === "small" ? typographyStyles["Body/Small/Medium"] : typographyStyles["Body/Base/Medium"];
  const removeTip = useIconTooltip(remove ? t.remove : false);
  return <span {...rest} ref={ref} className={["zen-badge", className].filter(Boolean).join(" ")} data-size={size} data-tone={theme} data-background={background}>
    {leadingContent ? <span className="zen-badge__leading">{leadingContent}</span> : null}
    <span className={`zen-badge__text ${textStyle}`}>{children}</span>
    {remove ? <button className="zen-badge__remove" type="button" aria-label={t.remove} {...removeTip.bind({ onClick: onRemove })}><Icon name="icon-x-circle-solid" decorative />{removeTip.tooltip}</button> : null}
  </span>;
}

export interface BadgeCounterProps extends Omit<BadgeProps, "remove" | "onRemove" | "leading"> {
  value?: ReactNode;
}

export function BadgeCounter({ value, children, size: sizeProp = "sm", className, ...props }: BadgeCounterProps) {
  const size = scaleKey(sizeProp, badgeSizes);
  return <Badge {...props} className={["zen-badge--counter", className].filter(Boolean).join(" ")} leadingIcon={false} size={size}><span aria-label={typeof value === "string" || typeof value === "number" ? `${value}` : undefined}>{value ?? children}</span></Badge>;
}
