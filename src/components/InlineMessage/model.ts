import type { IconName } from "../../icons/generated/names";
import { typographyStyles } from "../../tokens/typography.generated";
// The icons it names draw at once: the core set registers them (npm run icons:check).
import "../Icon/core";
import type { ZenLabels } from "../_shared/labels";
import { toneFromStatus, type StatusAlias } from "../_shared/status";

/*
 * InlineMessage's framework-free part (the web core, src/core): themes, the icon per theme, and what the root, the
 * texts, the action and the close control render. React's InlineMessage and the Vue port both draw from it
 * (tools/code-languages/vue-parity.mjs).
 */

export const inlineMessageThemes = ["neutral", "info", "positive", "warning", "negative", "custom"] as const;
export type InlineMessageTheme = (typeof inlineMessageThemes)[number];

/** Figma Inline-Message icon per Theme; Custom takes a Visual instead, a 36px image placeholder by default. */
export const inlineMessageThemeIcons: Record<InlineMessageTheme, IconName> = {
  neutral: "icon-info-circle-solid",
  info: "icon-info-circle-solid",
  positive: "icon-check-circle-solid",
  warning: "icon-alert-triangle-solid",
  negative: "icon-alert-octagon-solid",
  custom: "icon-image-solid",
};

/** Figma Action: one Button/Main Small Tertiary under the text. */
export const inlineMessageActionButton = { appearance: "main", level: "tertiary", size: "sm" } as const;

export const inlineMessageTitleClass = `zen-inline-message__title ${typographyStyles["Body/Base/Bold"]}`;
export const inlineMessageCaptionClass = `zen-inline-message__caption ${typographyStyles["Body/Small/Regular"]}`;

export type InlineMessageModelInput = { theme?: InlineMessageTheme; status?: StatusAlias; closeLabel?: string; labels: ZenLabels };

export type InlineMessageModel = {
  theme: InlineMessageTheme;
  /** Negative and Warning interrupt (alert); the others wait their turn (status). */
  role: "alert" | "status";
  /** The theme's icon (icon = true). */
  icon: IconName;
  /** The close control's name: `closeLabel`, else the locale's "Dismiss". */
  closeLabel: string;
};

export function inlineMessageModel({ theme: themeProp, status, closeLabel, labels }: InlineMessageModelInput): InlineMessageModel {
  const theme: InlineMessageTheme = themeProp ?? toneFromStatus(status) ?? "neutral";
  return {
    theme,
    role: theme === "negative" || theme === "warning" ? "alert" : "status",
    icon: inlineMessageThemeIcons[theme],
    closeLabel: closeLabel ?? labels.dismiss,
  };
}
