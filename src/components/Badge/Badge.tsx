import { type ReactNode } from "react";
import { Icon } from "../Icon";
import { typographyStyles } from "../../tokens/typography.generated";
import "./badge.css";

export const badgeSizes = ["xsmall", "small", "medium"] as const;
export const badgeThemes = ["accent", "neutral", "yellow", "orange", "red", "crimson", "pink", "plum", "purple", "violet", "indigo", "blue", "cyan", "teal", "green", "brown", "inverse", "on-color"] as const;
export type BadgeSize = (typeof badgeSizes)[number];
export type BadgeTheme = (typeof badgeThemes)[number];
export type BadgeBackground = "solid" | "subtle";

export interface BadgeProps {
  children?: ReactNode;
  size?: BadgeSize;
  theme?: BadgeTheme;
  background?: BadgeBackground;
  leading?: ReactNode;
  leadingIcon?: boolean;
  remove?: boolean;
  onRemove?: () => void;
  className?: string;
}

export function Badge({ children, size = "medium", theme = "neutral", background = "solid", leading, leadingIcon = true, remove = false, onRemove, className }: BadgeProps) {
  const leadingContent = leading ?? (leadingIcon ? <Icon name="icon-circle-small-solid" decorative /> : null);
  const textStyle = size === "xsmall" ? typographyStyles["Caption/Medium"] : size === "small" ? typographyStyles["Body/Small/Medium"] : typographyStyles["Body/Base/Medium"];
  return <span className={["zen-badge", className].filter(Boolean).join(" ")} data-size={size} data-theme={theme} data-background={background}>
    {leadingContent ? <span className="zen-badge__leading">{leadingContent}</span> : null}
    <span className={`zen-badge__text ${textStyle}`}>{children}</span>
    {remove ? <button className="zen-badge__remove" type="button" aria-label="Remove" onClick={onRemove}><Icon name="icon-x-circle-solid" decorative /></button> : null}
  </span>;
}

export interface BadgeCounterProps extends Omit<BadgeProps, "remove" | "onRemove" | "leading"> {
  value?: ReactNode;
}

export function BadgeCounter({ value, children, size = "small", className, ...props }: BadgeCounterProps) {
  return <Badge {...props} className={["zen-badge--counter", className].filter(Boolean).join(" ")} leadingIcon={false} size={size}><span aria-label={typeof value === "string" || typeof value === "number" ? `${value}` : undefined}>{value ?? children}</span></Badge>;
}
