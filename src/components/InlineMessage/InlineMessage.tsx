import type { ReactNode, Ref } from "react";
import { Button } from "../Button";
import { Icon, type IconName } from "../Icon";
import { useIconTooltip } from "../Tooltip";
import { renderIcon } from "../_shared/icon";
import type { StatusAlias } from "../_shared/status";
import { useZenLabels } from "../_shared/zen-context";
import { inlineMessageActionButton, inlineMessageCaptionClass, inlineMessageModel, inlineMessageTitleClass, type InlineMessageTheme } from "./model";
import "./inline-message.css";
import "../Icon/core";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { dataAttributes } from "../_shared/data-attributes";

export { inlineMessageThemes, type InlineMessageTheme } from "./model";

export interface InlineMessageProps {
  theme?: InlineMessageTheme;
  /** @deprecated Use theme: success → positive, error → negative (warning and info are the same). */
  status?: StatusAlias;
  /** Figma Title (Body/Base/Bold). */
  title?: ReactNode;
  /** Figma Caption (Body/Small/Regular). */
  children?: ReactNode;
  /** `false` hides the icon; an icon name or a node replaces it. Theme=Custom: the Visual slot (defaults to a 36px image placeholder). */
  icon?: boolean | IconName | ReactNode;
  /** Figma Action: one Button/Main Small Tertiary under the text. */
  action?: { label: ReactNode; onClick?: () => void };
  /** Shows the close control (icon-x-small-line, Content/Neutral/Light). */
  onClose?: () => void;
  /** Accessible name of the close control. Default: the locale's “Dismiss”. */
  closeLabel?: string;
  className?: string;
  /** Forwarded to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
  /** Figma instance overrides: props of the icon and Button it draws, by layer (`{ Action: { level: "secondary" } }`). Written by Zen Studio;
   *  app code sets icon / action. */
  overrides?: NestedOverrides;
}

/**
 * Figma Inline-Message (595:54857): a Subtle-surface message inside the content it describes.
 * Padding Medium, gap Small, Corner-Radius/Large. Icon Content/<theme>/Light, title Strongest, caption Base.
 */
export function InlineMessage({ theme: themeProp, status, title, children, icon = true, action, onClose, closeLabel: closeLabelProp, className, overrides, ref, ...rest }: InlineMessageProps) {
  const nest = useNested(overrides);
  const t = useZenLabels();
  const message = inlineMessageModel({ theme: themeProp, status, closeLabel: closeLabelProp, labels: t });
  const leading = icon === true ? <Icon name={message.icon} decorative /> : icon ? renderIcon(icon) : null;
  const closeTip = useIconTooltip(onClose ? message.closeLabel : false);
  return (
    <div {...dataAttributes(rest)} ref={ref} className={["zen-inline-message", className].filter(Boolean).join(" ")} data-tone={message.theme} role={message.role}>
      <div className="zen-inline-message__container">
        {leading ? <span className="zen-inline-message__icon" aria-hidden="true">{nest("Leading", leading)}</span> : null}
        <div className="zen-inline-message__content">
          <div className="zen-inline-message__text">
            {title ? <span className={inlineMessageTitleClass}>{title}</span> : null}
            {children ? <span className={inlineMessageCaptionClass}>{nest.slot(children)}</span> : null}
          </div>
          {action ? nest("Action", <Button className="zen-inline-message__action" {...inlineMessageActionButton} onClick={action.onClick}>{action.label}</Button>) : null}
        </div>
      </div>
      {onClose ? (
        <button type="button" className="zen-inline-message__close" aria-label={message.closeLabel} {...closeTip.bind({ onClick: onClose })}>
          <Icon name="icon-x-small-line" decorative />{closeTip.tooltip}
        </button>
      ) : null}
    </div>
  );
}
