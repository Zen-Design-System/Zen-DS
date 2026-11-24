import { typographyStyles } from "../../tokens/typography.generated";
import { contentToneVar, type ContentTone } from "../_shared/contentTone";

/*
 * List's, ListItem's and ListBox's framework-free part (the web core, src/core): the box themes, the row's text styles and
 * the value's colour. React's components and the Vue port both draw from it (tools/code-languages/vue-parity.mjs).
 */

export type ListInset = "auto" | "comfortable" | "compact" | "none";

/** ListBox elevation: Figma List-Box Theme (Default · Shadow · Pale · Border · Flat-Border · On-Container, the tokens of
 *  Card's Theme; renamed with Card 2026-10-21: Flat → Default, Border × Surface=Flat → Flat-Border). */
export const listBoxThemes = ["default", "shadow", "pale", "border", "flat-border", "on-container"] as const;
export type ListBoxTheme = (typeof listBoxThemes)[number];
/** Figma List-Box Color (14922:75297): the Pale theme's hue, Support/<Hue>/Pale; the other themes are Neutral only. */
export const listBoxColors = ["neutral", "brand", "cyan", "violet", "green", "yellow", "orange", "blue", "purple"] as const;
export type ListBoxColor = (typeof listBoxColors)[number];
/** Figma List-Box Surface: Surface/Default or Surface/Alt. */
export type ListBoxSurface = "default" | "alt";
/** The Surfaces each Theme has in Figma (Alt on Default and Border); the others keep their own fill. */
export const listBoxSurfaces: Readonly<Record<ListBoxTheme, readonly ListBoxSurface[]>> = {
  default: ["default", "alt"], shadow: ["default"], pale: ["default"], border: ["default", "alt"], "flat-border": ["default"], "on-container": ["default"],
};

/** Only Figma's variants: a hue on Pale, Surface/Alt on Default and Border. */
export const listBoxModel = (theme: ListBoxTheme, color: ListBoxColor, surface: ListBoxSurface) => ({
  "data-tone": theme,
  "data-color": theme === "pale" && color !== "neutral" ? color : undefined,
  "data-surface": surface === "alt" && listBoxSurfaces[theme]?.includes("alt") ? "alt" : undefined,
});

/** The deprecated `inset` as List's `data-inset`. */
export const listInset = (inset: ListInset) => (inset === "auto" ? undefined : inset);

export const listItemTitleClass = `zen-list-item__title ${typographyStyles["Body/Base/Bold"]}`;
export const listItemCaptionClass = `zen-list-item__caption ${typographyStyles["Body/Small/Regular"]}`;
export const listItemValueClass = `zen-list-item__value-text ${typographyStyles["Body/Base/Bold"]}`;
export const listItemValueCaptionClass = `zen-list-item__value-caption ${typographyStyles["Body/Small/Regular"]}`;

/** The value's colour: the default tone (strongest) is the CSS default; another sets the colour variable, `inherit` the parent's. */
export function listItemValueStyle(tone: ContentTone): Record<string, string> | undefined {
  if (tone === "strongest") return undefined;
  const color = contentToneVar(tone);
  return color ? { "--zen-list-item-value-color": `var(${color})` } : { color: "inherit" };
}
