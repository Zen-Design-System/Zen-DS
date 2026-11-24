import type { ReactNode, Ref } from "react";
import { Button } from "../Button";
import { Icon, type IconName } from "../Icon";
import { useIconTooltip } from "../Tooltip";
import { renderIcon } from "../_shared/icon";
import type { StatusAlias } from "../_shared/status";
import { useZenLabels } from "../_shared/zen-context";
import { alertBannerActionButton, alertBannerModel, type AlertBannerSize, type AlertBannerTheme } from "./model";
import "./alert-banner.css";
import "../Icon/core";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { dataAttributes } from "../_shared/data-attributes";

export { alertBannerSizes, alertBannerThemes, type AlertBannerSize, type AlertBannerTheme } from "./model";

export interface AlertBannerProps {
  /** The alert message (Body/Base/Medium; Small: Body/Small/Medium). */
  children: ReactNode;
  theme?: AlertBannerTheme;
  /** @deprecated Use theme: success → positive, error → negative (warning and info are the same). */
  status?: StatusAlias;
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: AlertBannerSize;
  /** Figma Leading: `true` shows the theme icon, `false` hides it, or pass a custom icon (an icon name or a node). */
  leading?: boolean | IconName | ReactNode;
  /** Figma Action (Medium only): Button/Overlay Small Inverse. */
  action?: { label: ReactNode; onClick?: () => void };
  /** Shows the close control (icon-x-small-line). */
  onClose?: () => void;
  /** Accessible name of the close control. Default: the locale's “Dismiss”. */
  closeLabel?: string;
  className?: string;
  /** Forwarded to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
  /** Figma instance overrides: props of the icon and Button it draws, by layer (`{ Action: { level: "primary" } }`). Written by Zen Studio;
   *  app code sets leading / action. */
  overrides?: NestedOverrides;
}

/**
 * Figma Alert-Banner (6828:9393): a full-width Solid strip for page-level messages.
 * Medium 56px (padding Small/Large, gap Small, 20px icons) · Small 32px (padding XSmall/Medium, gap XSmall, 16px icons).
 * Warning uses Content/On-Brights; Info/Positive/Negative use Content/On-Colors; Default is Neutral/Solid + Inverse.
 */
export function AlertBanner({ children, theme: themeProp, status, size: sizeProp = "md", leading = true, action, onClose, closeLabel: closeLabelProp, className, overrides, ref, ...rest }: AlertBannerProps) {
  const nest = useNested(overrides);
  const t = useZenLabels();
  const banner = alertBannerModel({ theme: themeProp, status, size: sizeProp, closeLabel: closeLabelProp, labels: t });
  const leadingNode = nest("Leading", leading === true ? <Icon name={banner.icon} decorative /> : leading ? renderIcon(leading) : null);
  const closeTip = useIconTooltip(onClose ? banner.closeLabel : false);
  return (
    <div {...dataAttributes(rest)} ref={ref} className={["zen-alert-banner", className].filter(Boolean).join(" ")} data-tone={banner.theme} data-size={banner.size} role={banner.role}>
      {leadingNode ? <span className="zen-alert-banner__icon" aria-hidden="true">{leadingNode}</span> : null}
      <span className={banner.messageClass}>{nest.slot(children)}</span>
      {action && banner.showsAction ? (
        nest("Action", <Button className="zen-alert-banner__action" {...alertBannerActionButton} onClick={action.onClick}>{action.label}</Button>)
      ) : null}
      {onClose ? (
        <button type="button" className="zen-alert-banner__close" aria-label={banner.closeLabel} {...closeTip.bind({ onClick: onClose })}>
          <Icon name="icon-x-small-line" decorative />{closeTip.tooltip}
        </button>
      ) : null}
    </div>
  );
}
