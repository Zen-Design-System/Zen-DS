import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import { scaleKey } from "../_shared/scale";
import "./dock-icon.css";
import "../Icon/core";

export const dockIconSizes = ["xsmall", "small", "medium", "large", "xlarge", "2xlarge"] as const;
export const dockIconSupportColors = ["blue", "bronze", "brown", "crimson", "cyan", "golden", "green", "indigo", "mint", "orange", "pink", "plum", "purple", "red", "sky", "teal", "violet", "yellow"] as const;
export const dockIconThemes = ["neutral", "accent", ...dockIconSupportColors, "inverse", "on-color", "pale", "surface", "emoji"] as const;
/** CSS / Figma key (the `data-size` value). */
type DockIconSizeKey = (typeof dockIconSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type DockIconSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "xsmall" | "small" | "medium" | "large" | "xlarge" | "2xlarge";
export type DockIconTheme = (typeof dockIconThemes)[number];
export type DockIconBackground = "solid" | "subtle";

export interface DockIconProps {
  /** Figma Icon-Src. */
  icon?: IconName;
  /** Theme=Emoji: the emoji (or any glyph) shown instead of an icon. */
  emoji?: ReactNode;
  /** Figma Size: XSmall 24 · Small 32 · Medium 40 · Large 48 · XLarge 56 · 2XLarge 80 (Image-Size tokens; glyph 12 · 16 · 20 · 24 · 28 · 44, Element-Size/Popular); Theme=Emoji draws Medium 40 with a 28px glyph (Heading/1) and Large 48 with a 36px glyph (Display/3). Short (sm, md, 2xl…) or Figma (small, medium, 2xlarge…) spelling. */
  size?: DockIconSize;
  theme?: DockIconTheme;
  /** Solid (default) or Subtle; Pale is always subtle, Inverse / On-Color / Surface / Emoji always solid. */
  background?: DockIconBackground;
  /** Accessible name when the icon carries meaning on its own; omit when a text label sits next to it. */
  label?: string;
  className?: string;
}

/**
 * Figma Dock-Icon (308:45902): a round, fully filled icon tile (Corner-Radius/Rounded) — app, category or file-type
 * marks in lists, tables and cards. Solid → Content/On-Colors (Neutral: Inverse/Strongest); Subtle → Content/<colour>/Light
 * (Neutral: Neutral/Base). Re-synced from the live file 2026-10-09.
 */
export function DockIcon({ icon = "icon-star-93-solid", emoji, size: sizeProp = "md", theme = "neutral", background = "solid", label, className }: DockIconProps) {
  const size = scaleKey(sizeProp, dockIconSizes);
  const resolvedBackground = theme === "pale" ? "subtle" : ["inverse", "on-color", "surface", "emoji"].includes(theme) ? "solid" : background;
  const glyph = theme === "emoji" ? <span className="zen-dock-icon__emoji">{emoji ?? "😊"}</span> : <Icon name={icon} decorative />;
  return (
    <span className={["zen-dock-icon", className].filter(Boolean).join(" ")} data-size={size} data-tone={theme} data-background={resolvedBackground} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {glyph}
    </span>
  );
}
