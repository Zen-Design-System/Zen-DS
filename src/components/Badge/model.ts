import { typographyStyles } from "../../tokens/typography.generated";
import type { ZenLabels } from "../_shared/labels";
import { scaleKey } from "../_shared/scale";

/*
 * Badge's framework-free part (the web core, src/core): sizes, themes, and what the root, the text and the remove
 * button render. React's Badge and the Vue port both draw from it (tools/code-languages/vue-parity.mjs).
 */

export const badgeSizes = ["xsmall", "small", "medium"] as const;
export const badgeThemes = ["accent", "neutral", "yellow", "orange", "red", "crimson", "pink", "plum", "purple", "violet", "indigo", "blue", "cyan", "teal", "green", "brown", "inverse", "on-color", "sky", "mint", "bronze", "golden"] as const;
/** CSS / Figma key (the `data-size` value). */
type BadgeSizeKey = (typeof badgeSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type BadgeSize = "xs" | "sm" | "md" | "xsmall" | "small" | "medium";
export type BadgeTheme = (typeof badgeThemes)[number];
export type BadgeBackground = "solid" | "subtle";

/** The `data-size` key and the text's class (Caption/Medium at xsmall, Body/Small/Medium at small, else Body/Base/Medium). */
export function badgeModel(size: BadgeSize): { size: BadgeSizeKey; textClass: string } {
  const key = scaleKey(size, badgeSizes);
  const style = key === "xsmall" ? typographyStyles["Caption/Medium"] : key === "small" ? typographyStyles["Body/Small/Medium"] : typographyStyles["Body/Base/Medium"];
  return { size: key, textClass: `zen-badge__text ${style}` };
}

/**
 * Like Tag: the remove button names what it removes ("Remove Design") from a text label; `removeLabel` names it for a
 * label that is not plain text, which otherwise falls back to "Remove".
 */
export const badgeRemoveName = (labels: ZenLabels, text: string | undefined, removeLabel?: string) => removeLabel ?? (text === undefined ? labels.remove : labels.removeItem(text));
