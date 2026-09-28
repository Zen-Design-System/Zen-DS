import { isValidElement, type HTMLAttributes, type KeyboardEvent, type MouseEvent, type ReactElement, type ReactNode, type Ref } from "react";
import { IconButton } from "../Button";
import type { IconName } from "../Icon";
import { scaleKey } from "../_shared/scale";
import "./card.css";
import "../Icon/core";

export const cardThemes = ["shadow", "flat", "pale", "border", "semi-pale"] as const;
export const cardSpacings = ["medium", "small"] as const;
export type CardTheme = (typeof cardThemes)[number];
/** CSS / Figma key (the `data-spacing` value). */
type CardSpacingKey = (typeof cardSpacings)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type CardSpacing = "md" | "sm" | "medium" | "small";
/** Layer 2 fill of Shadow / Flat / Border cards: default on a Canvas/Default page, alt to suit a Canvas/Alt (white) page. */
export type CardSurface = "default" | "alt";

export interface CardSubAction {
  label: string;
  /** Icon name (default `icon-dots-horizontal-line`) or an icon element. */
  icon?: IconName | ReactElement;
  onClick?: () => void;
}

const isSubActionConfig = (value: unknown): value is CardSubAction => typeof value === "object" && value !== null && !isValidElement(value) && "label" in value;

/** Standard HTML attributes (`id`, `data-*`, `aria-*`, `style`…) go to the root element. */
export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "onClick"> {
  /** The root element. */
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
  /** Figma Theme: Shadow (Shadow/Bottom/Level-1) · Flat · Pale (Support/Neutral/Pale + Effect/Overlay blur) · Border · Semi-Pale (Pale→Subtle gradient). */
  theme?: CardTheme;
  /** Figma Spacing: Medium (Card-padding-medium, Corner-Radius/2XLarge) · Small (Card-padding-small, Corner-Radius/Large). Short (sm, md…) or Figma (small, medium…) spelling. */
  spacing?: CardSpacing;
  /** Figma Active=Yes: the selected card — Surface fill with a 2px Card/Border/Active stroke. */
  selected?: boolean;
  /**
   * Figma Active=Yes (the selected card).
   * @deprecated Use selected.
   */
  active?: boolean;
  /** Surface/Default or Surface/Alt, chosen to suit the page's Canvas. Unset follows an inherited --zen-card-surface
   *  (a page scope can set it once), else Surface/Default. Pale / Semi-Pale keep their own fill. */
  surface?: CardSurface;
  /** Makes the whole card one action (role=button, Enter/Space). Keep other controls out of clickable cards. */
  onClick?: (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void;
  /** Accessible name for a clickable card when its content does not start with a clear title. */
  "aria-label"?: string;
  /** Figma Sub-Action: a Small Flat icon button pinned to the top-right corner (default ⋯ "More actions"). */
  subAction?: CardSubAction | ReactNode;
  as?: "div" | "article" | "section" | "li";
  className?: string;
}

/**
 * Figma Card (6643:51021): a Content slot on one of five surfaces, padded Card-padding-medium/small.
 * A clickable card is an actionable container: Border theme steps its stroke up to Border/Neutral/Subtle (§6).
 */
export function Card({ ref, children, theme = "shadow", spacing: spacingProp = "md", selected, active: activeProp, surface, onClick, onKeyDown, "aria-label": ariaLabel, subAction, as: Tag = "div", className, ...rest }: CardProps) {
  const spacing = scaleKey(spacingProp, cardSpacings);
  const active = selected ?? activeProp ?? false;
  const interactive = Boolean(onClick);
  const sub: ReactNode = isSubActionConfig(subAction)
    ? <IconButton appearance="flat" level="primary" size="sm" aria-label={subAction.label} onClick={subAction.onClick} icon={subAction.icon ?? "icon-dots-horizontal-line"} />
    : subAction;
  return (
    <Tag
      {...rest}
      // One ref type for every `as` tag (div, article, section, li).
      ref={ref as Ref<HTMLDivElement & HTMLLIElement>}
      className={["zen-card", className].filter(Boolean).join(" ")}
      data-tone={theme}
      data-spacing={spacing}
      data-surface={surface}
      data-active={active ? "true" : undefined}
      data-interactive={interactive ? "true" : undefined}
      role={interactive ? "button" : rest.role}
      tabIndex={interactive ? 0 : rest.tabIndex}
      aria-pressed={interactive && active ? true : rest["aria-pressed"]}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={interactive ? (event: KeyboardEvent<HTMLElement>) => { onKeyDown?.(event); if (event.defaultPrevented) return; if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onClick?.(event); } } : onKeyDown}
    >
      <div className="zen-card__content">{children}</div>
      {sub ? <div className="zen-card__sub-action">{sub}</div> : null}
    </Tag>
  );
}
