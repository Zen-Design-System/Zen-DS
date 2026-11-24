import type { ReactNode, Ref } from "react";
import { Icon, type IconName } from "../Icon";
import { dockIconDefaultEmoji, dockIconModel, type DockIconBackground, type DockIconSize, type DockIconTheme } from "./model";
import "./dock-icon.css";
import "../Icon/core";
import { dataAttributes } from "../_shared/data-attributes";

export { dockIconSizes, dockIconSupportColors, dockIconThemes, type DockIconBackground, type DockIconSize, type DockIconTheme } from "./model";

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
  /** Forwarded to the root `<span>`. */
  ref?: Ref<HTMLSpanElement>;
}

/**
 * Figma Dock-Icon (308:45902): a round, fully filled icon tile (Corner-Radius/Rounded) — app, category or file-type
 * marks in lists, tables and cards. Solid → Content/On-Colors (Neutral: Inverse/Strongest); Subtle → Content/<colour>/Light
 * (Neutral: Neutral/Base). Re-synced from the live file 2026-10-09.
 */
export function DockIcon({ icon = "icon-star-93-solid", emoji, size: sizeProp = "md", theme = "neutral", background = "solid", label, className, ref, ...rest }: DockIconProps) {
  const dock = dockIconModel({ size: sizeProp, theme, background, label });
  const glyph = theme === "emoji" ? <span className="zen-dock-icon__emoji">{emoji ?? dockIconDefaultEmoji}</span> : <Icon name={icon} decorative />;
  return (
    <span {...dataAttributes(rest)} ref={ref} className={["zen-dock-icon", className].filter(Boolean).join(" ")} data-size={dock.size} data-tone={theme} data-background={dock.background} role={dock.role} aria-label={label} aria-hidden={dock.ariaHidden}>
      {glyph}
    </span>
  );
}
