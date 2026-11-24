import { scaleKey } from "../_shared/scale";

/*
 * DockIcon's framework-free part (the web core, src/core): sizes, themes, and what the root renders for a set of props.
 * React's DockIcon and the Vue port both draw from it (tools/code-languages/vue-parity.mjs).
 */

export const dockIconSizes = ["xsmall", "small", "medium", "large", "xlarge", "2xlarge"] as const;
export const dockIconSupportColors = ["blue", "bronze", "brown", "crimson", "cyan", "golden", "green", "indigo", "mint", "orange", "pink", "plum", "purple", "red", "sky", "teal", "violet", "yellow"] as const;
export const dockIconThemes = ["neutral", "accent", ...dockIconSupportColors, "inverse", "on-color", "pale", "surface", "emoji"] as const;
/** CSS / Figma key (the `data-size` value). */
type DockIconSizeKey = (typeof dockIconSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type DockIconSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "xsmall" | "small" | "medium" | "large" | "xlarge" | "2xlarge";
export type DockIconTheme = (typeof dockIconThemes)[number];
export type DockIconBackground = "solid" | "subtle";

/** Theme=Emoji's glyph when no `emoji` is given. */
export const dockIconDefaultEmoji = "😊";

/**
 * The root's `data-*` and accessibility: Pale is always subtle, Inverse / On-Color / Surface / Emoji always solid; with a
 * `label` the tile is an image of that name, without one it is hidden from assistive tech.
 */
export function dockIconModel({ size, theme, background, label }: { size: DockIconSize; theme: DockIconTheme; background: DockIconBackground; label?: string }): {
  size: DockIconSizeKey;
  background: DockIconBackground;
  role: "img" | undefined;
  ariaHidden: true | undefined;
} {
  return {
    size: scaleKey(size, dockIconSizes),
    background: theme === "pale" ? "subtle" : ["inverse", "on-color", "surface", "emoji"].includes(theme) ? "solid" : background,
    role: label ? "img" : undefined,
    ariaHidden: label ? undefined : true,
  };
}
