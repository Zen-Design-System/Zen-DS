import type { IconName } from "../../icons/generated/names";
import { typographyStyles } from "../../tokens/typography.generated";
// The icons it names draw at once: the core set registers them (npm run icons:check).
import "../Icon/core";
import type { ZenLabels } from "../_shared/labels";
import { scaleKey } from "../_shared/scale";
import { toneFromStatus, type StatusAlias } from "../_shared/status";

/*
 * AlertBanner's framework-free part (the web core, src/core): themes, sizes, the leading icon per theme, and what the
 * root, the message, the action and the close control render. React's AlertBanner and the Vue port both draw from it
 * (tools/code-languages/vue-parity.mjs).
 */

export const alertBannerThemes = ["default", "info", "positive", "warning", "negative"] as const;
export const alertBannerSizes = ["medium", "small"] as const;
export type AlertBannerTheme = (typeof alertBannerThemes)[number];
/** CSS / Figma key (the `data-size` value). */
type AlertBannerSizeKey = (typeof alertBannerSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type AlertBannerSize = "md" | "sm" | "medium" | "small";

/** Figma Alert-Banner Leading icon per Theme. */
export const alertBannerThemeIcons: Record<AlertBannerTheme, IconName> = {
  default: "icon-info-circle-line",
  info: "icon-info-circle-solid",
  positive: "icon-check-solid",
  warning: "icon-alert-triangle-solid",
  negative: "icon-x-circle-solid",
};

/** Figma Action: Button/Overlay Small Inverse (Medium only). */
export const alertBannerActionButton = { appearance: "overlay", level: "inverse", size: "sm" } as const;

export type AlertBannerModelInput = { theme?: AlertBannerTheme; status?: StatusAlias; size: AlertBannerSize; closeLabel?: string; labels: ZenLabels };

export type AlertBannerModel = {
  theme: AlertBannerTheme;
  size: AlertBannerSizeKey;
  /** Negative and Warning interrupt (alert); the others wait their turn (status). */
  role: "alert" | "status";
  /** The theme's leading icon (Leading = true). */
  icon: IconName;
  messageClass: string;
  /** The action shows at Medium only. */
  showsAction: boolean;
  /** The close control's name: `closeLabel`, else the locale's "Dismiss". */
  closeLabel: string;
};

export function alertBannerModel({ theme: themeProp, status, size: sizeProp, closeLabel, labels }: AlertBannerModelInput): AlertBannerModel {
  const theme: AlertBannerTheme = themeProp ?? toneFromStatus(status) ?? "default";
  const size = scaleKey(sizeProp, alertBannerSizes);
  return {
    theme,
    size,
    role: theme === "negative" || theme === "warning" ? "alert" : "status",
    icon: alertBannerThemeIcons[theme],
    messageClass: `zen-alert-banner__message ${typographyStyles[size === "small" ? "Body/Small/Medium" : "Body/Base/Medium"]}`,
    showsAction: size === "medium",
    closeLabel: closeLabel ?? labels.dismiss,
  };
}
